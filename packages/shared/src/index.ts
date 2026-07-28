import { z } from "zod";

// ---------- Enums ----------
export const ROLES = ["coach", "player", "parent", "supporter", "admin", "club"] as const;
export type Role = (typeof ROLES)[number];

/**
 * V1 recentrée sur la gestion des matchs amicaux entre coachs : seuls le coach
 * et l'administrateur ont accès à l'application. Les autres rôles restent en
 * base et dans le code, mais ne peuvent ni s'inscrire ni se connecter.
 */
export const V1_ROLES = ["coach", "admin"] as const satisfies readonly Role[];
export function isV1Role(role: Role): boolean {
  return (V1_ROLES as readonly Role[]).includes(role);
}

// Rôle d'un coach au sein d'une équipe (une équipe peut avoir plusieurs coachs)
export const TEAM_COACH_ROLES = ["principal", "adjoint"] as const;
export type TeamCoachRole = (typeof TEAM_COACH_ROLES)[number];

export const ANNOUNCEMENT_STATUSES = ["open", "matched", "cancelled"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

/**
 * Délai réglementaire FFF : un match amical doit être déclaré à la fédération
 * (district / ligue) au moins 10 jours avant sa date.
 */
export const FFF_NOTICE_DAYS = 10;

/** Nombre de jours pleins entre deux dates ISO (yyyy-mm-dd), sans effet de fuseau */
export function daysBetweenIso(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Le délai FFF est-il tenu pour un match le `matchDate` annoncé le `announcedOn` ? */
export function respectsFffNotice(matchDate: string, announcedOn: string): boolean {
  return daysBetweenIso(announcedOn, matchDate) >= FFF_NOTICE_DAYS;
}

/**
 * Cycle de vie d'un match : le coach saisit le score final à la fin de la
 * rencontre (`awaiting_confirmation`), puis le coach adverse le valide en
 * scannant le QR code affiché — c'est cette validation qui clôt le match.
 *
 * `cancelled` : l'un des deux coachs s'est désisté avant le coup d'envoi. Le
 * match est conservé (trace du désistement), il ne compte plus nulle part.
 */
export const MATCH_STATUSES = ["scheduled", "live", "awaiting_confirmation", "finished", "cancelled"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

/** Motifs de désistement, imposés pour rester exploitables (relances, statistiques) */
export const WITHDRAWAL_REASONS = ["blessure", "meteo", "terrain", "personnel"] as const;
export type WithdrawalReason = (typeof WITHDRAWAL_REASONS)[number];

export const WITHDRAWAL_REASON_LABELS: Record<WithdrawalReason, string> = {
  blessure: "Blessure / effectif insuffisant",
  meteo: "Conditions météo",
  terrain: "Terrain indisponible",
  personnel: "Raison personnelle",
};

export const MATCH_SIDES = ["home", "away"] as const;
export type MatchSide = (typeof MATCH_SIDES)[number];

export const RESPONSE_STATUSES = ["pending", "accepted", "declined"] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export const MATCH_LEVELS = ["loisir", "competition"] as const;
export type MatchLevel = (typeof MATCH_LEVELS)[number];

export const MATCH_FORMATS = ["5v5", "8v8", "11v11"] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

/**
 * Catégories d'âge de la FFF, de l'école de foot aux vétérans. Les équipes sont
 * engagées en compétition sur les catégories impaires (des U12 jouent en U13),
 * mais un amical peut se caler sur n'importe laquelle — d'où la liste complète.
 *
 * Source unique : le formulaire de publication et le filtre du radar la
 * partagent, ils divergeaient tant qu'elle était recopiée dans chacun.
 */
export const MATCH_CATEGORIES = [
  "U6", "U7", "U8", "U9", "U10", "U11", "U12", "U13", "U14", "U15", "U16", "U17", "U18", "U19", "U20",
  "Seniors", "Veterans",
] as const;
export type MatchCategory = (typeof MATCH_CATEGORIES)[number];

/**
 * Libellé affiché. Les valeurs restent sans accent, comme tous les identifiants
 * du projet : elles voyagent en JSON, en base et un jour en paramètre d'URL, où
 * un « é » ne survit pas toujours au transport.
 */
export function categoryLabel(category: string): string {
  return category === "Veterans" ? "Vétérans" : category;
}

/**
 * Genre de l'équipe, distinct de la catégorie : dédoubler les catégories
 * (U15, U15F…) rendrait « U15 » ambigu et doublerait la liste. « Mixte » n'est
 * pas un fourre-tout — jusqu'aux U11, les équipes le sont réellement.
 */
export const MATCH_GENDERS = ["masculin", "feminin", "mixte"] as const;
export type MatchGender = (typeof MATCH_GENDERS)[number];

export const MATCH_GENDER_LABELS: Record<MatchGender, string> = {
  masculin: "Masculin",
  feminin: "Féminin",
  mixte: "Mixte",
};

/** Types d'événements d'agenda. "match" est virtuel : projeté depuis les matchs. */
export const EVENT_TYPES = ["match", "entrainement", "tournoi", "reunion", "autre"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
/** Types créables par le coach (tout sauf "match") */
export const TEAM_EVENT_TYPES = ["entrainement", "tournoi", "reunion", "autre"] as const;
export type TeamEventType = (typeof TEAM_EVENT_TYPES)[number];

export const EVENT_RECURRENCES = ["none", "weekly"] as const;
export type EventRecurrence = (typeof EVENT_RECURRENCES)[number];

// ---------- Schémas de requêtes ----------
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const createAnnouncementSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  city: z.string().min(1).max(100),
  stadium: z.string().min(1).max(150),
  category: z.enum(MATCH_CATEGORIES),
  // Demandé à la publication : deviner le genre d'une équipe serait présumer,
  // et une annonce féminine tombée face à une équipe masculine ne se joue pas.
  gender: z.enum(MATCH_GENDERS),
  level: z.enum(MATCH_LEVELS),
  format: z.enum(MATCH_FORMATS),
  comment: z.string().max(500).optional(),
  // Attestation obligatoire : la déclaration du match amical à la fédération
  // incombe au coach, l'application en garde la trace.
  federationDeclared: z.boolean().refine((v) => v, {
    message: "Vous devez attester avoir déclaré ce match amical à votre fédération",
  }),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

/** Coup d'envoi : passage de `scheduled` à `live` */
export const kickoffSchema = z.object({});

/** Saisie du score final par un des deux coachs — ouvre la validation par QR */
export const finalScoreSchema = z.object({
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
});
export type FinalScoreInput = z.infer<typeof finalScoreSchema>;

/** Validation du score par le coach adverse : le jeton vient du QR scanné */
export const confirmScoreSchema = z.object({
  token: z.string().min(10).max(100),
});
export type ConfirmScoreInput = z.infer<typeof confirmScoreSchema>;

/**
 * Désistement d'un des deux coachs avant le coup d'envoi. Le motif est imposé,
 * la précision libre s'affiche telle quelle aux coachs qui verront l'annonce
 * repartir en SOS — d'où la longueur volontairement courte.
 */
export const withdrawMatchSchema = z.object({
  reason: z.enum(WITHDRAWAL_REASONS),
  details: z.string().trim().max(140).optional(),
});
export type WithdrawMatchInput = z.infer<typeof withdrawMatchSchema>;

/**
 * Création d'une équipe supplémentaire par un coach déjà inscrit. Mêmes bornes
 * que l'équipe créée à l'inscription : c'est la même chose, créée plus tard.
 */
export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(60),
  city: z.string().trim().min(1).max(60),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const registerCoachSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8, "8 caractères minimum"),
  teamName: z.string().min(2).max(60),
  teamCity: z.string().min(1).max(60),
});
export type RegisterCoachInput = z.infer<typeof registerCoachSchema>;

// Création d'un compte club par l'admin : le club + son compte de connexion (contact)
export const createClubSchema = z.object({
  name: z.string().min(2).max(80),
  city: z.string().min(1).max(60),
  contactFirstName: z.string().min(1).max(50),
  contactLastName: z.string().min(1).max(50),
  email: z.string().email(),
});
export type CreateClubInput = z.infer<typeof createClubSchema>;

// Gestion des équipes par le club
export const createClubTeamSchema = z.object({
  name: z.string().min(2).max(60),
  city: z.string().min(1).max(60),
});
export const updateClubTeamSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  city: z.string().min(1).max(60).optional(),
});

