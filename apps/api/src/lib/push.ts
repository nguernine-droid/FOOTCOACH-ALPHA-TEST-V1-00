import webpush from "web-push";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import {
  COACH_CATEGORY_LABELS,
  fineCategoriesOf,
  sosCategoryReach,
  WITHDRAWAL_REASON_LABELS,
  type CoachCategory,
  type WithdrawalReason,
} from "@teamnexus/shared";
import { env } from "../env.js";
import { db } from "../db/client.js";
import { pushSubscriptions, teamCoaches, teams, users } from "../db/schema.js";
import { originOf } from "./coachOrigin.js";
import { haversineKm } from "./cities.js";

/**
 * Notifications Web Push.
 *
 * Tout est optionnel : sans paire VAPID configurée, `pushEnabled()` est faux et
 * chaque envoi devient un no-op — l'API tourne exactement comme avant.
 *
 * Les envois ne sont jamais attendus par une route : un service de push lent ne
 * doit pas retarder la réponse du coach qui vient de publier son annonce.
 */
export function pushEnabled(): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

export function vapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY ?? null;
}

let configured = false;
function configure(): boolean {
  if (!pushEnabled()) return false;
  if (!configured) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Chemin ouvert au clic sur la notification */
  url: string;
  /** Regroupe les notifications d'un même sujet (une seule reste affichée) */
  tag?: string;
}

/** Envoie à tous les appareils enregistrés de ces comptes. */
async function sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!configure() || userIds.length === 0) return;
  const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (err) {
        // 404/410 : l'utilisateur a désinstallé l'app ou révoqué l'autorisation.
        // L'abonnement ne redeviendra jamais valide, on le supprime.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id)).catch(() => undefined);
        } else {
          console.error("[push] échec d'envoi", status ?? err);
        }
      }
    }),
  );
}

/** Lance l'envoi sans bloquer la requête en cours. */
function fireAndForget(task: Promise<void>): void {
  void task.catch((err) => console.error("[push] notification abandonnée", err));
}

/** « 14 août » — la date telle qu'elle apparaît dans le corps des notifications */
function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

/**
 * Coachs abonnés au push pour un type de notification donné, avec leur point
 * de rayonnement. Une seule requête, dédoublonnée par compte : un coach peut
 * avoir plusieurs appareils et plusieurs équipes.
 */
async function candidates(
  pref: "notifyNewAnnouncement" | "notifyAnnouncementResponse" | "notifyResponseDecision" | "notifyScore",
  excludeUserId?: string,
) {
  const rows = await db
    .select({ user: users, team: teams })
    .from(users)
    .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, users.id))
    .leftJoin(teamCoaches, eq(teamCoaches.coachId, users.id))
    .leftJoin(teams, eq(teams.id, teamCoaches.teamId))
    .where(
      and(
        eq(users.role, "coach"),
        isNull(users.disabledAt),
        eq(users[pref], true),
        excludeUserId ? ne(users.id, excludeUserId) : undefined,
      ),
    );

  const byUser = new Map<string, { user: typeof users.$inferSelect; team: typeof teams.$inferSelect | null }>();
  for (const row of rows) if (!byUser.has(row.user.id)) byUser.set(row.user.id, row);
  return [...byUser.values()];
}

/**
 * Une annonce vient d'être publiée : prévient les coachs dont le périmètre
 * couvre le lieu du match. Un coach sans position connue n'est pas notifié —
 * on ne peut pas affirmer que l'annonce le concerne.
 */
export function notifyNewAnnouncement(input: {
  authorUserId: string;
  teamName: string;
  category: string;
  format: string;
  city: string;
  venue: { lat: number; lng: number } | null;
}): void {
  if (!pushEnabled() || !input.venue) return;
  fireAndForget(
    (async () => {
      const targets: string[] = [];
      for (const { user, team } of await candidates("notifyNewAnnouncement", input.authorUserId)) {
        const origin = originOf(user, team);
        if (!origin) continue;
        const km = haversineKm(origin, input.venue!);
        // radarRadiusKm null = sans limite : tout est dans le périmètre
        if (user.radarRadiusKm !== null && km > user.radarRadiusKm) continue;
        targets.push(user.id);
      }
      await sendToUsers(targets, {
        title: `${input.teamName} cherche un adversaire`,
        body: `${input.category} · ${input.format} · à ${input.city}`,
        url: "/coach",
        tag: "annonce",
      });
    })(),
  );
}

