import {
  ANNOUNCEMENT_CATEGORIES,
  MATCH_FORMATS,
  MATCH_GENDERS,
  MATCH_GENDER_LABELS,
  type AdminInsightsDto,
  type BreakdownDto,
  type FunnelStepDto,
} from "@footcoach/shared";

/**
 * ————— Les chiffres qui aident à décider —————
 *
 * Ce module ne parle pas à la base : il reçoit des lignes déjà lues et n'en
 * tire que des nombres. C'est ce qui le rend vérifiable sans Postgres, et c'est
 * délibéré — une statistique fausse ne se voit pas à l'œil nu, contrairement à
 * un écran cassé. Chaque règle de comptage est donc écrite ici une seule fois,
 * et éprouvée par des tests.
 *
 * Deux partis pris traversent le fichier :
 *
 * - **On compte des passages, pas des objets.** « 30 annonces » ne dit rien ;
 *   « 30 publiées, 4 vues, 3 répondues, 0 signée » désigne la marche à réparer.
 * - **On refuse de diviser sur presque rien.** Sous `INSIGHT_MIN_BASE`, un taux
 *   n'est pas calculé plutôt qu'affiché faux : c'est `insightRate` qui tranche,
 *   du côté de l'interface.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const STALE_AFTER_DAYS = 7;
const GROWTH_WEEKS = 12;

/**
 * Nombre minimal d'observations pour qu'une médiane de délai soit publiée.
 * Plus bas que `INSIGHT_MIN_BASE` : une médiane sur trois valeurs reste une
 * médiane, là où un pourcentage sur trois valeurs est un accident d'arrondi.
 */
const MIN_DELAY_SAMPLES = 3;

export interface InsightAnnouncementRow {
  id: string;
  teamId: string;
  status: string;
  /** YYYY-MM-DD */
  date: string;
  category: string;
  format: string;
  gender: string | null;
  isSos: boolean;
  viewCount: number;
  createdAt: Date;
}

export interface InsightResponseRow {
  id: string;
  announcementId: string;
  teamId: string;
  status: string;
  ownerConfirmedAt: Date | null;
  responderConfirmedAt: Date | null;
  createdAt: Date;
}

export interface InsightMatchRow {
  announcementId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: string;
}

export interface InsightTeamRow {
  id: string;
  city: string;
}

export interface InsightCoachRow {
  id: string;
  createdAt: Date;
}

export interface InsightTeamCoachRow {
  coachId: string;
  teamId: string;
}

export interface InsightLoginRow {
  userId: string;
  createdAt: Date;
}

export interface InsightInput {
  now: Date;
  /** Aujourd'hui en YYYY-MM-DD, pour comparer aux colonnes `date` */
  today: string;
  announcements: InsightAnnouncementRow[];
  responses: InsightResponseRow[];
  matches: InsightMatchRow[];
  teams: InsightTeamRow[];
  coaches: InsightCoachRow[];
  teamCoaches: InsightTeamCoachRow[];
  /** Connexions de la fenêtre de croissance — sert à la courbe des actifs par semaine */
  logins: InsightLoginRow[];
  /**
   * Dernière connexion de chaque compte, TOUTE HISTOIRE CONFONDUE.
   *
   * Séparé de `logins` à dessein : « jamais revenu » se juge sur la vie entière
   * du compte. Le déduire de la seule fenêtre de croissance ferait passer pour
   * un abandon tout coach inscrit avant elle.
   */
  lastLogins: { userId: string; lastAt: Date }[];
  /** Une ligne par date de disponibilité encore à venir */
  upcomingAvailabilities: { teamId: string }[];
  /** `departmentOf` du référentiel, injecté pour garder ce module sans dépendance */
  departmentOf: (city: string) => string | null;
  conversations: number;
  messages: number;
  openReports: number;
}

