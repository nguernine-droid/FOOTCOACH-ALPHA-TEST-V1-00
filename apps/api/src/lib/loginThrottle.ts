import crypto from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "../db/client.js";
import { loginAttempts } from "../db/schema.js";

/**
 * Frein partagé sur le devinage de mot de passe.
 *
 * Pourquoi en base et non en mémoire : `@fastify/rate-limit` compte dans la
 * mémoire de chaque processus. Le README encourage `--scale api=3`, et trois
 * réplicas donnent trois fois le plafond — un attaquant obtient 30 tentatives
 * par minute au lieu de 10, sans rien faire de particulier. Une trace en base
 * est vue de tous les réplicas.
 *
 * Pourquoi PAR COMPTE et non par adresse : sans `TRUST_PROXY` configuré,
 * l'adresse vue par l'API est celle du conteneur `web`. Un frein par adresse
 * verrouillerait donc TOUS les coachs dès qu'un seul attaquant s'acharne — le
 * remède serait pire que le mal. Le frein par compte n'a pas cet effet de bord,
 * et c'est de toute façon lui qui protège du devinage ciblé. La limitation par
 * adresse reste assurée en mémoire par @fastify/rate-limit.
 *
 * L'adresse est tout de même ENREGISTRÉE, sans servir de critère : la trace des
 * échecs de connexion n'existait pas — `login_events` ne garde que les
 * réussites — et c'est elle qui permet de constater une attaque après coup.
 */

/** Fenêtre glissante d'observation. */
export const WINDOW_MS = 15 * 60 * 1000;

/**
 * Échecs tolérés sur un même compte dans la fenêtre. Généreux à dessein : un
 * coach qui cherche lequel de ses mots de passe habituels il a utilisé doit
 * pouvoir se tromper plusieurs fois. Dix essais en quinze minutes n'arrivent
 * pas par accident, et rendent le devinage sans espoir.
 */
export const MAX_FAILURES_PER_ACCOUNT = 10;

/**
 * L'adresse email n'est pas stockée en clair : la table contiendrait sinon la
 * liste des adresses ESSAYÉES, y compris celles qui ne correspondent à aucun
 * compte — une donnée que l'application n'a aucune raison de conserver.
 * Le hachage suffit à compter par compte, qui est le seul usage.
 */
export function emailKey(email: string): string {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/** Décision pure, séparée de la lecture en base pour être exerçable seule. */
export function tooManyFailures(failures: number): boolean {
  return failures >= MAX_FAILURES_PER_ACCOUNT;
}

/** Échecs enregistrés sur ce compte dans la fenêtre glissante. */
export async function recentFailures(key: string, now = new Date()): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.emailKey, key),
        eq(loginAttempts.succeeded, false),
        gte(loginAttempts.createdAt, new Date(now.getTime() - WINDOW_MS)),
      ),
    );
  return Number(row?.value ?? 0);
}

/**
 * Consigne une tentative. Volontairement sans `await` du côté appelant sur le
 * chemin d'échec : une base lente ne doit pas allonger la réponse, ce qui
 * rendrait l'échec distinguable de la réussite par sa durée.
 */
export async function recordLoginAttempt(input: {
  key: string;
  ip: string | null;
  succeeded: boolean;
}): Promise<void> {
  await db.insert(loginAttempts).values({
    emailKey: input.key,
    ip: input.ip,
    succeeded: input.succeeded,
  });
}

/**
 * Purge des tentatives sorties de la fenêtre. Appelée après une connexion
 * réussie : la table n'a aucune raison de croître indéfiniment, et ce moment est
 * celui où personne n'attend le résultat.
 */
export async function pruneLoginAttempts(now = new Date()): Promise<void> {
  const { lt } = await import("drizzle-orm");
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(now.getTime() - WINDOW_MS)));
}
