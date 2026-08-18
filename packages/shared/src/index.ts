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
 *
 * Énoncé une seule fois, dans les CGU acceptées à l'inscription (LegalConsent).
 * L'application ne le mesure plus annonce par annonce : elle ne déclare rien à
 * la place du coach, et répéter l'avertissement à chaque écran noyait le reste.
 */
export const FFF_NOTICE_DAYS = 10;

/** Nombre de jours pleins entre deux dates ISO (yyyy-mm-dd), sans effet de fuseau */
export function daysBetweenIso(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Version des documents contractuels en vigueur — CGU et politique de
 * confidentialité, publiées ensemble sur le site.
 *
 * C'est ELLE qui est enregistrée avec l'acceptation, pas la date seule : une
 * acceptation ne vaut que pour un texte précis. Le jour où les CGU changent sur
 * un point substantiel, cette constante est incrémentée et les comptes dont la
 * version enregistrée est antérieure doivent se prononcer de nouveau.
 *
 * Version 2 (11 août 2026) : l'application ne mesure plus le délai FFF de
 * déclaration annonce par annonce — §5 le disait, ce n'est plus vrai. La règle
 * elle-même n'a pas bougé, seul ce que le service en fait a changé.
 *
 * Version 3 (14 août 2026) : mise à jour de fond des deux textes, dont deux
 * points substantiels — les coachs d'une même catégorie se voient désormais
 * dans une liste de secteur, avec un réglage public/privé pour s'en retirer ;
 * et le score n'est plus contre-signé, c'est le scan de rencontre au stade qui
 * atteste le match et donne les points. Le reste met les textes au niveau du
 * service : messagerie, tournois, publications, signalements, écusson d'équipe,
 * club déclaré.
 *
 * ⚠ Rien ne redemande son accord à un coach déjà inscrit : `terms_version` n'est
 * écrite qu'à l'inscription, il n'existe aucun écran de ré-acceptation. Les
 * comptes créés avant restent donc estampillés « 2 ». C'est un choix assumé
 * pour l'instant, pas un oubli — le §2 des CGU promet en revanche une
 * information dans l'application, qui reste à faire.
 *
 * À tenir aligné sur l'en-tête de `site/cgu.html` et de
 * `site/confidentialite.html` (« Version : 3 »).
 */
export const LEGAL_VERSION = "3";
export const LEGAL_UPDATED_AT = "2026-08-14";

/**
 * Cycle de vie d'un match : `scheduled` → `live` au coup d'envoi → `finished`
 * dès qu'un des deux coachs saisit le score final. Ce qui atteste que la
 * rencontre a bien eu lieu n'est plus le score, mais le scan du QR entre les
 * deux coachs au stade.
 *
 * `awaiting_confirmation` n'est PLUS produit : il datait de l'époque où le
 * score était contre-signé par le coach adverse. La valeur reste dans l'enum
 * pour les matchs clos sous cette règle, que rien ne doit rendre illisibles.
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

export const MATCH_FORMATS = ["5v5", "8v8", "11v11"] as const;
export type MatchFormat = (typeof MATCH_FORMATS)[number];

/**
 * Créneaux proposés à la publication d'une annonce : matinée avant le déjeuner,
 * puis l'après-midi jusqu'à la tombée du jour. Un amical ne se cale pas à 7h12
 * — offrir les 96 quarts d'heure de la journée faisait chercher longtemps ce
 * qui se choisit d'un coup d'œil.
 *
 * L'API, elle, accepte toujours n'importe quelle heure valide : c'est une aide
 * à la saisie, pas une règle métier, et les annonces déjà publiées à d'autres
 * heures restent parfaitement valides.
 */
export const ANNOUNCEMENT_TIME_SLOTS = [
  "09:00",
  "10:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
] as const;

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
 * Ramène une valeur venue de la base à la liste connue. Les catégories y sont
 * stockées en texte libre : une valeur retirée de la liste ne doit pas ressortir
 * typée comme si elle en faisait toujours partie, elle vaut alors « aucune ».
 */
export function asMatchCategory(value: string | null | undefined): MatchCategory | null {
  return value && (MATCH_CATEGORIES as readonly string[]).includes(value) ? (value as MatchCategory) : null;
}

/**
 * Catégories des ANNONCES : les rencontres se jouent par paires d'âges
 * (U6-U7, U8-U9…), c'est ainsi que les districts les organisent. L'équipe,
 * elle, garde sa catégorie fine (U13) — c'est à la publication qu'elle est
 * reprise dans son groupe.
 */
export const ANNOUNCEMENT_CATEGORIES = [
  "U6-U7", "U8-U9", "U10-U11", "U12-U13", "U14-U15", "U16-U17", "U18-U19",
  "U20", "Seniors", "Veterans",
] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

const ANNOUNCEMENT_GROUP_OF: Record<string, AnnouncementCategory> = {
  U6: "U6-U7", U7: "U6-U7", U8: "U8-U9", U9: "U8-U9", U10: "U10-U11", U11: "U10-U11",
  U12: "U12-U13", U13: "U12-U13", U14: "U14-U15", U15: "U14-U15", U16: "U16-U17", U17: "U16-U17",
  U18: "U18-U19", U19: "U18-U19", U20: "U20", Seniors: "Seniors", Veterans: "Veterans",
};

/** Le groupe d'annonce d'une catégorie d'équipe (U13 → U12-U13). Idempotent : un groupe reste lui-même. */
export function announcementCategoryOf(teamCategory: string | null | undefined): AnnouncementCategory | null {
  if (!teamCategory) return null;
  if ((ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(teamCategory)) return teamCategory as AnnouncementCategory;
  return ANNOUNCEMENT_GROUP_OF[teamCategory] ?? null;
}

/**
 * Jusqu'aux U11, on ne joue pas un match amical : le district réunit des
 * PLATEAUX de quatre équipes. Une annonce de ces catégories cherche donc trois
 * équipes, pas un adversaire. Les valeurs fines (U6…U11) sont reconnues aussi :
 * les annonces antérieures au regroupement les portent encore.
 */
export const PLATEAU_CATEGORIES = [
  "U6-U7", "U8-U9", "U10-U11", "U6", "U7", "U8", "U9", "U10", "U11",
] as const;

export function isPlateauCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  return (PLATEAU_CATEGORIES as readonly string[]).includes(category);
}

/** Équipes cherchées par une annonce de plateau — l'hôte complète le carré */
export const PLATEAU_TEAMS_WANTED = 3;

/**
 * Un plateau qui n'a pas fait le plein se joue quand même : trois équipes, ou
 * deux. À partir de ce seuil, la rencontre a lieu et le scan de points avec
 * elle — c'est ce qui distingue un plateau réduit d'un plateau désert.
 */
export const PLATEAU_MIN_TEAMS_ACCEPTED = 1;

/**
 * Les catégories fines couvertes par une catégorie d'annonce (U12-U13 →
 * U12, U13). Une catégorie fine se rend elle-même : la fonction accepte les
 * deux, les annonces d'avant le regroupement portant encore « U13 ».
 */
export function fineCategoriesOf(category: string | null | undefined): MatchCategory[] {
  if (!category) return [];
  if ((MATCH_CATEGORIES as readonly string[]).includes(category)) return [category as MatchCategory];
  return (MATCH_CATEGORIES as readonly MatchCategory[]).filter(
    (fine) => ANNOUNCEMENT_GROUP_OF[fine] === category,
  );
}

/** L'échelle des U, dans l'ordre — c'est elle qui donne un sens à « l'année d'à côté » */
const U_SCALE = (MATCH_CATEGORIES as readonly MatchCategory[]).filter((c) => c.startsWith("U"));

/** De combien d'années on s'écarte de la catégorie visée pour alerter un joker */
export const SOS_AGE_TOLERANCE = 1;

/**
 * Les catégories d'équipe qu'un SOS doit réveiller : celles de l'annonce, plus
 * l'année en dessous et celle au-dessus.
 *
 * Un U14 qui se retrouve sans adversaire joue volontiers contre des U13 ou des
 * U15 — à un an près, un amical reste jouable, et c'est justement quand on est
 * en panne qu'on élargit. Un U9 n'a en revanche rien à faire d'un SOS Seniors :
 * sans ce voisinage, l'alerte partait à tous les jokers du secteur, toutes
 * catégories confondues, et une alerte qui ne concerne jamais celui qui la
 * reçoit finit par ne plus être lue du tout.
 *
 * Seniors et Vétérans n'ont pas de voisin : ils ne sont pas sur l'échelle des
 * âges, et « l'année d'à côté » n'y veut rien dire.
 */
export function sosCategoryReach(categories: readonly (string | null | undefined)[]): Set<string> {
  const reach = new Set<string>();
  for (const raw of categories) {
    for (const fine of fineCategoriesOf(raw)) {
      const index = U_SCALE.indexOf(fine);
      if (index === -1) {
        reach.add(fine);
        continue;
      }
      for (let offset = -SOS_AGE_TOLERANCE; offset <= SOS_AGE_TOLERANCE; offset++) {
        const neighbour = U_SCALE[index + offset];
        if (neighbour) reach.add(neighbour);
      }
    }
  }
  return reach;
}

/**
 * Niveau de jeu — le palier réel d'une équipe (district, régional, national),
 * pas un simple « loisir/compétition ». Sert deux fois : sur l'équipe (« on
 * joue en D2 »), et sur une annonce (« on cherche du D2 ou mieux »).
 *
 * Toutes les valeurs existent dans l'absolu, mais seule une partie a un sens
 * pour une catégorie d'âge donnée — voir `divisionLevelsFor`. En dessous des
 * U10, aucun niveau ne s'applique : à cet âge, les districts ne classent pas
 * les équipes.
 */
export const DIVISION_LEVELS = [
  "debutant", "confirme",
  "d4", "d3", "d2", "d1", "territoire",
  "r3", "r2", "r1",
  "n3", "n2", "n1",
] as const;
export type DivisionLevel = (typeof DIVISION_LEVELS)[number];

export const DIVISION_LEVEL_LABELS: Record<DivisionLevel, string> = {
  debutant: "Débutant",
  confirme: "Confirmé",
  d4: "D4",
  d3: "D3",
  d2: "D2",
  d1: "D1",
  territoire: "Territoire",
  r3: "R3",
  r2: "R2",
  r1: "R1",
  n3: "N3",
  n2: "N2",
  n1: "N1",
};

/**
 * Les niveaux qui ont un sens pour une catégorie (fine, comme une équipe — U13
 * — ou groupée, comme une annonce — U12-U13). Tableau vide = pas de niveau à
 * cet âge, ni sur l'équipe ni sur l'annonce.
 */
export function divisionLevelsFor(category: string | null | undefined): readonly DivisionLevel[] {
  const group = announcementCategoryOf(category);
  switch (group) {
    case "U6-U7":
    case "U8-U9":
      return [];
    case "U10-U11":
      return ["debutant", "confirme"];
    case "U12-U13":
      return ["d4", "d3", "d2", "d1", "territoire"];
    case "U14-U15":
    case "U16-U17":
      return ["d4", "d3", "d2", "d1", "territoire", "r1"];
    case "U18-U19":
    case "U20":
    case "Seniors":
    case "Veterans":
      return ["d4", "d3", "d2", "d1", "territoire", "r3", "r2", "r1", "n3", "n2", "n1"];
    default:
      // Catégorie absente ou non reconnue : mieux vaut ne rien proposer qu'une
      // liste qui ne correspond à rien.
      return [];
  }
}

/** Ramène une valeur venue de la base à la liste connue — même précaution que `asMatchCategory`. */
export function asDivisionLevel(value: string | null | undefined): DivisionLevel | null {
  return value && (DIVISION_LEVELS as readonly string[]).includes(value) ? (value as DivisionLevel) : null;
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

/** Même précaution que `asMatchCategory` : le genre est stocké en texte libre. */
export function asMatchGender(value: string | null | undefined): MatchGender | null {
  return value && (MATCH_GENDERS as readonly string[]).includes(value) ? (value as MatchGender) : null;
}

/**
 * Une équipe qui propose peut-elle jouer cette annonce ? Deux règles, et deux
 * seulement — le reste (niveau, format) se négocie entre coachs.
 *
 * La catégorie se compare par GROUPE d'âges : une équipe U13 répond à une
 * annonce U12-U13, c'est le principe même de l'appariement du district.
 * Le genre se compare tel quel, à ceci près qu'une équipe mixte entre partout
 * et qu'une annonce mixte accueille tout le monde : jusqu'aux U11 les équipes
 * le sont réellement, refuser l'appariement les priverait de la moitié du
 * radar.
 *
 * Ce qu'on ne sait pas ne s'oppose pas : une équipe créée avant que le genre
 * et la catégorie existent ne porte rien, et l'inconnu n'est pas un désaccord.
 * D'où `null` pour « rien à signaler », et non `false`.
 */
export function teamMatchesAnnouncement(
  team: { category: MatchCategory | null; gender: MatchGender | null },
  announcement: { category: string; gender: MatchGender | null },
): { category: boolean; gender: boolean } | null {
  const teamGroup = announcementCategoryOf(team.category);
  const announcementGroup = announcementCategoryOf(announcement.category);
  if (team.category === null && team.gender === null) return null;
  return {
    category: teamGroup === null || announcementGroup === null || teamGroup === announcementGroup,
    gender:
      team.gender === null ||
      announcement.gender === null ||
      team.gender === announcement.gender ||
      team.gender === "mixte" ||
      announcement.gender === "mixte",
  };
}

/** Types d'événements d'agenda. "match" est virtuel : projeté depuis les matchs. */
export const EVENT_TYPES = ["match", "entrainement", "tournoi", "reunion", "autre"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
/** Types créables par le coach (tout sauf "match") */
export const TEAM_EVENT_TYPES = ["entrainement", "tournoi", "reunion", "autre"] as const;
export type TeamEventType = (typeof TEAM_EVENT_TYPES)[number];

export const EVENT_RECURRENCES = ["none", "weekly"] as const;
export type EventRecurrence = (typeof EVENT_RECURRENCES)[number];

// ---------- Catégories de coach ----------

/**
 * Casquettes qu'un coach se donne, **cumulables** : il peut être joker et
 * contributeur à la fois. Aucune n'est un rôle de compte — elles ne changent
 * pas ses droits, elles disent ce qu'il accepte de faire pour les autres.
 *
 * Ne pas en cocher est le cas ordinaire et se lit « simple coach » : c'est un
 * choix, pas un manque. D'où le tableau vide plutôt qu'une valeur « aucune »
 * qu'il faudrait ensuite exclure partout.
 */
/**
 * Délai laissé aux jokers avant d'élargir le SOS à tous les coachs du secteur.
 *
 * Il se resserre à mesure que le coup d'envoi approche : une heure d'avance
 * pour les jokers ne coûte rien sur un match dans quinze jours, elle peut faire
 * perdre la rencontre s'il se joue demain. À l'inverse, élargir en dix minutes
 * un SOS lointain gaspille l'attention de tout un secteur pour rien.
 *
 * Le premier seuil qui couvre l'échéance l'emporte ; au-delà du dernier, c'est
 * `SOS_WIDEN_DEFAULT_MINUTES`. Une seule table à retoucher pour réajuster.
 */
export const SOS_WIDEN_DELAYS = [
  /** Le match est aujourd'hui ou demain : on ne peut plus attendre */
  { withinDays: 1, minutes: 10 },
  /** Dans la semaine : de quoi laisser un joker répondre entre deux entraînements */
  { withinDays: 6, minutes: 30 },
] as const;

/** Au-delà du dernier seuil — le match est assez loin pour laisser du temps */
export const SOS_WIDEN_DEFAULT_MINUTES = 60;

/** Délai avant élargissement, pour un match dans `daysUntilMatch` jours */
export function sosWidenDelayMinutes(daysUntilMatch: number): number {
  for (const { withinDays, minutes } of SOS_WIDEN_DELAYS) {
    if (daysUntilMatch <= withinDays) return minutes;
  }
  return SOS_WIDEN_DEFAULT_MINUTES;
}

/** Le plus court des délais — borne grossière pour ne pas relire des annonces trop fraîches */
export const SOS_WIDEN_MIN_MINUTES = Math.min(
  SOS_WIDEN_DEFAULT_MINUTES,
  ...SOS_WIDEN_DELAYS.map((d) => d.minutes),
);

export const COACH_CATEGORIES = ["joker", "contributeur"] as const;
export type CoachCategory = (typeof COACH_CATEGORIES)[number];

export const COACH_CATEGORY_LABELS: Record<CoachCategory, string> = {
  joker: "Joker",
  contributeur: "Contributeur",
};

/** Ce que la casquette engage, affiché à côté de la case à cocher */
export const COACH_CATEGORY_DESCRIPTIONS: Record<CoachCategory, string> = {
  joker:
    "Vous acceptez d'être alerté quand un coach de votre secteur se retrouve sans adversaire. Ces alertes SOS ne partent qu'aux jokers.",
  contributeur:
    "Vous faites vivre le projet : vous partagez les informations du secteur (poules, intempéries, plateaux annulés), vous le faites connaître autour de vous, et vous avez la ligne directe avec l'équipe TeamNexus — vos signalements de bugs et vos idées d'amélioration ouvrent une discussion avec elle.",
};

/**
 * Troisième option de l'écran des casquettes — qui n'est pas une casquette :
 * « Coach simple » vaut pour le tableau VIDE. Rien de nouveau n'est stocké, on
 * ne fabrique pas une valeur en base pour dire l'absence des deux autres ; et
 * une casquette « simple » qu'il faudrait retirer avant d'en prendre une vraie
 * serait un piège.
 *
 * Elle a malgré tout sa carte : un choix qui ne se voit pas ne se fait pas.
 * Deux cases seules laissaient deviner qu'on pouvait n'en cocher aucune, sans
 * jamais le dire — et sans montrer que c'est le cas ordinaire.
 */
export const COACH_PLAIN_LABEL = "Coach simple";
export const COACH_PLAIN_DESCRIPTION =
  "Aucune casquette. Vous publiez vos annonces, répondez à celles des autres et jouez vos matchs : tout fonctionne à l'identique. Vous n'êtes simplement ni alerté des SOS en premier, ni rédacteur des publications.";

/** Choix des casquettes par le coach lui-même. Tableau vide = « coach simple ». */
export const updateCoachCategoriesSchema = z.object({
  categories: z.array(z.enum(COACH_CATEGORIES)).max(COACH_CATEGORIES.length),
});
export type UpdateCoachCategoriesInput = z.infer<typeof updateCoachCategoriesSchema>;

/**
 * Profil public ou privé dans la liste des coachs de sa catégorie. Une route à
 * part comme les casquettes : une case qu'on décoche pour se retirer d'une
 * liste doit prendre effet sur-le-champ, pas au prochain enregistrement d'un
 * formulaire d'identité.
 */
export const updateProfileVisibilitySchema = z.object({ profilePublic: z.boolean() });
export type UpdateProfileVisibilityInput = z.infer<typeof updateProfileVisibilitySchema>;

/** Ce que le réglage engage, dit au coach à l'inscription comme au profil */
export const PROFILE_PUBLIC_LABEL = "Profil public";
export const PROFILE_PUBLIC_DESCRIPTION =
  "Les coachs de votre catégorie et de votre secteur vous voient dans leur liste : surnom, photo, équipe et distance. C'est ainsi qu'on se trouve avant même d'avoir publié une annonce.";
export const PROFILE_PRIVATE_LABEL = "Profil privé";
export const PROFILE_PRIVATE_DESCRIPTION =
  "Dans cette liste, ils ne voient que votre surnom — ni photo, ni équipe, ni distance. Le reste ne change pas : une annonce que vous publiez vous montre, et vos matchs et relations vous connaissent déjà.";

// ---------- Signalements (bug / suggestion) ----------

export const FEEDBACK_TYPES = ["bug", "suggestion"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug",
  suggestion: "Suggestion d'amélioration",
};

export const FEEDBACK_STATUSES = ["nouveau", "en_cours", "resolu", "refuse"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  resolu: "Résolu",
  refuse: "Refusé",
};

export const createFeedbackSchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  message: z.string().trim().min(10).max(2000),
});
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

/** Triage admin : changer le statut, avec une note facultative visible de l'auteur */
export const updateFeedbackStatusSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES),
  adminNote: z.string().trim().max(500).optional(),
});
export type UpdateFeedbackStatusInput = z.infer<typeof updateFeedbackStatusSchema>;

