import { sql } from "drizzle-orm";
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

export const userRole = pgEnum("user_role", ["coach", "player", "parent", "supporter", "admin", "club"]);
// Rôle d'un coach au sein d'une équipe (une équipe peut avoir plusieurs coachs).
export const teamCoachRole = pgEnum("team_coach_role", ["principal", "adjoint"]);
export const announcementStatus = pgEnum("announcement_status", ["open", "matched", "cancelled"]);
export const matchStatus = pgEnum("match_status", [
  "scheduled",
  "live",
  "awaiting_confirmation",
  "finished",
  "cancelled",
]);
// Motif du désistement d'un coach sur un match confirmé
export const withdrawalReason = pgEnum("withdrawal_reason", ["blessure", "meteo", "terrain", "personnel"]);
export const attendanceStatus = pgEnum("attendance_status", ["present", "absent"]);
export const matchEventType = pgEnum("match_event_type", ["goal", "card", "substitution", "highlight"]);
export const matchSide = pgEnum("match_side", ["home", "away"]);
export const bookingStatus = pgEnum("booking_status", ["pending", "approved", "declined"]);
export const responseStatus = pgEnum("response_status", ["pending", "accepted", "declined"]);
export const matchLevel = pgEnum("match_level", ["loisir", "competition"]);
export const matchFormat = pgEnum("match_format", ["5v5", "8v8", "11v11"]);
// Genre de l'équipe, à côté de la catégorie d'âge (et non fondu dedans)
export const matchGender = pgEnum("match_gender", ["masculin", "feminin", "mixte"]);
export const playerPosition = pgEnum("player_position", ["gardien", "defenseur", "milieu", "attaquant"]);
// Types d'événements d'agenda créables — les matchs ne sont PAS stockés ici,
// ils sont projetés dans l'agenda à la lecture (zéro double saisie).
export const teamEventType = pgEnum("team_event_type", ["entrainement", "tournoi", "reunion", "autre"]);
export const eventRecurrence = pgEnum("event_recurrence", ["none", "weekly"]);
export const joinRequestStatus = pgEnum("join_request_status", ["pending", "approved", "declined"]);
export const resetRequestStatus = pgEnum("reset_request_status", ["pending", "handled"]);
// D'où vient la position d'un coach : géolocalisation du navigateur, ou adresse
// qu'il a saisie. NULL = aucune position propre, on retombe sur son équipe.
export const locationSource = pgEnum("location_source", ["gps", "address"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  teamId: uuid("team_id"),
  // Coach : club auquel il est affilié (NULL = coach indépendant, sans club)
  clubId: uuid("club_id").references((): any => clubs.id),
  // Profil : partagés avec les coachs de son réseau de relations
  phone: text("phone"),
  // Code personnel du coach : à dicter ou à faire scanner pour créer une relation
  coachCode: text("coach_code").unique(),
  // Nom du fichier photo dans le volume d'uploads (NULL = initiales)
  avatarPath: text("avatar_path"),
  // Joueur : compte parent assigné (valide ses réservations de covoiturage)
  parentId: uuid("parent_id"),
  // Joueur : fiche sportive renseignée par le coach
  position: playerPosition("position"),
  jerseyNumber: integer("jersey_number"),
  // Parent : infos conducteur, requises pour proposer un covoiturage
  licensePlate: text("license_plate"),
  driverLicenseNumber: text("driver_license_number"),
  // ————— Position du coach —————
  // Point de référence des distances et du radar. Prime sur la ville de son
  // équipe, qui reste le repli quand rien n'est renseigné. Coordonnées
  // arrondies au centième de degré (~1 km) : la précision utile pour un radar
  // en kilomètres, sans conserver le domicile exact.
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  // Libellé lisible de la position (« Bron, Rhône »), affiché tel quel
  locationLabel: text("location_label"),
  locationSource: locationSource("location_source"),
  // Rayon du radar, en km. NULL = sans limite. Sert aussi côté serveur à
  // décider qui notifier d'une nouvelle annonce.
  radarRadiusKm: integer("radar_radius_km").default(50),
  // Quelles notifications ce coach accepte (l'abonnement push conditionne tout)
  notifyNewAnnouncement: boolean("notify_new_announcement").notNull().default(true),
  notifyAnnouncementResponse: boolean("notify_announcement_response").notNull().default(true),
  notifyResponseDecision: boolean("notify_response_decision").notNull().default(true),
  notifyScore: boolean("notify_score").notNull().default(true),
  // Compte désactivé par l'admin : connexion et refresh refusés
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Un abonnement Web Push par navigateur/appareil. L'endpoint identifie de façon
 * unique le canal côté service de push : c'est lui la clé naturelle.
 * Une ligne disparaît dès que le service répond 404/410 (abonnement révoqué).
 */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Une ligne par connexion réussie — alimente les stats admin (actifs, par jour/heure)
export const loginEvents = pgTable("login_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: userRole("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Demande "mot de passe oublié" : visible par l'admin qui génère un mot de
// passe temporaire (pas d'envoi d'email dans cette version).
export const passwordResetRequests = pgTable(
  "password_reset_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: resetRequestStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    handledAt: timestamp("handled_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("reset_requests_pending_user_idx").on(t.userId).where(sql`status = 'pending'`)],
);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  // Coordonnées approximatives de la ville (annuaire statique, pas d'API externe)
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  // Club propriétaire de l'équipe (NULL = équipe d'un coach indépendant, sans club)
  clubId: uuid("club_id").references(() => clubs.id),
  // Affectation des coachs : voir table team_coaches (une équipe peut avoir
  // plusieurs coachs, un coach plusieurs équipes). Colonne conservée en transition,
  // désormais nullable et non-unique ; les lectures migrent vers team_coaches.
  coachId: uuid("coach_id").references(() => users.id),
  // Code d'équipe unique partagé aux joueurs/parents pour rejoindre en autonomie
  joinCode: text("join_code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Un club = une entité propriétaire de plusieurs équipes, à laquelle des coachs
// sont affiliés. Le compte de connexion du club est un users(role="club") pointé
// par ownerId. affiliationCode permet à un coach existant de rejoindre le club.
export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  email: text("email"),
  ownerId: uuid("owner_id")
    .notNull()
    .unique()
    .references(() => users.id),
  affiliationCode: text("affiliation_code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Affectation coach ↔ équipe (N:N). Une équipe peut avoir un coach "principal"
// et des "adjoints" ; un coach peut être affecté à plusieurs équipes du club.
export const teamCoaches = pgTable(
  "team_coaches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: teamCoachRole("role").notNull().default("principal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("team_coaches_team_coach_idx").on(t.teamId, t.coachId)],
);

// Demande d'affiliation d'un coach existant à un club, via le code d'affiliation.
// Le coach initie (il connaît le code) ; le club valide. À l'acceptation :
// users.clubId du coach = clubId.
export const clubAffiliationRequests = pgTable(
  "club_affiliation_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    status: joinRequestStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("club_affiliation_pending_coach_idx").on(t.coachId).where(sql`status = 'pending'`)],
);

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
  // NULL pour les annonces publiées avant l'ajout du genre : on ne devine pas
  // rétroactivement le genre d'une équipe.
  gender: matchGender("gender"),
  level: matchLevel("level").notNull().default("loisir"),
  format: matchFormat("format").notNull().default("11v11"),
  comment: text("comment"),
  status: announcementStatus("status").notNull().default("open"),
  // Attestation du coach : le match amical a été déclaré à la fédération (délai FFF de 10 jours)
  federationDeclared: boolean("federation_declared").notNull().default(false),
  // SOS : l'annonce est repartie en recherche parce que l'adversaire s'est
  // désisté. Elle passe en tête du radar, motif affiché aux autres coachs.
  isSos: boolean("is_sos").notNull().default(false),
  sosReason: withdrawalReason("sos_reason"),
  sosDetails: text("sos_details"),
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
  // Pas d'unicité : après un désistement l'annonce repart en SOS et peut donner
  // un second match. Seul le match non annulé fait foi (voir loadMatchLinks).
  announcementId: uuid("announcement_id")
    .notNull()
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
  // Conservée pour compatibilité : plus utilisée depuis que le score final
  // est saisi par l'un des deux coachs puis validé par l'autre.
  awayCoachCanEdit: boolean("away_coach_can_edit").notNull().default(false),
  // Validation du score final : un coach saisit, l'autre valide en scannant le
  // QR code. Le jeton est régénéré à chaque saisie (invalide le QR précédent).
  scoreSubmittedByTeamId: uuid("score_submitted_by_team_id").references(() => teams.id),
  scoreSubmittedAt: timestamp("score_submitted_at", { withTimezone: true }),
  scoreConfirmedAt: timestamp("score_confirmed_at", { withTimezone: true }),
  confirmationToken: text("confirmation_token"),
  // Désistement avant le coup d'envoi : qui a renoncé, pourquoi, et quand.
  withdrawnByTeamId: uuid("withdrawn_by_team_id").references(() => teams.id),
  withdrawalReason: withdrawalReason("withdrawal_reason"),
  withdrawalDetails: text("withdrawal_details"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
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

// Demande d'adhésion à une équipe via son code unique. Le compte users est créé
// dès l'inscription (teamId NULL) ; le coach accepte ou refuse. À l'acceptation :
// users.teamId est posé, et pour un parent child.parentId = demandeur.
export const joinRequests = pgTable(
  "join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    role: userRole("role").notNull(),
    // Parent : joueur désigné comme son enfant (le coach peut corriger à l'acceptation)
    childUserId: uuid("child_user_id").references(() => users.id, { onDelete: "cascade" }),
    status: joinRequestStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("join_requests_pending_user_idx").on(t.userId).where(sql`status = 'pending'`)],
);

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

// Réseau de relations entre coachs. Le lien est réciproque : ajouter quelqu'un
// insère les deux lignes, si bien que « mes relations » est une simple lecture
// sur coach_id, sans OR ni normalisation d'ordre.
export const coachRelations = pgTable(
  "coach_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    relatedCoachId: uuid("related_coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("coach_relations_pair_idx").on(t.coachId, t.relatedCoachId)],
);
