import { TEST_ACCESS_SECRET } from "../test/env.setup.js";
import assert from "node:assert/strict";
import test from "node:test";
import jwt from "jsonwebtoken";
import { signAccessToken } from "./auth.js";

/**
 * Non-régression FC-12 — algorithme de signature épinglé.
 *
 * `jwt.verify` était appelé sans `algorithms`. Vérifié sur la version installée
 * (jsonwebtoken 9.0.3) : l'attaque `alg: none` est refusée d'office, il n'y
 * avait donc pas de faille exploitable. Mais la garantie venait du défaut d'une
 * dépendance et non du code. Ces tests l'y ancrent.
 */

test("un jeton émis par l'application est bien en HS256", () => {
  const token = signAccessToken({ id: "coach-1", role: "coach", teamId: null });
  const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
  assert.equal(header.alg, "HS256");
});

test("un jeton émis est vérifiable en n'autorisant que HS256", () => {
  const token = signAccessToken({ id: "coach-1", role: "coach", teamId: "equipe-1" });
  const payload = jwt.verify(token, TEST_ACCESS_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
  assert.equal(payload.sub, "coach-1");
  assert.equal(payload.role, "coach");
  assert.equal(payload.teamId, "equipe-1");
  assert.ok(payload.exp, "le jeton doit porter une expiration");
});

test("un jeton sans signature est refusé", () => {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const forge = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "attaquant", role: "admin" })}.`;
  assert.throws(() => jwt.verify(forge, TEST_ACCESS_SECRET, { algorithms: ["HS256"] }));
  // Et sans épinglage non plus, sur cette version : le constat de l'audit.
  assert.throws(() => jwt.verify(forge, TEST_ACCESS_SECRET));
});

test("un jeton signé avec une autre clé est refusé", () => {
  const etranger = jwt.sign({ sub: "attaquant", role: "admin" }, "une-autre-cle-de-signature-quelconque");
  assert.throws(() => jwt.verify(etranger, TEST_ACCESS_SECRET, { algorithms: ["HS256"] }));
});

test("le jeton expire, et l'expiration est vérifiée", () => {
  const perime = jwt.sign({ sub: "coach-1" }, TEST_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: "-1s",
  });
  assert.throws(
    () => jwt.verify(perime, TEST_ACCESS_SECRET, { algorithms: ["HS256"] }),
    /expired/i,
  );
});