/**
 * Un confrère vient d'écrire dans une conversation.
 *
 * Adressée à UNE personne et non à une équipe : un message est écrit à
 * quelqu'un, pas à un banc de touche. Le `tag` porte l'identifiant du fil pour
 * que dix messages d'affilée n'empilent pas dix notifications — la dernière
 * remplace la précédente, comme dans n'importe quelle messagerie.
 */
export function notifyNewMessage(input: {
  recipientCoachId: string;
  senderName: string;
  preview: string;
  conversationId: string;
}): void {
  if (!pushEnabled()) return;
  fireAndForget(
    (async () => {
      const [recipient] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.recipientCoachId), isNull(users.disabledAt), eq(users.notifyMessage, true)));
      if (!recipient) return;
      // Un aperçu, pas le message : une notification affichée sur un écran
      // verrouillé se lit par-dessus l'épaule.
      const preview = input.preview.length > 120 ? `${input.preview.slice(0, 119)}…` : input.preview;
      await sendToUsers([recipient.id], {
        title: input.senderName,
        body: preview,
        url: `/coach/messages/${input.conversationId}`,
        tag: `message-${input.conversationId}`,
      });
    })(),
  );
}

/** Coachs d'une équipe qui acceptent ce type de notification. */
async function teamCoachesToNotify(
  teamId: string,
  pref: "notifyAnnouncementResponse" | "notifyResponseDecision" | "notifyScore",
): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(teamCoaches, eq(teamCoaches.coachId, users.id))
    .where(and(eq(teamCoaches.teamId, teamId), isNull(users.disabledAt), eq(users[pref], true)));
  return [...new Set(rows.map((r) => r.id))];
}

/**
 * Une équipe propose de jouer mon annonce.
 *
 * L'url mène directement au fil ouvert avec le coach répondant : c'est là,
 * et non dans un popup à part, qu'accepter ou décliner se décide — après en
 * avoir discuté si besoin.
 */
export function notifyAnnouncementResponse(input: {
  ownerTeamId: string;
  responseId: string;
  responderTeamName: string;
  city: string;
  conversationId: string | null;
}): void {
  if (!pushEnabled()) return;
  fireAndForget(
    (async () => {
      await sendToUsers(await teamCoachesToNotify(input.ownerTeamId, "notifyAnnouncementResponse"), {
        title: "Une équipe veut jouer votre annonce",
        body: `${input.responderTeamName} propose de jouer à ${input.city}.`,
        url: input.conversationId ? `/coach/messages/${input.conversationId}` : "/coach/announcements/mine",
        tag: "proposition",
      });
    })(),
  );
}

/** Ma proposition a été acceptée ou déclinée. */
export function notifyResponseDecision(input: {
  responderTeamId: string;
  accepted: boolean;
  opponentTeamName: string;
  matchId: string | null;
}): void {
  if (!pushEnabled()) return;
  fireAndForget(
    (async () => {
      await sendToUsers(await teamCoachesToNotify(input.responderTeamId, "notifyResponseDecision"), {
        title: input.accepted ? "Match confirmé" : "Proposition déclinée",
        body: input.accepted
          ? `${input.opponentTeamName} a accepté votre proposition.`
          : `${input.opponentTeamName} a décliné votre proposition.`,
        url: input.accepted && input.matchId ? `/coach/matches/${input.matchId}` : "/coach/announcements",
        tag: "decision",
      });
    })(),
  );
}

/** Comptes coachs rattachés à ces équipes — pour les exclure d'une diffusion. */
async function coachIdsOfTeams(teamIds: string[]): Promise<Set<string>> {
  if (teamIds.length === 0) return new Set();
  const rows = await db
    .select({ id: teamCoaches.coachId })
    .from(teamCoaches)
    .where(inArray(teamCoaches.teamId, teamIds));
  return new Set(rows.map((r) => r.id));
}

/** L'adversaire s'est désisté : le match est annulé. */
export function notifyWithdrawal(input: {
  opponentTeamId: string;
  withdrawnTeamName: string;
  reason: WithdrawalReason;
  /** true si l'annonce de l'hôte repart en recherche (désistement de l'invité) */
  reopened: boolean;
}): void {
  if (!pushEnabled()) return;
  fireAndForget(
    (async () => {
      await sendToUsers(await teamCoachesToNotify(input.opponentTeamId, "notifyResponseDecision"), {
        title: "Désistement",
        body: `${input.withdrawnTeamName} renonce au match — ${WITHDRAWAL_REASON_LABELS[input.reason]}. ${
          input.reopened
            ? "Votre annonce est repartie en SOS sur le radar."
            : "Le match est annulé."
        }`,
        url: input.reopened ? "/coach/announcements" : "/coach/matches",
        tag: "desistement",
      });
    })(),
  );
}

