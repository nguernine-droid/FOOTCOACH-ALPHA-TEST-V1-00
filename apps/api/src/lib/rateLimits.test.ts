import { TEST_ACCESS_SECRET } from "../test/env.setup.js";
import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import jwt from "jsonwebtoken";
import { rateLimitOptions } from "../plugins/rateLimit.js";
import { authRateLimit } from "./rateLimits.js";

/**
 * Non-régression FC-01 — contournement de la limitation de débit par
 * l'en-tête `Authorization`.
 *
 * La clé de comptage se dérivait des octets bruts de l'en-tête, sans vérifier
 * la signature du jeton : faire varier le « Bearer » à chaque essai donnait un
 * compteur neuf, et la connexion n'avait plus aucun plafond. Ces tests montent
 * un serveur avec les VRAIS réglages du dépôt (`rateLimitOptions`,
 * `authRateLimit`) et comptent les 429.
 */

const AUTH_MAX = 10; // authRateLimit : 10 tentatives par minute

async function startServer() {
  const app = Fastify();
  await app.register(rateLimit, rateLimitOptions);
  app.post("/auth/login", authRateLimit, async () => ({ ok: false }));
  app.get("/matches", async () => ({ ok: true }));
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  assert.ok(address && typeof address === "object", "adresse d'écoute introuvable");
  return { app, base: `http://127.0.0.1:${address.port}` };
}

/** Envoie `count` requêtes et retourne le nombre de réponses non bloquées. */
async function countAccepted(
  base: string,
  path: string,
  count: number,
  headersFor: (i: number) => Record<string, string>,
  method = "POST",
): Promise<number> {
  let accepted = 0;
  for (let i = 0; i < count; i++) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "content-type": "application/json", ...headersFor(i) },
      ...(method === "POST" ? { body: JSON.stringify({ essai: i }) } : {}),
    });
    if (res.status !== 429) accepted++;
  }
  return accepted;
}

test("un Bearer qui change à chaque essai ne fabrique plus de compteur neuf", async () => {
  const { app, base } = await startServer();
  try {
    const accepted = await countAccepted(base, "/auth/login", 40, (i) => ({
      authorization: `Bearer contournement-${i}`,
    }));
    assert.equal(
      accepted,
      AUTH_MAX,
      `le plafond de ${AUTH_MAX} doit tenir malgré un jeton différent à chaque requête (${accepted} passées)`,
    );
  } finally {
    await app.close();
  }
});

test("un jeton forgé, signé avec une autre clé, ne fabrique pas de compteur", async () => {
  const { app, base } = await startServer();
  try {
    // Structure de jeton valide, mais signée avec un secret que le serveur ignore
    const accepted = await countAccepted(base, "/auth/login", 40, (i) => ({
      authorization: `Bearer ${jwt.sign({ sub: `attaquant-${i}` }, "mauvaise-cle-de-signature")}`,
    }));
    assert.equal(accepted, AUTH_MAX, `un jeton non vérifiable doit retomber sur l'adresse (${accepted} passées)`);
  } finally {
    await app.close();
  }
});

test("un jeton expiré ne fabrique pas de compteur", async () => {
  const { app, base } = await startServer();
  try {
    const expired = jwt.sign({ sub: "coach-1" }, TEST_ACCESS_SECRET, { expiresIn: "-1h" });
    const accepted = await countAccepted(base, "/auth/login", 40, () => ({
      authorization: `Bearer ${expired}`,
    }));
    assert.equal(accepted, AUTH_MAX, `un jeton expiré doit retomber sur l'adresse (${accepted} passées)`);
  } finally {
    await app.close();
  }
});

test("les routes d'authentification comptent par adresse, jeton valide ou non", async () => {
  const { app, base } = await startServer();
  try {
    // Même un jeton parfaitement valide ne doit pas ouvrir un quota séparé sur
    // /auth/login : sinon il suffirait d'un compte pour marteler la connexion
    // d'un autre.
    const valid = jwt.sign({ sub: "coach-1" }, TEST_ACCESS_SECRET, { expiresIn: "15m" });
    const accepted = await countAccepted(base, "/auth/login", 25, () => ({
      authorization: `Bearer ${valid}`,
    }));
    assert.equal(accepted, AUTH_MAX, `/auth/login doit compter par adresse (${accepted} passées)`);
  } finally {
    await app.close();
  }
});

test("hors authentification, deux comptes vérifiés gardent bien des quotas distincts", async () => {
  const { app, base } = await startServer();
  try {
    // La raison d'être du keyGenerator : deux coachs derrière le même NAT ne
    // doivent pas se partager un compteur. Ce test protège l'intention autant
    // que le correctif protège la faille.
    const tokenA = jwt.sign({ sub: "coach-a" }, TEST_ACCESS_SECRET, { expiresIn: "15m" });
    const tokenB = jwt.sign({ sub: "coach-b" }, TEST_ACCESS_SECRET, { expiresIn: "15m" });

    const a = await countAccepted(base, "/matches", 5, () => ({ authorization: `Bearer ${tokenA}` }), "GET");
    const b = await countAccepted(base, "/matches", 5, () => ({ authorization: `Bearer ${tokenB}` }), "GET");

    assert.equal(a, 5, "le premier compte doit passer");
    assert.equal(b, 5, "le second compte ne doit pas hériter du compteur du premier");
  } finally {
    await app.close();
  }
});
