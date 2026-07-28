import { z } from "zod";

/**
 * Secrets fournis par défaut dans docker-compose pour que la pile démarre sans
 * configuration en développement. Les laisser en production reviendrait à
 * publier la clé de signature des jetons : n'importe qui pourrait alors forger
 * un jeton d'administrateur. Le démarrage est refusé s'ils survivent.
 */
const DEV_ONLY_SECRETS = ["dev-access-secret-not-for-prod", "dev-refresh-secret-not-for-prod"];

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
    VAPID_SUBJECT: z.string().default("mailto:contact@footcoach.local"),
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
