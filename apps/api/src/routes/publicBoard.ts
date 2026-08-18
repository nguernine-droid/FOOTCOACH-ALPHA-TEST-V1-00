import type { FastifyInstance } from "fastify";
import { and, asc, count, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import {
  categoryFromSlug,
  departmentLabel,
  districtSlug,
  isPlateauCategory,
  DEPARTMENT_NAMES,
  PLATEAU_TEAMS_WANTED,
  type AnnouncementCategory,
  type MatchFormat,
  type MatchGender,
  type PublicAnnouncementDto,
  type PublicBoardDto,
  type PublicCategoryCountDto,
  type PublicDistrictDto,
  type PublicStatsDto,
  type DivisionLevel,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { announcementResponses, matchAnnouncements, matches, teams, users } from "../db/schema.js";
import { HttpError } from "../plugins/errors.js";
import { asDivisionLevel, asMatchGender } from "@teamnexus/shared";
import { departmentOf } from "../lib/districts.js";
import { publicBoardRateLimit } from "../lib/rateLimits.js";

/**
 * La couche publique : ce que voit quelqu'un qui n'a pas de compte.
 *
 * C'est le seul canal d'acquisition qui se cumule dans le temps — une page par
 * département et par catégorie, indexée une fois, qui rapporte des visiteurs
 * pendant des années sans rien coûter de plus.
 *
 * ── Ce qui n'en sort jamais ─────────────────────────────────────────────
 * Aucune identité de coach, aucun stade exact, aucun commentaire libre : voir
 * le commentaire de `PublicAnnouncementDto`, qui dit pourquoi pour chacun. Le
 * filtrage se fait ICI, à la construction du DTO, et non côté client — une
 * donnée qui quitte le serveur est publiée, quel que soit l'usage qu'en fait la
 * page.
 *
 * ── Pourquoi un plafond par adresse ─────────────────────────────────────
 * Une route ouverte qui balaie la base est une invitation à l'aspirer. Le
 * plafond est généreux (un robot d'indexation légitime parcourt vite) mais il
 * existe, et le cache de cinq minutes fait le reste : deux visiteurs sur la
 * même page ne coûtent qu'une requête.
 */

/** Aujourd'hui en ISO — une annonce passée n'a rien à faire sur une page publique */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Les annonces ouvertes à venir, avec le département de l'équipe qui publie.
 *
 * Chargées d'un bloc puis réparties en mémoire : les départements se déduisent
 * de la ville par un annuaire local, ils ne se filtrent pas en SQL.
 */
async function openAnnouncements() {
  const rows = await db
    .select({ announcement: matchAnnouncements, team: teams })
    .from(matchAnnouncements)
    .innerJoin(teams, eq(matchAnnouncements.teamId, teams.id))
    .where(and(eq(matchAnnouncements.status, "open"), gte(matchAnnouncements.date, today())))
    .orderBy(asc(matchAnnouncements.date));
  return rows.map((row) => ({ ...row, department: departmentOf(row.team.city) }));
}

/** Places restantes des plateaux, pour n'en annoncer que ce qui est vrai */
async function acceptedCounts(ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;
  const rows = await db
    .select({ announcementId: announcementResponses.announcementId, count: sql<number>`count(*)::int` })
    .from(announcementResponses)
    .where(and(inArray(announcementResponses.announcementId, ids), eq(announcementResponses.status, "accepted")))
    .groupBy(announcementResponses.announcementId);
  for (const row of rows) counts.set(row.announcementId, row.count);
  return counts;
}

function toPublicDto(
  announcement: typeof matchAnnouncements.$inferSelect,
  team: typeof teams.$inferSelect,
  accepted: number,
): PublicAnnouncementDto {
  const plateau = isPlateauCategory(announcement.category);
  return {
    id: announcement.id,
    teamName: team.name,
    city: announcement.city,
    date: announcement.date,
    time: announcement.time.slice(0, 5),
    category: announcement.category as AnnouncementCategory,
    gender: asMatchGender(announcement.gender) as MatchGender | null,
    level: asDivisionLevel(announcement.level) as DivisionLevel | null,
    format: announcement.format as MatchFormat,
    slotsLeft: plateau ? Math.max(0, PLATEAU_TEAMS_WANTED - accepted) : null,
    isSos: announcement.isSos,
    // stadium, comment et coach ne sont volontairement pas repris — voir
    // le commentaire de PublicAnnouncementDto.
  };
}

export function publicBoardRoutes(app: FastifyInstance) {

  /**
   * Les chiffres de la vitrine : combien de coachs, combien d'annonces publiées,
   * combien de matchs réellement joués.
   *
   * Ouverte à tous, comme le reste de cette couche, et volontairement pauvre :
   * trois entiers agrégés, rien qui décrive un club ou une personne. On ne peut
   * rien en déduire sur qui que ce soit.
   *
   * Les coachs DÉSACTIVÉS ne comptent pas. Un chiffre gonflé des comptes fermés
   * est faux, et c'est exactement celui qu'un dirigeant vérifiera.
   *
   * `matchesPlayed` compte les matchs terminés, pas les annonces matchées : un
   * match convenu puis annulé n'a rien prouvé, et c'est le seul chiffre des
   * trois qui dise que le service tient sa promesse.
   */
  app.get("/public/stats", publicBoardRateLimit, async (_request, reply): Promise<PublicStatsDto> => {
    const [[coaches], [announcements], [played]] = await Promise.all([
      db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.role, "coach"), isNull(users.disabledAt))),
      db.select({ value: count() }).from(matchAnnouncements),
      db.select({ value: count() }).from(matches).where(eq(matches.status, "finished")),
    ]);

    reply.header("Cache-Control", "public, max-age=300");
    return {
      coaches: coaches.value,
      announcements: announcements.value,
      matchesPlayed: played.value,
    };
  });

  /**
   * L'index : les départements où quelque chose se passe.
   *
   * Sert la page d'accueil publique ET le plan du site. Un département sans
   * annonce ouverte n'y figure pas : une page vide indexée dessert plus qu'elle
   * ne sert, et elle reviendra d'elle-même quand un coach y publiera.
   */
  app.get("/public/board", publicBoardRateLimit, async (_request, reply): Promise<PublicDistrictDto[]> => {
    const rows = await openAnnouncements();
    const byDepartment = new Map<string, { count: number; categories: Map<string, number> }>();
    for (const row of rows) {
      if (!row.department) continue;
      const entry = byDepartment.get(row.department) ?? { count: 0, categories: new Map() };
      entry.count++;
      entry.categories.set(row.announcement.category, (entry.categories.get(row.announcement.category) ?? 0) + 1);
      byDepartment.set(row.department, entry);
    }

    reply.header("Cache-Control", "public, max-age=300");
    return [...byDepartment.entries()]
      .map(([code, entry]) => ({
        code,
        label: departmentLabel(code),
        slug: districtSlug(code, DEPARTMENT_NAMES[code] ?? code),
        announcements: entry.count,
        categories: [...entry.categories.entries()]
          .map(([category, count]) => ({ category: category as AnnouncementCategory, count }))
          .sort((a, b) => b.count - a.count) satisfies PublicCategoryCountDto[],
      }))
      .sort((a, b) => b.announcements - a.announcements);
  });

  /**
   * Un département, éventuellement borné à une catégorie.
   *
   * Un code inconnu renvoie 404 plutôt qu'une page vide : les moteurs doivent
   * apprendre que l'URL n'existe pas, sans quoi une faute de frappe partagée
   * une fois resterait indexée comme une page légitime.
   */
  app.get("/public/board/:code", publicBoardRateLimit, async (request, reply): Promise<PublicBoardDto> => {
    const { code: rawCode } = request.params as { code: string };
    const code = rawCode.toUpperCase();
    if (!(code in DEPARTMENT_NAMES)) throw new HttpError(404, "Département inconnu");

    const { categorie } = request.query as { categorie?: string };
    const category = categorie ? categoryFromSlug(categorie) : null;
    if (categorie && !category) throw new HttpError(404, "Catégorie inconnue");

    const rows = (await openAnnouncements()).filter(
      (row) => row.department === code && (category === null || row.announcement.category === category),
    );
    const counts = await acceptedCounts(rows.map((r) => r.announcement.id));

    const all = await openAnnouncements();
    const categories = new Map<string, number>();
    for (const row of all) {
      if (row.department !== code) continue;
      categories.set(row.announcement.category, (categories.get(row.announcement.category) ?? 0) + 1);
    }

    reply.header("Cache-Control", "public, max-age=300");
    return {
      district: {
        code,
        label: departmentLabel(code),
        slug: districtSlug(code, DEPARTMENT_NAMES[code] ?? code),
        announcements: [...categories.values()].reduce((a, b) => a + b, 0),
        categories: [...categories.entries()]
          .map(([c, count]) => ({ category: c as AnnouncementCategory, count }))
          .sort((a, b) => b.count - a.count),
      },
      category,
      announcements: rows.map((row) =>
        toPublicDto(row.announcement, row.team, counts.get(row.announcement.id) ?? 0),
      ),
    };
  });
}
