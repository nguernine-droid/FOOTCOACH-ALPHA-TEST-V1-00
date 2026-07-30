import "../test/env.setup.js";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ensureUploadsDir } from "./uploads.js";

/**
 * Non-régression FC-03 — le dossier des photos de profil.
 *
 * En production, `volumes: []` retirait le volume `uploads` et l'image tournait
 * sous un utilisateur non privilégié dans un `/app` appartenant à root :
 * `mkdir` échouait en EACCES depuis le corps du module, donc hors du try qui
 * entoure `listen()`, et le conteneur s'arrêtait au démarrage.
 *
 * Le correctif porte sur le Dockerfile (dossier créé et attribué) et sur
 * docker-compose.prod.yml (`volumes: !override`, qui remplace la liste au lieu
 * de la fusionner). Les deux ont été vérifiés sur l'image réelle. Ce que ces
 * tests garantissent, c'est le filet de sécurité côté code : un dossier
 * inutilisable doit produire un diagnostic nommant la cause, et l'écriture doit
 * être réellement éprouvée — un dossier qui existe n'est pas forcément un
 * dossier où ce processus peut écrire.
 */

test("un dossier utilisable passe, et ne laisse aucun fichier derrière lui", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fc-uploads-"));
  try {
    await ensureUploadsDir(dir);
    await ensureUploadsDir(dir); // rejouable
    const { readdir } = await import("node:fs/promises");
    assert.deepEqual(await readdir(dir), [], "le fichier témoin d'écriture doit être retiré");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("un dossier absent est créé, arborescence comprise", async () => {
  const parent = await mkdtemp(path.join(tmpdir(), "fc-uploads-"));
  try {
    await ensureUploadsDir(path.join(parent, "a", "b", "uploads"));
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("un chemin inutilisable produit un diagnostic, pas une trace brute", async () => {
  const parent = await mkdtemp(path.join(tmpdir(), "fc-uploads-"));
  const asFile = path.join(parent, "uploads");
  try {
    // Le chemin existe déjà, mais c'est un FICHIER : impossible d'y écrire un
    // avatar. C'est la forme d'échec reproductible sur les trois OS ; l'EACCES
    // du conteneur emprunte exactement le même chemin de code.
    await writeFile(asFile, "");
    await assert.rejects(
      () => ensureUploadsDir(asFile),
      (err: Error) => {
        assert.match(err.message, /Dossier des photos de profil inutilisable/);
        assert.match(err.message, /volume `uploads`/, "le message doit dire quoi réparer");
        assert.ok(err.cause, "la cause d'origine doit être conservée pour les journaux");
        return true;
      },
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
