import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ClubSuggestionDto, DeclaredClubDto } from "@teamnexus/shared";
import { searchClubs } from "../lib/clubDirectory.js";
import { findSimilarClubs } from "../lib/declaredClubs.js";
import { clubSearchRateLimit } from "../lib/rateLimits.js";

const querySchema = z.object({ q: z.string().max(100).optional() });
const declaredQuerySchema = z.object({
  name: z.string().max(100).optional(),
  city: z.string().max(60).optional(),
});

// `clubDirectoryRoutes` et non `clubRoutes` : ce dernier existe déjà pour
// l'espace club (routes/club.ts), qui n'a rien à voir — celui-ci ne fait que
// suggérer des noms depuis un annuaire public.
export function clubDirectoryRoutes(app: FastifyInstance) {
  /**
   * Suggestions de noms de clubs pendant la saisie.
   *
   * Volontairement SANS authentification : elle sert d'abord au formulaire
   * d'inscription, où le coach n'a pas encore de compte. Le plafond de débit
   * par adresse est ce qui tient lieu de garde-fou (voir clubSearchRateLimit).
   *
   * Ne renvoie jamais d'erreur de recherche : une liste vide se lit comme
   * « aucune suggestion », et le champ reste une saisie libre.
   */
  app.get("/clubs/search", clubSearchRateLimit, async (request): Promise<ClubSuggestionDto[]> => {
    const { q } = querySchema.parse(request.query);
    return searchClubs(q ?? "");
  });

  /**
   * Les clubs DÉJÀ déclarés dans l'application qui ressemblent à celui qu'on
   * saisit. Sert à poser la question « n'est-ce pas déjà ce club ? » avant d'en
   * créer un second — le doublon se répare mal une fois que des équipes se sont
   * réparties entre les deux lignes.
   *
   * Publique comme la recherche ci-dessus, et pour la même raison : le
   * formulaire d'inscription en a besoin avant qu'un compte existe. Elle ne
   * révèle qu'un nom de club et sa ville, ce qui s'affiche déjà sur chaque
   * annonce du radar.
   */
  app.get("/clubs/declared", clubSearchRateLimit, async (request): Promise<DeclaredClubDto[]> => {
    const { name, city } = declaredQuerySchema.parse(request.query);
    if (!name || !city) return [];
    return findSimilarClubs(name, city);
  });
}
