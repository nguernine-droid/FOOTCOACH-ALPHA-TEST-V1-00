import type { FastifyInstance } from "fastify";
import { count, eq } from "drizzle-orm";
import {
  coachIdParamSchema,
  type CategoryCoachDto,
  type CoachCardDto,
  type PlatformStatsDto,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { matchAnnouncements, tournaments, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { buildCoachCard, canSeeCoachCard } from "../lib/coachCard.js";
import { coachesOfTeams, teamsInMyCategory } from "../lib/categoryCoaches.js";

export function coachCardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  /**
   * Trois chiffres à l'échelle de l'application entière — combien de coachs
   * l'ont rejointe, combien de matchs et de tournois y ont été proposés. Sert
   * le bandeau du tableau de bord, à côté du bandeau « ma catégorie » qui lui
   * borne la portée au secteur.
   */
  app.get("/stats/platform", { preHandler: requireRole("coach") }, async (): Promise<PlatformStatsDto> => {
    const [[{ value: coachesCount }], [{ value: matchesCount }], [{ value: tournamentsCount }]] = await Promise.all([
      db.select({ value: count() }).from(users).where(eq(users.role, "coach")),
      db.select({ value: count() }).from(matchAnnouncements),
      db.select({ value: count() }).from(tournaments),
    ]);
    return { coachesCount, matchesCount, tournamentsCount };
  });

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