/**
 * Réponse de l'admin dans le fil du signalement. Même longueur qu'un message
 * de coach : c'est le même fil, lu dans le même écran.
 */
export const replyFeedbackSchema = z.object({
  body: z.string().trim().min(1, "Écrivez votre réponse").max(2000),
});
export type ReplyFeedbackInput = z.infer<typeof replyFeedbackSchema>;

/** Valeurs venues de la base ramenées à la liste connue, sans doublon */
export function asCoachCategories(values: readonly string[] | null | undefined): CoachCategory[] {
  if (!values) return [];
  const known = new Set<string>(COACH_CATEGORIES);
  return [...new Set(values.filter((v): v is CoachCategory => known.has(v)))];
}

// ---------- Points et paliers ----------

/**
 * Points gagnés quand les deux coachs valident leur rencontre en se scannant
 * au stade. Les deux en gagnent : celui qui reçoit a tenu son engagement autant
 * que celui qui s'est déplacé.
 *
 * Le dépannage vaut double, mais pour le seul coach qui répond à un SOS : c'est
 * lui qui rend le service, en acceptant un match qu'un autre vient d'abandonner.
 * L'hôte, lui, ne gagne rien de plus à voir son adversaire se désister.
 */
export const MATCH_POINTS = {
  /** Rencontre honorée, pour chacun des deux coachs */
  rencontre: 10,
  /** Coach venu répondre à une annonce repartie en SOS (remplace les 10, ne s'y ajoute pas) */
  sosResponder: 20,
  /** Équipe venue au tournoi et pointée à l'arrivée — même effort qu'un amical */
  tournoi: 10,
  /**
   * Organisateur du tournoi, crédité UNE SEULE FOIS au premier pointage, et
   * non par équipe accueillie : monter un tournoi à seize équipes deviendrait
   * sinon la façon la plus rapide de gravir les paliers. Le forfait vaut le
   * double d'une venue, parce qu'organiser coûte plus que se déplacer.
   */
  organisation: 20,
} as const;

/**
 * Délai avant qu'une même paire d'équipes rerapporte des points. Deux coachs
 * complices pourraient sinon enchaîner annonce → réponse → scan et fabriquer un
 * palier en une soirée. Les rencontres suivantes ont bien lieu et sont
 * enregistrées — elles ne paient simplement plus.
 *
 * Trente jours glissants plutôt qu'un mois calendaire : ce dernier rouvrirait
 * les compteurs le 1er, et deux matchs les 31 et 1er paieraient tous les deux.
 */
export const POINTS_COOLDOWN_DAYS = 30;

export const POINT_REASONS = ["rencontre", "sos", "tournoi", "organisation"] as const;
export type PointReason = (typeof POINT_REASONS)[number];

// ---------- Tournois ----------

/**
 * L'application ne gère du tournoi QUE sa visibilité et ses inscriptions :
 * pas de poules, pas de calendrier, pas de résultats. Tout le reste se règle
 * entre coachs, comme avant l'application.
 */
export const TOURNAMENT_STATUSES = ["open", "cancelled"] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

/** Bornes du nombre d'équipes attendues — un tournoi en dessous de 3 est un amical */
export const TOURNAMENT_MIN_SLOTS = 3;
export const TOURNAMENT_MAX_SLOTS = 64;

/** Durée maximale d'un tournoi, en jours. Au-delà, c'est un championnat. */
export const TOURNAMENT_MAX_DAYS = 7;

/** Pas d'horaire réel pour un tournoi — seulement s'il se joue de jour ou en nocturne */
export const TOURNAMENT_SESSIONS = ["day", "night"] as const;
export type TournamentSession = (typeof TOURNAMENT_SESSIONS)[number];
export const TOURNAMENT_SESSION_LABELS: Record<TournamentSession, string> = {
  day: "Journée",
  night: "Nocturne",
};

export const createTournamentSchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Absente = tournoi d'une seule journée */
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    session: z.enum(TOURNAMENT_SESSIONS),
    city: z.string().trim().min(1).max(100),
    stadium: z.string().trim().min(1).max(150),
    // Plusieurs catégories d'âge peuvent jouer le même tournoi, en poules
    // séparées.
    category: z.array(z.enum(MATCH_CATEGORIES)).min(1),
    gender: z.enum(MATCH_GENDERS),
    format: z.enum(MATCH_FORMATS),
    slots: z.number().int().min(TOURNAMENT_MIN_SLOTS).max(TOURNAMENT_MAX_SLOTS),
    comment: z.string().trim().max(1000).optional(),
  })
  // Vérifiée ici et pas seulement dans le formulaire : une date de fin
  // antérieure au début donnerait un tournoi impossible à afficher.
  .refine((t) => !t.endDate || t.endDate >= t.date, {
    message: "La date de fin ne peut pas précéder le début",
    path: ["endDate"],
  })
  .refine((t) => !t.endDate || daysBetweenIso(t.date, t.endDate) < TOURNAMENT_MAX_DAYS, {
    message: `Un tournoi ne peut pas durer plus de ${TOURNAMENT_MAX_DAYS} jours`,
    path: ["endDate"],
  });
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

/** Retrait d'une équipe inscrite — même motifs imposés qu'un désistement de match */
export const withdrawTournamentSchema = z.object({
  reason: z.enum(WITHDRAWAL_REASONS),
  details: z.string().trim().max(140).optional(),
});
export type WithdrawTournamentInput = z.infer<typeof withdrawTournamentSchema>;

/** Pointage à l'arrivée : le jeton vient du QR affiché par l'organisateur */
export const checkInTournamentSchema = z.object({
  token: z.string().min(10).max(100),
});
export type CheckInTournamentInput = z.infer<typeof checkInTournamentSchema>;

/**
 * Paliers affichés sur la fiche d'un coach. Le total brut reste interne : un
 * chiffre invite à la comparaison permanente, un palier se gagne et se garde.
 *
 * Les seuils visent un coach qui joue quelques amicaux par mois — Bronze après
 * trois rencontres, Platine au bout de plusieurs saisons. Une seule liste à
 * retoucher pour les rééquilibrer, tout le reste en découle.
 */
