import { and, eq, gte, inArray, isNotNull, lte, ne, or } from "drizzle-orm";
import {
  freeWeekendTarget,
  withinRelayHours,
  AVAILABILITY_MAX_DAYS_AHEAD,
  type SuggestionDto,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import {
  availabilityNotices,
  matchAnnouncements,
  matches,
  teamAvailabilities,
  teamEvents,
  teams,
} from "../db/schema.js";
import { suggestionsFor, today } from "./availabilityMatch.js";
import { notifyFreeWeekend, notifySuggestionsReady, pushEnabled } from "./push.js";

/**
 * Fréquence du balayage. Trente minutes et non deux : rien ici n'est urgent.
 * Le SOS court après un adversaire pour dimanche prochain ; ces relances-là
 * parlent d'un match dans dix jours, et un quart d'heure de retard ne change
 * rien à ce que le coach en fera.
 */
export const WEEKEND_SWEEP_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Réclame le droit d'envoyer une relance.
 *
 * L'insertion tient lieu de verrou : la contrainte d'unicité fait que si trois
 * répliques balaient en même temps, une seule obtient la ligne — et donc une
 * seule notifie. C'est le pendant de l'UPDATE conditionnel du relais SOS.
 *
 * La trace est posée AVANT l'envoi. Une notification perdue vaut mieux qu'une
 * notification doublée : le coach retrouvera l'information sur son écran, alors
 * qu'une alerte reçue deux fois se remarque et agace.
 */
async function claimNotice(teamId: string, date: string, kind: "suggestion" | "free_weekend"): Promise<boolean> {
  const inserted = await db
    .insert(availabilityNotices)
    .values({ teamId, date, kind })
    .onConflictDoNothing()
    .returning({ id: availabilityNotices.id });
  return inserted.length > 0;
}

/**
 * Premier volet : les dates déclarées auxquelles des équipes répondent.
 *
 * Le coach a fait sa part — il a dit qu'il était libre. C'est à nous d'aller
 * lui dire que quelqu'un l'est aussi, sans attendre qu'il rouvre l'écran.
 *
 * Les dates d'une même équipe sont regroupées en UNE notification : déclarer
 * cinq dimanches d'un coup ne doit pas valoir cinq alertes.
 */
export async function relayReadySuggestions(): Promise<number> {
  const from = today();
  const to = horizonIso();

  // Les équipes qui ont au moins une date à venir sans relance envoyée. Le
  // calcul d'appariement coûte quelques requêtes par équipe : on ne le lance
  // que pour celles qui peuvent encore recevoir quelque chose.
  const pending = await db
    .select({ teamId: teamAvailabilities.teamId, date: teamAvailabilities.date })
    .from(teamAvailabilities)
    .where(and(gte(teamAvailabilities.date, from), lte(teamAvailabilities.date, to)));
  if (pending.length === 0) return 0;

  const alreadySent = await db
    .select({ teamId: availabilityNotices.teamId, date: availabilityNotices.date })
    .from(availabilityNotices)
    .where(
      and(
        eq(availabilityNotices.kind, "suggestion"),
        gte(availabilityNotices.date, from),
        lte(availabilityNotices.date, to),
      ),
    );
  const sentKeys = new Set(alreadySent.map((n) => `${n.teamId}|${n.date}`));

  const datesByTeam = new Map<string, string[]>();
  for (const row of pending) {
    if (sentKeys.has(`${row.teamId}|${row.date}`)) continue;
    const list = datesByTeam.get(row.teamId);
    if (list) list.push(row.date);
    else datesByTeam.set(row.teamId, [row.date]);
  }
  if (datesByTeam.size === 0) return 0;

  let notified = 0;
  for (const [teamId, dates] of datesByTeam) {
    let suggestions: SuggestionDto[];
    try {
      suggestions = await suggestionsFor(teamId);
    } catch (err) {
      // Une équipe qui échoue ne doit pas emporter le balayage des autres
      console.error("[weekend] appariement impossible", teamId, err);
      continue;
    }

    // On ne retient que les dates non encore relancées, et qui ont vraiment
    // quelqu'un en face aujourd'hui.
    const pendingDates = new Set(dates);
    const matched = suggestions.filter((s) => pendingDates.has(s.date));
    if (matched.length === 0) continue;

    const dateSet = [...new Set(matched.map((s) => s.date))].sort();
    const claimed: string[] = [];
    for (const date of dateSet) if (await claimNotice(teamId, date, "suggestion")) claimed.push(date);
    if (claimed.length === 0) continue;

    const [team] = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId));
    if (!team) continue;
    notifySuggestionsReady({
      teamId,
      teamName: team.name,
      firstDate: claimed[0],
      // Le nombre d'équipes distinctes, pas de suggestions : la même équipe
      // libre sur trois de mes dates est UNE équipe, et l'annoncer trois fois
      // gonflerait le chiffre sans rien ajouter.
      teamsCount: new Set(matched.filter((s) => claimed.includes(s.date)).map((s) => s.team.id)).size,
      datesCount: claimed.length,
    });
    notified++;
  }
  return notified;
}

