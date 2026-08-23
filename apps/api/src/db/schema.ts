import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
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
/**
 * Casquettes qu'un coach se donne lui-même, cumulables. Distinctes de son rôle
 * de compte : elles ne changent pas ses droits, elles disent ce qu'il accepte
 * de faire pour les autres.
 *
 * `joker` a un effet immédiat — lui seul est alerté des SOS. `contributeur`
 * annonce un coach qui publie beaucoup : c'est une intention affichée, sans
 * effet technique pour l'instant, que la V2 pourra reconnaître.
 *
 * Les deux se choisissent à l'inscription et se rechangent au profil.
 */
export const coachCategory = pgEnum("coach_category", ["joker", "contributeur"]);
// Rôle d'un coach au sein d'une équipe (une équipe peut avoir plusieurs coachs).
export const teamCoachRole = pgEnum("team_coach_role", ["principal", "adjoint"]);
// Où une équipe accepte de jouer le jour qu'elle a déclaré libre. `any` est
// le cas le plus fréquent : sans créneau réservé, un coach joue où on veut.
export const availabilityVenue = pgEnum("availability_venue", ["home", "away", "any"]);
// Nature d'une relance déjà envoyée. `suggestion` : des équipes répondent à
// une date que j'ai déclarée. `free_weekend` : je n'ai rien déclaré et ce
// week-end est vide dans mon agenda.
export const availabilityNoticeKind = pgEnum("availability_notice_kind", ["suggestion", "free_weekend"]);
// Qui siffle l'amical. `tbd` est un état réel du dossier, pas un trou.
export const refereeBy = pgEnum("referee_by", ["tbd", "home", "away", "official"]);
// D'où vient une ligne du référentiel des districts. `annuaire` : trouvée au
// registre officiel des associations, nom légal et SIREN à l'appui.
// `manuel` : saisie faute d'y figurer sous une forme trouvable — donc à
// vérifier, et l'écran d'administration la présente comme telle.
export const districtSource = pgEnum("district_source", ["annuaire", "manuel"]);
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
// Pourquoi des points ont été attribués. Le motif est stocké et non recalculé :
// une annonce cesse d'être en SOS une fois pourvue, la raison du bonus doit
// survivre à ce changement d'état.
//
// `tournoi` : équipe venue et pointée à l'arrivée. `organisation` : le coach
// qui a monté le tournoi, crédité une seule fois quel que soit le nombre
// d'équipes — sinon organiser deviendrait la façon la plus rapide de monter
// en palier.
export const pointReason = pgEnum("point_reason", ["rencontre", "sos", "tournoi", "organisation"]);
// Un tournoi ne se « matche » pas : il est ouvert aux inscriptions, ou annulé.
// « Complet » n'est pas un état stocké — il se déduit du nombre d'inscrits, qui
// varie à chaque désistement.
export const tournamentStatus = pgEnum("tournament_status", ["open", "cancelled"]);
// Inscription d'une équipe. La ligne est conservée après un retrait : c'est
// elle qui garde la trace du désistement à l'origine d'un SOS.
export const tournamentRegistrationStatus = pgEnum("tournament_registration_status", [
  "registered",
  "withdrawn",
]);
export const attendanceStatus = pgEnum("attendance_status", ["present", "absent"]);
export const matchEventType = pgEnum("match_event_type", ["goal", "card", "substitution", "highlight"]);
export const matchSide = pgEnum("match_side", ["home", "away"]);
export const bookingStatus = pgEnum("booking_status", ["pending", "approved", "declined"]);
export const responseStatus = pgEnum("response_status", ["pending", "accepted", "declined"]);
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
// Qui parle dans une conversation. `system` = l'application elle-même, qui
// inscrit le match convenu à l'ouverture du fil et à chaque nouvelle rencontre.
export const messageKind = pgEnum("message_kind", ["coach", "system"]);
// D'où vient la position d'un coach : géolocalisation du navigateur, ou adresse
// qu'il a saisie. NULL = aucune position propre, on retombe sur son équipe.
export const locationSource = pgEnum("location_source", ["gps", "address"]);
// Un bug se constate, une suggestion se propose : même canal vers l'admin,
// deux intentions à distinguer dans l'inbox de triage.
export const feedbackType = pgEnum("feedback_type", ["bug", "suggestion"]);
export const feedbackStatus = pgEnum("feedback_status", ["nouveau", "en_cours", "resolu", "refuse"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull(),
  /**
   * Surnom choisi à l'inscription : l'identité affichée aux autres coachs —
   * la seule qui sorte du compte. Backfillé depuis `first_name` pour les
   * comptes antérieurs (migration 0032).
   */
  nickname: text("nickname").notNull(),
  /**
   * État civil, facultatif depuis l'arrivée du surnom (chaîne vide = non
   * renseigné, pas un NULL à interpréter). Visible du seul titulaire et des
   * gestionnaires de comptes (admin, club) — jamais des confrères.
   */
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  teamId: uuid("team_id"),
  // Coach : club auquel il est affilié (NULL = coach indépendant, sans club)
  clubId: uuid("club_id").references((): any => clubs.id),
  // Profil : partagés avec les coachs de son réseau de relations
  phone: text("phone"),
  /**
   * Numéro de licence d'éducateur, facultatif. Distinct de
   * `driver_license_number` juste dessous, qui est un permis de conduire de
   * parent conducteur — deux « licences » sans rapport, d'où le préfixe.
   *
   * Donnée administrative et identifiante : servie au seul titulaire, jamais
   * aux autres coachs ni sur les fiches de relations. Rien ne s'appuie dessus
   * pour l'instant ; elle est recueillie parce qu'un coach l'a sous la main à
   * l'inscription et beaucoup moins le jour où elle servira.
   */
  coachLicenseNumber: text("coach_license_number"),
  // Code personnel du coach : à dicter ou à faire scanner pour créer une relation
  coachCode: text("coach_code").unique(),
  /**
   * Jeton du flux ICS d'abonnement (agenda du téléphone). NULL = agenda non
   * lié. C'est un secret de type capability : l'URL du flux est consultée par
   * les calendriers sans session, ce jeton est donc la seule barrière d'accès.
   * Délier = le mettre à NULL ; relier en génère un nouveau, l'ancien lien
   * meurt.
   */
  calendarToken: text("calendar_token").unique(),
  /**
   * Casquettes du coach, cumulables. Tableau vide = « aucune », le cas courant :
   * c'est une valeur en soi et non une donnée manquante, d'où le NOT NULL avec
   * défaut `{}` plutôt qu'un NULL qu'il faudrait interpréter partout.
   */
  coachCategories: coachCategory("coach_categories").array().notNull().default([]),
  /**
   * Profil public ou privé — ce que voient les coachs du VOISINAGE, ceux qui ne
   * se sont pas encore croisés (liste des coachs de ma catégorie).
   *
   * `false` : seul le surnom apparaît dans cette liste, rien d'autre. Le reste
   * de l'application ne change pas — une annonce publiée continue de montrer
   * qui la publie, un match convenu de montrer l'adversaire : ce sont des gens
   * avec qui on s'est engagé, pas des inconnus qui passent.
   *
   * Défaut `true` : c'est l'état des comptes créés avant ce réglage, et la
   * question est posée explicitement à l'inscription pour que le choix soit fait
   * en connaissance de cause.
   */
  profilePublic: boolean("profile_public").notNull().default(true),
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
  notifyMessage: boolean("notify_message").notNull().default(true),
  /**
   * Relance des week-ends libres : « vos U13 n'ont pas de match le 11 octobre ».
   * Sa propre préférence et non celle des annonces neuves : celle-ci parle de
   * ce que font les AUTRES, celle-là de ce que fait — ou ne fait pas — ma
   * propre équipe. Un coach peut vouloir l'une sans l'autre.
   */
  notifyFreeWeekend: boolean("notify_free_weekend").notNull().default(true),
  // Compte désactivé par l'admin : connexion et refresh refusés
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  // ————— Acceptation des conditions —————
  // Trace de l'acceptation donnée à l'inscription : quand, et pour QUEL texte.
  // La version compte autant que la date — une acceptation ne vaut que pour le
  // texte qu'elle visait. Nullable : les comptes créés avant la mise en place
  // de l'écran d'acceptation n'ont rien accepté, et cela doit se voir.
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  termsVersion: text("terms_version"),
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

/**
 * Tentatives de connexion, réussies comme échouées — frein partagé entre
 * réplicas sur le devinage de mot de passe (voir lib/loginThrottle.ts).
 *
 * Table distincte de `login_events` à dessein : celle-là ne compte que les
 * réussites et nourrit les statistiques admin (comptes actifs, connexions par
 * jour et par heure). Y verser les échecs aurait faussé tous ces chiffres.
 *
 * `email_key` est une empreinte SHA-256, jamais l'adresse en clair : la table
 * contiendrait sinon la liste des adresses ESSAYÉES, y compris celles qui ne
 * correspondent à aucun compte.
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailKey: text("email_key").notNull(),
    // Enregistrée pour constater une attaque après coup, jamais utilisée comme
    // critère de blocage : sans TRUST_PROXY, c'est l'adresse du conteneur web.
    ip: text("ip"),
    succeeded: boolean("succeeded").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Le comptage lit toujours (email_key, succeeded, created_at) : sans cet
  // index, chaque connexion balaierait la table entière.
  (t) => [index("login_attempts_key_time_idx").on(t.emailKey, t.createdAt)],
);

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

/**
 * Signalement d'un bug ou suggestion d'amélioration envoyé par un coach.
 * Une seule table pour les deux : ce sont deux intentions d'un même geste
 * (« quelque chose ne va pas » / « pourrait être mieux »), distinguées par
 * `type` et non deux formulaires qui dupliqueraient triage et visibilité.
 *
 * Visible du seul auteur (ses envois + leur statut) et de l'admin qui triage —
 * pas de vote public ni de visibilité entre coachs, à la différence d'une
 * annonce : ce canal s'adresse à l'éditeur, pas aux autres coachs.
 */
export const coachFeedback = pgTable(
  "coach_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: feedbackType("type").notNull(),
    message: text("message").notNull(),
    status: feedbackStatus("status").notNull().default("nouveau"),
    // Réponse courte de l'admin, visible de l'auteur : pourquoi refusé, ce qui a été fait…
    adminNote: text("admin_note"),
    /**
     * Fil ouvert entre le contributeur et l'équipe TeamNexus à l'envoi. C'est là
     * que la conversation se poursuit : l'admin répond depuis son inbox, le
     * contributeur lit et relance depuis sa messagerie, au même endroit que ses
     * échanges avec les autres coachs.
     *
     * NULL sur les signalements d'avant cette colonne, et le jour où aucun
     * compte admin n'existe encore : un signalement reçu vaut mieux qu'un
     * signalement refusé faute d'interlocuteur.
     */
    conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Posé au premier changement de statut fait par un admin ; NULL = encore "nouveau"
    handledAt: timestamp("handled_at", { withTimezone: true }),
  },
  (t) => [
    // « Mes signalements » : lu par auteur, le plus récent en tête
    index("coach_feedback_author_idx").on(t.authorId, t.createdAt),
    // L'inbox admin trie/filtre par statut
    index("coach_feedback_status_idx").on(t.status, t.createdAt),
  ],
);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  // Coordonnées approximatives de la ville (annuaire statique, pas d'API externe)
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  // ————— Références reprises par les annonces —————
  // Catégorie d'engagement (U13, Seniors…) et stade habituel : saisis une fois
  // à la création, ils préremplissent chaque publication d'annonce. Ce sont des
  // valeurs par défaut, pas des contraintes — l'annonce garde les siennes.
  //
  // Texte libre pour la catégorie, comme dans match_announcements : la liste
  // (MATCH_CATEGORIES) est validée par zod à l'entrée, un enum PostgreSQL
  // imposerait une migration à chaque catégorie ajoutée.
  //
  // NULL pour les équipes créées avant : on ne devine pas la catégorie d'un
  // « FC Exemple », et le formulaire d'annonce doit pouvoir le constater.
  category: text("category"),
  //
  // Genre de l'équipe, à côté de sa catégorie et pour la même raison : il
  // préremplit l'annonce, et il dit à celui qui reçoit une proposition si
  // l'équipe en face joue bien dans le même tableau. Texte libre comme la
  // catégorie (MATCH_GENDERS validé par zod), NULL pour les équipes créées
  // avant — on ne devine pas le genre d'un « FC Exemple ».
  gender: text("gender"),
  stadium: text("stadium"),
  /**
   * Terrain retenu au recensement, quand le coach en a choisi un. Il ne
   * remplace pas `stadium` — le nom reste libre — mais il prérremplit les
   * annonces et il a déjà fourni les coordonnées ci-dessus.
   */
  venueId: uuid("venue_id"),
  /**
   * Écusson de l'équipe — le « logo du club » tel que le coach le comprend.
   * Nom du fichier dans le volume d'uploads, comme une photo de profil, servi
   * en /api/uploads/. NULL tant qu'aucun n'a été envoyé : rien n'est deviné, et
   * l'affichage retombe alors sur les initiales.
   *
   * Porté par l'ÉQUIPE et non par le club : un coach indépendant n'a pas de
   * ligne `clubs`, et c'est justement lui qui a le plus besoin qu'on reconnaisse
   * son maillot sur le radar.
   */
  logoPath: text("logo_path"),
  // Niveau réel de l'équipe (D2, R1…) — même texte libre que catégorie/genre,
  // validé par zod (DIVISION_LEVELS). NULL tant qu'il n'a pas été réglé, et
  // pour les catégories qui n'en ont pas (en dessous des U10).
  level: text("level"),
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
  /** Stade habituel du club — préremplit celui des équipes qui s'y rattachent */
  stadium: text("stadium"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  email: text("email"),
  /**
   * Compte de connexion du club. **NULL pour un club DÉCLARÉ par un coach** :
   * celui-ci nomme son club pour que les autres le reconnaissent, il ne crée
   * pas un espace de gestion — cela reste le geste d'un administrateur. Un club
   * déclaré peut donc être « repris » plus tard par un compte, sans rien perdre
   * des équipes déjà rattachées.
   */
  ownerId: uuid("owner_id")
    .unique()
    .references(() => users.id),
  /**
   * Code d'affiliation, NULL tant que le club n'a pas de compte : sans personne
   * pour approuver les demandes, un code distribuable ne mènerait qu'à des
   * attentes sans réponse. L'index unique tolère les NULL, ils ne se comparent
   * pas entre eux.
   */
  affiliationCode: text("affiliation_code").unique(),
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

export const matchAnnouncements = pgTable(
  "match_announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    date: date("date").notNull(),
    time: time("time").notNull(),
    city: text("city").notNull(),
    stadium: text("stadium").notNull(),
    /**
     * ————— Lieu exact du match —————
     * Terrain retenu au recensement, et ses coordonnées RECOPIÉES ici.
     *
     * Recopiées et non jointes, pour deux raisons. La première est le radar :
     * il calcule une distance par annonce dans sa boucle, et une jointure de
     * plus par ligne s'y paierait. La seconde compte davantage — le lieu d'un
     * match déjà convenu ne doit pas se déplacer parce que le référentiel a été
     * réimporté entre-temps.
     *
     * NULL quand le coach a simplement tapé l'adresse : la distance retombe
     * alors sur le centre de la commune, comme avant.
     */
    venueId: uuid("venue_id"),
    venueLat: doublePrecision("venue_lat"),
    venueLng: doublePrecision("venue_lng"),
    category: text("category").notNull(),
    /**
     * Âge précisé À L'INTÉRIEUR du groupe (« U14 » sur une annonce U14-U15).
     *
     * NULL est le cas ordinaire et se lit « les deux années » : une rencontre
     * se cherche par paire d'âges, et c'est ce qui remplit le radar. La
     * précision n'entre donc PAS dans l'appariement — elle s'affiche, et le
     * coach d'en face en tient compte avant de proposer. La filtrer ici
     * reviendrait à couper les annonces en deux catégories qui ne se voient
     * plus, alors qu'un U14 joue très bien un U15.
     */
    preciseCategory: text("precise_category"),
    // NULL pour les annonces publiées avant l'ajout du genre : on ne devine pas
    // rétroactivement le genre d'une équipe.
    gender: matchGender("gender"),
    // Niveau souhaité de l'adversaire (D2, R1…) — texte libre validé par zod
    // (DIVISION_LEVELS), NULL pour les catégories qui n'en ont pas.
    level: text("level"),
    format: matchFormat("format").notNull().default("11v11"),
    comment: text("comment"),
    status: announcementStatus("status").notNull().default("open"),
    /**
     * Nombre de fois où un AUTRE coach a ouvert le détail de l'annonce — un
     * signal d'intérêt pour son émetteur. Incrémenté à chaque lecture de
     * `GET /announcements/:id` par un coach d'une autre équipe ; mes propres
     * lectures ne comptent pas, ce n'est pas moi que ce chiffre intéresse.
     */
    viewCount: integer("view_count").notNull().default(0),
    /**
     * Attestation « j'ai déclaré ce match à ma fédération », cochée annonce par
     * annonce jusqu'à ce que l'acceptation de responsabilité soit demandée à
     * l'inscription (users.terms_accepted_at). Elle y faisait double emploi.
     *
     * Colonne conservée mais PLUS ÉCRITE : elle garde la trace des attestations
     * réellement données. Sur les annonces récentes, `false` veut dire « la
     * question n'a pas été posée », et non « le coach a refusé d'attester » —
     * ne pas la relire comme un manquement.
     */
    federationDeclared: boolean("federation_declared").notNull().default(false),
    // SOS : l'annonce est repartie en recherche parce que l'adversaire s'est
    // désisté. Elle passe en tête du radar, motif affiché aux autres coachs.
    isSos: boolean("is_sos").notNull().default(false),
    sosReason: withdrawalReason("sos_reason"),
    sosDetails: text("sos_details"),
    /**
     * ————— Relance du SOS —————
     * `sos_alerted_at` : instant où les jokers du secteur ont été alertés.
     * `sos_widened_at` : instant où le filet a été élargi aux autres coachs,
     * faute de réponse. NULL tant que la relance reste due.
     *
     * Les deux sont remis à zéro à chaque nouveau SOS sur la même annonce : un
     * second désistement rouvre un cycle complet, il ne doit pas hériter de la
     * relance déjà faite au précédent.
     *
     * `sos_widened_at` est aussi le VERROU de la relance : le balayeur la pose
     * par un UPDATE conditionnel, si bien que deux répliques de l'API qui
     * balaient en même temps n'envoient pas la notification deux fois.
     */
    sosAlertedAt: timestamp("sos_alerted_at", { withTimezone: true }),
    sosWidenedAt: timestamp("sos_widened_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Index partiel pour le balayeur de relances : il tourne toutes les deux
  // minutes dans chaque réplique, et sans lui il parcourrait toute la table des
  // annonces pour n'en retenir au plus qu'une poignée. La clause reprend
  // exactement son filtre — les lignes déjà relancées n'y entrent même pas.
  (t) => [
    index("sos_pending_relay_idx").on(t.sosAlertedAt).where(sql`is_sos and sos_widened_at is null`),
  ],
);

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
    /**
     * Le coach qui a proposé, en personne. L'équipe seule ne suffit plus depuis
     * qu'une conversation s'ouvre à l'acceptation : elle relie deux personnes,
     * et une équipe en compte parfois plusieurs.
     *
     * NULL sur les propositions envoyées avant cette colonne — on retombe alors
     * sur le coach qui représente l'équipe.
     */
    coachId: uuid("coach_id").references(() => users.id, { onDelete: "set null" }),
    status: responseStatus("status").notNull().default("pending"),
    /**
     * ————— Les deux signatures —————
     * Un match n'existe que si les DEUX coachs l'ont voulu, chacun de son
     * côté du fil : `owner` est l'émetteur de l'annonce, `responder` celui qui
     * a proposé de jouer. La proposition ne vaut pas signature — c'est une
     * mise en relation, et le répondant garde le droit de se raviser une fois
     * qu'il a vu, en discutant, que l'annonce ne lui convient pas.
     *
     * Le passage en `accepted` et la création du match n'ont lieu qu'à la
     * seconde des deux, dans l'ordre où elles arrivent.
     *
     * Les propositions acceptées avant cette double validation portent les
     * deux dates (reprise en migration) : elles ont bien été convenues, même
     * si une seule signature était demandée à l'époque.
     */
    ownerConfirmedAt: timestamp("owner_confirmed_at", { withTimezone: true }),
    responderConfirmedAt: timestamp("responder_confirmed_at", { withTimezone: true }),
    /**
     * Le fil ouvert entre les deux coachs dès la proposition — c'est là que se
     * discute et se décide « on joue ou pas », plus dans un popup à part.
     * NULL si l'un des deux comptes a disparu depuis.
     */
    conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
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
  // Qui a saisi le score final, et quand. Le score n'est plus contre-validé :
  // c'est le scan de rencontre, plus haut dans la journée, qui atteste que les
  // deux coachs se sont bien retrouvés.
  scoreSubmittedByTeamId: uuid("score_submitted_by_team_id").references(() => teams.id),
  scoreSubmittedAt: timestamp("score_submitted_at", { withTimezone: true }),
  /**
   * Ancienne double validation du score (un coach saisissait, l'autre scannait
   * un QR). Colonnes conservées pour les matchs clos sous cette règle, PLUS
   * ÉCRITES : `score_confirmed_at` à NULL sur un match récent ne veut pas dire
   * que le score est contesté, seulement qu'il n'y a plus de contre-signature.
   */
  scoreConfirmedAt: timestamp("score_confirmed_at", { withTimezone: true }),
  confirmationToken: text("confirmation_token"),
  /**
   * ————— Rencontre —————
   * Le QR que l'équipe qui REÇOIT (celle dont l'annonce est à l'origine du
   * match) montre à l'équipe qui s'est déplacée. Le scan atteste que les deux
   * coachs se sont trouvés face à face, ce qu'aucun appui sur un bouton ne peut
   * prouver — et c'est ce qui déclenche les points.
   *
   * Le jeton naît avec le match ; `encounter_token_coach_id` retient QUEL coach
   * de l'équipe hôte l'a affiché, car une équipe en compte plusieurs et les
   * points vont aux deux personnes qui se sont réellement rencontrées.
   */
  encounterToken: text("encounter_token"),
  encounterTokenCoachId: uuid("encounter_token_coach_id").references(() => users.id),
  encounterConfirmedAt: timestamp("encounter_confirmed_at", { withTimezone: true }),
  encounterConfirmedByCoachId: uuid("encounter_confirmed_by_coach_id").references(() => users.id),
  /**
   * ————— Confirmation en deux temps —————
   * Chaque camp reconfirme à l'approche du match (voir CONFIRMATION_STAGES).
   * NULL = pas encore confirmé, ce qui n'est un reproche qu'une fois la fenêtre
   * ouverte — avant, il n'y avait rien à confirmer.
   */
  homeConfirmedAt: timestamp("home_confirmed_at", { withTimezone: true }),
  awayConfirmedAt: timestamp("away_confirmed_at", { withTimezone: true }),
  /**
   * ————— Détails pratiques —————
   * Réglés par l'équipe qui REÇOIT : elle seule connaît son stade. Lus par les
   * deux, et repris dans le rappel de la veille.
   */
  refereeBy: refereeBy("referee_by").notNull().default("tbd"),
  refereeName: text("referee_name"),
  changingRooms: text("changing_rooms"),
  /**
   * Rappel de la veille envoyé — VERROU, comme les autres balayeurs : la
   * colonne se pose par un UPDATE conditionnel sur son propre NULL.
   */
  dayBeforeRemindedAt: timestamp("day_before_reminded_at", { withTimezone: true }),
  /**
   * Dernier palier de rappel envoyé (7, puis 3), et VERROU du balayeur : il ne
   * pose un palier que s'il est plus proche que le précédent, par un UPDATE
   * conditionnel. Deux répliques qui balaient ensemble n'envoient donc qu'un
   * rappel — le même mécanisme que `sos_widened_at`.
   */
  confirmationRemindedDays: integer("confirmation_reminded_days"),
  // Désistement avant le coup d'envoi : qui a renoncé, pourquoi, et quand.
  withdrawnByTeamId: uuid("withdrawn_by_team_id").references(() => teams.id),
  withdrawalReason: withdrawalReason("withdrawal_reason"),
  withdrawalDetails: text("withdrawal_details"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tournoi. L'application n'en gère NI le déroulé, NI les poules, NI les
 * résultats : elle le rend visible sur le radar et prend les inscriptions.
 * Tout le reste se règle entre coachs, comme avant.
 *
 * Porté par une équipe (son organisateur), comme une annonce : c'est ce qui lui
 * donne une ville, un point sur le radar et des coachs à prévenir.
 */
export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    name: text("name").notNull(),
    date: date("date").notNull(),
    // Un tournoi tient souvent sur un week-end. NULL = une seule journée.
    endDate: date("end_date"),
    // Pas d'horaire réel : un tournoi s'étale sur la journée, seul le moment
    // (journée ou nocturne) se décide à l'avance.
    session: text("session").notNull().default("day"),
    city: text("city").notNull(),
    stadium: text("stadium").notNull(),
    // Plusieurs catégories d'âge peuvent jouer le même tournoi (poules
    // séparées) : un tableau plutôt qu'une table de jointure, pour un besoin
    // qui reste simple.
    category: text("category").array().notNull(),
    gender: matchGender("gender"),
    format: matchFormat("format").notNull().default("8v8"),
    /** Nombre d'équipes attendues — c'est lui qui ferme les inscriptions */
    slots: integer("slots").notNull(),
    /**
     * Affiche du tournoi : nom du fichier dans le volume d'uploads, servi sous
     * /api/uploads/… comme les photos de profil. NULL = aucune affiche, et la
     * carte se rabat sur un visuel dessiné.
     */
    posterPath: text("poster_path"),
    comment: text("comment"),
    status: tournamentStatus("status").notNull().default("open"),
    // SOS : une équipe s'est retirée, la place se rouvre. Même mécanique que
    // les annonces, y compris la relance élargie (voir lib/sosRelay.ts).
    isSos: boolean("is_sos").notNull().default(false),
    sosReason: withdrawalReason("sos_reason"),
    sosDetails: text("sos_details"),
    sosAlertedAt: timestamp("sos_alerted_at", { withTimezone: true }),
    sosWidenedAt: timestamp("sos_widened_at", { withTimezone: true }),
    /**
     * QR d'arrivée, affiché par l'organisateur le jour J : chaque coach présent
     * le scanne, ce qui pointe son équipe et lui donne ses points. Même sens
     * que la rencontre d'un amical — celui qui reçoit montre, celui qui vient
     * scanne — et surtout l'organisateur n'a rien à faire équipe par équipe.
     */
    encounterToken: text("encounter_token"),
    encounterTokenCoachId: uuid("encounter_token_coach_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Même index partiel que les annonces, pour le balayeur de relances SOS
  (t) => [
    index("tournaments_sos_pending_relay_idx")
      .on(t.sosAlertedAt)
      .where(sql`is_sos and sos_widened_at is null`),
  ],
);

/**
 * Inscription d'une équipe à un tournoi. Directe : pas de validation par
 * l'organisateur, le coach clique et il est pris tant qu'il reste des places.
 *
 * La ligne survit au retrait (`status = 'withdrawn'`) au lieu d'être effacée :
 * c'est elle qui explique pourquoi une place s'est rouverte, et elle empêche
 * qu'un coach se réinscrive en boucle pour brouiller le compte.
 */
export const tournamentRegistrations = pgTable(
  "tournament_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    status: tournamentRegistrationStatus("status").notNull().default("registered"),
    /** Pointage à l'arrivée : quand, et quel coach a scanné le QR de l'organisateur */
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInByCoachId: uuid("checked_in_by_coach_id").references(() => users.id),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tournament_registrations_tournament_team_idx").on(t.tournamentId, t.teamId)],
);

/**
 * Points gagnés par un coach, une ligne par match et par coach.
 *
 * Un journal plutôt qu'un compteur sur `users` : le total se recalcule par
 * somme, mais surtout il reste explicable — d'où viennent ces points, quand,
 * sur quel match. Un compteur seul serait impossible à auditer le jour où un
 * coach conteste son palier, et impossible à corriger sans tout refaire.
 *
 * L'unicité (match, coach) est la garantie qu'un même match ne peut pas payer
 * deux fois : elle tient même si deux requêtes de scan arrivent en même temps.
 *
 * Un point de départ EXCLUSIF : soit un match, soit un tournoi. Un journal
 * unique plutôt que deux tables, pour que le total d'un coach reste une seule
 * somme — deux tables auraient imposé une union à chaque lecture de compte, et
 * la première occasion de les désynchroniser.
 */
export const coachPoints = pgTable(
  "coach_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "cascade" }),
    tournamentId: uuid("tournament_id").references(() => tournaments.id, { onDelete: "cascade" }),
    points: integer("points").notNull(),
    reason: pointReason("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Unicités partielles : une ligne par (match, coach) ET une par (tournoi,
    // coach). Sur des colonnes nullables, un index unique ordinaire laisserait
    // passer autant de NULL qu'on veut — d'où la clause.
    uniqueIndex("coach_points_match_coach_idx")
      .on(t.matchId, t.coachId)
      .where(sql`match_id is not null`),
    uniqueIndex("coach_points_tournament_coach_idx")
      .on(t.tournamentId, t.coachId)
      .where(sql`tournament_id is not null`),
    // Le total d'un coach est lu à chaque lecture de son compte
    index("coach_points_coach_idx").on(t.coachId),
    // Exactement une origine. La règle vit en base et pas seulement dans le
    // code : une ligne orpheline fausserait un palier sans qu'on sache d'où
    // elle vient, et rien ne permettrait de la rattacher après coup.
    check(
      "coach_points_une_origine",
      sql`(match_id is not null) <> (tournament_id is not null)`,
    ),
  ],
);

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

/**
 * Conversation entre DEUX coachs. Elle naît d'une acceptation d'annonce : à
 * partir du moment où un match est convenu, les deux coachs ont à se parler
 * (l'heure exacte, le vestiaire, la couleur des maillots) et n'ont plus à
 * s'échanger un numéro pour le faire.
 *
 * Une seule conversation par paire, jamais une par match : deux coachs qui se
 * retrouvent la saison suivante reprennent le même fil. `match_id` garde
 * seulement la rencontre qui l'a ouverte, pour pouvoir le raconter.
 *
 * La paire est ORDONNÉE (`coach_a_id < coach_b_id`, garanti par la contrainte)
 * pour que l'index unique suffise : sans cet ordre, (A,B) et (B,A) seraient
 * deux lignes distinctes et la même paire pourrait avoir deux fils.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coachAId: uuid("coach_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    coachBId: uuid("coach_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Match à l'origine du fil (NULL si le match a été supprimé depuis) */
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    /**
     * Dernier message, dupliqué ici : c'est le tri de la liste des
     * conversations, et le recalculer par un MAX sur les messages à chaque
     * ouverture de l'écran coûterait un balayage par fil.
     */
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("conversations_pair_idx").on(t.coachAId, t.coachBId),
    // Les deux lectures de la liste : « mes conversations », d'un côté ou de l'autre
    index("conversations_coach_a_idx").on(t.coachAId, t.lastMessageAt),
    index("conversations_coach_b_idx").on(t.coachBId, t.lastMessageAt),
    check("conversations_paire_ordonnee", sql`coach_a_id < coach_b_id`),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    /**
     * NULL pour un message `system` : personne ne l'a écrit, c'est
     * l'application qui inscrit le match convenu. Un expéditeur de complaisance
     * — le coach qui accepte, par exemple — ferait croire qu'il l'a rédigé.
     */
    senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }),
    kind: messageKind("kind").notNull().default("coach"),
    /**
     * Match annoncé par un message `system`. Le texte du message est figé à
     * l'écriture (il raconte ce qui a été convenu ce jour-là) ; cette référence,
     * elle, permet d'ouvrir la feuille de match telle qu'elle est aujourd'hui.
     */
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    /**
     * Proposition dont ce message `system` parle — porte les boutons
     * Accepter/Décliner tant qu'elle est en attente. NULL pour tout message
     * qui ne demande pas de décision (le match confirmé, un message de coach).
     */
    responseId: uuid("response_id").references(() => announcementResponses.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Un fil se lit toujours en entier et dans l'ordre
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

/**
 * Jusqu'où chaque coach a lu son fil. Une ligne par (conversation, coach),
 * posée à la première ouverture : son absence veut dire « jamais ouvert », donc
 * tout est non lu — un défaut juste, et non une donnée manquante.
 */
export const conversationReads = pgTable(
  "conversation_reads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    coachId: uuid("coach_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("conversation_reads_conv_coach_idx").on(t.conversationId, t.coachId)],
);

/**
 * Publication d'un coach contributeur : un billet d'information à destination
 * de tous les coachs — les poules des matchs officiels, une intempérie qui
 * annule un plateau. Rien d'autre qu'un texte et son auteur : ni destinataire,
 * ni réponse, ni statut — c'est un panneau d'affichage, pas une conversation.
 *
 * Le droit d'écrire ne se stocke pas ici : il se lit dans la casquette
 * `contributeur` de l'auteur AU MOMENT de la rédaction. Un billet survit donc
 * au retrait de la casquette — l'information donnée reste donnée.
 */
export const publications = pgTable(
  "publications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Le fil se lit toujours du plus récent au plus ancien
  (t) => [index("publications_created_idx").on(t.createdAt)],
);

/**
 * Disponibilité déclarée : « cette équipe est libre ce jour-là ».
 *
 * L'inverse d'une annonce. L'annonce dit « je propose un match, venez » et
 * suppose qu'un autre coach passe la voir ; la disponibilité dit seulement « je
 * suis libre », et c'est le système qui rapproche deux libertés compatibles.
 * Un coach déclare une fois, il ne surveille plus.
 *
 * Rien n'est stocké de l'appariement lui-même : les suggestions se recalculent
 * à chaque lecture. Une équipe change de niveau, un coach élargit son rayon, et
 * une table de couples figés mentirait dès le lendemain.
 *
 * La catégorie et le genre ne sont pas repris ici : ce sont ceux de l'équipe,
 * et les recopier les ferait diverger le jour où elle change de catégorie.
 */
export const teamAvailabilities = pgTable(
  "team_availabilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    /** Le coach qui a déclaré — une équipe en compte parfois plusieurs */
    coachId: uuid("coach_id").references(() => users.id, { onDelete: "set null" }),
    date: date("date").notNull(),
    venue: availabilityVenue("venue").notNull().default("any"),
    /** Heure souhaitée, indicative : elle préremplit l'annonce, elle ne filtre rien */
    time: time("time"),
    /**
     * Niveaux d'adversaire acceptés. Tableau VIDE = tous niveaux, et c'est le
     * défaut : ne pas avoir d'avis ne doit pas fermer le secteur.
     */
    acceptedLevels: text("accepted_levels").array().notNull().default([]),
    /** Rayon propre à cette date ; NULL = celui du radar du coach (users.radar_radius_km) */
    radiusKm: integer("radius_km"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Une seule déclaration par équipe et par date : deux lignes pour le même
    // dimanche diraient deux choses contradictoires au matcheur.
    uniqueIndex("team_availabilities_team_date_idx").on(t.teamId, t.date),
    // Le matcheur balaie toujours par date, à partir d'aujourd'hui
    index("team_availabilities_date_idx").on(t.date),
  ],
);

/**
 * Trace des relances envoyées — et VERROU du balayeur.
 *
 * L'insertion en `onConflictDoNothing` joue les deux rôles à la fois : seule
 * la réplique qui gagne la ligne envoie la notification. C'est l'équivalent de
 * l'UPDATE conditionnel sur `sos_widened_at`, en plus simple ici puisqu'il n'y
 * a pas de ligne préexistante à marquer.
 *
 * Une équipe n'est donc relancée qu'une fois par date et par nature. Si trois
 * nouvelles équipes se déclarent libres après coup, elles n'entraînent pas une
 * seconde alerte : le coach a été prévenu, l'écran des disponibilités porte le
 * compte à jour, et insister serait du harcèlement.
 */
export const availabilityNotices = pgTable(
  "availability_notices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    kind: availabilityNoticeKind("kind").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // La contrainte qui fait le verrou : une relance par équipe, date et nature
    uniqueIndex("availability_notices_team_date_kind_idx").on(t.teamId, t.date, t.kind),
  ],
);

/**
 * Districts de football — le découpage dans lequel les dirigeants pensent.
 *
 * Un district n'est PAS un département : cinq d'entre eux en couvrent deux
 * (Alpes, Drôme-Ardèche, Doubs-Territoire de Belfort, Gard-Lozère, Alsace) et
 * trois départements en comptent deux (Nord, Pas-de-Calais, Guadeloupe). D'où
 * un tableau de départements et non une colonne unique — une correspondance
 * un-pour-un aurait été fausse dans les deux sens.
 *
 * La Corse et quatre départements d'outre-mer n'ont pas de district : leur
 * ligue administre directement. Ce n'est pas un trou du référentiel, c'est
 * l'organisation réelle.
 *
 * Semé depuis `districtsReference.json`, rejouable — voir `seedDistricts.ts`.
 */
export const districts = pgTable(
  "districts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Nom d'usage, celui qu'un dirigeant reconnaît */
    name: text("name").notNull(),
    /** Clé stable de l'import : c'est par elle que la remise à jour retrouve la ligne */
    slug: text("slug").notNull().unique(),
    /** Nom au registre des associations, NULL pour les lignes saisies à la main */
    legalName: text("legal_name"),
    siren: text("siren"),
    /** Commune du siège, telle que le registre l'écrit */
    city: text("city"),
    /** Départements couverts — au moins un, parfois deux */
    departments: text("departments").array().notNull(),
    source: districtSource("source").notNull(),
    /**
     * Relu et confirmé par un administrateur. Les lignes `manuel` arrivent à
     * `false` : c'est ce drapeau, et non la source, qui dit ce qui reste à
     * faire — une ligne du registre peut aussi avoir été corrigée à la main.
     */
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Le rattachement d'une équipe passe toujours par son département
  (t) => [index("districts_departments_idx").using("gin", t.departments)],
);

/**
 * Terrains de football, repris du recensement des équipements sportifs du
 * ministère chargé des sports (licence ouverte).
 *
 * 36 000 terrains, tous géolocalisés. Deux usages, et le second compte plus
 * que le premier :
 *   1. le coach choisit son stade dans une liste au lieu de le taper ;
 *   2. l'équipe hérite des COORDONNÉES RÉELLES du terrain.
 *
 * Jusqu'ici, une équipe était située au centre de sa commune. À Lyon, cela
 * revenait à placer tous les clubs au même point ; en zone rurale, à deux ou
 * trois kilomètres du terrain. Toutes les distances de l'application — rayon
 * du radar, appariement des disponibilités, relance du secteur — en héritent.
 *
 * Ce n'est PAS la base de la fédération : c'est un recensement public
 * d'équipements, qui ignore tout des clubs qui y jouent et des matchs qui s'y
 * disputent. Il donne un lieu, pas un calendrier.
 */
export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Identifiant du recensement (`equip_numero`) — clé de rejeu de l'import */
    sourceId: text("source_id").notNull().unique(),
    /** Nom de l'installation : « Stade municipal du Calvaire » */
    name: text("name").notNull(),
    /** Nom du terrain dans l'installation : « Terrain d'honneur » (plusieurs par stade) */
    pitchName: text("pitch_name"),
    /**
     * Nom en minuscules sans accents, pour la recherche. Colonne et non calcul
     * à la volée : `unaccent` demande une extension, et 36 000 lignes filtrées
     * à chaque frappe méritent un index.
     */
    searchName: text("search_name").notNull(),
    address: text("address"),
    postalCode: text("postal_code"),
    city: text("city").notNull(),
    department: text("department"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    /** « Gazon naturel », « Gazon synthétique », « Stabilisé/cendrée »… */
    surface: text("surface"),
    floodlit: boolean("floodlit"),
    /** Nombre de vestiaires sportifs — l'information que le coach visiteur demande */
    changingRooms: integer("changing_rooms"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // La recherche est toujours « ce nom, près d'ici » : un cadre géographique
    // d'abord, le texte ensuite.
    index("venues_lat_idx").on(t.lat),
    index("venues_lng_idx").on(t.lng),
    index("venues_search_idx").on(t.searchName),
  ],
);
