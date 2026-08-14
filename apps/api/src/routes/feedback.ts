import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import {
  createFeedbackSchema,
  idParamSchema,
  replyFeedbackSchema,
  updateFeedbackStatusSchema,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPE_LABELS,
  type AdminFeedbackDto,
  type FeedbackDto,
  type FeedbackStatus,
  type FeedbackThreadMessageDto,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { coachFeedback, conversations, messages, users } from "../db/schema.js";
import { requireAuth, requireCoachCategory, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { markRead, openConversation, postSystemMessage } from "../lib/conversations.js";
import { notifyNewMessage } from "../lib/push.js";
import { avatarUrlOf } from "./auth.js";

/** Nom sous lequel l'équipe apparaît dans le fil, côté coach comme en notification */
export const TEAMNEXUS_TEAM_NAME = "Équipe TeamNexus";

function toDto(row: typeof coachFeedback.$inferSelect): FeedbackDto {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    status: row.status,
    adminNote: row.adminNote,
    createdAt: row.createdAt.toISOString(),
    handledAt: row.handledAt?.toISOString() ?? null,
    conversationId: row.conversationId,
  };
}

function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return typeof value === "string" && (FEEDBACK_STATUSES as readonly string[]).includes(value);
}

/**
 * Le compte admin qui porte les fils de signalement — le plus ancien en
 * activité.
 *
 * Un fil relie DEUX personnes : il faut donc désigner un interlocuteur, et non
 * « les admins » en général. Le plus ancien compte est le choix le plus stable
 * qu'on puisse faire sans réglage à tenir — il ne change pas quand un modérateur
 * est ajouté. N'importe quel admin répond ensuite dans ce fil depuis son inbox
 * (voir `POST /admin/feedback/:id/reply`) : c'est l'équipe qui répond, pas une
 * personne.
 */
async function teamnexusAdminId(): Promise<string | null> {
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), isNull(users.disabledAt)))
    .orderBy(asc(users.createdAt))
    .limit(1);
  return admin?.id ?? null;
}

/**
 * Le signalement, tel qu'il s'inscrit dans le fil. Un message de l'application
 * et non du coach : c'est le formulaire qui l'a mis en forme, et le type (bug ou
 * suggestion) en fait partie — l'admin doit le lire dans le fil comme dans son
 * inbox, sans avoir à recouper les deux.
 */
function feedbackSystemMessage(type: FeedbackDto["type"], message: string): string {
  return [`${FEEDBACK_TYPE_LABELS[type]} signalé`, message].join("\n\n");
}

