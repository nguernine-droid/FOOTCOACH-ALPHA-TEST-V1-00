import { z } from "zod";

// ---------- Enums ----------
export const ROLES = ["coach", "player", "parent", "supporter"] as const;
export type Role = (typeof ROLES)[number];

export const ANNOUNCEMENT_STATUSES = ["open", "matched", "cancelled"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const MATCH_STATUSES = ["scheduled", "live", "finished"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const ATTENDANCE_STATUSES = ["present", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const MATCH_EVENT_TYPES = ["goal", "card", "substitution", "highlight"] as const;
export type MatchEventType = (typeof MATCH_EVENT_TYPES)[number];

export const MATCH_SIDES = ["home", "away"] as const;
export type MatchSide = (typeof MATCH_SIDES)[number];

export const BOOKING_STATUSES = ["pending", "approved", "declined"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const RESPONSE_STATUSES = ["pending", "accepted", "declined"] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export const MATCH_LEVELS = ["loisir", "competition"] as const;
export type MatchLevel = (typeof MATCH_LEVELS)[number];

export const MATCH_FORMATS = ["5v5", "8v8", "11v11"] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

export const PLAYER_POSITIONS = ["gardien", "defenseur", "milieu", "attaquant"] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

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
  category: z.string().min(1).max(50),
  level: z.enum(MATCH_LEVELS),
  format: z.enum(MATCH_FORMATS),
  comment: z.string().max(500).optional(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateScoreSchema = z.object({
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
  status: z.enum(MATCH_STATUSES).optional(),
});
export type UpdateScoreInput = z.infer<typeof updateScoreSchema>;

export const updateEditAuthorizationSchema = z.object({
  awayCoachCanEdit: z.boolean(),
});
export type UpdateEditAuthorizationInput = z.infer<typeof updateEditAuthorizationSchema>;

export const createMatchEventSchema = z.object({
  minute: z.number().int().min(0).max(150),
  type: z.enum(MATCH_EVENT_TYPES),
  side: z.enum(MATCH_SIDES),
  description: z.string().min(1).max(300),
});
export type CreateMatchEventInput = z.infer<typeof createMatchEventSchema>;

export const registerCoachSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8, "8 caractères minimum"),
  teamName: z.string().min(2).max(60),
  teamCity: z.string().min(1).max(60),
});
export type RegisterCoachInput = z.infer<typeof registerCoachSchema>;

export const JOIN_REQUEST_STATUSES = ["pending", "approved", "declined"] as const;
export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUSES)[number];

// Inscription en autonomie avec le code d'équipe unique (joueur ou parent)
export const registerJoinSchema = z
  .object({
    code: z.string().min(4).max(12),
    role: z.enum(["player", "parent"]),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z.string().email(),
    password: z.string().min(8, "8 caractères minimum"),
    // Joueur : fiche sportive optionnelle (le coach garde la main ensuite)
    position: z.enum(PLAYER_POSITIONS).optional(),
    jerseyNumber: z.number().int().min(1).max(99).optional(),
    // Parent : joueur désigné comme son enfant
    childUserId: z.string().uuid().optional(),
  })
  .refine((v) => v.role !== "parent" || !!v.childUserId, { message: "Choisissez votre enfant dans la liste" });
export type RegisterJoinInput = z.infer<typeof registerJoinSchema>;

// Nouvelle demande d'un compte existant (refusé ou sans équipe)
export const resubmitJoinSchema = z.object({
  code: z.string().min(4).max(12),
  position: z.enum(PLAYER_POSITIONS).optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  childUserId: z.string().uuid().optional(),
});
export type ResubmitJoinInput = z.infer<typeof resubmitJoinSchema>;

export const approveJoinRequestSchema = z.object({
  /** Le coach peut corriger l'enfant désigné par un parent avant d'accepter */
  childUserId: z.string().uuid().optional(),
});

export const updatePlayerSchema = z.object({
  position: z.enum(PLAYER_POSITIONS).nullable().optional(),
  jerseyNumber: z.number().int().min(1).max(99).nullable().optional(),
});
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>;

export const driverInfoSchema = z.object({
  licensePlate: z
    .string()
    .min(4)
    .max(15)
    .regex(/^[A-Za-z0-9 -]+$/, "Format de plaque invalide"),
  driverLicenseNumber: z
    .string()
    .min(5)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Format de permis invalide"),
});
export type DriverInfoInput = z.infer<typeof driverInfoSchema>;

export const saveLineupSchema = z.object({
  players: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        x: z.number().int().min(0).max(100),
        y: z.number().int().min(0).max(100),
      }),
    )
    .max(15),
});
export type SaveLineupInput = z.infer<typeof saveLineupSchema>;

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

export const setEventAttendanceSchema = z.object({
  /** Occurrence visée (= date de l'événement, ou date + k semaines si récurrent) */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(ATTENDANCE_STATUSES),
});
export type SetEventAttendanceInput = z.infer<typeof setEventAttendanceSchema>;

export const setAttendanceSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES),
  canTransport: z.boolean().optional(),
  transportSeats: z.number().int().min(0).max(9).optional(),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  departureArea: z.string().max(80).nullable().optional(),
});
export type SetAttendanceInput = z.infer<typeof setAttendanceSchema>;