export const COACH_LEVELS = [
  { name: "Nouveau", min: 0 },
  { name: "Bronze", min: 30 },
  { name: "Argent", min: 100 },
  { name: "Or", min: 250 },
  { name: "Platine", min: 500 },
] as const;

export type CoachLevelName = (typeof COACH_LEVELS)[number]["name"];

export interface CoachLevelDto {
  name: CoachLevelName;
  /** Seuil atteint pour ce palier */
  min: number;
  /** Seuil du palier suivant, null au dernier — sert à la barre de progression */
  next: number | null;
}

/** Palier correspondant à un total de points, et le seuil suivant s'il en reste un */
export function levelForPoints(points: number): CoachLevelDto {
  let index = 0;
  for (let i = 0; i < COACH_LEVELS.length; i++) {
    if (points >= COACH_LEVELS[i].min) index = i;
  }
  const level = COACH_LEVELS[index];
  const upcoming = COACH_LEVELS[index + 1];
  return { name: level.name, min: level.min, next: upcoming ? upcoming.min : null };
}

// ---------- Politique de mot de passe ----------

/**
 * Longueur minimale d'un mot de passe CHOISI (inscription, changement).
 *
 * Huit caractères sans autre exigence laissaient passer « motdepasse » et
 * « 12345678 ». Ce n'était tenable que si la limitation de débit bornait le
 * devinage — or elle ne le bornait pas (voir FC-01 et FC-02 du rapport
 * d'audit). Douze caractères sortent le devinage hors de portée même sans
 * frein.
 */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Longueur minimale acceptée À LA CONNEXION. Volontairement restée à 8 : la
 * relever verrouillerait dehors les comptes existants dont le mot de passe fait
 * 8 à 11 caractères, ainsi que les mots de passe temporaires déjà distribués
 * par l'administrateur. La connexion doit accepter ce qui existe ; c'est au
 * choix d'un nouveau mot de passe d'être exigeant.
 */
export const PASSWORD_LOGIN_MIN_LENGTH = 8;

/**
 * Mots de passe interdits, quelle que soit leur longueur.
 *
 * Liste courte et embarquée, pas un service tiers : un appel réseau sortant sur
 * le chemin d'inscription ajouterait une dépendance et une latence pour un gain
 * marginal. Ce qu'on veut écarter, ce sont les mots de passe qu'un attaquant
 * essaie dans ses dix premières tentatives — et pour cette application-ci, le
 * vocabulaire du football en fait partie autant que « azertyuiop ».
 *
 * La comparaison ignore la casse et les chiffres ou ponctuations ajoutés en
 * bout : « Football123! » ne vaut pas mieux que « football ».
 */
const FORBIDDEN_PASSWORDS = [
  // Universels
  "password", "motdepasse", "azerty", "azertyuiop", "qwerty", "qwertyuiop",
  "123456", "1234567890", "0123456789", "iloveyou", "admin", "administrateur",
  "welcome", "bienvenue", "letmein", "changeme", "secret", "abc", "abcdef",
  "monmotdepasse", "soleil", "bonjour", "coucou", "chouchou", "doudou",
  // Propres à ce produit : les premiers essais d'un attaquant qui sait où il est
  "teamnexus", "football", "foot", "coach", "entraineur", "equipe", "match",
  "stade", "ballon", "gardien", "champion", "victoire", "demo", "test",
];

/** Réduit un mot de passe à son ossature, pour le comparer à la liste noire. */
function passwordStem(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    // Retire les accents : « équipe » et « equipe » sont le même mot de passe
    .replace(/[̀-ͯ]/g, "")
    // Puis les chiffres et la ponctuation de début et de fin, qui ne sont
    // qu'un déguisement : « Football123! » -> « football »
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
}

/** Le mot de passe est-il un grand classique, déguisé ou non ? */
export function isForbiddenPassword(value: string): boolean {
  const stem = passwordStem(value);
  if (stem.length === 0) return true; // uniquement des chiffres ou des symboles
  return FORBIDDEN_PASSWORDS.includes(stem);
}

export const PASSWORD_TOO_SHORT = `${PASSWORD_MIN_LENGTH} caractères minimum.`;
export const PASSWORD_TOO_COMMON =
  "Ce mot de passe est trop courant — il figure dans les premiers essais d'une attaque.";

/**
 * Message d'erreur pour un mot de passe choisi, ou `null` s'il convient.
 * Partagé pour que le formulaire et l'API disent exactement la même chose.
 */
export function passwordProblem(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) return PASSWORD_TOO_SHORT;
  if (isForbiddenPassword(value)) return PASSWORD_TOO_COMMON;
  return null;
}

/** Schéma d'un mot de passe CHOISI par l'utilisateur. */
export const chosenPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT)
  .refine((v) => !isForbiddenPassword(v), { message: PASSWORD_TOO_COMMON });

// ---------- Schémas de requêtes ----------
export const loginSchema = z.object({
  email: z.string().email(),
  // Pas `chosenPasswordSchema` : voir PASSWORD_LOGIN_MIN_LENGTH. Relever cette
  // borne reviendrait à refuser des mots de passe corrects.
  password: z.string().min(PASSWORD_LOGIN_MIN_LENGTH),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/**
 * Identifiants d'objet passés dans le chemin.
 *
 * Le transtypage `request.params as { id: string }` ne valide rien à
 * l'exécution : la chaîne partait telle quelle dans une comparaison sur une
 * colonne `uuid`, et Postgres répondait par l'erreur 22P02. Le client recevait
 * bien un 500 anonyme — aucune fuite — mais chaque appel malformé écrivait une
 * erreur complète dans les journaux, que n'importe qui pouvait donc gonfler à
 * volonté pour noyer une attaque réelle dans le bruit.
 *
 * Le ZodError est transformé en 400 par le gestionnaire d'erreurs : la
 * validation ne demande rien de plus que de remplacer le transtypage.
 */
export const idParamSchema = z.object({ id: z.string().uuid() });
export const coachIdParamSchema = z.object({ coachId: z.string().uuid() });
export const teamCoachParamsSchema = z.object({ id: z.string().uuid(), coachId: z.string().uuid() });
export const responseParamsSchema = z.object({ id: z.string().uuid(), responseId: z.string().uuid() });

/**
 * Le niveau doit exister pour la catégorie qu'il accompagne — jamais un R1 sur
 * une annonce U8-U9, jamais un niveau absent là où la catégorie en propose.
 * Partagée par l'annonce et les références d'équipe : même règle des deux côtés.
 */
function levelMatchesCategory(v: { category: string; level?: DivisionLevel | null }): boolean {
  const allowed = divisionLevelsFor(v.category);
  if (allowed.length === 0) return !v.level;
  return !v.level || (allowed as readonly string[]).includes(v.level);
}

export const createAnnouncementSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    city: z.string().min(1).max(100),
    stadium: z.string().min(1).max(150),
    // Groupes d'âges, pas catégories fines : une rencontre se cherche en U12-U13,
    // c'est ainsi que les districts apparient les équipes.
    category: z.enum(ANNOUNCEMENT_CATEGORIES),
    // Demandé à la publication : deviner le genre d'une équipe serait présumer,
    // et une annonce féminine tombée face à une équipe masculine ne se joue pas.
    gender: z.enum(MATCH_GENDERS),
    // Niveau souhaité de l'adversaire (D2, R1…) — null pour les catégories qui
    // n'en ont pas (jusqu'aux U9).
    level: z.enum(DIVISION_LEVELS).nullable(),
    format: z.enum(MATCH_FORMATS),
    comment: z.string().max(500).optional(),
    // Plus d'attestation par annonce : la responsabilité de déclarer le match à
    // la fédération est acceptée à l'inscription (registerCoachSchema →
    // acceptResponsibility), pour tous les matchs à venir. La redemander à
    // chaque publication ne renforçait rien et faisait un obstacle de plus.
  })
  .refine(levelMatchesCategory, { message: "Niveau invalide pour cette catégorie", path: ["level"] });
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

/** Modifier une annonce déjà publiée — mêmes champs, tant qu'elle est encore ouverte */
export const updateAnnouncementSchema = createAnnouncementSchema;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

/** Coup d'envoi : passage de `scheduled` à `live` */
export const kickoffSchema = z.object({});

/**
 * Saisie du score final par l'un des deux coachs. Elle clôt le match : il n'y a
 * plus de contre-validation, c'est le scan de rencontre qui atteste que les
 * deux équipes se sont bien retrouvées.
 */
export const finalScoreSchema = z.object({
  homeScore: z.number().int().min(0).max(99),
  awayScore: z.number().int().min(0).max(99),
});
export type FinalScoreInput = z.infer<typeof finalScoreSchema>;

/** Validation de la rencontre par le coach qui s'est déplacé : le jeton vient du QR scanné */
export const confirmEncounterSchema = z.object({
  token: z.string().min(10).max(100),
});
export type ConfirmEncounterInput = z.infer<typeof confirmEncounterSchema>;

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
 * Références d'une équipe : sa catégorie d'engagement, son genre et son stade
 * habituel.
 *
 * Renseignées une fois à la création, elles préremplissent chaque annonce — un
 * coach de U13 masculin qui reçoit toujours au même stade ne les ressaisit
 * plus. Elles restent modifiables annonce par annonce : un déplacement se joue
 * ailleurs, et un amical peut se caler sur une autre catégorie.
 *
 * Le genre est demandé au même titre que la catégorie parce qu'il sert deux
 * fois : à remplir l'annonce, et à dire au coach qui reçoit une proposition si
 * l'équipe d'en face joue dans le même tableau (`teamMatchesAnnouncement`).
 *
 * Le stade est facultatif (tous les clubs n'en ont pas un attitré) ; la chaîne
 * vide vaut « aucun » et sera stockée `null`.
 */
const teamReferencesShape = {
  category: z.enum(MATCH_CATEGORIES),
  gender: z.enum(MATCH_GENDERS),
  stadium: z.string().trim().max(150).optional(),
  /**
   * Terrain choisi dans le recensement public, quand le coach en a retenu un.
   *
   * Il ne remplace pas `stadium` — le nom reste modifiable, et un terrain absent
   * du recensement se tape toujours à la main. Ce qu'il apporte, ce sont les
   * COORDONNÉES : l'équipe cesse d'être située au centre de sa commune, et
   * toutes les distances de l'application s'en trouvent justes.
   */
  venueId: z.string().uuid().nullable().optional(),
  // Niveau réel de l'équipe (D2, R1…) — absent tant qu'il n'a pas été réglé,
  // et jamais proposé pour les catégories qui n'en ont pas.
  level: z.enum(DIVISION_LEVELS).nullable().optional(),
};

export const teamReferencesSchema = z.object(teamReferencesShape).refine(levelMatchesCategory, {
  message: "Niveau invalide pour cette catégorie",
  path: ["level"],
});
export type TeamReferencesInput = z.infer<typeof teamReferencesSchema>;

/**
 * Création d'une équipe supplémentaire par un coach déjà inscrit. Mêmes bornes
 * que l'équipe créée à l'inscription : c'est la même chose, créée plus tard.
 */
/**
 * Le club d'une équipe, à la création comme à l'inscription. Deux formes
 * exclusives, et l'absence des deux vaut « pas de club » :
 *
 * - `clubId` : le coach a reconnu un club DÉJÀ déclaré (celui que la détection
 *   de doublon lui a proposé) — on s'y rattache, on n'en crée pas un second ;
 * - `club` : personne ne l'avait déclaré, il le nomme lui-même.
 *
 * Le champ est facultatif de bout en bout : beaucoup de coachs n'ont pas de
 * club à nommer, et rien de ce que fait l'application n'en dépend.
 */
export const clubChoiceShape = {
  clubId: z.string().uuid().optional(),
  club: z
    .object({
      name: z.string().trim().min(2, "Nom du club trop court").max(80),
      city: z.string().trim().min(1).max(60),
      stadium: z.string().trim().max(150).optional(),
    })
    .optional(),
};

/** Un seul des deux : se rattacher ET déclarer n'aurait pas de sens */
export function oneClubChoice(value: { clubId?: string; club?: unknown }): boolean {
  return !(value.clubId && value.club);
}
export const CLUB_CHOICE_CONFLICT = "Choisissez un club existant OU déclarez-en un, pas les deux.";

export const createTeamSchema = z
  .object({
    ...teamReferencesShape,
    ...clubChoiceShape,
    name: z.string().trim().min(2).max(60),
    city: z.string().trim().min(1).max(60),
  })
  .refine(levelMatchesCategory, { message: "Niveau invalide pour cette catégorie", path: ["level"] })
  .refine(oneClubChoice, { message: CLUB_CHOICE_CONFLICT, path: ["club"] });
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

/** Déclaration d'un club depuis un écran qui ne crée pas d'équipe (espace admin) */
export const declareClubSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().min(1).max(60),
  stadium: z.string().trim().max(150).optional(),
});
export type DeclareClubInput = z.infer<typeof declareClubSchema>;

/**
 * Mise à jour des seules références. Le nom et la ville n'en font pas partie :
 * la ville sert de point d'ancrage au radar et aux distances déjà calculées,
 * la changer relève d'autre chose que régler un préremplissage.
 */
export const updateTeamReferencesSchema = teamReferencesSchema;

