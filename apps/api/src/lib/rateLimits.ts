import { env } from "../env.js";

/**
 * Plafonds de débit, réunis ici pour être lus d'un coup d'œil.
 *
 * Ils sont actifs par défaut, y compris en développement : une protection qu'on
 * n'active qu'en production est une protection qu'on découvre cassée en
 * production. `RATE_LIMIT_DISABLED` permet de les lever pour un test de charge
 * — la configuration refuse ce réglage si NODE_ENV vaut « production ».
 */
const off = env.RATE_LIMIT_DISABLED;

/** Plafond général : protège d'un client emballé, pas d'un usage normal. */
export const GLOBAL_MAX = off ? 100_000 : 300;

/**
 * Routes où l'on peut deviner quelque chose par répétition — mot de passe,
 * jeton de session, existence d'un compte. Comptées par adresse, faute d'être
 * authentifié à ce stade.
 */
export const authRateLimit = {
  config: { rateLimit: { max: off ? 100_000 : 10, timeWindow: "1 minute" } },
};

/** Inscription : rien ne justifie d'ouvrir des comptes en rafale. */
export const registerRateLimit = {
  config: { rateLimit: { max: off ? 100_000 : 5, timeWindow: "10 minutes" } },
};
