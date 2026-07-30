import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { DUMMY_PASSWORD_HASH, hashPassword, needsRehash, verifyPassword } from "./passwordHash.js";

/**
 * Non-régression FC-16 — hachage des mots de passe.
 *
 * L'application hachait en bcrypt coût 10 via bcryptjs (JavaScript pur). Le
 * passage à scrypt natif ne devait casser aucune connexion existante : c'est ce
 * que ces tests vérifient d'abord.
 */

const MOT = "Vestiaire-Gerland-2026";

test("un mot de passe haché se vérifie", async () => {
  const stored = await hashPassword(MOT);
  assert.equal(await verifyPassword(MOT, stored), true);
  assert.equal(await verifyPassword("autre-chose-de-douze", stored), false);
});

test("le format porte ses paramètres, et jamais le mot de passe", async () => {
  const stored = await hashPassword(MOT);
  assert.match(stored, /^scrypt\$32768\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  assert.doesNotMatch(stored, /Vestiaire|Gerland/i, "le mot de passe ne doit pas apparaître");
});

test("deux hachages du même mot de passe diffèrent", async () => {
  // Sel par empreinte : sans lui, deux comptes au même mot de passe se
  // reconnaîtraient dans un dump, et une table précalculée les couvrirait tous.
  assert.notEqual(await hashPassword(MOT), await hashPassword(MOT));
});

test("les empreintes bcrypt existantes continuent de fonctionner", async () => {
  // LE point de compatibilité : sans cela, tous les comptes créés avant ce
  // changement seraient verrouillés dehors.
  for (const cost of [10, 12]) {
    const legacy = await bcrypt.hash(MOT, cost);
    assert.equal(await verifyPassword(MOT, legacy), true, `bcrypt coût ${cost} doit rester lisible`);
    assert.equal(await verifyPassword("mauvais-mot-de-passe", legacy), false);
  }
});

test("une empreinte bcrypt est signalée à réencoder, une scrypt non", async () => {
  assert.equal(needsRehash(await bcrypt.hash(MOT, 10)), true);
  assert.equal(needsRehash(await hashPassword(MOT)), false);
});

test("les variantes de préfixe bcrypt sont reconnues", async () => {
  // bcryptjs produit du $2a$ ; d'autres implémentations écrivent $2b$ ou $2y$.
  // Une empreinte importée depuis un autre système ne doit pas être rejetée.
  const legacy = await bcrypt.hash(MOT, 10);
  for (const prefix of ["$2a$", "$2b$", "$2y$"]) {
    const variant = prefix + legacy.slice(4);
    assert.equal(needsRehash(variant), true, `${prefix} doit être vu comme hérité`);
  }
});

test("une empreinte d'un format inconnu est refusée, pas interprétée", async () => {
  for (const bizarre of [
    "",
    MOT, // mot de passe stocké en clair : refuser, ne jamais comparer
    "md5$abcdef",
    "scrypt$pas-un-nombre$8$1$c2VsCg$Y2xlCg",
    "scrypt$32768$8$1$c2VsCg", // champs manquants
    "scrypt$99999999$8$1$c2VsCg$Y2xlCg", // paramètres déraisonnables
    "scrypt$32768$8$1$$",
  ]) {
    assert.equal(
      await verifyPassword(MOT, bizarre),
      false,
      `« ${bizarre.slice(0, 30) }» doit être refusé`,
    );
  }
});

test("l'empreinte témoin ne correspond à rien et reste au format courant", async () => {
  const dummy = await DUMMY_PASSWORD_HASH;
  assert.match(dummy, /^scrypt\$/, "elle doit coûter le même temps qu'une vérification réelle");
  assert.equal(await verifyPassword(MOT, dummy), false);
  assert.equal(await verifyPassword("", dummy), false);
});

test("vérifier un compte inconnu coûte le même temps qu'un compte réel", async () => {
  // C'est ce qui empêche de dresser la liste des comptes à la montre. Le seuil
  // est large : on cherche à écarter un écart d'un ORDRE DE GRANDEUR, seul
  // exploitable à travers le réseau, pas à mesurer finement une machine de CI.
  const reel = await hashPassword(MOT);
  const temoin = await DUMMY_PASSWORD_HASH;
  const chrono = async (stored: string) => {
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < 3; i++) await verifyPassword("mauvais-mot-de-passe", stored);
    return Number(process.hrtime.bigint() - t0) / 1e6 / 3;
  };
  await chrono(reel); // chauffe
  const msReel = await chrono(reel);
  const msTemoin = await chrono(temoin);
  const rapport = Math.max(msReel, msTemoin) / Math.max(1, Math.min(msReel, msTemoin));
  assert.ok(
    rapport < 3,
    `les deux durées doivent rester du même ordre (réel ${msReel.toFixed(1)} ms, témoin ${msTemoin.toFixed(1)} ms)`,
  );
});