/**
 * Acceptation exigée à l'inscription. `z.literal(true)` et non `z.boolean()` :
 * le champ absent, `false`, ou n'importe quoi d'autre fait échouer la requête.
 * La case décochée ne peut donc pas créer de compte, même en contournant
 * l'interface — l'acceptation est vérifiée là où elle a une valeur, au serveur.
 */
const acceptedSchema = (subject: string) =>
  z.literal(true, { errorMap: () => ({ message: `Acceptation requise : ${subject}` }) });

/**
 * Numéro de licence d'éducateur. Volontairement permissif : les formats
 * varient d'un district à l'autre, et rien ne s'appuie dessus pour l'instant —
 * un contrôle strict n'écarterait que des numéros valides mal devinés.
 * La chaîne vide vaut « pas de licence » et sera stockée `null`.
 *
 * Déclaré ici, avant les deux schémas qui l'utilisent (inscription et profil) :
 * un `const` employé plus haut que sa définition lèverait à l'évaluation du
 * module, pas au premier appel.
 */
export const coachLicenseSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[A-Za-z0-9 .\-/]*$/, "Numéro de licence invalide");

/**
 * Surnom du coach : l'identité qu'il montre aux autres. Obligatoire — c'est LE
 * nom d'affichage — quand le prénom et le nom, eux, sont devenus facultatifs.
 */
export const nicknameSchema = z.string().trim().min(1, "Choisissez un surnom").max(30);

export const registerCoachSchema = z.object({
  ...clubChoiceShape,
  nickname: nicknameSchema,
  // Facultatifs depuis l'arrivée du surnom : ils ne s'affichent qu'au
  // titulaire (profil) et aux gestionnaires (admin, club), jamais aux
  // confrères. Chaîne vide = non renseigné — pas un NULL à interpréter.
  firstName: z.string().trim().max(50).default(""),
  lastName: z.string().trim().max(50).default(""),
  email: z.string().email(),
  password: chosenPasswordSchema,
  teamName: z.string().min(2).max(60),
  teamCity: z.string().min(1).max(60),
  // Références de l'équipe créée avec le compte : mêmes règles que partout
  // ailleurs (voir teamReferencesSchema), simplement préfixées « team ».
  teamCategory: z.enum(MATCH_CATEGORIES),
  teamGender: z.enum(MATCH_GENDERS),
  teamStadium: z.string().trim().max(150).optional(),
  // Facultatif : un coach l'a souvent sous la main en s'inscrivant, beaucoup
  // moins le jour où il faudra le retrouver. Modifiable ensuite dans le profil.
  licenseNumber: coachLicenseSchema.optional(),
  // Casquettes choisies à l'inscription. Absentes ou vides = aucune, le cas
  // ordinaire : le défaut évite qu'un client plus ancien, qui ne les envoie
  // pas, se voie refuser l'inscription. Modifiables ensuite dans le profil.
  categories: z.array(z.enum(COACH_CATEGORIES)).max(COACH_CATEGORIES.length).default([]),
  /**
   * Profil public dans la liste des coachs de sa catégorie. Le défaut vaut
   * « public » : c'est l'état de tous les comptes créés avant ce réglage, et un
   * client plus ancien qui n'envoie pas le champ ne doit pas se voir refuser
   * l'inscription. La question est posée en clair dans le parcours.
   */
  profilePublic: z.boolean().default(true),
  // Deux acceptations distinctes, et non une case unique fourre-tout : la
  // clause de responsabilité (déclaration à la fédération, licences, transport)
  // est celle qui protège réellement l'éditeur. Acceptée à part, elle ne peut
  // pas être présentée comme noyée dans un renvoi aux conditions générales.
  acceptTerms: acceptedSchema("conditions générales d'utilisation"),
  acceptResponsibility: acceptedSchema("responsabilités du coach et de son club"),
}).refine(oneClubChoice, { message: CLUB_CHOICE_CONFLICT, path: ["club"] });
export type RegisterCoachInput = z.infer<typeof registerCoachSchema>;

// Création d'un compte club par l'admin : le club + son compte de connexion (contact)
export const createClubSchema = z.object({
  name: z.string().min(2).max(80),
  city: z.string().min(1).max(60),
  /** Stade du club — repris par les équipes qui s'y rattacheront */
  stadium: z.string().trim().max(150).optional(),
  contactFirstName: z.string().min(1).max(50),
  contactLastName: z.string().min(1).max(50),
  email: z.string().email(),
  /**
   * Club DÉJÀ déclaré que ce compte vient reprendre. C'est la sortie de la
   * détection de doublon : un club nommé par un coach ne doit pas être créé une
   * seconde fois le jour où l'administrateur lui ouvre un espace — les équipes
   * déjà rattachées resteraient de l'autre côté.
   */
  claimClubId: z.string().uuid().optional(),
});
export type CreateClubInput = z.infer<typeof createClubSchema>;

/**
 * Correction d'un club par l'admin — l'orthographe, la ville, le stade.
 *
 * Tous les champs sont facultatifs : l'admin corrige souvent un seul mot
 * (« AS. Lyon » → « AS Lyon ») et ne doit pas avoir à renvoyer le reste.
 * `stadium` accepte la chaîne vide pour effacer un stade saisi par erreur.
 */
export const adminUpdateClubSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    city: z.string().trim().min(1).max(60).optional(),
    stadium: z.string().trim().max(150).optional(),
  })
  .refine((v) => Object.values(v).some((field) => field !== undefined), {
    message: "Aucune modification",
  });
export type AdminUpdateClubInput = z.infer<typeof adminUpdateClubSchema>;

/**
 * Fusion de deux clubs qui n'en sont qu'un : `sourceId` disparaît au profit du
 * club appelé dans l'URL. Ce qui pointait vers lui — équipes, coachs affiliés,
 * demandes d'affiliation — est repointé avant sa suppression.
 */
export const mergeClubSchema = z.object({ sourceId: z.string().uuid() });
export type MergeClubInput = z.infer<typeof mergeClubSchema>;

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
  nickname: nicknameSchema,
  firstName: z.string().trim().max(50).default(""),
  lastName: z.string().trim().max(50).default(""),
  licenseNumber: coachLicenseSchema.nullable().optional(),
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
 * Longueur maximale d'un message entre coachs. Large de quoi caler une heure de
 * rendez-vous et expliquer un imprévu, court de quoi rester lisible dans une
 * bulle — au-delà, c'est un appel téléphonique qu'il faut passer.
 */
export const MESSAGE_MAX_LENGTH = 2000;

/** Envoi d'un message dans une conversation */
export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, "Écrivez votre message").max(MESSAGE_MAX_LENGTH),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/**
 * Longueur maximale d'une publication de contributeur. C'est un billet
 * d'information — les poules du district, une intempérie qui annule — pas un
 * article : au-delà, l'information se noie dans le texte.
 */
export const PUBLICATION_MAX_LENGTH = 800;

/** Rédaction d'une publication (coachs contributeurs uniquement) */
export const createPublicationSchema = z.object({
  body: z.string().trim().min(1, "Écrivez votre publication").max(PUBLICATION_MAX_LENGTH),
});
export type CreatePublicationInput = z.infer<typeof createPublicationSchema>;

/**
 * Préfixe du QR code d'un coach : `TEAMNEXUS:COACH:<code>`. Il permet au
 * scanner de reconnaître un code TeamNexus et d'écarter tout autre QR.
 */
export const COACH_QR_PREFIX = "TEAMNEXUS:COACH:";

export function coachQrPayload(code: string): string {
  return `${COACH_QR_PREFIX}${code}`;
}

/** Extrait le code d'un QR scanné ; null si ce n'est pas un QR coach TeamNexus */
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
  /** Surnom : l'identité affichée partout dans l'application */
  nickname: string;
  /** Facultatifs (chaîne vide = non renseigné) : visibles du seul titulaire et des gestionnaires */
  firstName: string;
  lastName: string;
  /** Équipe active/principale. Coach : première de `teams`. Autres rôles : leur équipe. */
  teamId: string | null;
  teamName: string | null;
  /** Coach : toutes ses équipes (U10, U13…), principale en premier. Absent pour les autres rôles. */
  teams?: CoachTeamDto[];
  /** Téléphone du profil — visible de ses relations uniquement */
  phone: string | null;
  /**
   * Coach : son numéro de licence d'éducateur, facultatif. Servi au SEUL
   * titulaire — il n'apparaît ni sur les fiches de relations, ni nulle part
   * ailleurs. Donnée administrative, pas un signe extérieur.
   */
  licenseNumber?: string | null;
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
  /** Coach : total de points gagnés aux rencontres, et le palier qui en découle */
  points?: number;
  level?: CoachLevelDto;
  /** Coach : ses casquettes (tableau vide = simple coach) */
  categories?: CoachCategory[];
  /**
   * Coach : profil public dans la liste des coachs de sa catégorie. À `false`,
   * les coachs qu'il n'a pas encore croisés n'y voient que son surnom.
   */
  profilePublic?: boolean;
  /** Coach : matchs terminés par les équipes qu'il encadre — son compteur d'expérience */
  matchesPlayed?: number;
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
  /** Un coach m'écrit dans une conversation */
  message: boolean;
  /** Mon équipe n'a rien de prévu sur son jour de match habituel, dans une dizaine de jours */
  freeWeekend: boolean;
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
  /**
   * Écusson de l'équipe, servi depuis le volume d'uploads. `null` quand aucun
   * n'a été envoyé : l'affichage retombe alors sur les initiales, qui restent
   * le repli partout où ce logo apparaît.
   */
  logoUrl: string | null;
}

/**
 * Club proposé à la saisie, tiré de l'annuaire public des entreprises. Ce n'est
 * qu'une SUGGESTION : rien n'oblige le coach à en retenir une, et aucune
 * référence n'est conservée vers l'annuaire — seul le texte choisi est stocké.
 */
export interface ClubSuggestionDto {
  name: string;
  /** Commune du siège, pour distinguer deux clubs homonymes (null si absente) */
  city: string | null;
  postalCode: string | null;
}

/** Une équipe encadrée par le coach connecté, avec son rôle dessus (sélecteur "Mes équipes") */
export interface CoachTeamDto {
  id: string;
  name: string;
  city: string;
  role: TeamCoachRole;
  /**
   * Références reprises à la publication d'une annonce. `null` pour les équipes
   * créées avant leur introduction : rien n'est deviné, le formulaire retombe
   * alors sur ses valeurs par défaut.
   */
  category: MatchCategory | null;
  gender: MatchGender | null;
  stadium: string | null;
  /** Niveau réel de l'équipe (D2, R1…) — null tant qu'il n'a pas été réglé */
  level: DivisionLevel | null;
  /** Écusson de l'équipe (null tant qu'aucun n'a été envoyé) */
  logoUrl: string | null;
  /** Club déclaré auquel elle se rattache — null pour une équipe sans club */
  club: DeclaredClubDto | null;
}

/**
 * Un club tel que l'application le connaît : nommé une fois, retrouvé ensuite
 * par les autres coachs du même club.
 *
 * `hasAccount` distingue les clubs créés par un administrateur — qui ont un
 * espace de gestion et un code d'affiliation — de ceux simplement DÉCLARÉS par
 * un coach. Les seconds n'existent que pour être reconnus et partagés ; c'est
 * ce qui permet à un club amateur absent de tout annuaire d'exister ici sans
 * qu'on lui fabrique un compte dont personne n'a demandé les clés.
 */
export interface DeclaredClubDto {
  id: string;
  name: string;
  city: string;
  stadium: string | null;
  hasAccount: boolean;
}

/** Proposition d'un coach adverse sur une annonce (visible par l'émetteur) */
export interface AnnouncementResponseDto {
  id: string;
  team: TeamDto;
  /**
   * Catégorie et genre de l'équipe qui propose — de quoi vérifier, avant
   * d'accepter, qu'elle joue bien dans le même tableau que l'annonce
   * (`teamMatchesAnnouncement`). `null` pour les équipes créées avant que ces
   * références existent : on ne signale alors rien plutôt qu'un faux écart.
   *
   * Portés par la proposition et non par `TeamDto` : c'est ici, et nulle part
   * ailleurs, que la comparaison a un sens.
   */
  teamCategory: MatchCategory | null;
  teamGender: MatchGender | null;
  /**
   * Le coach qui a proposé, en personne — à défaut le représentant de son
   * équipe. C'est lui que l'émetteur veut voir avant d'accepter : sa carte
   * s'ouvre depuis la proposition. `null` si l'équipe n'a plus d'encadrant.
   */
  coach: CoachRefDto | null;
  status: ResponseStatus;
  createdAt: string;
  /** Le fil ouvert entre les deux coachs pour en discuter et décider — null si aucun des deux comptes ne tient plus */
  conversationId: string | null;
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
  /** Niveau souhaité de l'adversaire (D2, R1…) — null pour les catégories qui n'en ont pas */
  level: DivisionLevel | null;
  format: MatchFormat;
  comment: string | null;
  status: AnnouncementStatus;
  isMine: boolean;
  /** Nombre de fois où un autre coach a ouvert le détail de l'annonce */
  viewCount: number;
  /**
   * Jusqu'aux U11, l'annonce ne cherche pas UN adversaire mais un PLATEAU de
   * quatre équipes : elle reste ouverte jusqu'à trois acceptations.
   */
  plateau: boolean;
  /** Équipes cherchées (1 pour un amical, 3 pour un plateau) */
  teamsWanted: number;
  /** Équipes déjà acceptées — ce qui reste se déduit */
  teamsAccepted: number;
  /**
   * Plateau clos sans avoir fait le plein : le jour du match est arrivé avec
   * deux ou trois équipes au lieu de quatre. Il se joue tel quel, et les
   * rencontres qu'il contient rapportent leurs points normalement — d'où le
   * besoin de le NOMMER plutôt que de le laisser passer pour un plateau
   * complet.
   */
  plateauReduced: boolean;
  /**
   * Coach qui représente l'équipe émettrice — de quoi ouvrir sa carte depuis
   * l'annonce. Publier, c'est se montrer : le nom sort de l'anonymat le temps
   * que l'annonce cherche un adversaire.
   */
  coach: CoachRefDto | null;
  createdAt: string;
  /** Renseignés quand l'annonce est matchée : le match créé et l'équipe qui a répondu */
  matchId: string | null;
  opponentTeam: TeamDto | null;
  /**
   * Fiabilité de l'équipe qui publie. À côté de la date et du lieu, parce que
   * c'est une information de DÉCISION : accepter un match, c'est parier que
   * l'adversaire sera là.
   */
  reliability: ReliabilityDto;
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
   * remonte en tête du radar.
   */
  isSos: boolean;
  sosReason: WithdrawalReason | null;
  sosDetails: string | null;
}