export function feedbackRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  /**
   * Envoi d'un signalement — réservé aux coachs **contributeurs**.
   *
   * C'est ce que la casquette engage : faire remonter ce qui ne va pas et ce
   * qui pourrait être mieux, avec une ligne directe vers l'équipe. Un coach
   * ordinaire ou un joker n'a pas ce canal — non pour le faire taire, mais
   * parce qu'un retour utile demande de suivre ce qu'on a signalé, et que c'est
   * précisément ce à quoi le contributeur s'est engagé.
   *
   * L'envoi ouvre (ou retrouve) le fil avec l'équipe TeamNexus et y inscrit le
   * signalement : la réponse arrivera là, dans la messagerie du contributeur,
   * et non dans un écran « mes signalements » qu'il faudrait aller consulter.
   */
  app.post(
    "/feedback",
    { preHandler: [requireRole("coach"), requireCoachCategory("contributeur")] },
    async (request, reply): Promise<FeedbackDto> => {
      const input = createFeedbackSchema.parse(request.body);

      // Sans compte admin, le signalement est tout de même enregistré : il sera
      // lu à la première connexion d'un admin, fil ou pas.
      const adminId = await teamnexusAdminId();
      const conversationId = adminId
        ? await openConversation(db, request.user.id, adminId, null)
        : null;

      const [created] = await db
        .insert(coachFeedback)
        .values({
          authorId: request.user.id,
          type: input.type,
          message: input.message,
          conversationId,
        })
        .returning();

      if (conversationId) {
        await postSystemMessage(db, conversationId, feedbackSystemMessage(input.type, input.message), null);
        // Le contributeur vient d'écrire ce message : il ne doit pas le
        // retrouver en non-lu dans sa propre messagerie.
        await markRead(db, conversationId, request.user.id);
      }

      reply.code(201);
      return toDto(created);
    },
  );

  // Inbox admin : tout signalement de tout coach, filtrable par statut
  app.get("/admin/feedback", { preHandler: requireRole("admin") }, async (request): Promise<AdminFeedbackDto[]> => {
    const { status } = request.query as { status?: string };
    const rows = await db
      .select({ feedback: coachFeedback, author: users })
      .from(coachFeedback)
      .innerJoin(users, eq(coachFeedback.authorId, users.id))
      .where(isFeedbackStatus(status) ? eq(coachFeedback.status, status) : undefined)
      .orderBy(desc(coachFeedback.createdAt));
    return rows.map(({ feedback, author }) => ({
      ...toDto(feedback),
      author: {
        id: author.id,
        nickname: author.nickname,
        avatarUrl: avatarUrlOf(author.avatarPath),
      },
    }));
  });

  // Triage : changer le statut, avec une note facultative à usage interne (l'auteur ne la voit pas)
  app.patch("/admin/feedback/:id", { preHandler: requireRole("admin") }, async (request): Promise<FeedbackDto> => {
    const { id } = idParamSchema.parse(request.params);
    const input = updateFeedbackStatusSchema.parse(request.body);
    const [existing] = await db.select().from(coachFeedback).where(eq(coachFeedback.id, id));
    if (!existing) throw new HttpError(404, "Signalement introuvable");
    const [updated] = await db
      .update(coachFeedback)
      .set({
        status: input.status,
        adminNote: input.adminNote ?? existing.adminNote,
        // Posé au premier passage hors "nouveau" ; les changements suivants ne le déplacent pas
        handledAt: existing.handledAt ?? (input.status === "nouveau" ? null : new Date()),
      })
      .where(eq(coachFeedback.id, id))
      .returning();
    return toDto(updated);
  });

  /**
   * Le fil du signalement, vu de l'inbox admin : le signalement lui-même, les
   * réponses de l'équipe et ce que le contributeur a écrit depuis.
   *
   * L'admin n'a pas accès à la messagerie (elle est entre coachs) : c'est cette
   * route qui lui en donne la seule fenêtre utile, celle du fil qu'il a ouvert
   * en recevant le signalement.
   */
  app.get(
    "/admin/feedback/:id/thread",
    { preHandler: requireRole("admin") },
    async (request): Promise<FeedbackThreadMessageDto[]> => {
      const { id } = idParamSchema.parse(request.params);
      const [existing] = await db.select().from(coachFeedback).where(eq(coachFeedback.id, id));
      if (!existing) throw new HttpError(404, "Signalement introuvable");
      if (!existing.conversationId) return [];
      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, existing.conversationId))
        .orderBy(asc(messages.createdAt));
      return rows.map((m) => ({
        id: m.id,
        body: m.body,
        kind: m.kind,
        // Ce que l'auteur n'a pas écrit vient de l'équipe. Le signalement, lui,
        // est un message `system` : il n'est ni de l'un ni de l'autre.
        fromAdmin: m.kind === "coach" && m.senderId !== existing.authorId,
        createdAt: m.createdAt.toISOString(),
      }));
    },
  );

  /**
   * Réponse de l'équipe dans le fil du signalement.
   *
   * Le message est signé par l'admin qui l'écrit — pas par le compte qui porte
   * le fil : c'est celui qui répond qui l'a rédigé, et une signature de
   * complaisance rendrait l'historique faux. Côté contributeur, tout ce qui ne
   * vient pas de lui s'affiche de toute façon sous le nom de l'équipe.
   */
  app.post(
    "/admin/feedback/:id/reply",
    { preHandler: requireRole("admin") },
    async (request, reply): Promise<FeedbackThreadMessageDto> => {
      const { id } = idParamSchema.parse(request.params);
      const { body } = replyFeedbackSchema.parse(request.body);
      const [existing] = await db.select().from(coachFeedback).where(eq(coachFeedback.id, id));
      if (!existing) throw new HttpError(404, "Signalement introuvable");
      if (!existing.conversationId) {
        throw new HttpError(400, "Ce signalement n'a pas de fil — il a été envoyé avant la messagerie avec l'équipe");
      }

      const conversationId = existing.conversationId;
      const created = await db.transaction(async (tx) => {
        const [message] = await tx
          .insert(messages)
          .values({ conversationId, senderId: request.user.id, body })
          .returning();
        await tx
          .update(conversations)
          .set({ lastMessageAt: message.createdAt })
          .where(eq(conversations.id, conversationId));
        return message;
      });

      notifyNewMessage({
        recipientCoachId: existing.authorId,
        senderName: TEAMNEXUS_TEAM_NAME,
        preview: body,
        conversationId,
      });

      reply.code(201);
      return {
        id: created.id,
        body: created.body,
        kind: "coach",
        fromAdmin: true,
        createdAt: created.createdAt.toISOString(),
      };
    },
  );
}
