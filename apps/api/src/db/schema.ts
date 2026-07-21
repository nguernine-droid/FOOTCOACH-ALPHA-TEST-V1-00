import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["coach", "player", "parent", "supporter"]);
export const announcementStatus = pgEnum("announcement_status", ["open", "matched", "cancelled"]);
export const matchStatus = pgEnum("match_status", ["scheduled", "live", "finished"]);
export const attendanceStatus = pgEnum("attendance_status", ["present", "absent"]);
export const matchEventType = pgEnum("match_event_type", ["goal", "card", "substitution", "highlight"]);
export const matchSide = pgEnum("match_side", ["home", "away"]);
export const bookingStatus = pgEnum("booking_status", ["pending", "approved", "declined"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  teamId: uuid("team_id"),
  // Joueur : compte parent assigné (valide ses réservations de covoiturage)
  parentId: uuid("parent_id"),
  // Parent : infos conducteur, requises pour proposer un covoiturage
  licensePlate: text("license_plate"),
  driverLicenseNumber: text("driver_license_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  coachId: uuid("coach_id")
    .notNull()
    .unique()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matchAnnouncements = pgTable("match_announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id),
  date: date("date").notNull(),
  time: time("time").notNull(),
  city: text("city").notNull(),
  stadium: text("stadium").notNull(),
  category: text("category").notNull(),
  comment: text("comment"),
  status: announcementStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  announcementId: uuid("announcement_id")
    .notNull()
    .unique()
    .references(() => matchAnnouncements.id),
  homeTeamId: uuid("home_team_id")
    .notNull()
    .references(() => teams.id),
  awayTeamId: uuid("away_team_id")
    .notNull()
    .references(() => teams.id),
  date: date("date").notNull(),
  time: time("time").notNull(),
  location: text("location").notNull(),
  status: matchStatus("status").notNull().default("scheduled"),
  homeScore: integer("home_score").notNull().default(0),
  awayScore: integer("away_score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendances = pgTable(
  "attendances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: attendanceStatus("status").notNull(),
    canTransport: boolean("can_transport").notNull().default(false),
    transportSeats: integer("transport_seats").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("attendances_match_user_idx").on(t.matchId, t.userId)],
);

export const matchEvents = pgTable("match_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  minute: integer("minute").notNull(),
  type: matchEventType("type").notNull(),
  side: matchSide("side").notNull(),
  description: text("description").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Réservation d'une place dans la voiture d'un parent pour un match.
// pending = en attente de validation par le parent assigné du joueur.
export const carpoolBookings = pgTable("carpool_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: bookingStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Codes d'invitation générés par le coach.
// role=player : crée un compte joueur dans l'équipe.
// role=parent : crée un compte parent lié au joueur (player_user_id).
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  role: userRole("role").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  playerUserId: uuid("player_user_id").references(() => users.id, { onDelete: "cascade" }),
  usedByUserId: uuid("used_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