// ---------- DTOs de réponses ----------
export interface UserDto {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  teamId: string | null;
  teamName: string | null;
  /** Parent : infos conducteur renseignées (requises pour proposer un covoiturage) */
  hasDriverInfo: boolean;
  /** Joueur : id du compte parent assigné (ses réservations devront être validées) */
  parentId: string | null;
  /** Joueur : fiche sportive (optionnels — absents des sessions stockées avant leur ajout) */
  position?: PlayerPosition | null;
  jerseyNumber?: number | null;
  /** Joueur/parent sans équipe : état de sa dernière demande d'adhésion */
  joinRequestStatus?: JoinRequestStatus | null;
  pendingTeamName?: string | null;
}

export interface TeamDto {
  id: string;
  name: string;
  city: string;
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
  level: MatchLevel;
  format: MatchFormat;
  comment: string | null;
  status: AnnouncementStatus;
  isMine: boolean;
  createdAt: string;
  /** Renseignés quand l'annonce est matchée : le match créé et l'équipe qui a répondu */
  matchId: string | null;
  opponentTeam: TeamDto | null;
  /** Distance à vol d'oiseau entre ma ville et celle de l'annonceur (null si ville inconnue) */
  distanceKm: number | null;
  /** Émetteur uniquement : propositions reçues (vide sinon) */
  responses: AnnouncementResponseDto[];
  /** Coach visiteur : statut de ma proposition sur cette annonce (null si aucune) */
  myResponseStatus: ResponseStatus | null;
}

export interface MatchEventDto {
  id: string;
  minute: number;
  type: MatchEventType;
  side: MatchSide;
  description: string;
  createdAt: string;
}

/** Présence d'un coéquipier vue par un membre de l'équipe (joueur/parent) */
export interface TeamPresenceDto {
  userId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: PlayerPosition | null;
  /** null = pas encore répondu */
  status: AttendanceStatus | null;
}

export interface AttendanceDto {
  userId: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: AttendanceStatus;
  canTransport: boolean;
  transportSeats: number;
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
  /** true si le coach émetteur a autorisé le coach adverse à éditer score/temps forts */
  awayCoachCanEdit: boolean;
  presentCount: number;
  absentCount: number;
  transportSeats: number;
  myAttendance: {
    status: AttendanceStatus;
    canTransport: boolean;
    transportSeats: number;
    departureTime: string | null;
    departureArea: string | null;
  } | null;
}

export interface MatchDetailDto extends MatchDto {
  events: MatchEventDto[];
}

export interface CarpoolBookingDto {
  id: string;
  playerId: string;
  playerName: string;
  status: BookingStatus;
}

export interface CarpoolDto {
  driverId: string;
  driverName: string;
  licensePlate: string | null;
  departureTime: string | null;
  departureArea: string | null;
  seatsTotal: number;
  seatsRemaining: number;
  bookings: CarpoolBookingDto[];
  myBooking: { id: string; status: BookingStatus } | null;
}

export interface ApprovalDto {
  id: string;
  playerName: string;
  driverName: string;
  licensePlate: string | null;
  matchLabel: string;
  matchDate: string;
  status: BookingStatus;
}

/** Aperçu public d'une équipe via son code (écran "vous allez rejoindre…") */
export interface TeamJoinInfoDto {
  teamName: string;
  city: string;
  /** Joueurs inscrits — pour qu'un parent désigne son enfant */
  players: { id: string; firstName: string; lastName: string; hasParent: boolean }[];
}

/** Demande d'adhésion en attente, vue coach */
export interface JoinRequestDto {
  id: string;
  role: Extract<Role, "player" | "parent">;
  firstName: string;
  lastName: string;
  email: string;
  position: PlayerPosition | null;
  jerseyNumber: number | null;
  childUserId: string | null;
  childName: string | null;
  createdAt: string;
}

/** Ligne de l'effectif côté coach */
export interface TeamMemberDto {
  id: string;
  firstName: string;
  lastName: string;
  parentStatus: "linked" | "none";
  parentName: string | null;
  position: PlayerPosition | null;
  jerseyNumber: number | null;
  /** Réponse au prochain match programmé — null s'il n'y a pas de match à venir */
  nextMatchStatus: AttendanceStatus | "pending" | null;
  nextMatchDate: string | null;
}

export interface LineupPlayerDto {
  playerId: string;
  firstName: string;
  lastName: string;
  position: PlayerPosition | null;
  jerseyNumber: number | null;
  x: number;
  y: number;
}

/** Événement du fil d'activité (espace coach) */
export interface ActivityDto {
  id: string;
  type: "attendance" | "carpool" | "announcement";
  /** Nom mis en gras côté client */
  actor: string;
  detail: string;
  createdAt: string;
}

export interface LineupDto {
  /** Ma composition (coach) */
  mine: LineupPlayerDto[];
  /** Compo adverse — null tant qu'elle est verrouillée (> 2h avant le match) */
  opponent: LineupPlayerDto[] | null;
  opponentLocked: boolean;
  /** Date/heure ISO à partir de laquelle la compo adverse devient visible */
  opponentVisibleAt: string;
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
  /** Compteurs filtrés sur l'équipe du demandeur */
  presentCount: number;
  absentCount: number;
  /** Ma réponse à cette occurrence (null si pas répondu / non concerné) */
  myStatus: AttendanceStatus | null;
  matchStatus: MatchStatus | null;
  /** true si le début est à moins de 24h : réponses verrouillées */
  locked: boolean;
}

/** Réponse d'un joueur à une occurrence d'événement (vue coach) */
export interface EventAttendanceDto {
  userId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  status: AttendanceStatus | null;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}
