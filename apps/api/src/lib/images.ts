/**
 * Reconnaissance du type réel d'une image, par sa signature.
 *
 * `file.mimetype` du multipart est le `Content-Type` que l'appelant a écrit
 * lui-même : il annonce un type, il ne le prouve pas. En s'y fiant seul, on
 * acceptait n'importe quels octets — exécutable, archive, page HTML — pourvu
 * qu'ils soient déclarés `image/png`, et on les servait ensuite publiquement
 * sous /api/uploads/<nom>.png.
 *
 * Rien n'y était exécutable côté navigateur : le type servi vient de
 * l'extension, `nosniff` interdit de deviner autrement, et la CSP de l'API
 * n'autorise rien. Mais l'application hébergeait et diffusait du contenu
 * arbitraire depuis son propre domaine, et soumettait les décodeurs d'image des
 * autres coachs à des fichiers qui n'en étaient pas.
 *
 * Aucune dépendance : trois signatures suffisent aux trois formats acceptés.
 */

export const IMAGE_EXTENSIONS = ["jpg", "png", "webp"] as const;
export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];

/** Taille maximale d'une photo de profil. Source unique — la limite était
 *  déclarée deux fois, dans index.ts et dans la route, libres de diverger. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Types déclarés acceptés, et l'extension qu'ils devraient porter. */
export const ALLOWED_IMAGE_TYPES: Record<string, ImageExtension> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Type réellement contenu dans ces octets, ou `null` si ce n'est aucun des
 * trois formats acceptés.
 */
export function sniffImageType(buffer: Buffer): ImageExtension | null {
  // JPEG : SOI (FF D8) suivi d'un marqueur (FF). Les variantes JFIF, Exif et
  // les fichiers d'appareil photo partagent toutes ce début.
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return "png";
  }
  // WebP est un conteneur RIFF : « RIFF » puis la taille, puis « WEBP ».
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}