/**
 * Coachs **jokers** abonnés au push, avec leur point de rayonnement.
 *
 * Se déclarer joker EST l'abonnement aux SOS : on ne le recoupe pas avec la
 * préférence « nouvelle annonce », qui répond à une autre question. Un coach
 * qui a coupé le flot des annonces neuves mais s'est déclaré joker veut
 * précisément cela — n'être dérangé que quand quelqu'un est en panne.
 *
 * `reach` restreint l'appel aux jokers de la bonne tranche d'âge : les
 * catégories visées et l'année de chaque côté (voir `sosCategoryReach`). Un
 * joker qui encadre plusieurs équipes est retenu dès que l'UNE d'elles est dans
 * la tranche — c'est bien lui qui peut dépanner. Celui dont aucune équipe n'a
 * de catégorie renseignée reste appelé : on ne sait pas, et ce qu'on ne sait
 * pas ne doit pas priver un coach d'un SOS.
 */
async function jokerCandidates(reach?: Set<string>) {
  const rows = await db
    .select({ user: users, team: teams })
    .from(users)
    .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, users.id))
    .leftJoin(teamCoaches, eq(teamCoaches.coachId, users.id))
    .leftJoin(teams, eq(teams.id, teamCoaches.teamId))
    .where(
      and(
        eq(users.role, "coach"),
        isNull(users.disabledAt),
        // `@>` : le tableau des casquettes contient 'joker'
        sql`${users.coachCategories} @> ARRAY['joker']::coach_category[]`,
      ),
    );

  // Le point de rayonnement vient de la PREMIÈRE équipe, comme partout
  // ailleurs ; les catégories, elles, se cumulent sur toutes.
  const byUser = new Map<string, { user: typeof users.$inferSelect; team: typeof teams.$inferSelect | null }>();
  const categoriesByUser = new Map<string, string[]>();
  for (const row of rows) {
    if (!byUser.has(row.user.id)) byUser.set(row.user.id, row);
    if (row.team?.category) {
      categoriesByUser.set(row.user.id, [...(categoriesByUser.get(row.user.id) ?? []), row.team.category]);
    }
  }

  const candidates = [...byUser.values()];
  if (!reach) return candidates;
  return candidates.filter(({ user }) => {
    const categories = categoriesByUser.get(user.id);
    if (!categories) return true;
    // `fineCategoriesOf` par sécurité : une équipe porte en principe une
    // catégorie fine (U13), mais une valeur de groupe venue d'un import se
    // comparerait sinon à rien et priverait ce joker de tout SOS.
    return categories.some(
      (category) => reach.has(category) || fineCategoriesOf(category).some((fine) => reach.has(fine)),
    );
  });
}

/**
 * Une annonce repart en SOS après un désistement. À la différence d'une annonce
 * neuve, elle ne réveille que les coachs qui se sont déclarés **jokers** — et
 * seulement ceux dont le périmètre couvre le lieu : un joker lillois n'a rien à
 * faire d'un match à Marseille, se dire disponible n'est pas se dire ubiquiste.
 *
 * Sans joker à portée, ce premier appel ne réveille personne — mais l'annonce
 * n'est pas perdue pour autant : passé le délai, `notifySosWidened` élargit à
 * tous les coachs du secteur (voir lib/sosRelay.ts).
 *
 * « À portée » se dit de deux façons : le périmètre, et la tranche d'âge — les
 * catégories de l'annonce plus l'année de chaque côté (`sosCategoryReach`).
 */
export function notifySosAnnouncement(input: {
  teamName: string;
  category: string;
  format: string;
  city: string;
  date: string;
  venue: { lat: number; lng: number } | null;
  /** Les deux équipes du match annulé : leurs coachs savent déjà */
  excludeTeamIds: string[];
}): void {
  if (!pushEnabled() || !input.venue) return;
  fireAndForget(
    (async () => {
      const excluded = await coachIdsOfTeams(input.excludeTeamIds);
      const targets: string[] = [];
      for (const { user, team } of await jokerCandidates(sosCategoryReach([input.category]))) {
        if (excluded.has(user.id)) continue;
        const origin = originOf(user, team);
        if (!origin) continue;
        const km = haversineKm(origin, input.venue!);
        if (user.radarRadiusKm !== null && km > user.radarRadiusKm) continue;
        targets.push(user.id);
      }
      const day = formatDay(input.date);
      await sendToUsers(targets, {
        title: `SOS — ${input.teamName} cherche un adversaire`,
        body: `Match du ${day} à ${input.city} · ${input.category} · ${input.format} — l'adversaire s'est désisté.`,
        url: "/coach",
        tag: "sos",
      });
    })(),
  );
}

