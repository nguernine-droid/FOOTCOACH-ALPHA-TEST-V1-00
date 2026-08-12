import { z } from "zod";

/**
 * Secrets fournis par défaut dans docker-compose pour que la pile démarre sans
 * configuration en développement. Les laisser en production reviendrait à
 * publier la clé de signature des jetons : n'importe qui pourrait alors forger
 * un jeton d'administrateur. Le démarrage est refusé s'ils survivent.
 */
const DEV_ONLY_SECRETS = ["dev-access-secret-not-for-prod", "dev-refresh-secret-not-for-prod"];

/**
 * Analyse de `TRUST_PROXY`. Exportée pour être exerçable par un test : c'est la
 * fonction qui décide si l'adresse d'un client est croyable, et la seule valeur
 * qu'elle ne doit JAMAIS produire est `true` — qui reviendrait à faire confiance
 * à tous les sauts, donc à laisser l'appelant choisir son adresse.
 *
 * Voir le commentaire du champ TRUST_PROXY plus bas pour les valeurs admises.
 */
export function parseTrustProxy(value: string | undefined): false | number | string[] {
  const raw = value?.trim();
  if (!raw) return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  const entries = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  // Une liste vide ferait retomber Fastify sur son défaut : mieux vaut dire
  // explicitement « personne ».
  return entries.length > 0 ? entries : false;
}

const envSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    API_PORT: z.coerce.number().int().default(4000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    /**
     * Origines autorisées à appeler l'API depuis un navigateur, séparées par
     * des virgules. Sans valeur en production, aucune origine tierce n'est
     * acceptée — le navigateur passe de toute façon par le proxy du service web.
     */
    CORS_ORIGINS: z
      .string()
      .optional()
      .transform((v) =>
        v
          ? v
              .split(",")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
      ),
    // Web Push — optionnelles : sans elles l'API démarre normalement et le
    // front masque simplement le réglage des notifications.
    // Paire à générer une fois : npx web-push generate-vapid-keys
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    // Contact exigé par la spec Web Push, transmis au service de notification
    VAPID_SUBJECT: z.string().default("mailto:contact@teamnexus.local"),
    /**
     * Annuaire public des entreprises (façade SIRENE), pour suggérer un nom de
     * club à l'inscription. Gratuit et sans clé. Configurable pour pouvoir le
     * remplacer par un miroir, ou le neutraliser sur un réseau fermé — une
     * adresse injoignable dégrade seulement la suggestion, la saisie du nom
     * reste libre.
     */
    CLUB_DIRECTORY_URL: z.string().url().default("https://recherche-entreprises.api.gouv.fr"),
    /**
     * Lève les plafonds de débit, pour un test de charge sur un poste de
     * développement. Refusé en production (voir plus bas) : la limitation est
     * la seule protection contre la force brute sur les mots de passe.
     */
    // Chaîne libre plutôt qu'énumération : une variable non renseignée arrive
    // en chaîne vide depuis docker-compose, ce qui ferait échouer un enum.
    RATE_LIMIT_DISABLED: z
      .string()
      .optional()
      .transform((v) => v === "true"),
    /**
     * Sauts de confiance devant l'API, pour établir l'adresse du client.
     *
     * Ce réglage décide de qui l'on croit quand une requête annonce une
     * adresse dans `X-Forwarded-For`. Il ne peut pas être devine : il décrit la
     * chaîne de proxys réellement déployée, et une erreur casse la limitation
     * de débit dans un sens (tout le trafic sur un seul compteur) ou dans
     * l'autre (un compteur par adresse annoncée, donc aucun plafond).
     *
     * Non renseigné = ne croire personne. L'adresse retenue est alors celle du
     * pair TCP, c'est-à-dire le conteneur `web` : la limitation reste correcte,
     * mais grossière — tout le trafic anonyme partage un compteur.
     *
     * Valeurs acceptées, transmises telles quelles à Fastify :
     *   - un entier   : nombre de sauts de confiance (« 2 » = nginx puis web) ;
     *   - une liste   : adresses ou réseaux de confiance, séparés par des
     *                   virgules. Les mots-clés de `proxy-addr` sont admis —
     *                   « loopback,uniquelocal » couvre le réseau privé Docker.
     *
     * ⚠️ Next NE COMPLÈTE PAS `X-Forwarded-For` : `base-server.js` ne le pose
     * que s'il est absent (`??=`). Un en-tête envoyé par le client traverse donc
     * le service `web` intact. La confiance doit venir du reverse proxy en
     * façade, configuré pour AJOUTER l'adresse réelle :
     *     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
     * Sans ce reverse proxy, laisser TRUST_PROXY vide.
     */
    TRUST_PROXY: z.string().optional().transform(parseTrustProxy),
  })
  // Refus de démarrer plutôt que de tourner en production avec des secrets
  // connus : une API qui répond avec la mauvaise clé est pire qu'une API qui
  // ne répond pas.
  .superRefine((config, ctx) => {
    if (config.NODE_ENV !== "production") return;
    for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
      if (DEV_ONLY_SECRETS.includes(config[key])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} porte encore sa valeur de développement — générez un secret dédié (openssl rand -base64 48)`,
        });
      } else if (config[key].length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} doit faire au moins 32 caractères en production`,
        });
      }
    }
    if (config.RATE_LIMIT_DISABLED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RATE_LIMIT_DISABLED"],
        message: "La limitation de débit ne peut pas être levée en production",
      });
    }
    if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_REFRESH_SECRET"],
        message: "Les deux secrets JWT doivent être distincts",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Message lisible : au démarrage d'un conteneur, une trace Zod brute
  // n'apprend rien à celui qui déploie.
  console.error("Configuration invalide :");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".") || "(racine)"} : ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
