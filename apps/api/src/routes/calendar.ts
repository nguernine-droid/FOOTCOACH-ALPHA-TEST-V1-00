import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { teams, users } from "../db/schema.js";
import { addDays, collectAgendaItems, todayStr } from "../lib/agenda.js";
import { buildIcsFeed, type CalendarEntry } from "../lib/ics.js";
import { getCoachTeamIds, requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";

/**
 * Liaison de l'agenda TeamNexus au calendrier du téléphone, par abonnement ICS.
 *
 * Le coach lie une fois depuis les paramètres : on lui génère un jeton secret,
 * et son téléphone s'abonne à l'URL du flux. Ensuite le calendrier relit le
 * flux tout seul — c'est lui qui décide de la fréquence (d'une heure à un jour
 * selon l'app), il n'y a rien à pousser de notre côté.
 *
 * Le flux est public au sens « sans session » : les apps calendrier ne savent
 * pas s'authentifier. Le jeton dans l'URL est donc le seul secret, comme un
 * lien de partage — d'où sa révocation possible (délier) et sa rotation à
 * chaque nouvelle liaison.
 */

// Fenêtre du flux : le mois écoulé (contexte) et la saison à venir, dans la
// limite que s'impose déjà la génération d'occurrences côté /events.
const FEED_PAST_DAYS = 30;
const FEED_FUTURE_DAYS = 150;

/** Chemin public du flux pour un jeton donné (le front le préfixe de l'origine) */
function feedPath(token: string): string {
  return `/api/calendar/${token}/teamnexus.ics`;
}

export function calendarRoutes(app: FastifyInstance) {
  // ————— Flux ICS, consulté par les calendriers sans session —————
  // Le nom de fichier en fin d'URL donne un libellé propre aux clients qui
  // l'affichent, et marque l'intention : ceci est un fichier calendrier.
  app.get("/calendar/:token/teamnexus.ics", async (request, reply) => {
    const { token } = request.params as { token: string };
    // Forme d'un jeton base64url à nous : évite une requête pour les scans fantaisistes
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw new HttpError(404, "Flux introuvable");

    // Un compte désactivé par un admin ne doit plus rien exposer : le jeton du
    // flux survivrait sinon à la révocation des sessions (login/refresh la
    // vérifient déjà), et continuerait à servir l'agenda sans authentification.
    const [coach] = await db
      .select()
      .from(users)
      .where(and(eq(users.calendarToken, token), isNull(users.disabledAt)));
    if (!coach || coach.role !== "coach") throw new HttpError(404, "Flux introuvable");

    // Toutes les équipes du coach : son calendrier personnel n'a pas de notion
    // d'« équipe active », il doit tout montrer. team_coaches fait foi, avec
    // l'équipe principale en repli pour les comptes d'avant le multi-équipes.
    let teamIds = await getCoachTeamIds(coach.id);
    if (teamIds.length === 0 && coach.teamId) teamIds = [coach.teamId];

    const from = addDays(todayStr(), -FEED_PAST_DAYS);
    const to = addDays(todayStr(), FEED_FUTURE_DAYS);

    const entries: CalendarEntry[] = [];
    if (teamIds.length > 0) {
      const teamRows = await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(inArray(teams.id, teamIds));
      const names = new Map(teamRows.map((t) => [t.id, t.name]));
      // Le préfixe d'équipe n'apparaît qu'en multi-équipes : pour un coach à
      // une seule équipe, il ne ferait que rallonger chaque ligne du calendrier.
      const multi = teamIds.length > 1;
      for (const teamId of teamIds) {
        const items = await collectAgendaItems(teamId, from, to);
        for (const item of items) {
          entries.push({ item, teamLabel: multi ? (names.get(teamId) ?? null) : null });
        }
      }
    }

    reply
      .header("Content-Type", "text/calendar; charset=utf-8")
      .header("Content-Disposition", 'inline; filename="teamnexus.ics"')
      // Les clients calendrier relisent d'eux-mêmes ; un petit cache absorbe
      // les relectures rapprochées sans retarder personne.
      .header("Cache-Control", "private, max-age=300");
    return buildIcsFeed(entries);
  });

  // ————— Gestion de la liaison, depuis les paramètres du coach —————
  app.register((coach) => {
    coach.addHook("preHandler", requireAuth);
    coach.addHook("preHandler", requireRole("coach"));

    // État courant : le chemin du flux si l'agenda est lié, sinon null
    coach.get("/calendar/link", async (request) => {
      const [row] = await db
        .select({ token: users.calendarToken })
        .from(users)
        .where(eq(users.id, request.user.id));
      return { path: row?.token ? feedPath(row.token) : null };
    });

    // Lier (ou relier) : génère un jeton neuf. Relier révoque l'ancien lien —
    // c'est le comportement voulu : un coach qui « relie » après un doute sur
    // son URL doit obtenir un secret vierge.
    coach.post("/calendar/link", async (request) => {
      const token = randomBytes(24).toString("base64url");
      await db.update(users).set({ calendarToken: token }).where(eq(users.id, request.user.id));
      return { path: feedPath(token) };
    });

    // Délier : le flux cesse d'exister, le calendrier du téléphone recevra des
    // 404 et l'abonnement se videra ou s'affichera en erreur selon l'app.
    coach.delete("/calendar/link", async (request) => {
      await db.update(users).set({ calendarToken: null }).where(eq(users.id, request.user.id));
      return { ok: true };
    });
  });
}