/**
 * Une place se rouvre dans un tournoi après le retrait d'une équipe. Même
 * ciblage qu'un SOS d'annonce — les jokers du secteur d'abord — et la relance
 * élargie suit la même règle si personne ne se manifeste.
 */
export function notifyTournamentSos(input: {
  tournamentId: string;
  tournamentName: string;
  organizerTeamName: string;
  /** Libellé affiché — les catégories du tournoi mises bout à bout */
  category: string;
  /** Les mêmes, une par une : c'est de là que se calcule la tranche d'âge appelée */
  categories: readonly string[];
  city: string;
  date: string;
  venue: { lat: number; lng: number } | null;
  excludeTeamIds: string[];
}): void {
  if (!pushEnabled() || !input.venue) return;
  fireAndForget(
    (async () => {
      const excluded = await coachIdsOfTeams(input.excludeTeamIds);
      const targets: string[] = [];
      for (const { user, team } of await jokerCandidates(sosCategoryReach(input.categories))) {
        if (excluded.has(user.id)) continue;
        const origin = originOf(user, team);
        if (!origin) continue;
        const km = haversineKm(origin, input.venue!);
        if (user.radarRadiusKm !== null && km > user.radarRadiusKm) continue;
        targets.push(user.id);
      }
      await sendToUsers(targets, {
        title: `Place libre — ${input.tournamentName}`,
        body: `${formatDay(input.date)} à ${input.city} · ${input.category} — une équipe s'est retirée du tournoi de ${input.organizerTeamName}.`,
        url: `/coach/tournaments/${input.tournamentId}`,
        tag: `tournoi-sos-${input.tournamentId}`,
      });
    })(),
  );
}

/**
 * Le SOS d'un tournoi n'a trouvé personne chez les jokers : on élargit aux
 * autres coachs du secteur, aux mêmes conditions que pour une annonce.
 */
export function notifyTournamentSosWidened(input: {
  tournamentId: string;
  tournamentName: string;
  category: string;
  categories: readonly string[];
  city: string;
  date: string;
  venue: { lat: number; lng: number } | null;
  excludeTeamIds: string[];
}): void {
  if (!pushEnabled() || !input.venue) return;
  fireAndForget(
    (async () => {
      const excluded = await coachIdsOfTeams(input.excludeTeamIds);
      // Seuls les jokers RÉELLEMENT appelés au premier tour sont écartés : un
      // joker hors tranche d'âge n'a rien reçu, il redevient un coach ordinaire.
      const jokers = new Set(
        (await jokerCandidates(sosCategoryReach(input.categories))).map(({ user }) => user.id),
      );
      const targets: string[] = [];
      for (const { user, team } of await candidates("notifyNewAnnouncement")) {
        if (excluded.has(user.id) || jokers.has(user.id)) continue;
        const origin = originOf(user, team);
        if (!origin) continue;
        const km = haversineKm(origin, input.venue!);
        if (user.radarRadiusKm !== null && km > user.radarRadiusKm) continue;
        targets.push(user.id);
      }
      await sendToUsers(targets, {
        title: `${input.tournamentName} cherche encore une équipe`,
        body: `${formatDay(input.date)} à ${input.city} · ${input.category} — la place est toujours libre.`,
        url: `/coach/tournaments/${input.tournamentId}`,
        tag: `tournoi-relance-${input.tournamentId}`,
      });
    })(),
  );
}

/**
 * Le SOS n'a trouvé personne chez les jokers : on élargit à tous les coachs du
 * secteur, aux mêmes conditions de périmètre qu'une annonce neuve.
 *
 * Les jokers sont écartés — ils ont déjà reçu le premier appel et ne l'ont pas
 * saisi ; les rappeler à l'ordre une heure plus tard, c'est punir ceux qui se
 * sont portés volontaires. La préférence « nouvelle annonce » redevient en
 * revanche le bon filtre : ces coachs-là n'ont rien demandé de particulier,
 * c'est leur réglage ordinaire qui décide.
 *
 * Un `tag` distinct de « sos » : sur les téléphones, deux notifications de même
 * étiquette se remplacent, et la relance effacerait l'appel initial encore
 * affiché chez un joker.
 */
