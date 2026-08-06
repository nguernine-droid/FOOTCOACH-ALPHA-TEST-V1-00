import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { HttpError } from "../plugins/errors.js";
import { ALLOWED_IMAGE_TYPES, sniffImageType, type ImageExtension } from "./images.js";
import { UPLOADS_DIR } from "./uploads.js";

/** Ce que l'API accepte d'un multipart : l'essentiel de l'interface de fastify-multipart */
interface UploadedFile {
  mimetype: string;
  file: { truncated: boolean };
  toBuffer: () => Promise<Buffer>;
}

/**
 * Contrôle en deux temps d'une image reçue, puis écriture dans le volume.
 *
 * Écrit une fois ici plutôt qu'à chaque route qui accepte une image : les
 * photos de profil et les affiches de tournoi doivent subir exactement le même
 * examen, et une seconde copie de ces trente lignes aurait vieilli à part.
 *
 * Premier filtre sur le type ANNONCÉ, pour ne pas lire deux mégaoctets d'un
 * envoi qui ne pouvait de toute façon pas convenir. Second sur le CONTENU : le
 * `Content-Type` du multipart est écrit par l'appelant, il annonce un type sans
 * le prouver. Sans cette vérification, n'importe quels octets déclarés
 * `image/png` étaient stockés puis servis publiquement sous /api/uploads/.
 *
 * @param prefix préfixe du nom de fichier, pour retrouver l'origine d'un envoi
 * @returns le nom du fichier écrit, à conserver en base
 */
export async function storeUploadedImage(
  file: UploadedFile | undefined,
  prefix: string,
  maxBytesLabel: string,
): Promise<string> {
  if (!file) throw new HttpError(400, "Aucun fichier reçu");

  const declared: ImageExtension | undefined = ALLOWED_IMAGE_TYPES[file.mimetype];
  if (!declared) throw new HttpError(400, "Format accepté : JPEG, PNG ou WebP");

  let buffer: Buffer;
  try {
    buffer = await file.toBuffer();
  } catch {
    throw new HttpError(413, `Image trop lourde (${maxBytesLabel} maximum)`);
  }
  if (file.file.truncated) throw new HttpError(413, `Image trop lourde (${maxBytesLabel} maximum)`);

  // L'extension retenue vient du contenu, jamais de la déclaration : c'est elle
  // qui décidera du `Content-Type` servi par fastify-static.
  const extension = sniffImageType(buffer);
  if (!extension) throw new HttpError(400, "Ce fichier n'est pas une image JPEG, PNG ou WebP");
  if (extension !== declared) {
    throw new HttpError(
      400,
      `Le fichier annonce ${file.mimetype} mais son contenu est du ${extension.toUpperCase()} — envoyez-le à nouveau`,
    );
  }

  // Nom unique à chaque envoi : les caches navigateur ne servent pas l'ancienne image
  const fileName = `${prefix}-${randomUUID().slice(0, 8)}.${extension}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, fileName), buffer);
  return fileName;
}

/**
 * Efface un fichier remplacé. Un échec n'est jamais fatal : le fichier neuf est
 * déjà écrit et référencé, un ancien qui traîne coûte quelques kilo-octets — pas
 * de quoi faire échouer la requête du coach.
 */
export async function removeUploadedImage(fileName: string | null): Promise<void> {
  if (!fileName) return;
  await unlink(path.join(UPLOADS_DIR, fileName)).catch(() => undefined);
}
