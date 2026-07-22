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

export const MATCH_LEVELS = ["loisir", "competition"] as const;
export type MatchLevel = (typeof MATCH_LEVELS)[number];

export const MATCH_FORMATS = ["5v5", "8v8", "11v11"] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

export const PLAYER_POSITIONS = ["gardien", "defenseur", "milieu", "attaquant"] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

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

export const registerInviteSchema = z.object({
  code: z.string().min(4).max(12),
  email: z.string().email(),
  password: z.string().min(8, "8 caractères minimum"),
  // Renseignés par le parent à l'inscription (le joueur a déjà son nom via l'invitation)
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});
export type RegisterInviteInput = z.infer<typeof registerInviteSchema>;

export const createPlayerInviteSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  position: z.enum(PLAYER_POSITIONS).optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
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

export const setAttendanceSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES),
  canTransport: z.boolean().optional(),
  transportSeats: z.number().int().min(0).max(9).optional(),
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
}

export interface TeamDto {
  id: string;
  name: string;
  city: string;
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
}

export interface MatchEventDto {
  id: string;
  minute: number;
  type: MatchEventType;
  side: MatchSide;
  description: string;
  createdAt: string;
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
  presentCount: number;
  absentCount: number;
  transportSeats: number;
  myAttendance: {
    status: AttendanceStatus;
    canTransport: boolean;
    transportSeats: number;
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

/** Aperçu d'une invitation (écran de confirmation avant inscription) */
export interface InvitationInfoDto {
  role: Extract<Role, "player" | "parent">;
  teamName: string;
  firstName: string | null;
  lastName: string | null;
  /** Pour un parent : nom du joueur auquel il sera lié */
  playerName: string | null;
}

/** Ligne de l'effectif côté coach */
export interface TeamMemberDto {
  id: string;
  firstName: string;
  lastName: string;
  accountStatus: "active" | "invited";
  inviteCode: string | null;
  parentStatus: "linked" | "invited" | "none";
  parentName: string | null;
  parentInviteCode: string | null;
  position: PlayerPosition | null;
  jerseyNumber: number | null;
  /** Réponse au prochain match programmé — null s'il n'y a pas de match à venir */
  nextMatchStatus: AttendanceStatus | "pending" | null;
}

export interface LineupPlayerDto {
  playerId: string;
  firstName: string;
  lastName: string;
  x: number;
  y: number;
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

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}
