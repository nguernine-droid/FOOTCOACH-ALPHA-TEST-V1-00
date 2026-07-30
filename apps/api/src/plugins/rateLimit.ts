import type { FastifyRateLimitOptions } from "@fastify/rate-limit";
import { GLOBAL_MAX, rateLimitKey } from "../lib/rateLimits.js";

/**
 * Limitation de débit. Le plafond global protège l'API d'un client emballé ;
 * les routes d'authentification ont le leur, bien plus bas, parce qu'elles sont
 * les seules où l'on peut deviner quelque chose par répétition.
 *
 * Réglages sortis de `index.ts` pour être exerçables par un test : une
 * protection dont on ne peut pas démontrer le fonctionnement est une protection
 * qu'on découvre cassée en production.
 */
export const rateLimitOptions: FastifyRateLimitOptions = {
  global: true,
  max: GLOBAL_MAX,
  timeWindow: "1 minute",
  keyGenerator: rateLimitKey,
  // Objet en forme d'erreur : le gestionnaire d'erreurs global le reçoit tel
  // quel et se fie à `statusCode`. Sans lui, le dépassement de quota ressortait
  // en 500 — un client bien élevé ne saurait pas qu'il doit ralentir.
  errorResponseBuilder: () => ({ statusCode: 429, message: "Trop de requêtes, patientez un instant" }),
};
