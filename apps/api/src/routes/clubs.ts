import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ClubSuggestionDto } from "@footcoach/shared";
import { searchClubs } from "../lib/clubDirectory.js";
import { clubSearchRateLimit } from "../lib/rateLimits.js";

const querySchema = z.object({ q: z.string().max(100).optional() });

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
}