/**
 * Second volet : les week-ends vides que personne n'a remarqués.
 *
 * Ici le coach n'a rien déclaré — c'est justement le point. On regarde ce que
 * l'application sait de son jour de match habituel dans dix à seize jours : ni
 * match, ni annonce, ni événement d'agenda, ni disponibilité déjà déclarée. Un
 * vide sur les quatre, et on pose la question.
 *
 * Ce n'est PAS le calendrier officiel du district, que nous n'avons pas le
 * droit de reprendre. C'est un constat sur nos propres données, formulé comme
 * tel : « rien de prévu », et non « vous êtes exempts ».
 */
export async function relayFreeWeekends(): Promise<number> {
  const now = new Date();

  // Une équipe sans catégorie n'a pas de jour de match habituel, et rien à
  // apparier de toute façon.
  const allTeams = await db
    .select({ id: teams.id, name: teams.name, category: teams.category })
    .from(teams)
    .where(isNotNull(teams.category));
  if (allTeams.length === 0) return 0;

  // La date visée dépend de la catégorie : samedi pour les jeunes, dimanche
  // pour les seniors. Deux dates au plus pour toute la base.
  const targets = new Map<string, string>();
  for (const team of allTeams) {
    const date = freeWeekendTarget(now, team.category);
    if (date) targets.set(team.id, date);
  }
  if (targets.size === 0) return 0;
  const dates = [...new Set(targets.values())];
  const teamIds = [...targets.keys()];

  // Ce qui occupe déjà ces équipes ce jour-là, en quatre requêtes bornées
  const [booked, announced, evented, declared, noticed] = await Promise.all([
    db
      .select({ teamId: matches.homeTeamId, awayId: matches.awayTeamId, date: matches.date })
      .from(matches)
      .where(
        and(
          inArray(matches.date, dates),
          ne(matches.status, "cancelled"),
          or(inArray(matches.homeTeamId, teamIds), inArray(matches.awayTeamId, teamIds)),
        ),
      ),
    db
      .select({ teamId: matchAnnouncements.teamId, date: matchAnnouncements.date })
      .from(matchAnnouncements)
      .where(
        and(
          inArray(matchAnnouncements.date, dates),
          inArray(matchAnnouncements.teamId, teamIds),
          ne(matchAnnouncements.status, "cancelled"),
        ),
      ),
    db
      .select({ teamId: teamEvents.teamId, date: teamEvents.date })
      .from(teamEvents)
      .where(and(inArray(teamEvents.date, dates), inArray(teamEvents.teamId, teamIds))),
    db
      .select({ teamId: teamAvailabilities.teamId, date: teamAvailabilities.date })
      .from(teamAvailabilities)
      .where(and(inArray(teamAvailabilities.date, dates), inArray(teamAvailabilities.teamId, teamIds))),
    db
      .select({ teamId: availabilityNotices.teamId, date: availabilityNotices.date })
      .from(availabilityNotices)
      .where(
        and(
          inArray(availabilityNotices.date, dates),
          inArray(availabilityNotices.teamId, teamIds),
          eq(availabilityNotices.kind, "free_weekend"),
        ),
      ),
  ]);

  const busy = new Set<string>();
  for (const m of booked) {
    busy.add(`${m.teamId}|${m.date}`);
    if (m.awayId) busy.add(`${m.awayId}|${m.date}`);
  }
  for (const rows of [announced, evented, declared, noticed]) {
    for (const r of rows) busy.add(`${r.teamId}|${r.date}`);
  }

  let notified = 0;
  for (const team of allTeams) {
    const date = targets.get(team.id);
    if (!date || busy.has(`${team.id}|${date}`)) continue;
    if (!(await claimNotice(team.id, date, "free_weekend"))) continue;
    notifyFreeWeekend({ teamId: team.id, teamName: team.name, date });
    notified++;
  }
  return notified;
}

/** Borne haute du premier volet : la même que celle des déclarations */
function horizonIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + AVAILABILITY_MAX_DAYS_AHEAD);
  return d.toISOString().slice(0, 10);
}

/**
 * Démarre le balayeur des relances.
 *
 * Contrairement au relais SOS, il ne balaie pas au démarrage : un redéploiement
 * à 6 h du matin ne doit pas envoyer les relances de la journée avec quatre
 * heures d'avance. Les bornes horaires sont vérifiées à chaque passage, et le
 * balayage suivant rattrapera ce qui était dû.
 *
 * Sans clés VAPID, rien ne part et rien n'est marqué : la trace serait posée
 * pour des notifications jamais envoyées, et le jour où le push est configuré,
 * plus personne ne serait relancé.
 */
export function startWeekendRelay(log: { info: (msg: string) => void; error: (err: unknown) => void }) {
  const sweep = async () => {
    if (!pushEnabled() || !withinRelayHours(new Date())) return;
    try {
      const suggested = await relayReadySuggestions();
      if (suggested > 0) log.info(`[weekend] ${suggested} équipe(s) prévenue(s) qu'on leur répond`);
      const nudged = await relayFreeWeekends();
      if (nudged > 0) log.info(`[weekend] ${nudged} équipe(s) relancée(s) sur un week-end vide`);
    } catch (err) {
      log.error(err);
    }
  };
  const timer = setInterval(() => void sweep(), WEEKEND_SWEEP_INTERVAL_MS);
  timer.unref?.();
  return timer;
}
