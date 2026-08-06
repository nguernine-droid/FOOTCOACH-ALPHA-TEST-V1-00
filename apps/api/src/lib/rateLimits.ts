import type { FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
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
 * Compartiment de comptage d'une requête.
 *
 * Un coach derrière le NAT d'un club partage l'adresse de ses collègues : une
 * fois authentifié, on compte donc par compte plutôt que par adresse.
 *
 * Le point délicat est de savoir de QUOI l'on dérive ce compte. La version
 * précédente prenait les octets de l'en-tête `Authorization` tels quels, sans
 * vérifier la signature du jeton : n'importe quelle chaîne commençant par
 * « Bearer » fabriquait un compteur neuf, et il suffisait de la faire varier à
 * chaque essai pour ne jamais rencontrer de plafond — y compris sur la
 * connexion, où la limitation est la seule protection contre la force brute.
 *
 * La clé ne peut donc venir que d'une identité VÉRIFIÉE. Le jeton est validé
 * ici, et l'on ne retient `sub` qu'en cas de succès ; un jeton absent, expiré
 * ou forgé retombe sur l'adresse réseau. Le surcoût est une vérification HMAC
 * par requête, que `requireAuth` paie de toute façon quelques instants plus
 * tard.
 *
 * Les préfixes `u:` et `ip:` séparent les deux espaces de noms : sans eux, un
 * identifiant de compte pourrait entrer en collision avec une adresse.
 */
export function rateLimitKey(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, {
        algorithms: ["HS256"],
      }) as jwt.JwtPayload;
      if (typeof payload.sub === "string" && payload.sub.length > 0) return `u:${payload.sub}`;
    } catch {
      // Jeton illisible, expiré ou signé avec une autre clé : il n'identifie
      // personne, il ne peut pas servir de compteur.
    }
  }
  return `ip:${request.ip ?? "anonyme"}`;
}

/**
 * Compartiment par adresse, sans considération du jeton. Les routes
 * d'authentification s'en servent : l'appelant n'y est par définition pas
 * encore authentifié, et un jeton présenté à `/auth/login` n'y a aucun sens.
 */
export function ipRateLimitKey(request: FastifyRequest): string {
  return `ip:${request.ip ?? "anonyme"}`;
}

/**
 * Routes où l'on peut deviner quelque chose par répétition — mot de passe,
 * jeton de session, existence d'un compte. Comptées par adresse, faute d'être
 * authentifié à ce stade.
 */
export const authRateLimit = {
  config: {
    rateLimit: { max: off ? 100_000 : 10, timeWindow: "1 minute", keyGenerator: ipRateLimitKey },
  },
};

/** Inscription : rien ne justifie d'ouvrir des comptes en rafale. */
export const registerRateLimit = {
  config: {
    rateLimit: { max: off ? 100_000 : 5, timeWindow: "10 minutes", keyGenerator: ipRateLimitKey },
  },
};

/**
 * Suggestion de nom de club. Route forcément ouverte — elle sert pendant
 * l'inscription, avant tout compte — donc relayée vers un service tiers par
 * un appelant anonyme : sans plafond, l'API deviendrait un proxy gratuit vers
 * l'annuaire des entreprises, et c'est notre adresse qui s'y ferait bannir.
 *
 * Généreux malgré tout : le champ interroge à chaque frappe stabilisée, et
 * remplir un formulaire d'inscription en consomme légitimement une dizaine.
 */
export const clubSearchRateLimit = {
  config: {
    rateLimit: { max: off ? 100_000 : 40, timeWindow: "1 minute", keyGenerator: ipRateLimitKey },
  },
};
