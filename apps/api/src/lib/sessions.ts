import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { refreshTokens } from "../db/schema.js";

/**
 * Révoque tous les jetons de rafraîchissement d'un compte.
 *
 * À appeler dès qu'une décision retire des droits : sans cela la session
 * resterait valable jusqu'à sept jours, puisque le jeton de rafraîchissement
 * ré-émet un jeton d'accès sans repasser par le mot de passe.
 *
 * ⚠️ Ce que cela ne fait PAS : invalider le jeton d'ACCÈS en cours, qui reste
 * valable jusqu'à quinze minutes. L'application l'assume déjà pour la
 * désactivation de compte (voir README, « limites connues »). Le rendre
 * immédiat demanderait de vérifier une liste de révocation à chaque requête —
 * c'est-à-dire de renoncer au caractère sans état des jetons.
 *
 * Réunie ici parce que deux chemins en ont besoin et qu'un troisième l'oubliait :
 * la fonction vivait en privé dans routes/admin.ts.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}