/**
 * Ce que la DERNIÈRE annonce du coach lègue à la suivante. Un coach republie
 * presque toujours la même chose : même catégorie, même genre, même niveau,
 * même format, même stade. Le formulaire s'en sert pour se replier sur
 * l'essentiel — la date, le lieu, les informations — et ranger le reste
 * derrière un « Modifier ».
 *
 * Servi par le serveur et non retenu par le navigateur : un coach qui publie
 * depuis le téléphone du club puis depuis le sien doit retrouver ses habitudes,
 * pas repartir de zéro.
 *
 * `null` quand le coach n'a encore rien publié : c'est le signal que le
 * formulaire doit tout montrer, il n'a rien à résumer.
 */
export interface AnnouncementDefaultsDto {
  category: AnnouncementCategory;
  gender: MatchGender | null;
  level: DivisionLevel | null;
  format: MatchFormat;
  stadium: string;
  city: string;
}

/**
 * Réponse du radar. Le périmètre est appliqué côté serveur — inutile d'envoyer
 * au téléphone des annonces qu'il ne montrera pas. `beyondRadius` compte celles
 * que le périmètre a écartées, pour proposer de balayer plus large sans avoir à
 * les télécharger.
 */
/** Le bandeau du tableau de bord : combien d'équipes et d'annonces dans mon groupe d'âges, dans mon secteur */
export interface CategoryStatsDto {
  /** Groupe d'âges de mon équipe active — null si elle n'en a pas encore une */
  category: AnnouncementCategory | null;
  teamsInCategory: number;
  announcementsInCategory: number;
  /** Tournois ouverts du secteur qui accueillent ma catégorie */
  tournamentsInCategory: number;
}

/** Le bandeau du tableau de bord : trois chiffres à l'échelle de toute l'application, pas de mon seul secteur */
export interface PlatformStatsDto {
  coachesCount: number;
  matchesCount: number;
  tournamentsCount: number;
}

/**
 * Un coach de ma catégorie, dans mon secteur — la liste qu'ouvre le bandeau du
 * tableau de bord.
 *
 * Son identité y est visible sans qu'on se soit encore croisés : c'est un
 * annuaire de voisinage, limité à MON groupe d'âges et à MON périmètre. La
 * règle de visibilité des cartes de coach (`canSeeCoachCard`) a été élargie en
 * conséquence — voir son commentaire.
 */
export interface CategoryCoachDto {
  id: string;
  nickname: string;
  /**
   * Profil public. À `false`, TOUT le reste de cette fiche est vide : le coach a
   * choisi de n'apparaître ici que sous son surnom. Ce n'est pas au client de
   * décider quoi masquer — le serveur ne l'envoie pas.
   */
  isPublic: boolean;
  avatarUrl: string | null;
  /** L'équipe qui le situe : celle de MA catégorie qu'il encadre (null si profil privé) */
  team: TeamDto | null;
  /** Distance entre mon point de balayage et la ville de son équipe (null si inconnue ou profil privé) */
  distanceKm: number | null;
  level: CoachLevelDto | null;
  /** A-t-il une annonce ouverte en ce moment ? De quoi aller lui répondre */
  hasOpenAnnouncement: boolean;
}

export interface RadarDto {
  items: AnnouncementDto[];
  /**
   * Tournois du même périmètre, servis à part plutôt que fondus dans `items` :
   * les deux se présentent ensemble à l'écran, mais ils n'ont ni les mêmes
   * champs ni les mêmes actions, et une liste hétérogène aurait obligé chaque
   * lecteur d'annonce à se demander sur quoi il tombe.
   */
  tournaments: TournamentDto[];
  beyondRadius: number;
}

export interface MatchDto {
  id: string;
  homeTeam: TeamDto;
  awayTeam: TeamDto;
  /** Les deux coachs : la feuille de match les présente face à face */
  homeCoach: CoachRefDto | null;
  awayCoach: CoachRefDto | null;
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
  /** true si le coup d'envoi est passé et que le score final reste à saisir */
  finalScoreDue: boolean;
  /**
   * ————— Rencontre —————
   * Horodatage du scan qui atteste que les deux coachs se sont retrouvés.
   */
  encounterConfirmedAt: string | null;
  /**
   * true le jour du match et après : avant, il n'y a rien à attester. Calculé
   * par le serveur pour que l'heure du téléphone n'ouvre pas la fenêtre.
   */
  encounterOpen: boolean;
  /**
   * Jeton du QR, servi au seul coach de l'équipe qui REÇOIT, et seulement
   * lorsqu'il demande à l'afficher. Toujours null pour celui qui se déplace :
   * c'est le scan qui le lui apporte, et c'est ce qui rend la validation
   * impossible à distance.
   */
  encounterToken: string | null;
  /**
   * Plateau dont ce match fait partie (≤ U11), `null` pour un amical ordinaire.
   * `teams` compte les équipes réunies, hôte comprise ; en dessous de `wanted`,
   * le plateau est RÉDUIT — il se joue, et le scan de rencontre y donne les
   * mêmes points qu'ailleurs. C'est ce qu'il faut dire au bord du terrain à
   * deux coachs qui pourraient croire leur déplacement non comptabilisé.
   */
  plateau: { teams: number; wanted: number } | null;
  /**
   * ————— Confirmation en deux temps —————
   * Convenir d'un match six semaines à l'avance ne dit pas qu'on y sera. Chaque
   * camp reconfirme à l'approche ; celui qui ne confirme pas se voit, et son
   * silence est une information — bien plus tôt qu'un appel le samedi soir.
   */
  iConfirmed: boolean;
  opponentConfirmed: boolean;
  /** true quand la fenêtre de confirmation est ouverte (voir CONFIRMATION_STAGES) */
  confirmationOpen: boolean;
  /**
   * ————— Détails pratiques —————
   * Qui arbitre, quels vestiaires, et l'horaire tel qu'il a été ajusté. Réglés
   * par l'équipe qui REÇOIT — elle seule connaît son stade — et lus par les
   * deux. C'est ce qui fait que le match se prépare ici plutôt que par SMS.
   */
  refereeBy: RefereeBy;
  refereeName: string | null;
  changingRooms: string | null;
  /** true pour le coach de l'équipe qui reçoit : lui seul peut les modifier */
  canEditDetails: boolean;
  /** Désistement : équipe qui a renoncé, et son motif (null si le match tient toujours) */
  withdrawnByTeamId: string | null;
  withdrawalReason: WithdrawalReason | null;
  withdrawalDetails: string | null;
}

export type MatchDetailDto = MatchDto;

export const TOURNAMENT_REGISTRATION_STATUSES = ["registered", "withdrawn"] as const;
export type TournamentRegistrationStatus = (typeof TOURNAMENT_REGISTRATION_STATUSES)[number];

/** Une équipe inscrite à un tournoi */
export interface TournamentRegistrationDto {
  id: string;
  team: TeamDto;
  status: TournamentRegistrationStatus;
  /** Horodatage du pointage à l'arrivée (null tant qu'elle n'est pas venue) */
  checkedInAt: string | null;
  createdAt: string;
}

export interface TournamentDto {
  id: string;
  /** Équipe organisatrice */
  team: TeamDto;
  name: string;
  date: string;
  /** null = tournoi d'une seule journée */
  endDate: string | null;
  session: TournamentSession;
  city: string;
  stadium: string;
  /** Plusieurs catégories d'âge peuvent jouer le même tournoi */
  category: string[];
  gender: MatchGender | null;
  format: MatchFormat;
  /** Nombre d'équipes attendues */
  slots: number;
  /** Inscrites et non retirées */
  registeredCount: number;
  /** Places restantes — 0 = complet, plus aucune inscription possible */
  slotsLeft: number;
  /** URL de l'affiche, servie par l'API (null = aucune affiche) */
  posterUrl: string | null;
  comment: string | null;
  status: TournamentStatus;
  /** Une équipe s'est retirée : la place rouverte passe le tournoi en tête du radar */
  isSos: boolean;
  sosReason: WithdrawalReason | null;
  sosDetails: string | null;
  /** Organisé par une de mes équipes */
  isMine: boolean;
  /** Inscription de mon équipe active, null si elle n'est pas inscrite */
  myRegistration: TournamentRegistrationDto | null;
  /** Distance et direction du LIEU du tournoi, comme pour une annonce */
  distanceKm: number | null;
  bearingDeg: number | null;
  createdAt: string;
  /**
   * Jeton du QR d'arrivée, servi au seul organisateur et seulement lorsqu'il
   * demande à l'afficher. Toujours null pour les équipes inscrites : c'est le
   * scan qui le leur apporte.
   */
  checkInToken: string | null;
  /** true à partir du jour du tournoi : avant, il n'y a personne à pointer */
  checkInOpen: boolean;
}

/** Un tournoi et la liste de ses équipes — la page du tournoi */
export interface TournamentDetailDto extends TournamentDto {
  registrations: TournamentRegistrationDto[];
}

/**
 * Réponse à un scan qui rapporte des points : ce qui a été validé, et ce qu'il
 * a rapporté. Partagée par la rencontre d'un amical et le pointage à l'arrivée
 * d'un tournoi — c'est le même geste, et le coach y attend la même réponse.
 */
export interface EncounterResultDto {
  /** Points crédités au coach qui vient de scanner (0 si le plafond s'applique) */
  pointsAwarded: number;
  reason: PointReason;
  /**
   * true quand la rencontre est bien validée mais ne rapporte rien : ces deux
   * équipes se sont déjà rencontrées dans les trente derniers jours. Dit
   * explicitement plutôt que déduit d'un `pointsAwarded` à zéro, qu'on
   * confondrait avec une erreur. Toujours false sur un tournoi : le plafond
   * porte sur une paire d'équipes, un tournoi n'en est pas une.
   */
  cappedByCooldown: boolean;
  /** Nouveau total et nouveau palier du coach qui a scanné */
  totalPoints: number;
  level: CoachLevelDto;
}

/** Événement du fil d'activité (espace coach) */
export interface ActivityDto {
  id: string;
  type: "announcement" | "score";
  /** Nom mis en gras côté client */
  actor: string;
  detail: string;
  /** Où mène la notification quand on la touche — null : simple information */
  href: string | null;
  createdAt: string;
}

/**
 * Occurrence d'agenda : événement d'équipe, match projeté, ou journée de
 * tournoi. Les trois sortes se rangent dans la même liste — une date occupée
 * l'est quelle qu'en soit la raison.
 */
export interface AgendaItemDto {
  /** Clé unique d'occurrence (affichage React uniquement — ne pas parser) */
  id: string;
  kind: "match" | "event" | "tournament";
  matchId: string | null;
  eventId: string | null;
  /** Tournoi d'origine : celui que l'équipe organise, ou auquel elle est inscrite */
  tournamentId: string | null;
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
  /** Toutes les lignes de la table, quel que soit leur statut */
  matchesTotal: number;
  /** Score final entré (`status = "finished"`) */
  matchesPlayed: number;
  tournamentsTotal: number;
  /** Dernier jour passé et non annulé — un tournoi n'a pas de statut "terminé" en base */
  tournamentsPlayed: number;
  /** 14 derniers jours, ordre chronologique */
  loginsPerDay: { date: string; count: number }[];
  /** 24 entrées (0h-23h) pour le jour demandé */
  loginsPerHour: { hour: number; count: number }[];
  /** Jour couvert par loginsPerHour (YYYY-MM-DD) */
  hourlyDate: string;
}

