/**
 * Test d'intégration du frein de connexion (FC-07), contre un vrai Postgres.
 *
 * Il porte sur le chemin le plus sensible de l'application : une erreur ici
 * empêche des coachs de se connecter. Il vérifie donc autant le frein que
 * l'absence de régression — un mot de passe correct doit continuer de passer.
 *
 * Ignoré si FOOTCOACH_TEST_DATABASE_URL n'est pas renseigné, pour que
 * `npm test` reste vert sans Docker :
 *
 *   docker compose up -d postgres
 *   FOOTCOACH_TEST_DATABASE_URL=postgres://footcoach:<mdp>@localhost:5433/footcoach \
 *     npm run test --workspace apps/api
 *
 * ⚠️ Il ÉCRIT dans la base visée (un compte @throttle.test et ses tentatives),
 * et nettoie derrière lui. À ne pointer que sur une base de développement.
 */
const TEST_DB = process.env.FOOTCOACH_TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

/**
 * Le plafond en mémoire de @fastify/rate-limit doit sortir du cadre : c'est le
 * frein EN BASE que ce test observe. Sans cela, la onzième requête de la minute
 * reçoit un 429 du plafond de route (authRateLimit, 10/minute) et l'on croit
 * mesurer le frein alors qu'on mesure l'autre protection.
 *
 * ⚠️ Ordre subtil : les `import` statiques sont évalués AVANT le corps du
 * module. Ces deux réglages ne portent donc que sur les `await import()`
 * dynamiques du corps du test — d'où le chargement tardif de db/client,
 * env et rateLimits plus bas. Node exécutant chaque fichier de test dans son
 * propre processus, cette variable ne fuit pas sur les autres tests.
 */
if (TEST_DB) process.env.RATE_LIMIT_DISABLED = "true";

import "./env.setup.js";
import assert from "node:assert/strict";
import test from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import bcrypt from "bcryptjs";
import { eq, like } from "drizzle-orm";

const describeOrSkip = TEST_DB ? test : test.skip;

