import path from "node:path";

/**
 * Dossier des fichiers envoyés (photos de profil). Monté sur un volume Docker
 * pour survivre aux reconstructions d'image — à sauvegarder au même titre
 * que la base.
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.resolve("/app/uploads");
