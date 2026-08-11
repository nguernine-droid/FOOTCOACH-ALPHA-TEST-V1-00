import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import {
  idParamSchema,
  sendMessageSchema,
  type ConversationDto,
  type ConversationThreadDto,
  type MessageDto,
} from "@footcoach/shared";
import { db } from "../db/client.js";
import { conversationReads, conversations, messages, teamCoaches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { conversationForMember, markRead } from "../lib/conversations.js";
import { notifyNewMessage } from "../lib/push.js";
import { avatarUrlOf } from "./auth.js";

type ConversationRow = typeof conversations.$inferSelect;

/**
 * Ce qui peut m'être compté comme non lu : ce que l'autre a écrit, et ce que
 * l'application a inscrit (un match convenu n'a pas d'expéditeur, mais il faut
 * bien qu'il s'annonce). Mes propres messages ne le sont jamais.
 */
const notFromMe = (me: string) => or(isNull(messages.senderId), ne(messages.senderId, me));

/**
 * Les fils demandés, vus par ce coach : son interlocuteur, le dernier message
 * échangé, et ce qu'il n'a pas encore lu.
 *
 * Tout se fait en trois requêtes quel que soit le nombre de fils — une liste de
 * conversations est un écran qu'on ouvre souvent, et une requête par ligne y
 * serait une requête par confrère.
 */
async function toDtos(rows: ConversationRow[], me: string): Promise<ConversationDto[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const otherIdOf = (r: ConversationRow) => (r.coachAId === me ? r.coachBId : r.coachAId);
  const otherIds = [...new Set(rows.map(otherIdOf))];

  const [coachRows, teamRows, lastMessages, unreadCounts] = await Promise.all([
    db
      .select({
        id: users.id,
        nickname: users.nickname,
        avatarPath: users.avatarPath,
      })
      .from(users)
      .where(inArray(users.id, otherIds)),

    // L'équipe qui situe le confrère : celle qu'il encadre en principal, à
    // défaut la plus ancienne — la même règle que partout ailleurs.
    db
      .select({ coachId: teamCoaches.coachId, name: teams.name })
      .from(teamCoaches)
      .innerJoin(teams, eq(teams.id, teamCoaches.teamId))
      .where(inArray(teamCoaches.coachId, otherIds))
      .orderBy(asc(teamCoaches.role), asc(teamCoaches.createdAt)),

    db
      .selectDistinctOn([messages.conversationId], {
        conversationId: messages.conversationId,
        body: messages.body,
        kind: messages.kind,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, ids))
      .orderBy(messages.conversationId, desc(messages.createdAt)),

    // Non-lus : les messages de l'AUTRE postérieurs à ma dernière lecture. Pas
    // de marqueur de lecture = fil jamais ouvert, donc tout est non lu.
    db
      .select({ conversationId: messages.conversationId, count: sql<number>`count(*)::int` })
      .from(messages)
      .leftJoin(
        conversationReads,
        and(eq(conversationReads.conversationId, messages.conversationId), eq(conversationReads.coachId, me)),
      )
      .where(
        and(
          inArray(messages.conversationId, ids),
          notFromMe(me),
          or(isNull(conversationReads.lastReadAt), gt(messages.createdAt, conversationReads.lastReadAt)),
        ),
      )
      .groupBy(messages.conversationId),
  ]);

  const coachById = new Map(coachRows.map((c) => [c.id, c]));
  const teamByCoach = new Map<string, string>();
  for (const row of teamRows) if (!teamByCoach.has(row.coachId)) teamByCoach.set(row.coachId, row.name);
  const lastByConversation = new Map(lastMessages.map((m) => [m.conversationId, m]));
  const unreadByConversation = new Map(unreadCounts.map((u) => [u.conversationId, u.count]));

  return rows.flatMap((row) => {
    const other = coachById.get(otherIdOf(row));
    // Compte supprimé entre-temps : le fil n'a plus d'interlocuteur, il ne sert
    // à rien de l'afficher (la cascade l'aura de toute façon emporté).
    if (!other) return [];
    const last = lastByConversation.get(row.id);
    return [
      {
        id: row.id,
        coach: {
          id: other.id,
          nickname: other.nickname,
          avatarUrl: avatarUrlOf(other.avatarPath),
        },
        teamName: teamByCoach.get(other.id) ?? null,
        lastMessage: last
          ? {
              body: last.body,
              createdAt: last.createdAt.toISOString(),
              mine: last.kind === "coach" && last.senderId === me,
              kind: last.kind,
            }
          : null,
        unread: unreadByConversation.get(row.id) ?? 0,
        updatedAt: row.lastMessageAt.toISOString(),
      },
    ];
  });
}

/**
 * Messagerie entre coachs.
 *
 * Une conversation ne se crée pas à la demande : elle naît d'un match convenu
 * (voir `openConversation`, appelée à l'acceptation d'une annonce). On n'écrit
 * donc qu'aux confrères avec qui on a quelque chose à organiser, et le carnet
 * d'adresses ne devient jamais une porte ouverte pour démarcher tout le monde.
 */
export function messageRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("coach"));

  app.get("/conversations", async (request): Promise<ConversationDto[]> => {
    const me = request.user.id;
    const rows = await db
      .select()
      .from(conversations)
      .where(or(eq(conversations.coachAId, me), eq(conversations.coachBId, me)))
      .orderBy(desc(conversations.lastMessageAt));
    return toDtos(rows, me);
  });

  /**
   * Le compteur de la pastille d'onglet, et lui seul : servi à part pour que la
   * barre de navigation n'ait pas à charger toutes les conversations pour
   * savoir s'il faut allumer un point rouge.
   */
  app.get("/conversations/unread", async (request): Promise<{ count: number }> => {
    const me = request.user.id;
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .leftJoin(
        conversationReads,
        and(eq(conversationReads.conversationId, conversations.id), eq(conversationReads.coachId, me)),
      )
      .where(
        and(
          or(eq(conversations.coachAId, me), eq(conversations.coachBId, me)),
          notFromMe(me),
          or(isNull(conversationReads.lastReadAt), gt(messages.createdAt, conversationReads.lastReadAt)),
        ),
      );
    return { count: row?.count ?? 0 };
  });

  /**
   * Un fil et tous ses messages. Pas de pagination : une conversation entre
   * deux coachs qui montent un amical tient en quelques dizaines de lignes.
   *
   * 404 et non 403 quand le fil n'est pas le sien : l'API ne dit pas à un
   * inconnu qu'une conversation existe entre deux autres coachs.
   */
  app.get("/conversations/:id", async (request): Promise<ConversationThreadDto> => {
    const { id } = idParamSchema.parse(request.params);
    const me = request.user.id;
    const row = await conversationForMember(id, me);
    if (!row) throw new HttpError(404, "Conversation introuvable");

    const [[conversation], rows] = await Promise.all([
      toDtos([row], me),
      db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(asc(messages.createdAt)),
    ]);
    if (!conversation) throw new HttpError(404, "Conversation introuvable");

    return {
      conversation,
      messages: rows.map(
        (m): MessageDto => ({
          id: m.id,
          kind: m.kind,
          body: m.body,
          // Un message de l'application n'est à personne : il ne prend donc le
          // côté d'aucun des deux coachs.
          mine: m.kind === "coach" && m.senderId === me,
          matchId: m.matchId,
          createdAt: m.createdAt.toISOString(),
        }),
      ),
    };
  });

  /** Ouvrir le fil vaut lecture — appelé par le client à l'affichage. */
  app.post("/conversations/:id/read", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const row = await conversationForMember(id, request.user.id);
    if (!row) throw new HttpError(404, "Conversation introuvable");
    await markRead(db, id, request.user.id);
    return { ok: true };
  });

  app.post("/conversations/:id/messages", async (request, reply): Promise<MessageDto> => {
    const { id } = idParamSchema.parse(request.params);
    const { body } = sendMessageSchema.parse(request.body);
    const me = request.user.id;
    const row = await conversationForMember(id, me);
    if (!row) throw new HttpError(404, "Conversation introuvable");

    const created = await db.transaction(async (tx) => {
      const [message] = await tx.insert(messages).values({ conversationId: id, senderId: me, body }).returning();
      // Le fil remonte en tête de liste chez les deux coachs
      await tx
        .update(conversations)
        .set({ lastMessageAt: message.createdAt })
        .where(eq(conversations.id, id));
      return message;
    });

    // Écrire, c'est avoir lu : sans ça, mes propres envois laisseraient le fil
    // marqué comme non ouvert jusqu'à ma prochaine visite.
    await markRead(db, id, me);

    const recipientId = row.coachAId === me ? row.coachBId : row.coachAId;
    const [sender] = await db
      .select({ nickname: users.nickname })
      .from(users)
      .where(eq(users.id, me));
    notifyNewMessage({
      recipientCoachId: recipientId,
      senderName: sender.nickname,
      preview: body,
      conversationId: id,
    });

    reply.code(201);
    return {
      id: created.id,
      kind: "coach",
      body: created.body,
      mine: true,
      matchId: null,
      createdAt: created.createdAt.toISOString(),
    };
  });
}
