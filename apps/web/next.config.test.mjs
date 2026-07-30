import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "./next.config.mjs";

/**
 * Non-régression FC-05 — la configuration qui neutralise les CVE de `sharp`.
 *
 * `next@16.2.12` (la dernière publiée) épingle `sharp: ^0.34.5`, alors que les
 * quatre CVE libvips de GHSA-f88m-g3jw-g9cj ne sont corrigées qu'en 0.35.0.
 * Aucune montée de next ne les referme aujourd'hui, et npm n'honore pas les
 * `overrides` de la racine pour les dépendances d'un workspace (vérifié : la
 * même configuration hors workspace fonctionne).
 *
 * Ce qui rend ces CVE inatteignables, ce n'est donc pas une version : c'est
 * `images: { unoptimized: true }`. L'endpoint d'optimisation de Next est le seul
 * chemin par lequel une image TÉLÉVERSÉE PAR UN UTILISATEUR entrerait dans
 * libvips. Fermé, sharp n'est jamais appelé.
 *
 * Ce test existe pour que ce lien ne soit pas oublié : le jour où quelqu'un
 * voudra `next/image`, il échouera ici et lira pourquoi, au lieu de rouvrir
 * silencieusement quatre CVE.
 */

test("l'optimisation d'images reste fermée tant que sharp est vulnérable", () => {
  assert.equal(
    nextConfig.images?.unoptimized,
    true,
    "Rouvrir l'optimisation d'images expose sharp (<0.35.0, 4 CVE libvips) aux fichiers " +
      "téléversés par les coachs. Avant de retirer `unoptimized: true`, vérifier que la " +
      "version de sharp résolue est >= 0.35.0 (npm ls sharp).",
  );
});

test("les en-têtes de sécurité fixes restent posés sur toutes les réponses", async () => {
  const headers = await nextConfig.headers();
  const forAllPaths = headers.find((entry) => entry.source === "/:path*");
  assert.ok(forAllPaths, "un bloc d'en-têtes doit couvrir /:path*");

  const byKey = new Map(forAllPaths.headers.map((h) => [h.key, h.value]));
  // nosniff n'est pas décoratif ici : c'est lui qui empêche un fichier
  // téléversé, servi sous /api/uploads/*, d'être interprété autrement que
  // comme l'image que son extension annonce (voir FC-08).
  assert.equal(byKey.get("X-Content-Type-Options"), "nosniff");
  assert.equal(byKey.get("X-Frame-Options"), "DENY");
  assert.equal(byKey.get("Referrer-Policy"), "no-referrer");
});