/** Médiane, en heures, d'une série de durées en millisecondes. `null` si trop peu d'observations */
export function medianHours(durationsMs: number[], minSamples = MIN_DELAY_SAMPLES): number | null {
  if (durationsMs.length < minSamples) return null;
  const sorted = [...durationsMs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const ms = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  // Une décimale suffit : personne ne décide sur la troisième
  return Math.round((ms / HOUR_MS) * 10) / 10;
}

/** Une proposition porte-t-elle au moins une signature ? */
export function hasAnySignature(r: InsightResponseRow): boolean {
  return r.ownerConfirmedAt !== null || r.responderConfirmedAt !== null;
}

/** Les deux signatures, donc un match convenu */
export function hasBothSignatures(r: InsightResponseRow): boolean {
  return r.ownerConfirmedAt !== null && r.responderConfirmedAt !== null;
}

/**
 * Une proposition est-elle définitivement bloquée ?
 *
 * Elle reste `pending` en base, mais la route de validation la refusera
 * toujours : son annonce a été annulée, ou la date du match est passée. Elle
 * occupe alors un fil de discussion qui ne mène nulle part — c'est un chiffre
 * à réparer, pas une statistique de plus.
 */
export function isDeadPending(
  r: InsightResponseRow,
  announcement: InsightAnnouncementRow | undefined,
  today: string,
): boolean {
  if (r.status !== "pending") return false;
  // Annonce disparue : la proposition ne mène plus nulle part non plus
  if (!announcement) return true;
  return announcement.status !== "open" || announcement.date < today;
}

/** Lundi de la semaine d'une date, en YYYY-MM-DD */
export function mondayOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay() : 0 = dimanche. On recule jusqu'au lundi précédent.
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ventile des lignes par clé, en écartant les modalités absentes */
function breakdown<T>(
  rows: T[],
  keys: readonly string[],
  keyOf: (row: T) => string | null,
  labelOf: (key: string) => string,
  matchedOf?: (row: T) => boolean,
): BreakdownDto[] {
  const counts = new Map<string, { count: number; matched: number }>();
  for (const row of rows) {
    const key = keyOf(row);
    if (key === null) continue;
    const cell = counts.get(key) ?? { count: 0, matched: 0 };
    cell.count++;
    if (matchedOf?.(row)) cell.matched++;
    counts.set(key, cell);
  }
  return keys
    .filter((k) => counts.has(k))
    .map((k) => {
      const cell = counts.get(k)!;
      return matchedOf
        ? { key: k, label: labelOf(k), count: cell.count, matched: cell.matched }
        : { key: k, label: labelOf(k), count: cell.count };
    })
    .sort((a, b) => b.count - a.count);
}

export function computeInsights(input: InsightInput): AdminInsightsDto {
  const { now, today, announcements, responses, matches, teams, coaches, teamCoaches } = input;

  const announcementById = new Map(announcements.map((a) => [a.id, a]));

  // ————— Ce qui est arrivé à chaque annonce —————
  const responsesByAnnouncement = new Map<string, InsightResponseRow[]>();
  for (const r of responses) {
    const list = responsesByAnnouncement.get(r.announcementId) ?? [];
    list.push(r);
    responsesByAnnouncement.set(r.announcementId, list);
  }
  const matchesByAnnouncement = new Map<string, InsightMatchRow[]>();
  for (const m of matches) {
    const list = matchesByAnnouncement.get(m.announcementId) ?? [];
    list.push(m);
    matchesByAnnouncement.set(m.announcementId, list);
  }

  const seen = announcements.filter((a) => a.viewCount > 0).length;
  const answered = announcements.filter((a) => (responsesByAnnouncement.get(a.id) ?? []).length > 0).length;
  const signedAnnouncements = announcements.filter((a) =>
    (responsesByAnnouncement.get(a.id) ?? []).some(hasAnySignature),
  ).length;
  const becameMatch = announcements.filter((a) => (matchesByAnnouncement.get(a.id) ?? []).length > 0).length;
  const playedAnnouncements = announcements.filter((a) =>
    (matchesByAnnouncement.get(a.id) ?? []).some((m) => m.status === "finished"),
  ).length;

  const announcementFunnel: FunnelStepDto[] = [
    { key: "published", label: "Annonces publiées", count: announcements.length },
    {
      key: "seen",
      label: "Ouvertes par un autre coach",
      count: seen,
      lossHint: "Ce qui se perd ici est un problème de visibilité, pas d'offre",
    },
    {
      key: "answered",
      label: "Ayant reçu une proposition",
      count: answered,
      lossHint: "Vue sans proposition : l'annonce ne correspond pas, ou ne donne pas envie",
    },
    {
      key: "signed",
      label: "Avec au moins une signature",
      count: signedAnnouncements,
      lossHint: "Le contact est pris et personne ne valide — c'est ici que le service se joue",
    },
    {
      key: "matched",
      label: "Devenues un match",
      count: becameMatch,
      lossHint: "Une seule des deux signatures a été posée",
    },
    {
      key: "played",
      label: "Match joué",
      count: playedAnnouncements,
      lossHint: "Match convenu puis annulé, ou score jamais saisi",
    },
  ];

  const withOneSignature = responses.filter(hasAnySignature).length;
  const withTwoSignatures = responses.filter(hasBothSignatures).length;
  const responseFunnel: FunnelStepDto[] = [
    { key: "received", label: "Propositions reçues", count: responses.length },
    {
      key: "one",
      label: "Une signature",
      count: withOneSignature,
      lossHint: "Ni l'un ni l'autre n'a validé, des deux côtés du fil",
    },
    {
      key: "two",
      label: "Les deux signatures",
      count: withTwoSignatures,
      lossHint: "Un coach a validé, l'autre ne l'a jamais fait",
    },
  ];

  // ————— Les délais : le temps que prend chaque marche —————
  const toFirstResponse: number[] = [];
  for (const a of announcements) {
    const list = responsesByAnnouncement.get(a.id);
    if (!list || list.length === 0) continue;
    const first = Math.min(...list.map((r) => r.createdAt.getTime()));
    toFirstResponse.push(first - a.createdAt.getTime());
  }
  const betweenSignatures: number[] = [];
  for (const r of responses) {
    if (!hasBothSignatures(r)) continue;
    betweenSignatures.push(
      Math.abs(r.responderConfirmedAt!.getTime() - r.ownerConfirmedAt!.getTime()),
    );
  }

  const staleBefore = now.getTime() - STALE_AFTER_DAYS * DAY_MS;
  const stalePending = responses.filter(
    (r) => r.status === "pending" && !hasAnySignature(r) && r.createdAt.getTime() < staleBefore,
  ).length;
  const deadPending = responses.filter((r) =>
    isDeadPending(r, announcementById.get(r.announcementId), today),
  ).length;

  // ————— L'activation, comptée en COACHS et non en actions —————
  //
  // Une annonce ne retient que son équipe, jamais son auteur : « a publié » se
  // lit donc « encadre une équipe qui a publié ». Sur une équipe à plusieurs
  // coachs le compte est généreux — c'est assumé, et c'est la seule lecture
  // possible sans réécrire l'historique.
  const coachesByTeam = new Map<string, string[]>();
  for (const tc of teamCoaches) {
    const list = coachesByTeam.get(tc.teamId) ?? [];
    list.push(tc.coachId);
    coachesByTeam.set(tc.teamId, list);
  }
  const coachIds = new Set(coaches.map((c) => c.id));
  const collect = (teamIds: Iterable<string>): number => {
    const out = new Set<string>();
    for (const teamId of teamIds) {
      for (const coachId of coachesByTeam.get(teamId) ?? []) {
        if (coachIds.has(coachId)) out.add(coachId);
      }
    }
    return out.size;
  };

  const publishedTeams = new Set(announcements.map((a) => a.teamId));
  // Répondre, c'est l'équipe portée sur la proposition — pas celle de l'annonce
  const respondedTeams = new Set(responses.map((r) => r.teamId));
  // Signer engage les deux côtés du fil : l'émetteur de l'annonce et le répondant
  const signedTeams = new Set<string>();
  for (const r of responses) {
    if (!hasAnySignature(r)) continue;
    signedTeams.add(r.teamId);
    const a = announcementById.get(r.announcementId);
    if (a) signedTeams.add(a.teamId);
  }
  const playedTeams = new Set<string>();
  for (const m of matches) {
    if (m.status !== "finished") continue;
    playedTeams.add(m.homeTeamId);
    playedTeams.add(m.awayTeamId);
  }

  // « Jamais revenu » : aucune connexion passé les 24 premières heures du compte
  const lastLoginByUser = new Map(input.lastLogins.map((l) => [l.userId, l.lastAt.getTime()]));
  const neverReturned = coaches.filter((c) => {
    const last = lastLoginByUser.get(c.id);
    return last === undefined || last <= c.createdAt.getTime() + DAY_MS;
  }).length;

  // ————— La liquidité : ce qui est disponible maintenant —————
  const upcomingOpen = announcements.filter((a) => a.status === "open" && a.date >= today);

  const teamsByDepartment = new Map<string, number>();
  for (const team of teams) {
    const code = input.departmentOf(team.city);
    if (code === null) continue;
    teamsByDepartment.set(code, (teamsByDepartment.get(code) ?? 0) + 1);
  }
  let denseDepartments = 0;
  let isolatedTeams = 0;
  for (const teamCount of teamsByDepartment.values()) {
    if (teamCount >= 2) denseDepartments++;
    else isolatedTeams += teamCount;
  }

  // ————— La croissance, semaine par semaine —————
  const weeks: string[] = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cursor.setDate(cursor.getDate() - (GROWTH_WEEKS - 1) * 7);
  for (let i = 0; i < GROWTH_WEEKS; i++) {
    weeks.push(mondayOf(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  const signupsByWeek = new Map<string, number>();
  for (const c of coaches) {
    const week = mondayOf(c.createdAt);
    signupsByWeek.set(week, (signupsByWeek.get(week) ?? 0) + 1);
  }
  const activeByWeek = new Map<string, Set<string>>();
  for (const l of input.logins) {
    const week = mondayOf(l.createdAt);
    const set = activeByWeek.get(week) ?? new Set<string>();
    set.add(l.userId);
    activeByWeek.set(week, set);
  }
  const growth = weeks.map((week) => ({
    week,
    signups: signupsByWeek.get(week) ?? 0,
    active: activeByWeek.get(week)?.size ?? 0,
  }));

  // ————— Les frictions —————
  const expiredUnanswered = announcements.filter(
    (a) =>
      a.status !== "matched" && a.date < today && (responsesByAnnouncement.get(a.id) ?? []).length === 0,
  ).length;

  return {
    announcementFunnel,
    responseFunnel,
    timing: {
      hoursToFirstResponse: medianHours(toFirstResponse),
      hoursBetweenSignatures: medianHours(betweenSignatures),
      stalePending,
      deadPending,
    },
    activation: {
      coaches: coaches.length,
      published: collect(publishedTeams),
      responded: collect(respondedTeams),
      signed: collect(signedTeams),
      played: collect(playedTeams),
      neverReturned,
    },
    liquidity: {
      openUpcoming: upcomingOpen.length,
      openUpcomingTeams: new Set(upcomingOpen.map((a) => a.teamId)).size,
      upcomingAvailabilities: input.upcomingAvailabilities.length,
      availabilityTeams: new Set(input.upcomingAvailabilities.map((a) => a.teamId)).size,
      departments: teamsByDepartment.size,
      denseDepartments,
      isolatedTeams,
    },
    demand: {
      byCategory: breakdown(
        announcements,
        ANNOUNCEMENT_CATEGORIES,
        (a) => a.category,
        (k) => k,
        (a) => a.status === "matched",
      ),
      byFormat: breakdown(
        announcements,
        MATCH_FORMATS,
        (a) => a.format,
        (k) => k,
      ),
      byGender: breakdown(
        announcements,
        MATCH_GENDERS,
        (a) => a.gender,
        (k) => MATCH_GENDER_LABELS[k as keyof typeof MATCH_GENDER_LABELS] ?? k,
      ),
      sos: announcements.filter((a) => a.isSos).length,
    },
    growth,
    friction: {
      announcementsCancelled: announcements.filter((a) => a.status === "cancelled").length,
      expiredUnanswered,
      matchesCancelled: matches.filter((m) => m.status === "cancelled").length,
      openReports: input.openReports,
      conversations: input.conversations,
      messages: input.messages,
    },
  };
}
