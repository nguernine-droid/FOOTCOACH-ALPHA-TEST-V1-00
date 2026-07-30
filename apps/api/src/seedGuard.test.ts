import assert from "node:assert/strict";
import test from "node:test";
import { SeedRefused, assertSeedAllowed } from "./seedGuard.js";

/**
 * Non-régression FC-04 — le seed de démonstration créait un administrateur au
 * mot de passe publié dans le README, sur n'importe quelle base.
 *
 * Le script ne consultait ni NODE_ENV ni la cible de DATABASE_URL. La commande
 * du README, lancée sur la pile de production, y créait `admin@demo.fr` /
 * `Demo1234!` — accès à tout /admin/**, sans rien avoir à deviner.
 */

const LOCAL = "postgres://footcoach:x@postgres:5432/footcoach";
const DISTANT = "postgres://footcoach:x@db.production.example:5432/footcoach";

test("refusé en production, même sur une base locale", () => {
  assert.throws(
    () => assertSeedAllowed({ nodeEnv: "production", databaseUrl: LOCAL, confirm: undefined }),
    (err: Error) => {
      assert.ok(err instanceof SeedRefused);
      assert.match(err.message, /NODE_ENV=production/);
      return true;
    },
  );
});

test("refusé en production même avec la confirmation : aucune échappatoire", () => {
  assert.throws(
    () => assertSeedAllowed({ nodeEnv: "production", databaseUrl: LOCAL, confirm: "oui" }),
    SeedRefused,
  );
});

test("refusé sur une base distante sans confirmation explicite", () => {
  assert.throws(
    () => assertSeedAllowed({ nodeEnv: "development", databaseUrl: DISTANT, confirm: undefined }),
    (err: Error) => {
      assert.match(err.message, /db\.production\.example/, "le message doit nommer la base visée");
      assert.match(err.message, /FOOTCOACH_SEED_CONFIRM=oui/, "et dire comment passer outre");
      return true;
    },
  );
});

test("refusé si DATABASE_URL est absent ou illisible", () => {
  for (const databaseUrl of [undefined, "", "pas-une-url", "postgres://"]) {
    assert.throws(
      () => assertSeedAllowed({ nodeEnv: "development", databaseUrl, confirm: "oui" }),
      SeedRefused,
      `DATABASE_URL=${JSON.stringify(databaseUrl)} doit être refusé`,
    );
  }
});

test("autorisé sur les hôtes locaux, sans confirmation", () => {
  for (const host of ["localhost", "127.0.0.1", "postgres", "db"]) {
    assert.doesNotThrow(() =>
      assertSeedAllowed({
        nodeEnv: "development",
        databaseUrl: `postgres://u:p@${host}:5432/footcoach`,
        confirm: undefined,
      }),
    );
  }
});

test("autorisé sur une base distante quand c'est délibéré", () => {
  assert.doesNotThrow(() =>
    assertSeedAllowed({ nodeEnv: "development", databaseUrl: DISTANT, confirm: "oui" }),
  );
});

test("une confirmation approximative ne vaut pas confirmation", () => {
  for (const confirm of ["true", "1", "yes", "OUI", "o"]) {
    assert.throws(
      () => assertSeedAllowed({ nodeEnv: "development", databaseUrl: DISTANT, confirm }),
      SeedRefused,
      `FOOTCOACH_SEED_CONFIRM=${confirm} ne doit pas suffire`,
    );
  }
});
