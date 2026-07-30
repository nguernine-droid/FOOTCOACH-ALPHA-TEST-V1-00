import "./env.setup.js";
import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { env, parseTrustProxy } from "../env.js";

/**
 * Non-régression FC-02 — `trustProxy: true` laissait le client déclarer son
 * adresse.
 *
 * `X-Forwarded-For` est un en-tête, donc une donnée fournie par l'appelant.
 * Avec `trustProxy: true`, Fastify en retenait l'entrée la plus à gauche :
 * `request.ip` — et donc le compteur de débit qui en dérive — devenait un champ
 * libre. Il suffisait d'incrémenter l'en-tête à chaque tentative pour retrouver
 * un devinage de mot de passe illimité, y compris après la correction de FC-01.
 *
 * Point aggravant vérifié dans le code de Next (`base-server.js` :
 * `req.headers['x-forwarded-for'] ??= socket.remoteAddress`) : l'en-tête n'est
 * posé que s'il est ABSENT. Un `X-Forwarded-For` envoyé par le client traverse
 * donc le service `web` intact — la confiance ne peut venir que d'un reverse
 * proxy configuré pour y ajouter l'adresse réelle.
 */

async function ipSeenBy(trustProxy: boolean | number | string[], forwardedFor?: string) {
  const app = Fastify({ trustProxy });
  app.get("/vu", async (request) => ({ ip: request.ip }));
  await app.listen({ port: 0, host: "127.0.0.1" });
  try {
    const address = app.server.address();
    assert.ok(address && typeof address === "object", "adresse d'écoute introuvable");
    const res = await fetch(`http://127.0.0.1:${address.port}/vu`, {
      headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
    });
    return ((await res.json()) as { ip: string }).ip;
  } finally {
    await app.close();
  }
}

test("le défaut ne fait confiance à personne : X-Forwarded-For est ignoré", async () => {
  assert.equal(
    env.TRUST_PROXY,
    false,
    "TRUST_PROXY non renseigné doit valoir false, jamais true : `true` rend l'adresse client falsifiable",
  );

  const spoofed = await ipSeenBy(env.TRUST_PROXY, "203.0.113.7");
  assert.equal(spoofed, "127.0.0.1", "l'adresse retenue doit être celle du pair TCP, pas celle annoncée");

  const honest = await ipSeenBy(env.TRUST_PROXY);
  assert.equal(honest, "127.0.0.1");
});

test("l'analyse de TRUST_PROXY ne produit jamais `true`", async (t) => {
  // `true` = faire confiance à tous les sauts = laisser le client choisir son
  // adresse. Aucune saisie ne doit pouvoir y mener, même « true ».
  for (const [input, expected] of [
    [undefined, false],
    ["", false],
    ["   ", false],
    [",  ,", false],
    ["2", 2],
    ["loopback,uniquelocal", ["loopback", "uniquelocal"]],
    ["10.0.0.0/8", ["10.0.0.0/8"]],
    // « true » n'est pas un booléen ici : c'est une liste d'un nom d'hôte qui ne
    // résoudra jamais, donc personne. Surtout : ce n'est pas `true`.
    ["true", ["true"]],
  ] as const) {
    await t.test(`TRUST_PROXY=${JSON.stringify(input)}`, () => {
      const result = parseTrustProxy(input);
      assert.notEqual(result, true, "aucune saisie ne doit produire `true`");
      assert.deepEqual(result, expected);
    });
  }
});