export function notifySosWidened(input: {
  teamName: string;
  category: string;
  format: string;
  city: string;
  date: string;
  announcementId: string;
  venue: { lat: number; lng: number } | null;
  excludeTeamIds: string[];
}): void {
  if (!pushEnabled() || !input.venue) return;
  fireAndForget(
    (async () => {
      const excluded = await coachIdsOfTeams(input.excludeTeamIds);
      // Comme pour les tournois : n'est écarté que le joker que le premier
      // appel a vraiment réveillé — donc celui de la bonne tranche d'âge.
      const jokers = new Set(
        (await jokerCandidates(sosCategoryReach([input.category]))).map(({ user }) => user.id),
      );
      const targets: string[] = [];
      for (const { user, team } of await candidates("notifyNewAnnouncement")) {
        if (excluded.has(user.id) || jokers.has(user.id)) continue;
        const origin = originOf(user, team);
        if (!origin) continue;
        const km = haversineKm(origin, input.venue!);
        if (user.radarRadiusKm !== null && km > user.radarRadiusKm) continue;
        targets.push(user.id);
      }
      const day = formatDay(input.date);
      await sendToUsers(targets, {
        title: `${input.teamName} cherche toujours un adversaire`,
        body: `Match du ${day} à ${input.city} · ${input.category} · ${input.format} — personne n'a encore répondu.`,
        url: "/coach",
        tag: `sos-relance-${input.announcementId}`,
      });
    })(),
  );
}

/**
 * Le coach vient de prendre une casquette : on le remercie.
 *
 * Envoyée alors qu'il a lui-même coché la case, ce qui pourrait passer pour un
 * écho inutile — mais c'est le seul moment où l'application dit merci, et une
 * casquette n'est pas un réglage : c'est un engagement envers les autres coachs
 * du secteur. La notification le reconnaît, et rappelle au passage ce à quoi
 * elle engage.
 *
 * Rien n'est envoyé quand une casquette est RENDUE : remercier quelqu'un qui
 * s'en va serait au mieux maladroit.
 */
export function notifyCoachCategoriesAdopted(input: {
  coachId: string;
  adopted: readonly CoachCategory[];
}): void {
  if (!pushEnabled() || input.adopted.length === 0) return;
  fireAndForget(
    (async () => {
      const labels = input.adopted.map((c) => COACH_CATEGORY_LABELS[c]);
      await sendToUsers([input.coachId], {
        title: labels.length > 1 ? `Merci — ${labels.join(" et ")}` : `Merci — ${labels[0]}`,
        body:
          input.adopted.includes("joker") && input.adopted.includes("contributeur")
            ? "Vous serez alerté des SOS de votre secteur en premier, et vos publications seront lues par tous les coachs."
            : input.adopted.includes("joker")
              ? "Vous serez alerté en premier quand un coach de votre secteur se retrouve sans adversaire."
              : "Vos informations seront lues par tous les coachs du secteur, et vous avez la ligne directe avec l'équipe TeamNexus.",
        url: "/coach/profile",
        tag: "casquette",
      });
    })(),
  );
}

/**
 * Score enregistré par l'adversaire. Purement informatif depuis que le score
 * n'est plus contre-signé : il n'y a rien à valider, mais le coach adverse doit
 * apprendre ce qui a été inscrit — c'est ce qui lui permet de le contester.
 */
export function notifyScoreRecorded(input: {
  opponentTeamId: string;
  submittedByTeamName: string;
  score: string;
  matchId: string;
}): void {
  if (!pushEnabled()) return;
  fireAndForget(
    (async () => {
      await sendToUsers(await teamCoachesToNotify(input.opponentTeamId, "notifyScore"), {
        title: "Score enregistré",
        body: `${input.submittedByTeamName} a saisi le score final : ${input.score}.`,
        url: `/coach/matches/${input.matchId}`,
        tag: `score-${input.matchId}`,
      });
    })(),
  );
}

