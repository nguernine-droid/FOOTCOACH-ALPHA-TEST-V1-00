import { and, eq, exists, gte, isNotNull, isNull, lt, not } from "drizzle-orm";
import { daysBetweenIso, SOS_WIDEN_MIN_MINUTES, sosWidenDelayMinutes } from "@footcoach/shared";
import { db } from "../db/client.js";
import {
  announcementResponses,
  matchAnnouncements,
  matches,
  teams,
  tournamentRegistrations,
  tournaments,
} from "../db/schema.js";
import { cityCoords } from "./cities.js";
import { notifySosWidened, notifyTournamentSosWidened, pushEnabled } from "./push.js";

/**
 * Fréquence du balayage. Deux minutes et non cinq : le délai le plus court est
 * de dix minutes pour un match du lendemain, et un retard de balayage s'ajoute
 * à ce délai. La requête est bornée par un index partiel, elle ne coûte rien.
 */
export const SOS_SWEEP_INTERVAL_MS = 2 * 60 * 1000;

/** Date du jour au format ISO — une annonce dont la date est passée ne se relance pas */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Élargit les SOS restés sans réponse aux coachs du secteur qui ne sont pas
 * jokers.
 *
 * Trois conditions cumulées pour qu'une annonce soit relancée :
 * - elle est toujours en SOS et ouverte (personne ne l'a reprise) ;
 * - **aucune proposition en attente** — un coach qui s'est manifesté suffit :
 *   le SOS a fait son travail, même si l'émetteur n'a pas encore tranché ;
 * - son délai propre est écoulé, et la date du match n'est pas passée.
 *
 * Le délai dépend de l'échéance du match (`sosWidenDelayMinutes`), il ne peut
 * donc pas se réduire à une borne unique en SQL. La requête ne fait qu'écarter
 * ce qui est trop frais pour le délai le PLUS COURT ; l'échéance de chacune est
 * ensuite tranchée ici, sur une poignée de lignes — les SOS en attente de
 * relance se comptent sur les doigts d'une main, même à grande échelle.
 *
 * La relance est réclamée par un UPDATE conditionnel sur `sos_widened_at` :
 * c'est ce qui rend la fonction sûre quand plusieurs répliques de l'API
 * balaient en même temps (`docker compose up --scale api=3`). Celle qui perd la
 * course ne trouve plus la ligne, et n'envoie rien.
 *
 * @returns le nombre d'annonces effectivement relancées
 */
export async function relayPendingSosAlerts(): Promise<number> {
  // Sans push configuré, rien à relancer — et surtout rien à consommer :
  // marquer les annonces ferait perdre la relance le jour où le push arrive.
  if (!pushEnabled()) return 0;

  const today = todayIso();
  const freshest = new Date(Date.now() - SOS_WIDEN_MIN_MINUTES * 60_000);

  const candidates = await db
    .select({ announcement: matchAnnouncements, team: teams })
    .from(matchAnnouncements)
    .innerJoin(teams, eq(matchAnnouncements.teamId, teams.id))
    .where(
      and(
        eq(matchAnnouncements.isSos, true),
        eq(matchAnnouncements.status, "open"),
        isNotNull(matchAnnouncements.sosAlertedAt),
        isNull(matchAnnouncements.sosWidenedAt),
        lt(matchAnnouncements.sosAlertedAt, freshest),
        gte(matchAnnouncements.date, today),
        // Personne ne s'est manifesté : pas de proposition en attente
        not(
          exists(
            db
              .select({ one: announcementResponses.id })
              .from(announcementResponses)
              .where(
                and(
                  eq(announcementResponses.announcementId, matchAnnouncements.id),
                  eq(announcementResponses.status, "pending"),
                ),
              ),
          ),
        ),
      ),
    );

  let relayed = 0;
  for (const { announcement, team } of candidates) {
    // Délai propre à cette annonce : plus le match est proche, plus il est court
    const delayMs = sosWidenDelayMinutes(daysBetweenIso(today, announcement.date)) * 60_000;
    if (announcement.sosAlertedAt!.getTime() + delayMs > Date.now()) continue;

    // Réclamation : une seule réplique peut poser la marque
    const [claimed] = await db
      .update(matchAnnouncements)
      .set({ sosWidenedAt: new Date() })
      .where(and(eq(matchAnnouncements.id, announcement.id), isNull(matchAnnouncements.sosWidenedAt)))
      .returning({ id: matchAnnouncements.id });
    if (!claimed) continue;

    // Les équipes du match annulé savent déjà : celle qui reçoit, et celle qui
    // s'est désistée. Les propositions ayant été effacées à la réouverture,
    // c'est le match annulé qui garde leur trace.
    const cancelled = await db
      .select({ home: matches.homeTeamId, away: matches.awayTeamId })
      .from(matches)
      .where(and(eq(matches.announcementId, announcement.id), eq(matches.status, "cancelled")));
    const excludeTeamIds = [
      ...new Set([announcement.teamId, ...cancelled.flatMap((m) => [m.home, m.away])]),
    ];

    notifySosWidened({
      teamName: team.name,
      category: announcement.category,
      format: announcement.format,
      city: announcement.city,
      date: announcement.date,
      announcementId: announcement.id,
      venue: cityCoords(announcement.city),
      excludeTeamIds,
    });
    relayed++;
  }
  return relayed;
}

/**
 * Même règle pour les tournois dont une place est restée libre : délai propre à
 * l'échéance, réclamation par UPDATE conditionnel, jokers d'abord puis tout le
 * secteur. Une fonction jumelle et non un traitement générique — les deux
 * lisent des tables différentes, et un abstracteur aurait coûté plus à
 * comprendre qu'il n'économise de lignes.
 *
 * La relance s'annule d'elle-même dès qu'une équipe reprend la place : la route
 * d'inscription remet `is_sos` à faux, ce qui sort le tournoi du filtre.
 */
export async function relayPendingTournamentSos(): Promise<number> {
  if (!pushEnabled()) return 0;

  const today = todayIso();
  const freshest = new Date(Date.now() - SOS_WIDEN_MIN_MINUTES * 60_000);

  const candidates = await db
    .select({ tournament: tournaments, team: teams })
    .from(tournaments)
    .innerJoin(teams, eq(tournaments.teamId, teams.id))
    .where(
      and(
        eq(tournaments.isSos, true),
        eq(tournaments.status, "open"),
        isNotNull(tournaments.sosAlertedAt),
        isNull(tournaments.sosWidenedAt),
        lt(tournaments.sosAlertedAt, freshest),
        gte(tournaments.date, today),
      ),
    );

  let relayed = 0;
  for (const { tournament, team } of candidates) {
    const delayMs = sosWidenDelayMinutes(daysBetweenIso(today, tournament.date)) * 60_000;
    if (tournament.sosAlertedAt!.getTime() + delayMs > Date.now()) continue;

    const [claimed] = await db
      .update(tournaments)
      .set({ sosWidenedAt: new Date() })
      .where(and(eq(tournaments.id, tournament.id), isNull(tournaments.sosWidenedAt)))
      .returning({ id: tournaments.id });
    if (!claimed) continue;

    // L'organisateur et les équipes déjà inscrites savent : les prévenir d'une
    // place qu'elles occupent déjà n'aurait aucun sens.
    const registered = await db
      .select({ teamId: tournamentRegistrations.teamId })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournament.id),
          eq(tournamentRegistrations.status, "registered"),
        ),
      );
    notifyTournamentSosWidened({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      category: tournament.category,
      city: tournament.city,
      date: tournament.date,
      venue: cityCoords(tournament.city),
      excludeTeamIds: [...new Set([tournament.teamId, ...registered.map((r) => r.teamId)])],
    });
    relayed++;
  }
  return relayed;
}

/**
 * Démarre le balayage périodique. Une passe immédiate au démarrage rattrape ce
 * qui s'est accumulé pendant que l'API était arrêtée — un redéploiement ne doit
 * pas faire disparaître une relance due.
 *
 * Une erreur de balayage est journalisée et n'arrête rien : ce n'est qu'une
 * notification manquée, elle ne vaut pas d'abattre le serveur.
 */
export function startSosRelay(log: { info: (msg: string) => void; error: (err: unknown) => void }) {
  const sweep = async () => {
    try {
      const relayed = await relayPendingSosAlerts();
      if (relayed > 0) log.info(`[sos] ${relayed} annonce(s) élargie(s) aux coachs du secteur`);
      const tournamentsRelayed = await relayPendingTournamentSos();
      if (tournamentsRelayed > 0) {
        log.info(`[sos] ${tournamentsRelayed} tournoi(s) élargi(s) aux coachs du secteur`);
      }
    } catch (err) {
      log.error(err);
    }
  };
  void sweep();
  const timer = setInterval(() => void sweep(), SOS_SWEEP_INTERVAL_MS);
  // Ne pas retenir la boucle d'événements : l'arrêt du serveur reste net.
  timer.unref?.();
  return timer;
}
