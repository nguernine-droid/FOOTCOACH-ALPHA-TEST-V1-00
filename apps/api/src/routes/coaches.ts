import type { FastifyInstance } from "fastify";
import {
  coachIdParamSchema,
  type CategoryCoachDto,
  type CoachCardDto,
} from "@teamnexus/shared";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { buildCoachCard, canSeeCoachCard } from "../lib/coachCard.js";
import { coachesOfTeams, teamsInMyCategory } from "../lib/categoryCoaches.js";

export function coachCardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  /**
   * Les coachs qui encadrent une équipe de MON groupe d'âges dans MON
   * périmètre — la liste qu'ouvre le bandeau du tableau de bord.
   *
   * Leur identité y est visible sans qu'on se soit croisés : c'est un choix
   * assumé (voir `canSeeCoachCard`, qui a été élargi pour que leur carte
   * s'ouvre depuis cette liste). Le périmètre et la catégorie bornent la
   * portée : ce n'est pas un annuaire de toute l'application.
   */
  app.get("/coaches/my-category", { preHandler: requireRole("coach") }, async (request): Promise<CategoryCoachDto[]> => {
    const { teams: teamRows, origin } = await teamsInMyCategory(request.user.id, request.user.teamId);
    const coaches = await coachesOfTeams(teamRows, origin);
    // Moi-même n'ai rien à faire dans la liste des confrères du secteur.
    return coaches.filter((coach) => coach.id !== request.user.id);
  });

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
