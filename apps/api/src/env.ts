import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  API_PORT: z.coerce.number().int().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Web Push — optionnelles : sans elles l'API démarre normalement et le
  // front masque simplement le réglage des notifications.
  // Paire à générer une fois : npx web-push generate-vapid-keys
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  // Contact exigé par la spec Web Push, transmis au service de notification
  VAPID_SUBJECT: z.string().default("mailto:contact@footcoach.local"),
});

export const env = envSchema.parse(process.env);