// Création d'un compte coach par le club (identifiants générés)
export const createClubCoachSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
});
// Affectation d'un coach affilié à une équipe du club
export const assignCoachSchema = z.object({
  coachId: z.string().uuid(),
  role: z.enum(TEAM_COACH_ROLES),
});
// Coach : demande d'affiliation à un club via son code
export const affiliateClubSchema = z.object({
  code: z.string().min(4).max(12),
});

// Statuts conservés : le club s'en sert pour les demandes d'affiliation des coachs
export const JOIN_REQUEST_STATUSES = ["pending", "approved", "declined"] as const;
export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUSES)[number];

/** Profil du coach : ce qu'il peut personnaliser lui-même */
export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  // Partagé avec ses relations uniquement. Permissif : indicatifs, espaces, points.
  phone: z
    .string()
    .max(20)
    .regex(/^[+0-9][0-9 .\-()]*$/, "Numéro de téléphone invalide")
    .nullable()
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/** Ajout d'une relation par code coach (saisi ou lu dans un QR) */
export const addRelationSchema = z.object({
  code: z.string().min(4).max(12),
});
export type AddRelationInput = z.infer<typeof addRelationSchema>;

/**
 * Préfixe du QR code d'un coach : `FOOTCOACH:COACH:<code>`. Il permet au
 * scanner de reconnaître un code FootCoach et d'écarter tout autre QR.
 */
