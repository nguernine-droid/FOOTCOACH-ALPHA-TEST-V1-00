/**
 * Rasterise `icon.svg` en icônes PWA.
 *
 *     docker compose exec -T web node - < apps/web/img/make-icons.mjs
 *
 * Le script est passé sur l'ENTRÉE STANDARD et lit le SVG par le système de
 * fichiers du conteneur : `apps/web/img/` n'est pas monté dans l'image (seuls
 * `src/` et `public/` le sont), mais `src/app/` l'est — donc les PNG écrits
 * atterrissent bien sur l'hôte. Le SVG, lui, est intégré ci-dessous par le
 * script d'appel : voir README.md.
 *
 * Deux tailles, deux usages :
 *   - 512×512 → `src/app/icon.png` : favicon, icône Android (`any` et
 *     `maskable`, d'où la marque à 62 % qui tient dans la zone de sécurité) ;
 *   - 180×180 → `src/app/apple-icon.png` : écran d'accueil iOS, qui ne gère
 *     pas la transparence — d'où le fond perdu opaque.
 *
 * `density` : librsvg rasterise à 72 ppp par défaut, soit exactement les
 * 512 px déclarés par le SVG. On monte à 288 ppp pour rendre à 4× puis
 * réduire — les diagonales et les arrondis y gagnent nettement.
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";

const SVG = readFileSync(process.env.ICON_SVG ?? "/tmp/icon.svg");

const OUTPUTS = [
  { size: 512, path: "/app/apps/web/src/app/icon.png" },
  { size: 180, path: "/app/apps/web/src/app/apple-icon.png" },
];

for (const { size, path } of OUTPUTS) {
  const info = await sharp(SVG, { density: 288 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path);
  console.log(`${path} — ${info.width}×${info.height}, ${info.size} octets`);
}