describeOrSkip("frein de connexion, de bout en bout", async (t) => {
  const { db } = await import("../db/client.js");
  const { loginAttempts, loginEvents, users } = await import("../db/schema.js");
  const { runMigrations } = await import("../db/migrate.js");
  const { authRoutes } = await import("../routes/auth.js");
  const { registerErrorHandler } = await import("../plugins/errors.js");
  const { rateLimitOptions } = await import("../plugins/rateLimit.js");
  const { MAX_FAILURES_PER_ACCOUNT, emailKey } = await import("../lib/loginThrottle.js");

  const EMAIL = "cible@throttle.test";
  const VOISIN = "voisin@throttle.test";
  const PASSWORD = "MotDePasseCorrect1!";

  let app: FastifyInstance;
  let base: string;

  async function cleanup() {
    for (const email of [EMAIL, VOISIN]) {
      await db.delete(loginAttempts).where(eq(loginAttempts.emailKey, emailKey(email)));
    }
    const doomed = await db.select({ id: users.id }).from(users).where(like(users.email, "%@throttle.test"));
    for (const { id } of doomed) {
      await db.delete(loginEvents).where(eq(loginEvents.userId, id));
      await db.delete(users).where(eq(users.id, id));
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return { status: res.status, body: (await res.json()) as { error?: string } };
  }

  t.before(async () => {
    await runMigrations();
    await cleanup();

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    for (const email of [EMAIL, VOISIN]) {
      await db
        .insert(users)
        .values({ email, passwordHash, role: "coach", nickname: "Test", firstName: "Test", lastName: "Frein" });
    }

    app = Fastify();
    // Réglages réels ; RATE_LIMIT_DISABLED=true (plus haut) élève les plafonds en
    // mémoire pour laisser le frein en base seul en scène.
    await app.register(rateLimit, rateLimitOptions);
    registerErrorHandler(app);
    app.register((instance) => authRoutes(instance));
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    assert.ok(address && typeof address === "object");
    base = `http://127.0.0.1:${address.port}`;
  });

  t.after(async () => {
    await app?.close();
    await cleanup();
    // Le pool de connexions est partagé par les deux blocs de ce fichier : il est
    // fermé par le dernier, pas ici.
  });

  await t.test("un mot de passe correct passe, sans frein", async () => {
    const { status } = await login(EMAIL, PASSWORD);
    assert.equal(status, 200, "le chemin normal de connexion doit rester intact");
  });

  await t.test("les échecs sont comptés puis le compte est freiné", async () => {
    await cleanup();
    // Recréer les comptes que cleanup() vient d'emporter
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    for (const email of [EMAIL, VOISIN]) {
      await db
        .insert(users)
        .values({ email, passwordHash, role: "coach", nickname: "Test", firstName: "Test", lastName: "Frein" });
    }

    for (let i = 0; i < MAX_FAILURES_PER_ACCOUNT; i++) {
      const { status } = await login(EMAIL, `mauvais-${i}`);
      assert.equal(status, 401, `tentative ${i + 1} : refus normal attendu, pas encore le frein`);
    }

    const freine = await login(EMAIL, `mauvais-encore`);
    assert.equal(freine.status, 429, "au-delà du seuil, le frein doit répondre 429");
    assert.match(freine.body.error ?? "", /Trop de tentatives/);

    // Le frein porte sur le COMPTE : même le bon mot de passe attend la fenêtre.
    // C'est le prix assumé d'un frein par compte, et la raison pour laquelle le
    // message renvoie vers la réinitialisation.
    const bonMaisFreine = await login(EMAIL, PASSWORD);
    assert.equal(bonMaisFreine.status, 429);

    // ... et il ne déborde pas sur les autres comptes, y compris depuis la même
    // adresse. C'est le point que ne tiendrait pas un frein par adresse.
    const voisin = await login(VOISIN, PASSWORD);
    assert.equal(voisin.status, 200, "un compte voisin ne doit pas être emporté");
  });

  await t.test("l'adresse essayée n'est jamais stockée en clair", async () => {
    const rows = await db
      .select({ emailKey: loginAttempts.emailKey })
      .from(loginAttempts)
      .where(eq(loginAttempts.emailKey, emailKey(EMAIL)));
    assert.ok(rows.length > 0, "des tentatives doivent avoir été enregistrées");
    for (const row of rows) {
      assert.doesNotMatch(row.emailKey, /throttle\.test/, "l'adresse ne doit pas être lisible");
    }
  });
});

/**
 * Migration transparente des empreintes (FC-16), contre un vrai Postgres.
 *
 * Le passage de bcrypt à scrypt ne devait verrouiller personne dehors et ne
 * demander aucune migration de données : une empreinte héritée doit permettre
 * de se connecter, puis être réécrite à cette occasion.
 */
describeOrSkip("réencodage des empreintes héritées", async (t) => {
  const { db } = await import("../db/client.js");
  const { loginAttempts, loginEvents, users } = await import("../db/schema.js");
  const { runMigrations } = await import("../db/migrate.js");
  const { authRoutes } = await import("../routes/auth.js");
  const { registerErrorHandler } = await import("../plugins/errors.js");
  const { emailKey } = await import("../lib/loginThrottle.js");
  const { needsRehash } = await import("../lib/passwordHash.js");
  const bcryptjs = (await import("bcryptjs")).default;

  const EMAIL = "legacy@throttle.test";
  const PASSWORD = "MotDePasseHerite2019";

  let app: FastifyInstance;
  let base: string;

  t.before(async () => {
    await runMigrations();
    await db.delete(loginAttempts).where(eq(loginAttempts.emailKey, emailKey(EMAIL)));
    const anciens = await db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL));
    for (const { id } of anciens) {
      await db.delete(loginEvents).where(eq(loginEvents.userId, id));
      await db.delete(users).where(eq(users.id, id));
    }
    // Un compte tel qu'il existait AVANT ce changement : empreinte bcrypt coût 10
    await db.insert(users).values({
      email: EMAIL,
      passwordHash: await bcryptjs.hash(PASSWORD, 10),
      role: "coach",
      nickname: "Ancien",
      firstName: "Ancien",
      lastName: "Compte",
    });

    app = Fastify();
    registerErrorHandler(app);
    app.register((instance) => authRoutes(instance));
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address();
    assert.ok(address && typeof address === "object");
    base = `http://127.0.0.1:${address.port}`;
  });

  t.after(async () => {
    await app?.close();
    await db.delete(loginAttempts).where(eq(loginAttempts.emailKey, emailKey(EMAIL)));
    const restes = await db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL));
    for (const { id } of restes) {
      await db.delete(loginEvents).where(eq(loginEvents.userId, id));
      await db.delete(users).where(eq(users.id, id));
    }
    // Dernier bloc du fichier : le pool peut être refermé, sinon le processus de
    // test resterait vivant sur des connexions ouvertes.
    const { sql } = await import("../db/client.js");
    await sql.end();
  });

  await t.test("un compte au format bcrypt se connecte, puis est réencodé", async () => {
    const [avant] = await db.select().from(users).where(eq(users.email, EMAIL));
    assert.ok(needsRehash(avant.passwordHash), "le compte doit bien partir d'une empreinte héritée");

    const res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    assert.equal(res.status, 200, "une empreinte héritée doit permettre de se connecter");

    // Le réencodage est délibérément lancé sans await : le coach n'attend pas.
    let apres = avant;
    for (let i = 0; i < 40 && needsRehash(apres.passwordHash); i++) {
      await new Promise((r) => setTimeout(r, 100));
      [apres] = await db.select().from(users).where(eq(users.email, EMAIL));
    }
    assert.equal(needsRehash(apres.passwordHash), false, "l'empreinte doit avoir été réécrite en scrypt");
    assert.match(apres.passwordHash, /^scrypt\$/);

    // Et le compte se reconnecte avec le même mot de passe, désormais en scrypt
    const encore = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    assert.equal(encore.status, 200, "le mot de passe doit valoir après réencodage");
  });
});
