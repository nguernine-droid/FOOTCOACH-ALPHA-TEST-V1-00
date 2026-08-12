import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import {
  createFeedbackSchema,
  idParamSchema,
  updateFeedbackStatusSchema,
  FEEDBACK_STATUSES,
  type AdminFeedbackDto,
  type FeedbackDto,
  type FeedbackStatus,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { coachFeedback, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { avatarUrlOf } from "./auth.js";

function toDto(row: typeof coachFeedback.$inferSelect): FeedbackDto {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    status: row.status,
    adminNote: row.adminNote,
    createdAt: row.createdAt.toISOString(),
    handledAt: row.handledAt?.toISOString() ?? null,
  };
}

function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return typeof value === "string" && (FEEDBACK_STATUSES as readonly string[]).includes(value);
}

export function feedbackRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Envoi seulement : un coach n'a pas de vue sur ses signalements passés, ni
  // sur leur statut — c'est un canal vers l'admin, pas un historique personnel.
  app.post("/feedback", { preHandler: requireRole("coach") }, async (request, reply): Promise<FeedbackDto> => {
    const input = createFeedbackSchema.parse(request.body);
    const [created] = await db
      .insert(coachFeedback)
      .values({ authorId: request.user.id, type: input.type, message: input.message })
      .returning();
    reply.code(201);
    return toDto(created);
  });

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
}
