import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import type { ActivityDto } from "@footcoach/shared";
import { db } from "../db/client.js";
import { announcementResponses, matchAnnouncements, matches, teams } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";

const FEED_LIMIT = 15;

const dayMonth = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

// Fil d'activité du coach, dérivé des tables existantes (aucune table dédiée) :
// propositions reçues, matchs confirmés, scores saisis et validés.
export function activityRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("coach"));

  app.get("/activity", async (request): Promise<ActivityDto[]> => {
    const teamId = request.user.teamId;
    if (!teamId) throw new HttpError(400, "Aucune équipe associée");

    const events: ActivityDto[] = [];

    // 1. Propositions reçues sur mes annonces (en attente de ma validation)
    const proposals = await db
      .select({ response: announcementResponses, proposer: teams, announcement: matchAnnouncements })
      .from(announcementResponses)
      .innerJoin(matchAnnouncements, eq(announcementResponses.announcementId, matchAnnouncements.id))
      .innerJoin(teams, eq(announcementResponses.teamId, teams.id))
      .where(and(eq(matchAnnouncements.teamId, teamId), eq(announcementResponses.status, "pending")))
      .orderBy(desc(announcementResponses.createdAt))
      .limit(FEED_LIMIT);
    for (const { response, proposer, announcement } of proposals) {
      events.push({
        id: `resp-${response.id}`,
        type: "announcement",
        actor: proposer.name,
        detail: `propose de jouer votre annonce ${announcement.category} du ${dayMonth(announcement.date)} — à valider`,
        createdAt: response.createdAt.toISOString(),
      });
    }

    // 2. Matchs confirmés à partir de mes annonces
    const answered = await db
      .select({ match: matches, opponent: teams, announcement: matchAnnouncements })
      .from(matches)
      .innerJoin(matchAnnouncements, eq(matches.announcementId, matchAnnouncements.id))
      .innerJoin(teams, eq(matches.awayTeamId, teams.id))
      .where(eq(matchAnnouncements.teamId, teamId))
      .orderBy(desc(matches.createdAt))
      .limit(FEED_LIMIT);
    for (const { match, opponent, announcement } of answered) {
      events.push({
        id: `ann-${match.id}`,
        type: "announcement",
        actor: opponent.name,
        detail: `jouera votre annonce ${announcement.category} du ${dayMonth(match.date)} — match confirmé`,
        createdAt: match.createdAt.toISOString(),
      });
    }

    // 3. Scores saisis sur mes matchs : validés, ou en attente d'une des deux parties
    const scored = await db
      .select()
      .from(matches)
      .where(
        and(
          or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)),
          isNotNull(matches.scoreSubmittedAt),
        ),
      )
      .orderBy(desc(matches.scoreSubmittedAt))
      .limit(FEED_LIMIT);
    const opponentIds = scored.map((m) => (m.homeTeamId === teamId ? m.awayTeamId : m.homeTeamId));
    const opponentRows = opponentIds.length
      ? await db.select().from(teams).where(inArray(teams.id, opponentIds))
      : [];
    const opponentName = new Map(opponentRows.map((t) => [t.id, t.name]));

    for (const match of scored) {
      const opponent = opponentName.get(match.homeTeamId === teamId ? match.awayTeamId : match.homeTeamId) ?? "l'adversaire";
      const score = `${match.homeScore} – ${match.awayScore}`;
      const iSubmitted = match.scoreSubmittedByTeamId === teamId;
      events.push({
        id: `score-${match.id}`,
        type: "score",
        actor: iSubmitted ? "Vous" : opponent,
        detail:
          match.status === "finished"
            ? `score validé face à ${opponent} : ${score}`
            : iSubmitted
              ? `avez saisi ${score} face à ${opponent} — en attente de validation`
              : `a saisi ${score} — scannez son QR code pour valider`,
        createdAt: (match.scoreConfirmedAt ?? match.scoreSubmittedAt!).toISOString(),
      });
    }

    return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, FEED_LIMIT);
  });
}
