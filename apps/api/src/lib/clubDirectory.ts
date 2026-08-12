import type { ClubSuggestionDto } from "@teamnexus/shared";
import { env } from "../env.js";
import { footballScore, prettifyClubName, stripSigle } from "./clubNames.js";

/**
 * Suggestions de noms de clubs, adossées à l'annuaire des entreprises de
 * data.gouv.fr — la façade publique de la base SIRENE.
 *
 * Pourquoi une API et non un annuaire statique comme les villes : le fichier
 * SIRENE complet pèse plusieurs gigaoctets, et les quelque 150 000
 * établissements du code 93.12Z changent tous les mois. Un extrait figé aurait
 * vieilli entre deux versions de l'application. Le commentaire de `cities.ts`
 * n'interdit que les API **payantes** ; celle-ci est publique, gratuite et sans
 * clé.
 *
 * Trois précautions, parce qu'une saisie d'inscription ne doit JAMAIS dépendre
 * d'un service tiers :
 * - délai d'attente court, et l'échec renvoie une liste vide plutôt qu'une
 *   erreur — le champ reste libre, le coach tape son club à la main ;
 * - cache en mémoire, pour ne pas rejouer la même frappe à chaque caractère ;
 * - l'appel part du serveur et non du navigateur : l'adresse des coachs n'est
 *   pas communiquée à un tiers, et le cache profite à tout le monde.
 */

/** Code d'activité « Activités de clubs de sports » (NAF 93.12Z, 93.12Y en 2025) */
const NAF_CLUBS_SPORTIFS = "93.12Z";

const SEARCH_TIMEOUT_MS = 3_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
/** Bornée : le cache sert à absorber une frappe, pas à stocker l'annuaire. */
const CACHE_MAX_ENTRIES = 500;
const MAX_SUGGESTIONS = 8;
/** En dessous, la recherche ramène tout et n'aide personne. */
export const MIN_QUERY_LENGTH = 3;

interface CacheEntry {
  expiresAt: number;
  suggestions: ClubSuggestionDto[];
}
const cache = new Map<string, CacheEntry>();

interface ApiResult {
  nom_complet?: string;
  nom_raison_sociale?: string;
  siege?: { libelle_commune?: string; code_postal?: string };
}

/**
 * Cherche des clubs par nom. Ne lève jamais : une suggestion absente est un
 * confort en moins, pas une inscription bloquée.
 */
export async function searchClubs(query: string): Promise<ClubSuggestionDto[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const key = trimmed.toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.suggestions;

  const url = new URL("/search", env.CLUB_DIRECTORY_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("activite_principale", NAF_CLUBS_SPORTIFS);
  // Établissements fermés écartés : un club dissous n'intéresse personne.
  url.searchParams.set("etat_administratif", "A");
  url.searchParams.set("per_page", "25");

  let suggestions: ClubSuggestionDto[] = [];
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { results?: ApiResult[] };
    const seen = new Set<string>();
    suggestions = (body.results ?? [])
      .map((result) => {
        const raw = stripSigle(result.nom_raison_sociale || result.nom_complet || "");
        return {
          name: prettifyClubName(raw),
          city: result.siege?.libelle_commune ? prettifyClubName(result.siege.libelle_commune) : null,
          postalCode: result.siege?.code_postal ?? null,
        };
      })
      .filter((s) => {
        if (!s.name) return false;
        // Un club a souvent plusieurs établissements : le même nom dans la même
        // commune ne doit apparaître qu'une fois dans la liste.
        const identity = `${s.name}|${s.city ?? ""}`;
        if (seen.has(identity)) return false;
        seen.add(identity);
        return true;
      })
      .sort((a, b) => footballScore(b.name) - footballScore(a.name))
      .slice(0, MAX_SUGGESTIONS);
  } catch {
    // Tiers indisponible, lent ou incohérent : on n'en dit rien au coach, le
    // champ reste une saisie libre et l'inscription continue.
    return [];
  }

  if (cache.size >= CACHE_MAX_ENTRIES) {
    // Purge grossière : la plus ancienne clé insérée, l'ordre d'une Map étant
    // celui de l'insertion. Suffisant pour un cache de confort.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, suggestions });
  return suggestions;
}