export interface AdminAccountDto {
  id: string;
  nickname: string;
  /** État civil, s'il a été renseigné — l'admin gère des comptes, il lui faut les deux */
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

/**
 * Un club vu de l'administrateur : la ligne de la table, plus ce qui s'y
 * accroche. Les compteurs sont là pour une seule décision — celle de fusionner
 * deux écritures du même club : ils disent ce qui suivra le club gardé et donc
 * ce qu'on perdrait à se tromper de sens.
 */
export interface AdminClubDto {
  id: string;
  name: string;
  city: string;
  stadium: string | null;
  /** Club créé par un admin (compte de connexion) vs simplement déclaré par un coach */
  hasAccount: boolean;
  /** Email du compte de connexion — null pour un club déclaré */
  ownerEmail: string | null;
  teamsCount: number;
  /** Coachs affiliés (users.clubId) */
  coachesCount: number;
  /** Demandes d'affiliation en attente */
  pendingRequests: number;
  createdAt: string;
}

/**
 * Des clubs qui n'en sont probablement qu'un : même ville, noms qui se
 * ressemblent. Un groupe est une QUESTION posée à l'admin, jamais un verdict —
 * c'est lui qui décide lequel garder, ou qu'il s'agit bien de deux clubs.
 */
export interface AdminClubDuplicateGroupDto {
  /** Deux clubs au moins, le plus fourni en premier */
  clubs: AdminClubDto[];
}

/**
 * Un signalement (bug ou suggestion), réservé aux coachs contributeurs.
 *
 * Le statut et la note de triage restent à l'admin ; ce que le contributeur
 * retrouve, lui, c'est le FIL ouvert avec l'équipe TeamNexus au moment de
 * l'envoi — c'est là que la réponse arrive, dans sa messagerie, et non dans un
 * écran « mes signalements » qu'il faudrait aller consulter.
 */
export interface FeedbackDto {
  id: string;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  adminNote: string | null;
  createdAt: string;
  handledAt: string | null;
  /** Fil ouvert avec l'équipe TeamNexus — null si aucun compte admin n'existe */
  conversationId: string | null;
}

/** Vue admin : la même chose, avec l'auteur — l'inbox mélange tous les coachs */
export interface AdminFeedbackDto extends FeedbackDto {
  author: CoachRefDto;
}

/**
 * Un message du fil d'un signalement, vu de l'admin. `fromAdmin` distingue les
 * réponses de l'équipe du signalement lui-même et de ce que le contributeur
 * écrit ensuite — l'admin doit voir qui parle sans avoir à deviner.
 */
export interface FeedbackThreadMessageDto {
  id: string;
  body: string;
  kind: MessageKind;
  fromAdmin: boolean;
  createdAt: string;
}

// ---------- Espace club ----------
export interface ClubDto {
  id: string;
  name: string;
  city: string;
  /** Stade du club — repris par ses équipes */
  stadium: string | null;
  email: string | null;
  /**
   * Code partagé aux coachs existants pour rejoindre le club (affiliation).
   * `null` pour un club simplement déclaré par un coach : sans compte pour
   * approuver les demandes, un code ne mènerait nulle part.
   */
  affiliationCode: string | null;
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

/**
 * De quoi désigner un coach et ouvrir sa carte. Posée sur les annonces et les
 * feuilles de match : elle porte juste ce qu'il faut pour l'afficher en ligne,
 * le reste vient de `GET /coaches/:id/card`.
 */
export interface CoachRefDto {
  id: string;
  /** Le surnom est la SEULE identité servie entre coachs — jamais l'état civil */
  nickname: string;
  avatarUrl: string | null;
}

/**
 * La carte d'un coach vue par un autre. Identique à la sienne, points compris :
 * une carte de joueur qui cacherait sa note ne serait plus une carte.
 *
 * L'accès est en revanche restreint — voir `canSeeCoachCard` côté serveur. Un
 * coach n'est pas visible de toute l'application : il l'est de ses relations,
 * de ceux qu'il rencontre, et de ceux qui voient une annonce qu'il a publiée
 * (publier, c'est se montrer).
 */
export interface CoachCardDto extends CoachRefDto {
  /** Club, ou à défaut l'équipe — le libellé est décidé par le serveur */
  clubLabel: string | null;
  /** Écusson de son équipe principale, affiché à côté du libellé (null s'il n'y en a pas) */
  clubLogoUrl: string | null;
  /** Catégorie d'âge de son équipe principale (U13…), null si non renseignée */
  teamCategory: string | null;
  /** Niveau de jeu de son équipe principale (D2, R1…), null si non réglé */
  teamLevel: DivisionLevel | null;
  level: CoachLevelDto;
  points: number;
  matchesPlayed: number;
  categories: CoachCategory[];
  /**
   * Fiabilité de son équipe principale. Portée par l'ÉQUIPE et non par la
   * personne : c'est le club qui honore ou non un engagement, et un adjoint
   * n'a pas à traîner le taux d'une équipe qu'il vient de rejoindre — ni à
   * s'en laver en changeant de banc.
   */
  reliability: ReliabilityDto;
}

/** Un coach du réseau de relations : contact + contexte sportif */
export interface CoachRelationDto {
  id: string;
  nickname: string;
  /** null si le coach n'a pas renseigné son numéro */
  phone: string | null;
  avatarUrl: string | null;
  clubName: string | null;
  teams: TeamDto[];
  createdAt: string;
  /** Palier de ce coach — un signal de fiabilité avant de lui proposer un match */
  level: CoachLevelDto;
  /** Ses casquettes : savoir qu'un confrère est joker sert le jour d'un désistement */
  categories: CoachCategory[];
}

// ---------- Messagerie entre coachs ----------

/**
 * Un fil de discussion avec un confrère, tel qu'il apparaît dans la liste.
 *
 * Une conversation par PAIRE de coachs, et non par match : deux coachs qui se
 * retrouvent une seconde fois reprennent le fil là où ils l'avaient laissé,
 * comme dans n'importe quelle messagerie. `match` dit seulement quelle
 * rencontre l'a ouverte — c'est le contexte de la première ligne, pas une clé.
 */
export interface ConversationDto {
  id: string;
  /** L'AUTRE coach : celui à qui l'on parle, jamais soi-même */
  coach: CoachRefDto;
  /** Son équipe, pour situer un homonyme (null s'il n'en encadre aucune) */
  teamName: string | null;
  /** Dernier message du fil — null tant que rien n'y a été inscrit */
  lastMessage: { body: string; createdAt: string; mine: boolean; kind: MessageKind } | null;
  /** Messages de l'autre coach reçus depuis ma dernière lecture */
  unread: number;
  /** Dernier message, ou création du fil : ce qui ordonne la liste */
  updatedAt: string;
}

/**
 * Qui parle dans un fil. `system` n'a pas d'expéditeur : c'est l'application
 * qui inscrit le match convenu, pour qu'on sache de quelle rencontre on parle —
 * deux coachs peuvent en avoir plusieurs ensemble, et plusieurs fils peuvent
 * s'ouvrir le même jour.
 */
export const MESSAGE_KINDS = ["coach", "system"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export interface MessageDto {
  id: string;
  kind: MessageKind;
  body: string;
  /** true si c'est moi qui l'ai écrit — c'est ce qui décide du côté de la bulle */
  mine: boolean;
  /** Match annoncé par un message `system` : de quoi ouvrir sa feuille */
  matchId: string | null;
  /**
   * Proposition dont ce message `system` parle. Présent tant que ça se
   * discute, pour porter les boutons Accepter/Décliner directement dans le
   * fil — `decidable` dit si c'est à MOI de trancher, ici et maintenant.
   */
  response: { id: string; announcementId: string; status: ResponseStatus; decidable: boolean } | null;
  createdAt: string;
}

/** Une conversation ouverte : son en-tête et ses messages, du plus ancien au plus récent */
export interface ConversationThreadDto {
  conversation: ConversationDto;
  messages: MessageDto[];
}

// ---------- Publications des contributeurs ----------

/**
 * Un billet d'information rédigé par un coach contributeur, lisible par tous
 * les coachs : les poules des matchs officiels, une intempérie qui annule…
 * À ne pas confondre avec les annonces : une publication n'attend pas de
 * réponse, elle informe.
 */
export interface PublicationDto {
  id: string;
  author: CoachRefDto;
  /** L'équipe qui situe l'auteur (null s'il n'en encadre aucune) */
  teamName: string | null;
  body: string;
  /** true si je l'ai rédigée — c'est ce qui affiche le bouton de suppression */
  mine: boolean;
  createdAt: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

/* ─────────────────────────── Disponibilités ───────────────────────────── */

/**
 * Où l'équipe accepte de jouer ce jour-là.
 *
 * `any` n'est pas un défaut mou : c'est le cas le plus fréquent chez les
 * équipes sans terrain réservé, et c'est lui qui fait matcher. Un coach qui
 * répond « domicile » alors qu'il n'a pas son créneau bloque un appariement
 * qu'il aurait accepté.
 */
export const AVAILABILITY_VENUES = ["home", "away", "any"] as const;
export type AvailabilityVenue = (typeof AVAILABILITY_VENUES)[number];

export const AVAILABILITY_VENUE_LABELS: Record<AvailabilityVenue, string> = {
  home: "À domicile",
  away: "En déplacement",
  any: "Peu importe",
};

/**
 * Deux préférences de lieu se rencontrent-elles ? L'une doit recevoir, l'autre
 * se déplacer. `any` s'accommode des deux — et deux `any` s'entendent aussi :
 * elles règleront entre elles qui reçoit, ce n'est pas au système de trancher.
 */
export function venuesFit(mine: AvailabilityVenue, theirs: AvailabilityVenue): boolean {
  if (mine === "any" || theirs === "any") return true;
  return mine !== theirs;
}

/**
 * Qui reçoit, une fois les deux préférences connues ? `null` quand aucune des
 * deux ne tranche (deux `any`) : la question reste ouverte entre les coachs, et
 * l'interface ne doit pas prétendre le contraire.
 */
export function hostOf(mine: AvailabilityVenue, theirs: AvailabilityVenue): "mine" | "theirs" | null {
  if (mine === "home" || theirs === "away") return "mine";
  if (mine === "away" || theirs === "home") return "theirs";
  return null;
}

/**
 * Le rayon proposé à la déclaration. Repris des paliers du radar : le coach ne
 * doit pas apprendre deux échelles de distance dans la même application.
 */
export const AVAILABILITY_RADIUS_OPTIONS = [15, 25, 50, 100] as const;

/** Nombre de dates déclarables en une fois — une saison se remplit par vagues, pas d'un coup */
export const AVAILABILITY_MAX_DATES = 20;

/** Au-delà, la disponibilité ne dit plus rien d'utile : les effectifs d'un club changent */
export const AVAILABILITY_MAX_DAYS_AHEAD = 120;

export const createAvailabilitySchema = z.object({
  /**
   * Plusieurs dates en un envoi : « je suis libre les trois prochains
   * dimanches » est une seule décision, elle ne doit pas coûter trois
   * formulaires. Le serveur en fait une ligne par date.
   */
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(AVAILABILITY_MAX_DATES),
  venue: z.enum(AVAILABILITY_VENUES),
  /** Heure souhaitée, purement indicative — elle prérremplira l'annonce */
  time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  /**
   * Niveaux d'adversaire acceptés. Liste VIDE = tous niveaux, et c'est le
   * défaut : un coach qui n'a pas d'avis ne doit pas se fermer le secteur sans
   * l'avoir voulu.
   */
  acceptedLevels: z.array(z.enum(DIVISION_LEVELS)).max(DIVISION_LEVELS.length),
  /** Rayon propre à cette déclaration ; null = celui du radar du coach */
  radiusKm: z.number().int().min(1).max(300).nullable(),
});
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;

/**
 * Une disponibilité déclarée par une équipe, telle que son propre coach la voit.
 */
export interface AvailabilityDto {
  id: string;
  date: string;
  venue: AvailabilityVenue;
  time: string | null;
  acceptedLevels: DivisionLevel[];
  radiusKm: number | null;
  /** Combien d'équipes lui répondent aujourd'hui — recalculé à chaque lecture, jamais stocké */
  suggestionCount: number;
  createdAt: string;
}

/**
 * Un appariement proposé par le système : ma disponibilité, l'équipe d'en face,
 * et de quoi décider sans ouvrir trois écrans.
 */
export interface SuggestionDto {
  availabilityId: string;
  date: string;
  team: TeamDto;
  /** Le coach à qui la proposition sera adressée (null si son profil est privé) */
  coach: CoachRefDto | null;
  /** Catégorie d'annonce commune aux deux équipes — celle que portera la proposition */
  category: AnnouncementCategory;
  gender: MatchGender | null;
  /** Niveau déclaré de l'équipe d'en face, tel quel (null s'il n'est pas réglé) */
  level: DivisionLevel | null;
  /** Sa fiabilité : entre deux équipes également disponibles, c'est ce qui départage */
  reliability: ReliabilityDto;
  distanceKm: number | null;
  /** Qui reçoit, si les deux préférences le disent — null quand ça reste à convenir */
  host: "mine" | "theirs" | null;
  /** L'heure retenue pour la proposition : la mienne, sinon la sienne, sinon 15:00 */
  time: string;
  /**
   * L'annonce déjà ouverte de mon équipe pour cette date, s'il y en a une.
   * Prévenir cette équipe s'y raccroche alors au lieu d'en publier une
   * seconde : deux annonces le même jour pour la même équipe diraient
   * qu'elle cherche deux matchs.
   */
  announcementId: string | null;
}

/** Heure de repli quand aucune des deux équipes n'a exprimé de préférence */
export const AVAILABILITY_DEFAULT_TIME = "15:00";

export const proposeSuggestionSchema = z.object({
  availabilityId: z.string().uuid(),
  teamId: z.string().uuid(),
});
export type ProposeSuggestionInput = z.infer<typeof proposeSuggestionSchema>;

/**
 * Deux disponibilités s'apparient-elles ?
 *
 * Même philosophie que `teamMatchesAnnouncement` : ce qu'on ne sait pas ne
 * s'oppose pas. Une équipe dont la catégorie ou le genre n'est pas réglé n'est
 * pas écartée — elle serait invisible pour toujours, sans jamais savoir
 * pourquoi. Le niveau suit la même règle : un filtre sur les niveaux acceptés
 * ne rejette que ce qu'il connaît.
 *
 * La distance, elle, est une VRAIE contrainte des deux côtés : chacun a réglé
 * son rayon, et un appariement à 80 km proposé à qui en accepte 25 n'est pas
 * une suggestion, c'est du bruit.
 *
 * @param distanceKm distance entre les deux équipes, `null` si inconnue — auquel
 *   cas elle ne bloque pas : une ville absente de l'annuaire ne doit pas
 *   exclure l'équipe de tout appariement.
 */
export function availabilitiesFit(
  mine: {
    venue: AvailabilityVenue;
    acceptedLevels: readonly DivisionLevel[];
    radiusKm: number | null;
    team: { category: MatchCategory | null; gender: MatchGender | null; level: DivisionLevel | null };
  },
  theirs: {
    venue: AvailabilityVenue;
    acceptedLevels: readonly DivisionLevel[];
    radiusKm: number | null;
    team: { category: MatchCategory | null; gender: MatchGender | null; level: DivisionLevel | null };
  },
  distanceKm: number | null,
): boolean {
  const myGroup = announcementCategoryOf(mine.team.category);
  const theirGroup = announcementCategoryOf(theirs.team.category);
  if (myGroup !== null && theirGroup !== null && myGroup !== theirGroup) return false;

  const myGender = mine.team.gender;
  const theirGender = theirs.team.gender;
  const genderFits =
    myGender === null ||
    theirGender === null ||
    myGender === theirGender ||
    myGender === "mixte" ||
    theirGender === "mixte";
  if (!genderFits) return false;

  if (!venuesFit(mine.venue, theirs.venue)) return false;

  // Une liste vide n'exprime aucune exigence ; un niveau inconnu en face ne
  // peut pas la contredire.
  if (mine.acceptedLevels.length > 0 && theirs.team.level !== null && !mine.acceptedLevels.includes(theirs.team.level))
    return false;
  if (theirs.acceptedLevels.length > 0 && mine.team.level !== null && !theirs.acceptedLevels.includes(mine.team.level))
    return false;

  if (distanceKm !== null) {
    if (mine.radiusKm !== null && distanceKm > mine.radiusKm) return false;
    if (theirs.radiusKm !== null && distanceKm > theirs.radiusKm) return false;
  }

  return true;
}

/* ───────────────────── Relance des week-ends libres ───────────────────── */

/**
 * Le jour où cette catégorie joue d'habitude : samedi pour les jeunes,
 * dimanche à partir des U20.
 *
 * C'est une CONVENTION des districts, pas une règle : elle sert uniquement à
 * choisir la date sur laquelle relancer un coach qui n'a rien déclaré. Se
 * tromper de jour ne coûte qu'une relance à côté, et le coach garde la main —
 * déclarer un autre jour éteint la relance pour la semaine.
 *
 * Renvoie le jour au sens de `Date.getUTCDay()` : 0 = dimanche, 6 = samedi.
 */
export function usualMatchDay(category: string | null | undefined): 0 | 6 {
  const group = announcementCategoryOf(category);
  if (group === null) return 6;
  return group === "U20" || group === "Seniors" || group === "Veterans" ? 0 : 6;
}

/**
 * Combien de jours à l'avance relancer. Dix jours et non trois : sous ce délai,
 * un coach n'a plus le temps de convenir d'un match, de le déclarer à son
 * district (FFF_NOTICE_DAYS) et de prévenir ses parents. Au-delà de seize, il
 * ne sait pas encore s'il sera libre.
 *
 * L'intervalle couvre exactement une semaine : chaque équipe est donc relancée
 * au plus une fois par semaine, sans qu'aucun compteur ait à le garantir.
 */
export const FREE_WEEKEND_LEAD_MIN_DAYS = 10;
export const FREE_WEEKEND_LEAD_MAX_DAYS = 16;

/**
 * La date à relancer pour cette catégorie, ou `null` si aucune ne tombe dans
 * la fenêtre. Calculée à partir d'un « aujourd'hui » passé en paramètre : une
 * fonction qui lirait l'horloge ne se testerait pas.
 */
export function freeWeekendTarget(today: Date, category: string | null | undefined): string | null {
  const day = usualMatchDay(category);
  for (let offset = FREE_WEEKEND_LEAD_MIN_DAYS; offset <= FREE_WEEKEND_LEAD_MAX_DAYS; offset++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset));
    if (d.getUTCDay() === day) return d.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Plage horaire des relances, heure de Paris. Rien ici n'est urgent : un coach
 * réveillé à 3 h du matin pour un match dans dix jours désinstalle
 * l'application, et il aura raison.
 *
 * Le SOS, lui, ne connaît pas ces bornes — quelqu'un est en panne.
 */
export const RELAY_HOUR_START = 9;
export const RELAY_HOUR_END = 21;

/**
 * L'heure de Paris est-elle dans la plage d'envoi ?
 *
 * `formatToParts` et non `format` : en français, l'heure se formate « 03 h »,
 * que `Number()` lit comme NaN — la plage était alors toujours fermée et plus
 * aucune relance ne partait. Le découpage en parties donne le nombre seul,
 * quelle que soit la langue.
 *
 * Le fuseau est celui de Paris et non celui du serveur : la prod tourne en UTC,
 * et « 9 h » doit vouloir dire 9 h pour le coach, pas pour la machine.
 */
export function withinRelayHours(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    hour12: false,
    timeZone: "Europe/Paris",
  }).formatToParts(now);
  const raw = parts.find((p) => p.type === "hour")?.value;
  if (raw === undefined) return false;
  const hour = Number.parseInt(raw, 10);
  if (Number.isNaN(hour)) return false;
  return hour >= RELAY_HOUR_START && hour < RELAY_HOUR_END;
}

/* ─────────────────────────── Fiabilité ────────────────────────────────── */

/**
 * Fenêtre d'observation : une saison glissante. Au-delà, ce qu'a fait une
 * équipe ne dit plus rien de celle d'aujourd'hui — les effectifs tournent, les
 * dirigeants changent.
 */
export const RELIABILITY_WINDOW_DAYS = 365;

/**
 * En dessous de cinq engagements, aucun taux n'est affiché.
 *
 * Ce n'est pas de la prudence décorative : un désistement sur deux matchs fait
 * « 50 % d'annulation », chiffre qui condamnerait un club sur un accident. Un
 * indicateur qu'on ne peut pas défendre ne vaut pas mieux que pas d'indicateur.
 */
export const RELIABILITY_MIN_SAMPLE = 5;

/**
 * Sous ce délai, le désistement est TARDIF : plus le temps de retrouver un
 * adversaire, les parents sont prévenus, le terrain est réservé.
 *
 * Quatre jours parce que c'est le cas que tout le monde connaît — être lâché le
 * jeudi pour un match du dimanche. C'est ce chiffre-là, et non le total, qui
 * décrit vraiment le tort causé.
 */
export const LATE_WITHDRAWAL_DAYS = 4;

/**
 * La fiabilité d'une équipe sur la saison glissante.
 *
 * `withdrawnByReason` est servi entier et affiché : un club qui a annulé trois
 * fois pour intempéries n'est pas un club qui lâche, et un taux nu le laisserait
 * croire. Le taux compte pourtant TOUS les désistements — du point de vue de
 * celui qui s'est retrouvé sans match, la pluie et l'oubli se ressemblent — mais
 * le motif reste sous les yeux pour en juger.
 */
export interface ReliabilityDto {
  /** Matchs honorés : terminés, non annulés */
  played: number;
  /** Désistements de cette équipe (elle, pas l'adversaire) */
  withdrawn: number;
  /** Dont ceux survenus à moins de `LATE_WITHDRAWAL_DAYS` jours du match */
  lateWithdrawn: number;
  withdrawnByReason: Partial<Record<WithdrawalReason, number>>;
  /** played + withdrawn : ce sur quoi l'équipe s'était engagée */
  commitments: number;
  /** `null` tant que l'échantillon est insuffisant — jamais un zéro trompeur */
  rate: number | null;
}

export type ReliabilityTone = "unknown" | "good" | "fair" | "poor";

/**
 * Les seuils sont volontairement larges. Le football amateur annule pour la
 * pluie, pour un terrain fermé, pour une épidémie de gastro dans un effectif de
 * quatorze : une échelle sévère peindrait en rouge des clubs parfaitement
 * corrects et ferait fuir ceux qu'on veut garder.
 */
export function reliabilityTone(r: ReliabilityDto): ReliabilityTone {
  if (r.rate === null) return "unknown";
  if (r.rate <= 0.1) return "good";
  if (r.rate <= 0.25) return "fair";
  return "poor";
}

export const RELIABILITY_TONE_LABELS: Record<ReliabilityTone, string> = {
  unknown: "Pas encore d'historique",
  good: "Honore ses matchs",
  fair: "Quelques désistements",
  poor: "Désistements fréquents",
};

/** Le taux en toutes lettres, ou ce qui en tient lieu quand il n'y en a pas */
export function reliabilityLabel(r: ReliabilityDto): string {
  if (r.rate === null) {
    return r.commitments === 0
      ? "Aucun match à son actif"
      : `${r.commitments} match${r.commitments > 1 ? "s" : ""} — trop peu pour se prononcer`;
  }
  return `${Math.round(r.rate * 100)} % de désistements sur ${r.commitments} matchs`;
}

/** L'entrée « rien à raconter » — évite de recopier quatre zéros à chaque repli */
export const NO_HISTORY: Parameters<typeof toReliability>[0] = {
  played: 0,
  withdrawn: 0,
  lateWithdrawn: 0,
  withdrawnByReason: {},
};

/**
 * Calcule le taux à partir des comptes bruts. Isolée du SQL pour être testable,
 * et parce que c'est ici que se décide ce qu'on ose afficher.
 */
export function toReliability(input: {
  played: number;
  withdrawn: number;
  lateWithdrawn: number;
  withdrawnByReason: Partial<Record<WithdrawalReason, number>>;
}): ReliabilityDto {
  const commitments = input.played + input.withdrawn;
  return {
    ...input,
    commitments,
    rate: commitments >= RELIABILITY_MIN_SAMPLE ? input.withdrawn / commitments : null,
  };
}

/* ─────────────────── Confirmation d'un match convenu ──────────────────── */

/**
 * Les deux temps de la confirmation, en jours avant le coup d'envoi.
 *
 * Sept jours : il reste une semaine pour retrouver un adversaire si l'autre se
 * dégonfle. Trois jours : dernier rappel, et à ce stade un silence vaut presque
 * réponse. Au-delà de sept jours, personne ne sait encore — demander trop tôt
 * n'obtiendrait qu'un « oui » machinal qui ne vaudrait rien.
 *
 * Décroissants : le balayeur prend le premier palier atteint.
 */
export const CONFIRMATION_STAGES = [7, 3] as const;

/** Fenêtre d'ouverture de la confirmation : le premier palier */
export const CONFIRMATION_OPENS_DAYS = CONFIRMATION_STAGES[0];

/**
 * Le palier dû pour un match dans `daysUntil` jours, ou `null` s'il n'y a rien
 * à demander. `remindedAt` est le dernier palier déjà envoyé : on ne redescend
 * jamais, et on ne répète pas.
 */
export function confirmationStageDue(daysUntil: number, remindedAt: number | null): number | null {
  // Le jour du match, il est trop tard pour relancer : on joue ou on ne joue pas
  if (daysUntil < 0) return null;
  for (const stage of CONFIRMATION_STAGES) {
    if (daysUntil <= stage && (remindedAt === null || stage < remindedAt)) return stage;
  }
  return null;
}

/* ───────────────────── Détails pratiques du match ─────────────────────── */

/**
 * Qui siffle. La question se pose à CHAQUE amical et se règle presque toujours
 * la veille par SMS — c'est exactement le genre d'échange qui sort les deux
 * coachs de l'application et ne les y ramène pas.
 *
 * `tbd` est le défaut et n'est pas un trou : « à définir » est un état réel du
 * dossier, et l'afficher comme tel rappelle qu'il reste quelque chose à faire.
 */
export const REFEREE_BY = ["tbd", "home", "away", "official"] as const;
export type RefereeBy = (typeof REFEREE_BY)[number];

export const REFEREE_BY_LABELS: Record<RefereeBy, string> = {
  tbd: "À définir",
  home: "Un dirigeant de l'équipe qui reçoit",
  away: "Un dirigeant de l'équipe qui se déplace",
  official: "Arbitre officiel",
};

/**
 * Ce que l'équipe qui reçoit peut régler après coup.
 *
 * L'heure en fait partie : un créneau se décale, et devoir annuler le match
 * pour le republier une heure plus tard serait absurde. Elle est la seule
 * information dont le changement ANNULE LES CONFIRMATIONS (voir la route) —
 * avoir dit « nous serons là » à 15 h n'engage à rien pour 10 h.
 */
export const updateMatchDetailsSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  refereeBy: z.enum(REFEREE_BY).optional(),
  refereeName: z.string().trim().max(80).nullable().optional(),
  changingRooms: z.string().trim().max(200).nullable().optional(),
});
export type UpdateMatchDetailsInput = z.infer<typeof updateMatchDetailsSchema>;

