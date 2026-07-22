import {
  boolean,
  date,
  doublePrecision,
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
export const responseStatus = pgEnum("response_status", ["pending", "accepted", "declined"]);
export const matchLevel = pgEnum("match_level", ["loisir", "competition"]);
export const matchFormat = pgEnum("match_format", ["5v5", "8v8", "11v11"]);
export const playerPosition = pgEnum("player_position", ["gardien", "defenseur", "milieu", "attaquant"]);
// Types d'événements d'agenda créables — les matchs ne sont PAS stockés ici,
// ils sont projetés dans l'agenda à la lecture (zéro double saisie).
export const teamEventType = pgEnum("team_event_type", ["entrainement", "tournoi", "reunion", "autre"]);
export const eventRecurrence = pgEnum("event_recurrence", ["none", "weekly"]);

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
  // Joueur : fiche sportive renseignée par le coach
  position: playerPosition("position"),
  jerseyNumber: integer("jersey_number"),
  // Parent : infos conducteur, requises pour proposer un covoiturage
  licensePlate: text("license_plate"),
  driverLicenseNumber: text("driver_license_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  // Coordonnées approximatives de la ville (annuaire statique, pas d'API externe)
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
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
  level: matchLevel("level").notNull().default("loisir"),
  format: matchFormat("format").notNull().default("11v11"),
  comment: text("comment"),
  status: announcementStatus("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Proposition d'un coach sur une annonce. L'annonce reste "open" (visible au radar)
// tant que le coach émetteur n'a pas accepté une proposition — c'est l'acceptation
// qui crée le match et passe l'annonce en "matched".
export const announcementResponses = pgTable(
  "announcement_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    announcementId: uuid("announcement_id")
      .notNull()
      .references(() => matchAnnouncements.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    status: responseStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("announcement_responses_ann_team_idx").on(t.announcementId, t.teamId)],
);

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
  // Le coach émetteur de l'annonce (équipe domicile) peut autoriser le coach
  // adverse à éditer score et temps forts ; par défaut lui seul le peut.
  awayCoachCanEdit: boolean("away_coach_can_edit").notNull().default(false),
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
    // Conducteur : heure et quartier de départ affichés aux joueurs
    departureTime: time("departure_time"),
    departureArea: text("departure_area"),
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

// Composition d'équipe pour un match (placement libre style FIFA, coordonnées en %).
// La compo adverse n'est révélée que 2h avant le coup d'envoi.
export const lineups = pgTable(
  "lineups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerUserId: uuid("player_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    posX: integer("pos_x").notNull(),
    posY: integer("pos_y").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lineups_match_player_idx").on(t.matchId, t.playerUserId)],
);

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
  position: playerPosition("position"),
  jerseyNumber: integer("jersey_number"),
  playerUserId: uuid("player_user_id").references(() => users.id, { onDelete: "cascade" }),
  usedByUserId: uuid("used_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Événement d'agenda d'équipe (entraînement, tournoi, réunion…).
// recurrence=weekly : occurrences générées à la lecture jusqu'à recurrence_until.
export const teamEvents = pgTable("team_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  type: teamEventType("type").notNull(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time"),
  location: text("location"),
  description: text("description"),
  recurrence: eventRecurrence("recurrence").notNull().default("none"),
  recurrenceUntil: date("recurrence_until"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Réponse de présence à UNE occurrence d'un événement (un entraînement hebdo
// a une réponse par date). Les présences aux matchs restent dans attendances.
export const eventAttendances = pgTable(
  "event_attendances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => teamEvents.id, { onDelete: "cascade" }),
    occurrenceDate: date("occurrence_date").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: attendanceStatus("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("event_att_event_date_user_idx").on(t.eventId, t.occurrenceDate, t.userId)],
);

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
