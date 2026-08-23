import type { FastifyInstance } from "fastify";
import { and, desc, eq, inArray, isNotNull, ne, or } from "drizzle-orm";
import { WITHDRAWAL_REASON_LABELS, type ActivityDto } from "@teamnexus/shared";
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
        // Le match demande DEUX validations : dire laquelle manque évite de
        // croire qu'on attend l'autre quand c'est soi qu'on attend.
        detail: response.ownerConfirmedAt
          ? `propose de jouer votre annonce ${announcement.category} du ${dayMonth(announcement.date)} — vous avez validé, en attente de ce coach`
          : `propose de jouer votre annonce ${announcement.category} du ${dayMonth(announcement.date)} — à valider`,
        // Mène au fil ouvert avec ce coach : c'est là qu'on en discute et qu'on
        // valide, chacun de son côté. À défaut — compte disparu depuis — la
        // liste de mes annonces.
        href: response.conversationId
          ? `/coach/messages/${response.conversationId}`
          : "/coach/announcements/mine",
        createdAt: response.createdAt.toISOString(),
      });
    }

    // 2. Matchs confirmés à partir de mes annonces (les annulés sont repris plus bas)
    const answered = await db
      .select({ match: matches, opponent: teams, announcement: matchAnnouncements })
      .from(matches)
      .innerJoin(matchAnnouncements, eq(matches.announcementId, matchAnnouncements.id))
      .innerJoin(teams, eq(matches.awayTeamId, teams.id))
      .where(and(eq(matchAnnouncements.teamId, teamId), ne(matches.status, "cancelled")))
      .orderBy(desc(matches.createdAt))
      .limit(FEED_LIMIT);
    for (const { match, opponent, announcement } of answered) {
      events.push({
        id: `ann-${match.id}`,
        type: "announcement",
        actor: opponent.name,
        detail: `jouera votre annonce ${announcement.category} du ${dayMonth(match.date)} — match confirmé`,
        href: `/coach/matches/${match.id}`,
        createdAt: match.createdAt.toISOString(),
      });
    }

    // 3. Désistements sur mes matchs, dans un sens comme dans l'autre
    const cancelled = await db
      .select({ match: matches, announcement: matchAnnouncements })
      .from(matches)
      .innerJoin(matchAnnouncements, eq(matches.announcementId, matchAnnouncements.id))
      .where(
        and(
          or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)),
          eq(matches.status, "cancelled"),
        ),
      )
      .orderBy(desc(matches.cancelledAt))
      .limit(FEED_LIMIT);
    const withdrawnTeamIds = cancelled.map((c) => c.match.withdrawnByTeamId).filter((v): v is string => v !== null);
    const withdrawnNames = withdrawnTeamIds.length
      ? new Map(
          (await db.select().from(teams).where(inArray(teams.id, withdrawnTeamIds))).map((t) => [t.id, t.name]),
        )
      : new Map<string, string>();

    for (const { match, announcement } of cancelled) {
      const iWithdrew = match.withdrawnByTeamId === teamId;
      const motif = match.withdrawalReason ? WITHDRAWAL_REASON_LABELS[match.withdrawalReason].toLowerCase() : null;
      // L'annonce repart en SOS quand c'est l'équipe visiteuse qui a renoncé
      const reopened = match.withdrawnByTeamId === match.awayTeamId && announcement.isSos;
      events.push({
        id: `cancel-${match.id}`,
        type: "announcement",
        actor: iWithdrew ? "Vous" : (withdrawnNames.get(match.withdrawnByTeamId ?? "") ?? "L'adversaire"),
        detail: `${iWithdrew ? "vous êtes désisté" : "s'est désisté"} du match du ${dayMonth(match.date)}${
          motif ? ` — ${motif}` : ""
        }${reopened ? ", l'annonce est repartie en SOS" : ""}`,
        href: `/coach/matches/${match.id}`,
        createdAt: (match.cancelledAt ?? match.createdAt).toISOString(),
      });
    }

    // 4. Scores saisis sur mes matchs : validés, ou en attente d'une des deux parties
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
      // L'acteur est déjà nommé en gras : ne pas le répéter dans le détail
      events.push({
        id: `score-${match.id}`,
        type: "score",
        actor: iSubmitted ? "Vous" : opponent,
        detail:
          match.status === "finished"
            ? iSubmitted
              ? `avez saisi le score face à ${opponent}, validé : ${score}`
              : `— score validé : ${score}`
            : iSubmitted
              ? `avez saisi ${score} face à ${opponent} — en attente de validation`
              : `a saisi ${score} — scannez son QR code pour valider`,
        href: `/coach/matches/${match.id}`,
        createdAt: (match.scoreConfirmedAt ?? match.scoreSubmittedAt!).toISOString(),
      });
    }

    return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, FEED_LIMIT);
  });
}