/**
 * Rappel de la veille : l'heure, le lieu, l'arbitre et les vestiaires envoyés
 * aux DEUX clubs, sans que personne ait à le demander.
 *
 * La veille et non le matin : à 7 h le jour du match, le car est déjà commandé
 * et les parents prévenus — l'information arriverait après la décision qu'elle
 * devait éclairer.
 */
export const DAY_BEFORE_REMINDER_DAYS = 1;

/* ─────────────────── Liquidité par département ────────────────────────── */

/**
 * Noms des départements, pour afficher « Rhône (69) » plutôt qu'un code nu.
 *
 * Le DÉPARTEMENT et non le district : les districts de football ne se
 * superposent pas exactement aux départements, et la FFF n'en publie pas le
 * découpage réutilisable. L'approximation est assumée et l'interface ne dit
 * jamais « district » — elle dit le nom du département, qui est vrai.
 *
 * Source : geo.api.gouv.fr (base officielle du Code officiel géographique).
 */
export const DEPARTMENT_NAMES: Record<string, string> = {
  "01": "Ain",
  "02": "Aisne",
  "03": "Allier",
  "04": "Alpes-de-Haute-Provence",
  "05": "Hautes-Alpes",
  "06": "Alpes-Maritimes",
  "07": "Ardèche",
  "08": "Ardennes",
  "09": "Ariège",
  "10": "Aube",
  "11": "Aude",
  "12": "Aveyron",
  "13": "Bouches-du-Rhône",
  "14": "Calvados",
  "15": "Cantal",
  "16": "Charente",
  "17": "Charente-Maritime",
  "18": "Cher",
  "19": "Corrèze",
  "21": "Côte-d'Or",
  "22": "Côtes-d'Armor",
  "23": "Creuse",
  "24": "Dordogne",
  "25": "Doubs",
  "26": "Drôme",
  "27": "Eure",
  "28": "Eure-et-Loir",
  "29": "Finistère",
  "2A": "Corse-du-Sud",
  "2B": "Haute-Corse",
  "30": "Gard",
  "31": "Haute-Garonne",
  "32": "Gers",
  "33": "Gironde",
  "34": "Hérault",
  "35": "Ille-et-Vilaine",
  "36": "Indre",
  "37": "Indre-et-Loire",
  "38": "Isère",
  "39": "Jura",
  "40": "Landes",
  "41": "Loir-et-Cher",
  "42": "Loire",
  "43": "Haute-Loire",
  "44": "Loire-Atlantique",
  "45": "Loiret",
  "46": "Lot",
  "47": "Lot-et-Garonne",
  "48": "Lozère",
  "49": "Maine-et-Loire",
  "50": "Manche",
  "51": "Marne",
  "52": "Haute-Marne",
  "53": "Mayenne",
  "54": "Meurthe-et-Moselle",
  "55": "Meuse",
  "56": "Morbihan",
  "57": "Moselle",
  "58": "Nièvre",
  "59": "Nord",
  "60": "Oise",
  "61": "Orne",
  "62": "Pas-de-Calais",
  "63": "Puy-de-Dôme",
  "64": "Pyrénées-Atlantiques",
  "65": "Hautes-Pyrénées",
  "66": "Pyrénées-Orientales",
  "67": "Bas-Rhin",
  "68": "Haut-Rhin",
  "69": "Rhône",
  "70": "Haute-Saône",
  "71": "Saône-et-Loire",
  "72": "Sarthe",
  "73": "Savoie",
  "74": "Haute-Savoie",
  "75": "Paris",
  "76": "Seine-Maritime",
  "77": "Seine-et-Marne",
  "78": "Yvelines",
  "79": "Deux-Sèvres",
  "80": "Somme",
  "81": "Tarn",
  "82": "Tarn-et-Garonne",
  "83": "Var",
  "84": "Vaucluse",
  "85": "Vendée",
  "86": "Vienne",
  "87": "Haute-Vienne",
  "88": "Vosges",
  "89": "Yonne",
  "90": "Territoire de Belfort",
  "91": "Essonne",
  "92": "Hauts-de-Seine",
  "93": "Seine-Saint-Denis",
  "94": "Val-de-Marne",
  "95": "Val-d'Oise",
  "971": "Guadeloupe",
  "972": "Martinique",
  "973": "Guyane",
  "974": "La Réunion",
  "976": "Mayotte",
};

