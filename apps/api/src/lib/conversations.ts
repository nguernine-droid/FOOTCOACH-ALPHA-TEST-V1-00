import { and, eq, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { conversationReads, conversations } from "../db/schema.js";

/**
 * Une transaction ou la base elle-même : `openConversation` est appelée depuis
 * l'acceptation d'une annonce, à l'intérieur de sa transaction, pour que le
 * match et le fil naissent ensemble ou pas du tout.
 */
type Executor = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

/**
 * La paire, toujours dans le même ordre. C'est ce qui permet à l'index unique
 * de suffire : sans cet ordre, (A,B) et (B,A) créeraient deux fils pour les
 * mêmes deux coachs. La contrainte `conversations_paire_ordonnee` en base dit
 * la même chose, pour que rien ne puisse la contourner.
 */
export function orderedPair(coachId: string, otherCoachId: string): [string, string] {
  return coachId < otherCoachId ? [coachId, otherCoachId] : [otherCoachId, coachId];
}

/**
 * Ouvre le fil entre deux coachs, ou retrouve celui qui existe déjà.
 *
 * Rejouable : deux coachs qui se rencontrent une seconde fois gardent leur
 * conversation et son historique — c'est le principe même d'une messagerie.
 * `matchId` n'est donc posé qu'à la création, il désigne la rencontre qui a
 * ouvert le fil et non la dernière en date.
 */
export async function openConversation(
  executor: Executor,
  coachId: string,
  otherCoachId: string,
  matchId: string | null,
): Promise<string | null> {
  // Un coach qui encadre les deux équipes ne se parle pas à lui-même. Le cas est
  // déjà refusé plus haut (deux équipes partageant un encadrant ne peuvent pas
  // se rencontrer) ; ici on se contente de ne rien faire.
  if (coachId === otherCoachId) return null;
  const [coachAId, coachBId] = orderedPair(coachId, otherCoachId);

  const [created] = await executor
    .insert(conversations)
    .values({ coachAId, coachBId, matchId })
    .onConflictDoNothing()
    .returning({ id: conversations.id });
  if (created) return created.id;

  const [existing] = await executor
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.coachAId, coachAId), eq(conversations.coachBId, coachBId)));
  return existing?.id ?? null;
}

/** La conversation, si ce coach en est bien l'un des deux membres. */
export async function conversationForMember(conversationId: string, coachId: string) {
  const [row] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        or(eq(conversations.coachAId, coachId), eq(conversations.coachBId, coachId)),
      ),
    );
  return row ?? null;
}

/**
 * Marque le fil comme lu jusqu'à maintenant. Posé à l'ouverture de l'écran et à
 * chaque envoi — écrire, c'est avoir lu ce qui précède.
 */
export async function markRead(conversationId: string, coachId: string): Promise<void> {
  await db
    .insert(conversationReads)
    .values({ conversationId, coachId, lastReadAt: new Date() })
    .onConflictDoUpdate({
      target: [conversationReads.conversationId, conversationReads.coachId],
      set: { lastReadAt: new Date() },
    });
}
