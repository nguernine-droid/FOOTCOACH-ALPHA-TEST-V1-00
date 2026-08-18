import type { FastifyInstance } from "fastify";
import { and, asc, between, ilike, sql } from "drizzle-orm";
import {
  VENUE_SEARCH_LIMIT,
  VENUE_SEARCH_RADIUS_KM,
  type VenueDto,
} from "@teamnexus/shared";
import { db } from "../db/client.js";
import { venues } from "../db/schema.js";
import { requireAuth, requireRole } from "../plugins/auth.js";
import { haversineKm } from "../lib/cities.js";
import { loadOrigin } from "../lib/coachOrigin.js";

/**
 * Recherche de terrain, pour la saisie du stade.
 *
 * ── Par proximité, et non par commune ───────────────────────────────────
 * Le recensement nomme les communes comme l'INSEE : « Lyon 7e Arrondissement »
 * et non « Lyon ». Chercher par égalité de nom de commune manquerait donc tous
 * les terrains des trois plus grandes villes de France, silencieusement.
 *
 * Comme chaque terrain porte ses coordonnées, on interroge par CADRE
 * GÉOGRAPHIQUE autour du coach, puis on ordonne par distance réelle. Le
 * problème des arrondissements disparaît, et la question posée devient la bonne :
 * « quel terrain, près d'ici ? »
 *
 * ── Sans position connue ────────────────────────────────────────────────
 * Un coach fraîchement inscrit n'a ni position réglée ni équipe : la recherche
 * retombe alors sur le seul texte, à l'échelle du pays. C'est moins bon, mais
 * c'est mieux que zéro résultat — et cela n'arrive qu'à la création de la
 * première équipe.
 */
export function venueRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("coach"));

  app.get("/venues/search", async (request): Promise<VenueDto[]> => {
    const { q, lat, lng } = request.query as { q?: string; lat?: string; lng?: string };
    const text = (q ?? "").trim();
    if (text.length < 2) return [];

    // Point de recherche : celui que le client donne (la ville saisie dans le
    // formulaire), sinon celui d'où le coach rayonne déjà.
    const given =
      lat && lng && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
        ? { lat: Number(lat), lng: Number(lng) }
        : null;
    const origin = given ?? (await loadOrigin(request.user.id, request.user.teamId));

    const needle = `%${text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")}%`;

    // Un degré de latitude vaut ~111 km ; en longitude il rétrécit avec le
    // cosinus de la latitude. Le cadre est donc un peu large près des pôles et
    // juste sous nos latitudes — il ne sert qu'à écarter le gros du volume,
    // la distance réelle tranche ensuite.
    const box = origin
      ? {
          latMin: origin.lat - VENUE_SEARCH_RADIUS_KM / 111,
          latMax: origin.lat + VENUE_SEARCH_RADIUS_KM / 111,
          lngMin: origin.lng - VENUE_SEARCH_RADIUS_KM / (111 * Math.cos((origin.lat * Math.PI) / 180)),
          lngMax: origin.lng + VENUE_SEARCH_RADIUS_KM / (111 * Math.cos((origin.lat * Math.PI) / 180)),
        }
      : null;

    const rows = await db
      .select()
      .from(venues)
      .where(
        and(
          ilike(venues.searchName, needle),
          box ? between(venues.lat, box.latMin, box.latMax) : undefined,
          box ? between(venues.lng, box.lngMin, box.lngMax) : undefined,
        ),
      )
      .orderBy(asc(venues.name))
      // Large avant tri : on ordonne ensuite par distance réelle, et couper
      // trop tôt écarterait le terrain d'à côté au profit d'un homonyme.
      .limit(VENUE_SEARCH_LIMIT * 8);

    const dtos: VenueDto[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      pitchName: row.pitchName,
      city: row.city,
      address: row.address,
      postalCode: row.postalCode,
      lat: row.lat,
      lng: row.lng,
      surface: row.surface,
      floodlit: row.floodlit,
      changingRooms: row.changingRooms,
      distanceKm: origin ? Math.round(haversineKm(origin, { lat: row.lat, lng: row.lng }) * 10) / 10 : null,
    }));

    dtos.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

    // Un même stade compte souvent trois ou quatre terrains, chacun sa ligne
    // au recensement. Le coach choisit un LIEU, pas une pelouse : on n'en garde
    // qu'un par installation et par commune, le plus proche — celui dont les
    // coordonnées situeront l'équipe.
    const seen = new Set<string>();
    const unique: VenueDto[] = [];
    for (const dto of dtos) {
      const key = `${dto.name.toLowerCase()}|${dto.city.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(dto);
      if (unique.length >= VENUE_SEARCH_LIMIT) break;
    }
    return unique;
  });

  /** Combien de terrains connus — sert au tableau de bord de l'administrateur */
  app.get("/venues/count", async () => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(venues);
    return { count };
  });
}