/** « 69 » → « Rhône (69) », ou le code seul s'il est inconnu */
export function departmentLabel(code: string): string {
  const name = DEPARTMENT_NAMES[code];
  return name ? `${name} (${code})` : code;
}

/**
 * La liquidité d'un département : ce qu'il faut regarder pour décider où
 * concentrer l'effort, et pour savoir si l'on y est devenu incontournable.
 */
export interface DistrictStatsDto {
  /** Code du département, ou null pour les villes absentes de l'annuaire */
  code: string | null;
  label: string;
  coaches: number;
  teams: number;
  /** Annonces publiées sur la fenêtre observée, toutes issues confondues */
  announcements: number;
  /** Celles qui ont trouvé un adversaire — le seul chiffre qui dit si ça marche */
  announcementsMatched: number;
  /** Dates de disponibilité déclarées et encore à venir */
  availabilities: number;
  matchesPlayed: number;
}

/**
 * Part des annonces qui ont trouvé preneur. `null` en dessous d'un seuil : un
 * taux sur trois annonces ne mesure rien, et un tableau de bord qui ment fait
 * prendre de mauvaises décisions.
 */
export const DISTRICT_MIN_ANNOUNCEMENTS = 5;

export function matchRate(stats: DistrictStatsDto): number | null {
  if (stats.announcements < DISTRICT_MIN_ANNOUNCEMENTS) return null;
  return stats.announcementsMatched / stats.announcements;
}

/* ─────────────────── Couche publique indexable ────────────────────────── */

/**
 * Ce qu'une annonce montre à un visiteur SANS COMPTE.
 *
 * La liste est courte, et ce qui en est absent l'est délibérément :
 *
 * - **pas de coach.** L'identité d'un coach est celle d'une personne privée ;
 *   elle obéit déjà à des règles strictes entre coachs (`canSeeCoachCard`) et
 *   n'a rien à faire sur une page indexée par les moteurs.
 * - **pas de stade.** Le nom du club et sa ville sont ceux d'une association
 *   déclarée, publics par nature ; le terrain exact ajouté à l'heure exacte
 *   ferait de la page un lieu de rendez-vous précis pour une équipe de mineurs.
 * - **pas de commentaire libre.** « Informations pratiques » contient souvent un
 *   numéro de téléphone. Publier ce champ, c'est publier des coordonnées
 *   personnelles sans que personne l'ait voulu.
 *
 * Reste ce qui rend la page utile : qui cherche, où, quand, dans quelle
 * catégorie. Assez pour donner envie de créer un compte, ce qui est le seul
 * objet de cette page.
 */
export interface PublicAnnouncementDto {
  id: string;
  teamName: string;
  city: string;
  date: string;
  time: string;
  category: AnnouncementCategory;
  gender: MatchGender | null;
  level: DivisionLevel | null;
  format: MatchFormat;
  /** Plateau (≤ U11) : places encore libres, sinon null */
  slotsLeft: number | null;
  /** L'adversaire s'est désisté et l'annonce cherche à nouveau */
  isSos: boolean;
}

/** Une catégorie présente dans un département, et son volume */
export interface PublicCategoryCountDto {
  category: AnnouncementCategory;
  count: number;
}

/** Un département de la couche publique : ce que le sitemap et l'index listent */
export interface PublicDistrictDto {
  code: string;
  label: string;
  slug: string;
  announcements: number;
  categories: PublicCategoryCountDto[];
}

export interface PublicBoardDto {
  district: PublicDistrictDto;
  /** Catégorie filtrée, null pour la page du département entier */
  category: AnnouncementCategory | null;
  announcements: PublicAnnouncementDto[];
}

/** « 69 » → « rhone-69 ». Le code termine le slug : c'est lui qui sert à relire. */
export function districtSlug(code: string, name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base}-${code.toLowerCase()}`;
}

/**
 * « rhone-69 » → « 69 ». On relit le CODE et jamais le nom : un nom mal
 * orthographié dans une URL partagée doit continuer de mener à la bonne page,
 * et le code est la seule partie qui ne peut pas dériver.
 */
export function districtCodeFromSlug(slug: string): string | null {
  const last = slug.split("-").pop();
  if (!last) return null;
  const code = last.toUpperCase();
  return code in DEPARTMENT_NAMES ? code : null;
}

/** « U12-U13 » → « u12-u13 », et retour */
export function categorySlug(category: AnnouncementCategory): string {
  return category.toLowerCase();
}

export function categoryFromSlug(slug: string): AnnouncementCategory | null {
  const found = ANNOUNCEMENT_CATEGORIES.find((c) => c.toLowerCase() === slug.toLowerCase());
  return found ?? null;
}

/* ────────────────── Référentiel des districts ─────────────────────────── */

/**
 * D'où vient une ligne du référentiel.
 *
 * `annuaire` : trouvée au registre officiel des associations, nom légal et
 * SIREN à l'appui. `manuel` : saisie faute d'y figurer sous une forme
 * trouvable — la fédération ne publie pas la liste de ses districts, et une
 * dizaine d'entre eux ne sont pas déclarés sous un nom contenant « district ».
 */
export const DISTRICT_SOURCES = ["annuaire", "manuel"] as const;
export type DistrictSource = (typeof DISTRICT_SOURCES)[number];

export const DISTRICT_SOURCE_LABELS: Record<DistrictSource, string> = {
  annuaire: "Registre des associations",
  manuel: "Saisi à la main",
};

export interface DistrictDto {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  siren: string | null;
  city: string | null;
  /** Départements couverts : cinq districts en couvrent deux */
  departments: string[];
  source: DistrictSource;
  /** Relu et confirmé par un administrateur */
  verified: boolean;
}

export const updateDistrictSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  // Le groupe n'est pas décoratif : sans lui, l'alternance porte sur toute
  // l'expression et « 2Axyz » passerait — l'ancre finale ne s'appliquerait
  // qu'à la dernière branche.
  departments: z.array(z.string().regex(/^([0-9]{2,3}|2A|2B)$/)).min(1).max(5).optional(),
  verified: z.boolean().optional(),
});
export type UpdateDistrictInput = z.infer<typeof updateDistrictSchema>;

/**
 * Départements sans district : leur ligue administre directement.
 *
 * Ce n'est PAS un trou du référentiel, c'est l'organisation réelle — et le
 * distinguer d'un oubli évite qu'un administrateur cherche pendant une heure
 * un district corse qui n'existe pas.
 */
export const DEPARTMENTS_WITHOUT_DISTRICT = ["2A", "2B", "972", "973", "974", "976"] as const;

/* ────────────────────── Référentiel des terrains ──────────────────────── */

/**
 * Un terrain proposé à la saisie, tiré du recensement public des équipements
 * sportifs.
 *
 * C'est une SUGGESTION, comme pour les clubs : rien n'oblige le coach à en
 * retenir une, et un terrain absent du recensement se tape toujours à la main.
 * Ce qu'on retient de son choix, en revanche, ce n'est pas seulement un nom —
 * ce sont des COORDONNÉES, et elles remplacent le centre de la commune dans
 * tous les calculs de distance.
 */
export interface VenueDto {
  id: string;
  /** Nom de l'installation : « Stade municipal du Calvaire » */
  name: string;
  /** Terrain dans l'installation : « Terrain d'honneur ». Plusieurs par stade. */
  pitchName: string | null;
  city: string;
  address: string | null;
  postalCode: string | null;
  lat: number;
  lng: number;
  surface: string | null;
  /** `null` = non renseigné au recensement, et non « pas d'éclairage » */
  floodlit: boolean | null;
  changingRooms: number | null;
  /** Distance depuis le point de recherche, quand il est connu */
  distanceKm: number | null;
}

/** Rayon de la recherche de terrain. Large : un club joue parfois à deux communes de là. */
export const VENUE_SEARCH_RADIUS_KM = 40;

/** Au-delà, la liste ne se lit plus — et le bon terrain est dans les premiers */
export const VENUE_SEARCH_LIMIT = 12;

/**
 * Le libellé d'un terrain sur une ligne : « Stade du Calvaire — Terrain
 * d'honneur ». Le nom du terrain n'est repris que s'il ajoute quelque chose :
 * la moitié du recensement l'appelle « Terrain de football », ce qui ne
 * distingue rien.
 */
export function venueLabel(venue: Pick<VenueDto, "name" | "pitchName">): string {
  const pitch = venue.pitchName?.trim();
  if (!pitch) return venue.name;
  // Les parties optionnelles portent leur espace : sans cela, « Terrain » seul
  // n'était pas reconnu comme générique et s'affichait en double.
  const generic = /^terrain( de)?( football| foot)?$/i.test(pitch);
  return generic ? venue.name : `${venue.name} — ${pitch}`;
}