export const COACH_QR_PREFIX = "FOOTCOACH:COACH:";

export function coachQrPayload(code: string): string {
  return `${COACH_QR_PREFIX}${code}`;
}

/** Extrait le code d'un QR scanné ; null si ce n'est pas un QR coach FootCoach */
export function parseCoachQr(payload: string): string | null {
  const trimmed = payload.trim();
  if (!trimmed.startsWith(COACH_QR_PREFIX)) return null;
  const code = trimmed.slice(COACH_QR_PREFIX.length).toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(code) ? code : null;
}

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const updateAccountEmailSchema = z.object({
  email: z.string().email(),
});

export const createEventSchema = z
  .object({
    type: z.enum(TEAM_EVENT_TYPES),
    title: z.string().min(1).max(80),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    location: z.string().max(150).nullable().optional(),
    description: z.string().max(500).nullable().optional(),
    recurrence: z.enum(EVENT_RECURRENCES).default("none"),
    recurrenceUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .refine((v) => v.recurrence === "none" || !!v.recurrenceUntil, {
    message: "Date de fin de récurrence requise",
  })
  .refine((v) => !v.recurrenceUntil || v.recurrenceUntil >= v.date, {
    message: "La fin de récurrence doit être après la première date",
  })
  .refine((v) => !v.endTime || v.endTime > v.startTime, {
    message: "L'heure de fin doit être après l'heure de début",
  });
export type CreateEventInput = z.infer<typeof createEventSchema>;

// ---------- DTOs de réponses ----------
export interface UserDto {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  /** Équipe active/principale. Coach : première de `teams`. Autres rôles : leur équipe. */
  teamId: string | null;
  teamName: string | null;
  /** Coach : toutes ses équipes (U10, U13…), principale en premier. Absent pour les autres rôles. */
  teams?: CoachTeamDto[];
  /** Téléphone du profil — visible de ses relations uniquement */
  phone: string | null;
  /** Chemin de la photo de profil (null = initiales) */
  avatarUrl: string | null;
  /** Coach : son code personnel, à dicter ou faire scanner pour créer une relation */
  coachCode?: string | null;
  /** Coach : club auquel il est affilié (null si aucun) */
  clubName?: string | null;
  /** Coach : club visé par une demande d'affiliation en attente (null sinon) */
  pendingClubName?: string | null;
  /** Coach : d'où il rayonne. `source: "team"` = repli sur la ville de son équipe. */
  location?: CoachLocationDto | null;
  /** Coach : rayon du radar en km (null = sans limite) */
  radarRadiusKm?: number | null;
  /** Coach : quelles notifications il accepte de recevoir */
  notifications?: NotificationPrefsDto;
}

/** Point de référence d'un coach pour les distances, le radar et les alertes */
export interface CoachLocationDto {
  lat: number;
  lng: number;
  /** Libellé lisible (« Bron, Rhône » ou « Stade des Iris, Villeurbanne ») */
  label: string;
  /** `team` : aucune position propre, on utilise la ville de son équipe */
  source: "gps" | "address" | "team";
}

export interface NotificationPrefsDto {
  /** Une annonce est publiée dans mon périmètre */
  newAnnouncement: boolean;
  /** Une équipe propose de jouer une de mes annonces */
  announcementResponse: boolean;
  /** Ma proposition a été acceptée ou déclinée */
  responseDecision: boolean;
  /** Score final à saisir, ou saisi par l'adversaire et en attente de ma validation */
  score: boolean;
}

/** Une suggestion d'adresse renvoyée par la recherche géographique */
export interface GeoSuggestionDto {
  label: string;
  /** Commune seule, pour un libellé court */
  city: string;
  postcode: string | null;
  lat: number;
  lng: number;
}

/** Arrondi au centième de degré (~1 km) : la précision utile à un radar en km,
 *  sans conserver le domicile exact d'un coach. Partagé client/serveur pour que
 *  les deux côtés stockent et affichent exactement la même valeur. */
export function coarseCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface TeamDto {
  id: string;
  name: string;
  city: string;
}

/** Une équipe encadrée par le coach connecté, avec son rôle dessus (sélecteur "Mes équipes") */
export interface CoachTeamDto {
  id: string;
  name: string;
  city: string;
  role: TeamCoachRole;
}

/** Proposition d'un coach adverse sur une annonce (visible par l'émetteur) */
export interface AnnouncementResponseDto {
  id: string;
  team: TeamDto;
  status: ResponseStatus;
  createdAt: string;
}

export interface AnnouncementDto {
  id: string;
  team: TeamDto;
  date: string;
  time: string;
  city: string;
  stadium: string;
  category: string;
  /** null pour les annonces publiées avant l'ajout du genre */
  gender: MatchGender | null;
  level: MatchLevel;
  format: MatchFormat;
  comment: string | null;
  status: AnnouncementStatus;
  isMine: boolean;
  createdAt: string;
  /** Le coach a attesté avoir déclaré ce match amical à sa fédération */
  federationDeclared: boolean;
  /** Jours entre la publication de l'annonce et la date du match (délai FFF : 10 minimum) */
  noticeDays: number;
  /** Renseignés quand l'annonce est matchée : le match créé et l'équipe qui a répondu */
  matchId: string | null;
  opponentTeam: TeamDto | null;
  /** Distance à vol d'oiseau entre ma ville et le LIEU DU MATCH (null si ville inconnue) */
  distanceKm: number | null;
  /** Direction du lieu du match vue de chez moi : 0 = nord, sens horaire (null si ville inconnue) */
  bearingDeg: number | null;
  /** Émetteur uniquement : propositions reçues (vide sinon) */
  responses: AnnouncementResponseDto[];
  /** Coach visiteur : statut de ma proposition sur cette annonce (null si aucune) */
  myResponseStatus: ResponseStatus | null;
  /**
   * L'adversaire s'est désisté et l'annonce est repartie en recherche : elle
   * remonte en tête du radar. Le délai FFF ne s'applique plus — la déclaration
   * porte sur le match, pas sur l'identité de l'adversaire.
   */
  isSos: boolean;
  sosReason: WithdrawalReason | null;
  sosDetails: string | null;
}

/**
 * Réponse du radar. Le périmètre est appliqué côté serveur — inutile d'envoyer
 * au téléphone des annonces qu'il ne montrera pas. `beyondRadius` compte celles
 * que le périmètre a écartées, pour proposer de balayer plus large sans avoir à
 * les télécharger.
 */
export interface RadarDto {
  items: AnnouncementDto[];
  beyondRadius: number;
}

export interface MatchDto {
  id: string;
  homeTeam: TeamDto;
  awayTeam: TeamDto;
  date: string;
  time: string;
  location: string;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  /** Côté de l'équipe du spectateur (null : non rattaché à une des deux équipes) */
  mySide: MatchSide | null;
  /** Équipe dont le coach a saisi le score final (null tant qu'aucune saisie) */
  scoreSubmittedByTeamId: string | null;
  /** Horodatage de la validation par le coach adverse (null tant qu'en attente) */
  scoreConfirmedAt: string | null;
  /**
   * Jeton du QR code, exposé au seul coach ayant saisi le score pour qu'il
   * l'affiche. Toujours null pour le coach adverse : c'est le scan qui le lui
   * apporte, et c'est ce qui rend la validation infalsifiable à distance.
   */
  confirmationToken: string | null;
  /** true si le coup d'envoi est passé et que le score final reste à saisir */
  finalScoreDue: boolean;
  /** Désistement : équipe qui a renoncé, et son motif (null si le match tient toujours) */
  withdrawnByTeamId: string | null;
  withdrawalReason: WithdrawalReason | null;
  withdrawalDetails: string | null;
}

export type MatchDetailDto = MatchDto;

/** Événement du fil d'activité (espace coach) */
export interface ActivityDto {
  id: string;
  type: "announcement" | "score";
  /** Nom mis en gras côté client */
  actor: string;
  detail: string;
  createdAt: string;
}

/** Occurrence d'agenda : événement d'équipe OU match projeté */
export interface AgendaItemDto {
  /** Clé unique d'occurrence (affichage React uniquement — ne pas parser) */
  id: string;
  kind: "match" | "event";
  matchId: string | null;
  eventId: string | null;
  occurrenceDate: string;
  type: EventType;
  title: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  description: string | null;
  recurrence: EventRecurrence;
  recurrenceUntil: string | null;
  matchStatus: MatchStatus | null;
}

/** Réponse d'un joueur à une occurrence d'événement (vue coach) */
// ---------- Espace admin ----------
export interface AdminStatsDto {
  totalAccounts: number;
  byRole: Record<Role, number>;
  /** Comptes distincts connectés au moins une fois sur la période */
  active7d: number;
  active30d: number;
  teamsCount: number;
  pendingResets: number;
  /** 14 derniers jours, ordre chronologique */
  loginsPerDay: { date: string; count: number }[];
  /** 24 entrées (0h-23h) pour le jour demandé */
  loginsPerHour: { hour: number; count: number }[];
  /** Jour couvert par loginsPerHour (YYYY-MM-DD) */
  hourlyDate: string;
}

export interface AdminAccountDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  teamName: string | null;
  disabled: boolean;
  hasPendingReset: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

// ---------- Espace club ----------
export interface ClubDto {
  id: string;
  name: string;
  city: string;
  email: string | null;
  /** Code partagé aux coachs existants pour rejoindre le club (affiliation) */
  affiliationCode: string;
}

/** Une équipe du club (vue club) : encadrants et effectif */
export interface ClubTeamDto {
  id: string;
  name: string;
  city: string;
  coaches: { id: string; firstName: string; lastName: string; role: TeamCoachRole }[];
}

/** Un coach affilié au club, avec ses affectations d'équipes */
export interface ClubCoachDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  teams: { id: string; name: string; role: TeamCoachRole }[];
}

/** Tableau de bord du club : totaux + détail des équipes */
export interface ClubOverviewDto {
  club: ClubDto;
  teamsCount: number;
  coachesCount: number;
  teams: ClubTeamDto[];
}

/** Création d'un club par l'admin : identifiants affichés une seule fois */
export interface AdminCreateClubResultDto {
  club: ClubDto;
  ownerEmail: string;
  tempPassword: string;
}

/** Demande d'affiliation d'un coach en attente de validation par le club */
export interface ClubAffiliationRequestDto {
  id: string;
  coachId: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

/** Création d'un compte coach par le club : identifiants affichés une seule fois */
export interface CreateClubCoachResultDto {
  coach: { id: string; firstName: string; lastName: string; email: string };
  tempPassword: string;
}

/** Un coach du réseau de relations : contact + contexte sportif */
export interface CoachRelationDto {
  id: string;
  firstName: string;
  lastName: string;
  /** null si le coach n'a pas renseigné son numéro */
  phone: string | null;
  avatarUrl: string | null;
  clubName: string | null;
  teams: TeamDto[];
  createdAt: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}
