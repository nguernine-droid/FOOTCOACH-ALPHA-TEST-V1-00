import type { FastifyInstance } from "fastify";
import { coachIdParamSchema, type CoachCardDto } from "@teamnexus/shared";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { buildCoachCard, canSeeCoachCard } from "../lib/coachCard.js";

export function coachCardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  /**
   * La carte d'un coach, vue par un autre.
   *
   * Un 404 et non un 403 quand le droit manque : répondre « interdit »
   * confirmerait que ce compte existe, et permettrait de sonder l'application
   * identifiant par identifiant pour dresser la liste de ses coachs. Une carte
   * qu'on n'a pas le droit de voir est une carte qui n'existe pas.
   */
  app.get("/coaches/:coachId/card", { preHandler: requireRole("coach") }, async (request): Promise<CoachCardDto> => {
    const { coachId } = coachIdParamSchema.parse(request.params);
    if (!(await canSeeCoachCard(request.user.id, coachId))) {
      throw new HttpError(404, "Carte introuvable");
    }
    const card = await buildCoachCard(coachId);
    if (!card) throw new HttpError(404, "Carte introuvable");
    return card;
  });
}
