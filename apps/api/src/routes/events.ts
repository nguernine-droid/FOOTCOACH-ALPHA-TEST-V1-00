import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { createEventSchema, idParamSchema, type AgendaItemDto } from "@teamnexus/shared";
import { db } from "../db/client.js";
import { teamEvents } from "../db/schema.js";
import { addDays, collectAgendaItems, daysBetween, todayStr } from "../lib/agenda.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";

// Fenêtre maximale demandable (borne la génération d'occurrences)
const MAX_WINDOW_DAYS = 185;

async function getEventOr404(id: string) {
  const [event] = await db.select().from(teamEvents).where(eq(teamEvents.id, id));
  if (!event) throw new HttpError(404, "Événement introuvable");
  return event;
}

export function eventRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Agenda fusionné de l'équipe : événements (occurrences générées) + matchs projetés
  app.get("/events", { preHandler: requireRole("coach") }, async (request): Promise<AgendaItemDto[]> => {
    const teamId = request.user.teamId;
    if (!teamId) throw new HttpError(400, "Aucune équipe associée");
    const query = request.query as { from?: string; to?: string };
    const from = query.from && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? query.from : addDays(todayStr(), -7);
    const to = query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? query.to : addDays(todayStr(), 60);
    if (from > to || daysBetween(from, to) > MAX_WINDOW_DAYS) {
      throw new HttpError(400, "Fenêtre de dates invalide");
    }
    return collectAgendaItems(teamId, from, to);
  });

  app.post("/events", { preHandler: requireRole("coach") }, async (request, reply) => {
    if (!request.user.teamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    const input = createEventSchema.parse(request.body);
    const [created] = await db
      .insert(teamEvents)
      .values({
        teamId: request.user.teamId,
        type: input.type,
        title: input.title,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime ?? null,
        location: input.location ?? null,
        description: input.description ?? null,
        recurrence: input.recurrence,
        recurrenceUntil: input.recurrence === "weekly" ? (input.recurrenceUntil ?? null) : null,
        createdBy: request.user.id,
      })
      .returning();
    reply.code(201);
    return { id: created.id };
  });

  app.put("/events/:id", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const event = await getEventOr404(id);
    if (event.teamId !== request.user.teamId) throw new HttpError(403, "Cet événement ne vous appartient pas");
    const input = createEventSchema.parse(request.body);
    await db
      .update(teamEvents)
      .set({
        type: input.type,
        title: input.title,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime ?? null,
        location: input.location ?? null,
        description: input.description ?? null,
        recurrence: input.recurrence,
        recurrenceUntil: input.recurrence === "weekly" ? (input.recurrenceUntil ?? null) : null,
      })
      .where(eq(teamEvents.id, id));
    return { ok: true };
  });

  app.delete("/events/:id", { preHandler: requireRole("coach") }, async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const event = await getEventOr404(id);
    if (event.teamId !== request.user.teamId) throw new HttpError(403, "Cet événement ne vous appartient pas");
    await db.delete(teamEvents).where(eq(teamEvents.id, id));
    return { ok: true };
  });

}