/**
 * Une équipe libre le même jour que vous vous invite à jouer.
 *
 * C'est la notification qui renverse le produit : le coach n'a rien ouvert,
 * rien surveillé — il a déclaré une date, et on vient le chercher.
 *
 * Adressée à l'équipe suggérée, et à elle seule : c'est une invitation
 * nominative, pas une diffusion de plus sur le secteur. Le lien mène à
 * l'annonce, où répondre se fait par le chemin habituel.
 *
 * Elle emprunte la préférence « nouvelle annonce » plutôt que d'en ajouter
 * une : c'est la même nature d'information — « il y a un match à jouer près
 * de chez vous » — et un coach qui a coupé celle-là ne veut pas de celle-ci.
 */
export function notifyAvailabilityProposal(input: {
  targetTeamId: string;
  fromTeamName: string;
  date: string;
  announcementId: string;
}): void {
  if (!pushEnabled()) return;
  fireAndForget(
    (async () => {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .innerJoin(teamCoaches, eq(teamCoaches.coachId, users.id))
        .where(
          and(
            eq(teamCoaches.teamId, input.targetTeamId),
            isNull(users.disabledAt),
            eq(users.notifyNewAnnouncement, true),
          ),
        );
      await sendToUsers([...new Set(rows.map((r) => r.id))], {
        title: `${input.fromTeamName} vous propose un match`,
        body: `Vous êtes libres le même jour — ${formatDay(input.date)}.`,
        url: `/coach/announcements/${input.announcementId}`,
        tag: `suggestion-${input.announcementId}`,
      });
    })(),
  );
}

/**
 * Coachs d'une équipe abonnés à une préférence donnée. Même règle que
 * `teamCoachesToNotify`, ouverte aux préférences du balayeur.
 */
async function teamCoachesForPref(
  teamId: string,
  pref: "notifyNewAnnouncement" | "notifyFreeWeekend",
): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(teamCoaches, eq(teamCoaches.coachId, users.id))
    .where(and(eq(teamCoaches.teamId, teamId), isNull(users.disabledAt), eq(users[pref], true)));
  return [...new Set(rows.map((r) => r.id))];
}

/**
 * Des équipes répondent aux dates que j'ai déclarées.
 *
 * Envoyée par le balayeur, pas par une action du coach : c'est le moment où
 * l'application cesse d'être un endroit qu'on pense à ouvrir. Le corps donne le
 * nombre d'équipes et la première date — de quoi décider d'ouvrir ou non sans
 * ouvrir.
 *
 * Une seule notification par date, même si d'autres équipes se déclarent
 * ensuite : l'écran porte le compte à jour, insister serait du harcèlement.
 */
export function notifySuggestionsReady(input: {
  teamId: string;
  teamName: string;
  firstDate: string;
  teamsCount: number;
  datesCount: number;
}): void {
  if (!pushEnabled()) return;
  fireAndForget(
    (async () => {
      const targets = await teamCoachesForPref(input.teamId, "notifyNewAnnouncement");
      const teamsLabel = `${input.teamsCount} équipe${input.teamsCount > 1 ? "s" : ""}`;
      await sendToUsers(targets, {
        title: `${teamsLabel} libre${input.teamsCount > 1 ? "s" : ""} en face`,
        body:
          input.datesCount > 1
            ? `${input.teamName} — à partir du ${formatDay(input.firstDate)}, sur ${input.datesCount} de vos dates.`
            : `${input.teamName} — le ${formatDay(input.firstDate)}.`,
        url: "/coach/availabilities",
        tag: `suggestions-${input.teamId}`,
      });
    })(),
  );
}

/**
 * Ce week-end-là est vide et personne ne l'avait remarqué.
 *
 * La relance qui arrive AVANT que le coach y pense : ni match, ni annonce, ni
 * événement d'agenda, ni date déclarée. Elle ne prétend pas connaître le
 * calendrier officiel du district — nous ne l'avons pas — elle constate un vide
 * dans ce que l'application sait, et pose la question.
 *
 * D'où sa formulation prudente : elle propose de se déclarer libre, elle
 * n'affirme pas que l'équipe l'est.
 */
export function notifyFreeWeekend(input: { teamId: string; teamName: string; date: string }): void {
  if (!pushEnabled()) return;
  fireAndForget(
    (async () => {
      const targets = await teamCoachesForPref(input.teamId, "notifyFreeWeekend");
      await sendToUsers(targets, {
        title: `Rien de prévu le ${formatDay(input.date)}`,
        body: `${input.teamName} n'a ni match ni annonce ce jour-là. Déclarez-vous libres et voyez qui l'est aussi.`,
        url: "/coach/availabilities",
        tag: `weekend-${input.teamId}-${input.date}`,
      });
    })(),
  );
}
