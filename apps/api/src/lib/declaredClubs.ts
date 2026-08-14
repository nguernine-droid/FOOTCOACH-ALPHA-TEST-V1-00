import { eq } from "drizzle-orm";
import type { DeclaredClubDto } from "@teamnexus/shared";
import { db } from "../db/client.js";
import { clubs } from "../db/schema.js";
import { cityCoords } from "./cities.js";

import { clubKey, clubNamesEqual, clubNamesLookAlike, sameCity } from "./clubMatching.js";

export function toDeclaredClubDto(club: typeof clubs.$inferSelect): DeclaredClubDto {
  return {
    id: club.id,
    name: club.name,
    city: club.city,
    stadium: club.stadium,
    hasAccount: club.ownerId != null,
  };
}

/**
 * Les clubs déjà déclarés qui ressemblent à celui qu'on est en train de saisir,
 * dans la MÊME ville.
 *
 * La ville est ce qui rend la comparaison sûre : « AS Saint-Martin » existe dans
 * vingt départements, et proposer celui d'à côté ferait rattacher un coach au
 * club d'une autre région — une erreur bien plus coûteuse qu'un doublon.
 *
 * La comparaison se fait sur le nom normalisé (sans accents ni casse), et dans
 * les deux sens d'inclusion : « AS Lyon » doit retrouver « A.S. LYON » comme
 * « AS Lyon Football ». C'est volontairement large — ce n'est pas un verdict,
 * seulement une question posée au coach, qui garde le dernier mot.
 */
export async function findSimilarClubs(name: string, city: string): Promise<DeclaredClubDto[]> {
  if (clubKey(name).length < 2 || clubKey(city).length === 0) return [];

  /**
   * Tout est comparé ici et non en SQL : « Saint-Étienne » et « saint-etienne »
   * doivent se reconnaître, et Postgres ne compare sans accents qu'avec
   * l'extension `unaccent`, absente de l'image utilisée. La table des clubs se
   * compte en centaines — le jour où elle se comptera en dizaines de milliers,
   * c'est un index trigramme qu'il faudra, pas une comparaison SQL naïve.
   */
  const rows = await db.select().from(clubs);

  return rows
    .filter((club) => sameCity(club.city, city) && clubNamesLookAlike(club.name, name))
    .map(toDeclaredClubDto);
}

/**
 * Retrouve un club déclaré par son identifiant — celui que le coach a reconnu
 * dans la question de doublon. 404 côté appelant si l'identifiant ne désigne
 * rien : mieux vaut refuser que rattacher l'équipe à un club inconnu.
 */
export async function clubById(id: string): Promise<typeof clubs.$inferSelect | null> {
  const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
  return club ?? null;
}

/**
 * Déclare un club. Sans compte de connexion ni code d'affiliation : c'est un
 * nom que les coachs se partagent, pas un espace de gestion — celui-ci reste la
 * prérogative d'un administrateur, qui pourra reprendre ce club plus tard.
 *
 * Un club de même nom dans la même ville n'est pas recréé : la question a déjà
 * été posée à la saisie, et deux appels concurrents (double clic sur
 * « Créer ») ne doivent pas laisser deux lignes derrière eux.
 */
export async function declareClub(input: {
  name: string;
  city: string;
  stadium?: string | null;
}): Promise<typeof clubs.$inferSelect> {
  const existing = await findSimilarClubs(input.name, input.city);
  const exact = existing.find((c) => clubNamesEqual(c.name, input.name));
  if (exact) {
    const club = await clubById(exact.id);
    if (club) return club;
  }

  const coords = cityCoords(input.city);
  const [created] = await db
    .insert(clubs)
    .values({
      name: input.name,
      city: input.city,
      stadium: input.stadium?.trim() || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    })
    .returning();
  return created;
}

/**
 * Le club à rattacher à une équipe qu'on crée, quelle que soit la forme reçue :
 * un identifiant reconnu, une déclaration, ou rien du tout.
 *
 * `null` quand le coach n'a pas de club à nommer — le cas le plus courant, et
 * qui doit rester sans conséquence.
 */
export async function resolveClubChoice(input: {
  clubId?: string;
  club?: { name: string; city: string; stadium?: string };
}): Promise<typeof clubs.$inferSelect | null> {
  if (input.clubId) return clubById(input.clubId);
  if (input.club) return declareClub(input.club);
  return null;
}
