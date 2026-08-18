import type { FastifyInstance } from "fastify";
import { and, asc, eq, gte, inArray, ne, notInArray, or, sql } from "drizzle-orm";
import {
  announcementCategoryOf,
  asDivisionLevel,
  asMatchCategory,
  asMatchGender,
  availabilitiesFit,
  AVAILABILITY_DEFAULT_TIME,
  AVAILABILITY_MAX_DAYS_AHEAD,
  createAvailabilitySchema,
  hostOf,
  idParamSchema,
  proposeSuggestionSchema,
  type AvailabilityDto,
  type AvailabilityVenue,
  type DivisionLevel,
  type SuggestionDto,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { matchAnnouncements, matches, teamAvailabilities, teamCoaches, teams, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { HttpError } from "../plugins/errors.js";
import { cityCoords, haversineKm } from "../lib/cities.js";
import { representativeCoachesOf } from "../lib/coachCard.js";
import { notifyAvailabilityProposal } from "../lib/push.js";
import { teamsSharingCoachWith } from "./announcements.js";

/** Aujourd'hui en ISO — une disponibilité passée ne se déclare ni ne se propose */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Date limite acceptée à la déclaration */
function horizon(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + AVAILABILITY_MAX_DAYS_AHEAD);
  return d.toISOString().slice(0, 10);
}

/**
 * D'où rayonne une ÉQUIPE. Ses coordonnées propres si elle en a, sinon celles
 * de sa ville dans l'annuaire statique — le même repli que le radar.
 *
 * On ne prend pas ici la position réglée par le coach : une disponibilité
 * appartient à l'équipe, et c'est elle qui se déplacera. Un coach en vacances à
 * 300 km ne rend pas son équipe disponible là-bas.
 */
function teamCoords(team: typeof teams.$inferSelect): { lat: number; lng: number } | null {
  if (team.lat != null && team.lng != null) return { lat: team.lat, lng: team.lng };
  return cityCoords(team.city);
}

type Row = { availability: typeof teamAvailabilities.$inferSelect; team: typeof teams.$inferSelect };

/** La forme attendue par `availabilitiesFit`, construite depuis une ligne et son équipe */
function toFitInput(row: Row, fallbackRadiusKm: number | null) {
  return {
    venue: row.availability.venue as AvailabilityVenue,
    acceptedLevels: row.availability.acceptedLevels
      .map((l) => asDivisionLevel(l))
      .filter((l): l is DivisionLevel => l !== null),
    radiusKm: row.availability.radiusKm ?? fallbackRadiusKm,
    team: {
      category: asMatchCategory(row.team.category),
      gender: asMatchGender(row.team.gender),
      level: asDivisionLevel(row.team.level),
    },
  };
}

function toDto(row: typeof teamAvailabilities.$inferSelect, suggestionCount: number): AvailabilityDto {
  return {
    id: row.id,
    date: row.date,
    venue: row.venue as AvailabilityVenue,
    time: row.time ? row.time.slice(0, 5) : null,
    acceptedLevels: row.acceptedLevels.map((l) => asDivisionLevel(l)).filter((l): l is DivisionLevel => l !== null),
    radiusKm: row.radiusKm,
    suggestionCount,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Le cœur de l'appariement : mes disponibilités à venir, croisées avec celles
 * des autres équipes.
 *
 * Rien n'est stocké et rien n'est mis en cache — la liste se recalcule à chaque
 * lecture. Le volume le permet : on ne croise que les dates que J'AI déclarées,
 * et une équipe en déclare quelques dizaines, pas des milliers.
 *
 * Les dates où mon équipe a déjà un match sont écartées : la déclaration n'a
 * pas été retirée, mais elle ne décrit plus la réalité, et proposer un second
 * match le même jour serait une suggestion à jeter.
 */
async function suggestionsFor(myTeamId: string): Promise<SuggestionDto[]> {
  const [myTeam] = await db.select().from(teams).where(eq(teams.id, myTeamId));
  if (!myTeam) return [];
  // Sans catégorie, aucun appariement n'est calculable : c'est elle qui définit
  // le groupe d'âges. Le client le sait et invite à la régler. Une catégorie
  // que le regroupement ne reconnaît pas est traitée pareil — mieux vaut ne
  // rien proposer qu'apparier sur un groupe deviné.
  const myCategory = announcementCategoryOf(myTeam.category);
  if (!myCategory) return [];

  const mine = await db
    .select()
    .from(teamAvailabilities)
    .where(and(eq(teamAvailabilities.teamId, myTeamId), gte(teamAvailabilities.date, today())));
  if (mine.length === 0) return [];

  const dates = [...new Set(mine.map((a) => a.date))];

  // Dates déjà prises par un match confirmé de mon équipe
  const booked = await db
    .select({ date: matches.date })
    .from(matches)
    .where(
      and(
        or(eq(matches.homeTeamId, myTeamId), eq(matches.awayTeamId, myTeamId)),
        inArray(matches.date, dates),
        ne(matches.status, "cancelled"),
      ),
    );
  const bookedDates = new Set(booked.map((m) => m.date));

  const usable = mine.filter((a) => !bookedDates.has(a.date));
  if (usable.length === 0) return [];
  const usableDates = [...new Set(usable.map((a) => a.date))];

  // Mes équipes et celles qui partagent un encadrant : on ne se propose pas à
  // soi-même, exactement comme au radar.
  const unplayable = await teamsSharingCoachWith(myTeamId);

  const others = await db
    .select({ availability: teamAvailabilities, team: teams })
    .from(teamAvailabilities)
    .innerJoin(teams, eq(teams.id, teamAvailabilities.teamId))
    .where(
      and(
        inArray(teamAvailabilities.date, usableDates),
        unplayable.length > 0 ? notInArray(teamAvailabilities.teamId, unplayable) : undefined,
      ),
    );
  if (others.length === 0) return [];

  // Rayons de repli : celui du radar de chaque coach, quand la disponibilité
  // n'en porte pas. Un seul aller-retour pour toutes les équipes concernées.
  const teamIds = [...new Set(others.map((r) => r.team.id)), myTeamId];
  const radiusRows = await db
    .select({ teamId: teamCoaches.teamId, radiusKm: users.radarRadiusKm })
    .from(teamCoaches)
    .innerJoin(users, eq(users.id, teamCoaches.coachId))
    .where(inArray(teamCoaches.teamId, teamIds));
  const radiusByTeam = new Map<string, number | null>();
  for (const r of radiusRows) if (!radiusByTeam.has(r.teamId)) radiusByTeam.set(r.teamId, r.radiusKm);

  // Mes annonces ouvertes, pour raccrocher la proposition à l'existant
  const openAnnouncements = await db
    .select({ id: matchAnnouncements.id, date: matchAnnouncements.date })
    .from(matchAnnouncements)
    .where(
      and(
        eq(matchAnnouncements.teamId, myTeamId),
        eq(matchAnnouncements.status, "open"),
        inArray(matchAnnouncements.date, usableDates),
      ),
    );
  const announcementByDate = new Map(openAnnouncements.map((a) => [a.date, a.id]));

  const myCoords = teamCoords(myTeam);
  const myFallbackRadius = radiusByTeam.get(myTeamId) ?? null;
  const byDate = new Map<string, Row[]>();
  for (const row of others) {
    const list = byDate.get(row.availability.date);
    if (list) list.push(row);
    else byDate.set(row.availability.date, [row]);
  }

  const suggestions: SuggestionDto[] = [];
  for (const availability of usable) {
    const mineFit = toFitInput({ availability, team: myTeam }, myFallbackRadius);
    for (const row of byDate.get(availability.date) ?? []) {
      const theirCoords = teamCoords(row.team);
      const distanceKm = myCoords && theirCoords ? haversineKm(myCoords, theirCoords) : null;
      const theirsFit = toFitInput(row, radiusByTeam.get(row.team.id) ?? null);
      if (!availabilitiesFit(mineFit, theirsFit, distanceKm)) continue;

      suggestions.push({
        availabilityId: availability.id,
        date: availability.date,
        team: { id: row.team.id, name: row.team.name, city: row.team.city, logoUrl: null },
        coach: null,
        // Le groupe d'âges de la proposition : le mien fait foi, c'est mon
        // équipe qui publiera l'annonce.
        category: myCategory,
        gender: asMatchGender(row.team.gender),
        level: asDivisionLevel(row.team.level),
        distanceKm,
        host: hostOf(mineFit.venue, theirsFit.venue),
        time: (availability.time ?? row.availability.time ?? AVAILABILITY_DEFAULT_TIME).slice(0, 5),
        announcementId: announcementByDate.get(availability.date) ?? null,
      });
    }
  }

  // Le plus proche d'abord, à date égale : c'est le critère qui décide vraiment
  // quand quatre équipes conviennent toutes.
  suggestions.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
  );
  return suggestions;
}

/** Le nombre de suggestions par disponibilité, pour accompagner chaque date déclarée */
function countByAvailability(suggestions: SuggestionDto[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of suggestions) counts.set(s.availabilityId, (counts.get(s.availabilityId) ?? 0) + 1);
  return counts;
}

export function availabilityRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("coach"));

  /** Mes dates déclarées, accompagnées du nombre d'équipes qui leur répondent */
  async function listMine(teamId: string): Promise<AvailabilityDto[]> {
    const rows = await db
      .select()
      .from(teamAvailabilities)
      .where(and(eq(teamAvailabilities.teamId, teamId), gte(teamAvailabilities.date, today())))
      .orderBy(asc(teamAvailabilities.date));
    const counts = countByAvailability(await suggestionsFor(teamId));
    return rows.map((r) => toDto(r, counts.get(r.id) ?? 0));
  }

  /**
   * Le compte accompagne la date parce que c'est lui qui donne envie d'ouvrir :
   * « libre le 11 octobre » n'apprend rien, « libre le 11 octobre, 4 équipes »
   * est une invitation.
   */
  app.get("/availabilities/mine", async (request): Promise<AvailabilityDto[]> => {
    if (!request.user.teamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    return listMine(request.user.teamId);
  });

  /**
   * Déclarer une ou plusieurs dates d'un coup.
   *
   * Redéclarer une date déjà présente la MET À JOUR plutôt que d'échouer : le
   * coach qui repasse en changeant « domicile » pour « peu importe » exprime un
   * changement d'avis, pas une erreur de saisie.
   */
  app.post("/availabilities", async (request, reply): Promise<AvailabilityDto[]> => {
    const teamId = request.user.teamId;
    if (!teamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    const input = createAvailabilitySchema.parse(request.body);

    const min = today();
    const max = horizon();
    for (const date of input.dates) {
      if (date < min) throw new HttpError(400, "Une date passée ne peut pas être déclarée libre");
      if (date > max)
        throw new HttpError(
          400,
          `Au-delà de ${AVAILABILITY_MAX_DAYS_AHEAD} jours, la disponibilité ne veut plus dire grand-chose`,
        );
    }

    const values = [...new Set(input.dates)].map((date) => ({
      teamId,
      coachId: request.user.id,
      date,
      venue: input.venue,
      time: input.time,
      acceptedLevels: input.acceptedLevels,
      radiusKm: input.radiusKm,
    }));

    await db
      .insert(teamAvailabilities)
      .values(values)
      .onConflictDoUpdate({
        target: [teamAvailabilities.teamId, teamAvailabilities.date],
        set: {
          coachId: sql`excluded.coach_id`,
          venue: sql`excluded.venue`,
          time: sql`excluded.time`,
          acceptedLevels: sql`excluded.accepted_levels`,
          radiusKm: sql`excluded.radius_km`,
        },
      });

    reply.code(201);
    return listMine(teamId);
  });

  /** Retirer une date : l'équipe n'est plus libre, ou ne l'était pas. */
  app.delete("/availabilities/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const [row] = await db.select().from(teamAvailabilities).where(eq(teamAvailabilities.id, id));
    if (!row) throw new HttpError(404, "Disponibilité introuvable");
    if (row.teamId !== request.user.teamId)
      throw new HttpError(403, "Cette disponibilité n'est pas celle de votre équipe");
    await db.delete(teamAvailabilities).where(eq(teamAvailabilities.id, id));
    return { ok: true };
  });

  /**
   * Les appariements proposés à mon équipe. L'identité des coachs d'en face est
   * ajoutée ici et non dans le calcul : elle obéit aux mêmes règles de
   * visibilité qu'ailleurs (`representativeCoachesOf`), et le calcul n'a pas à
   * connaître des noms qu'il n'utilise pas.
   */
  app.get("/availabilities/suggestions", async (request): Promise<SuggestionDto[]> => {
    if (!request.user.teamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    const suggestions = await suggestionsFor(request.user.teamId);
    if (suggestions.length === 0) return [];

    const teamIds = [...new Set(suggestions.map((s) => s.team.id))];
    const rows = await db.select().from(teams).where(inArray(teams.id, teamIds));
    const teamById = new Map(rows.map((t) => [t.id, t]));
    const coaches = await representativeCoachesOf(teamIds);
    return suggestions.map((s) => {
      const team = teamById.get(s.team.id);
      return {
        ...s,
        team: { ...s.team, logoUrl: team?.logoPath ? `/api/uploads/${team.logoPath}` : null },
        coach: coaches.get(s.team.id) ?? null,
      };
    });
  });

  /**
   * Prévenir une équipe suggérée.
   *
   * Le geste ne crée pas un rail parallèle : il publie une ANNONCE ordinaire
   * pour cette date — visible au radar comme les autres, répondable comme les
   * autres — et prévient nommément l'équipe suggérée. Tout ce qui suit
   * (proposition, acceptation, fil de discussion, match) est le chemin déjà
   * éprouvé.
   *
   * Si une annonce ouverte existe déjà pour cette date, elle est RÉUTILISÉE :
   * publier deux fois le même dimanche laisserait croire que l'équipe cherche
   * deux matchs.
   */
  app.post("/availabilities/propose", async (request, reply) => {
    const myTeamId = request.user.teamId;
    if (!myTeamId) throw new HttpError(400, "Aucune équipe associée à ce coach");
    const input = proposeSuggestionSchema.parse(request.body);

    const [availability] = await db
      .select()
      .from(teamAvailabilities)
      .where(eq(teamAvailabilities.id, input.availabilityId));
    if (!availability) throw new HttpError(404, "Disponibilité introuvable");
    if (availability.teamId !== myTeamId)
      throw new HttpError(403, "Cette disponibilité n'est pas celle de votre équipe");

    // Le serveur refait le calcul plutôt que de croire le client : la
    // suggestion affichée peut dater de plusieurs minutes, et l'équipe d'en
    // face a pu retirer sa date entre-temps.
    const suggestion = (await suggestionsFor(myTeamId)).find(
      (s) => s.availabilityId === input.availabilityId && s.team.id === input.teamId,
    );
    if (!suggestion) throw new HttpError(409, "Cette équipe n'est plus disponible pour cette date");

    const [myTeam] = await db.select().from(teams).where(eq(teams.id, myTeamId));
    const gender = asMatchGender(myTeam.gender);
    if (!gender) throw new HttpError(400, "Réglez le genre de votre équipe avant de proposer un match");
    if (!myTeam.stadium) throw new HttpError(400, "Réglez le stade de votre équipe avant de proposer un match");

    let announcementId = suggestion.announcementId;
    let created = false;
    if (!announcementId) {
      const [announcement] = await db
        .insert(matchAnnouncements)
        .values({
          teamId: myTeamId,
          date: suggestion.date,
          time: suggestion.time,
          city: myTeam.city,
          stadium: myTeam.stadium,
          category: suggestion.category,
          gender,
          level: myTeam.level,
          format: "11v11",
        })
        .returning();
      announcementId = announcement.id;
      created = true;
    }

    notifyAvailabilityProposal({
      targetTeamId: input.teamId,
      fromTeamName: myTeam.name,
      date: suggestion.date,
      announcementId,
    });

    reply.code(created ? 201 : 200);
    return { announcementId, created };
  });
}
