import { and, eq, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { conversationReads, conversations, messages } from "../db/schema.js";

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

/**
 * Inscrit dans le fil un message **de l'application** : le match convenu, avec
 * de quoi le reconnaître. Sans expéditeur — personne ne l'a écrit.
 *
 * C'est ce qui répond à « qui est qui, et pour quel match ? » : deux coachs ont
 * parfois plusieurs rencontres ensemble, et plusieurs annonces peuvent être
 * acceptées le même jour. Le fil devient alors la chronologie de ce qu'ils ont
 * convenu, et non une liste de noms.
 *
 * Le fil remonte en tête de liste : une conversation qui s'ouvre sur un match
 * confirmé est ce qu'il y a de plus frais à lire.
 */
export async function postSystemMessage(
  executor: Executor,
  conversationId: string,
  body: string,
  matchId: string | null,
): Promise<void> {
  const [message] = await executor
    .insert(messages)
    .values({ conversationId, senderId: null, kind: "system", matchId, body })
    .returning({ createdAt: messages.createdAt });
  await executor
    .update(conversations)
    .set({ lastMessageAt: message.createdAt })
    .where(eq(conversations.id, conversationId));
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
 * Marque le fil comme lu jusqu'à maintenant. Posé à l'ouverture de l'écran, à
 * chaque envoi — écrire, c'est avoir lu ce qui précède — et pour le coach qui
 * vient d'accepter une proposition : le message qui annonce le match, c'est lui
 * qui l'a provoqué, il n'a pas à le retrouver en non-lu.
 */
export async function markRead(
  executor: Executor,
  conversationId: string,
  coachId: string,
): Promise<void> {
  await executor
    .insert(conversationReads)
    .values({ conversationId, coachId, lastReadAt: new Date() })
    .onConflictDoUpdate({
      target: [conversationReads.conversationId, conversationReads.coachId],
      set: { lastReadAt: new Date() },
    });
}
