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

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}
