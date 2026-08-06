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
 * Version des documents contractuels en vigueur — CGU et politique de
 * confidentialité, publiées ensemble sur le site.
 *
 * C'est ELLE qui est enregistrée avec l'acceptation, pas la date seule : une
 * acceptation ne vaut que pour un texte précis. Le jour où les CGU changent sur
 * un point substantiel, cette constante est incrémentée et les comptes dont la
 * version enregistrée est antérieure doivent se prononcer de nouveau.
 *
 * À tenir aligné sur l'en-tête de `site/cgu.html` (« Version : 1 »).
 */
export const LEGAL_VERSION = "1";
export const LEGAL_UPDATED_AT = "2026-07-29";

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
 * Ramène une valeur venue de la base à la liste connue. Les catégories y sont
 * stockées en texte libre : une valeur retirée de la liste ne doit pas ressortir
 * typée comme si elle en faisait toujours partie, elle vaut alors « aucune ».
 */
export function asMatchCategory(value: string | null | undefined): MatchCategory | null {
  return value && (MATCH_CATEGORIES as readonly string[]).includes(value) ? (value as MatchCategory) : null;
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
    "Vous faites vivre l'application : retours, idées, signalements. Sans effet pour l'instant — la casquette prendra son sens dans une prochaine version.",
};

/** Choix des casquettes par le coach lui-même. Tableau vide = aucune. */
export const updateCoachCategoriesSchema = z.object({
  categories: z.array(z.enum(COACH_CATEGORIES)).max(COACH_CATEGORIES.length),
});
export type UpdateCoachCategoriesInput = z.infer<typeof updateCoachCategoriesSchema>;

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

export const createTournamentSchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Absente = tournoi d'une seule journée */
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    city: z.string().trim().min(1).max(100),
    stadium: z.string().trim().min(1).max(150),
    category: z.enum(MATCH_CATEGORIES),
    gender: z.enum(MATCH_GENDERS),
    level: z.enum(MATCH_LEVELS),
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
  "footcoach", "football", "foot", "coach", "entraineur", "equipe", "match",
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
  // Plus d'attestation par annonce : la responsabilité de déclarer le match à
  // la fédération est acceptée à l'inscription (registerCoachSchema →
  // acceptResponsibility), pour tous les matchs à venir. La redemander à
  // chaque publication ne renforçait rien et faisait un obstacle de plus.
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

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
 * Références d'une équipe : sa catégorie d'engagement et son stade habituel.
 *
 * Renseignées une fois à la création, elles préremplissent chaque annonce — un
 * coach de U13 qui reçoit toujours au même stade ne les ressaisit plus. Elles
 * restent modifiables annonce par annonce : un déplacement se joue ailleurs, et
 * un amical peut se caler sur une autre catégorie.
 *
 * Le stade est facultatif (tous les clubs n'en ont pas un attitré) ; la chaîne
 * vide vaut « aucun » et sera stockée `null`.
 */
export const teamReferencesSchema = z.object({
  category: z.enum(MATCH_CATEGORIES),
  stadium: z.string().trim().max(150).optional(),
});
export type TeamReferencesInput = z.infer<typeof teamReferencesSchema>;

/**
 * Création d'une équipe supplémentaire par un coach déjà inscrit. Mêmes bornes
 * que l'équipe créée à l'inscription : c'est la même chose, créée plus tard.
 */
export const createTeamSchema = teamReferencesSchema.extend({
  name: z.string().trim().min(2).max(60),
  city: z.string().trim().min(1).max(60),
});
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

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

export const registerCoachSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: chosenPasswordSchema,
  teamName: z.string().min(2).max(60),
  teamCity: z.string().min(1).max(60),
  // Références de l'équipe créée avec le compte : mêmes règles que partout
  // ailleurs (voir teamReferencesSchema), simplement préfixées « team ».
  teamCategory: z.enum(MATCH_CATEGORIES),
  teamStadium: z.string().trim().max(150).optional(),
  // Facultatif : un coach l'a souvent sous la main en s'inscrivant, beaucoup
  // moins le jour où il faudra le retrouver. Modifiable ensuite dans le profil.
  licenseNumber: coachLicenseSchema.optional(),
  // Deux acceptations distinctes, et non une case unique fourre-tout : la
  // clause de responsabilité (déclaration à la fédération, licences, transport)
  // est celle qui protège réellement l'éditeur. Acceptée à part, elle ne peut
  // pas être présentée comme noyée dans un renvoi aux conditions générales.
  acceptTerms: acceptedSchema("conditions générales d'utilisation"),
  acceptResponsibility: acceptedSchema("responsabilités du coach et de son club"),
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
  /**
   * Références reprises à la publication d'une annonce. `null` pour les équipes
   * créées avant leur introduction : rien n'est deviné, le formulaire retombe
   * alors sur ses valeurs par défaut.
   */
  category: MatchCategory | null;
  stadium: string | null;
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
  time: string;
  city: string;
  stadium: string;
  category: string;
  gender: MatchGender | null;
  level: MatchLevel;
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
  /** Palier de ce coach — un signal de fiabilité avant de lui proposer un match */
  level: CoachLevelDto;
  /** Ses casquettes : savoir qu'un confrère est joker sert le jour d'un désistement */
  categories: CoachCategory[];
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}
