import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Dossier des fichiers envoyés (photos de profil). Monté sur un volume Docker
 * pour survivre aux reconstructions d'image — à sauvegarder au même titre
 * que la base.
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.resolve("/app/uploads");

/**
 * S'assure que le dossier des envois existe ET qu'on peut y écrire, au
 * démarrage plutôt qu'au premier avatar.
 *
 * L'image de production tourne sous un utilisateur non privilégié dans un
 * `/app` qui appartient à root : un dossier absent ou mal attribué donne un
 * EACCES. Auparavant l'échec remontait en rejet non rattrapé depuis le corps du
 * module — le conteneur s'arrêtait sur une trace d'exécution, sans dire quoi
 * réparer. Le Dockerfile crée désormais le dossier et le donne à l'utilisateur ;
 * cette vérification est le filet, avec un message qui nomme la cause.
 *
 * L'écriture est réellement testée : un dossier qui existe n'est pas
 * nécessairement un dossier dans lequel ce processus peut écrire.
 */
export async function ensureUploadsDir(dir = UPLOADS_DIR): Promise<void> {
  const probe = path.join(dir, ".ecriture-verifiee");
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(probe, "");
    await unlink(probe);
  } catch (cause) {
    const code = (cause as { code?: string }).code;
    throw new Error(
      `Dossier des photos de profil inutilisable : ${dir} (${code ?? "erreur inconnue"}). ` +
        "Le conteneur doit pouvoir y écrire — vérifier que le volume `uploads` est bien monté " +
        "et qu'il appartient à l'utilisateur du conteneur (voir apps/api/Dockerfile).",
      { cause },
    );
  }
}
