import { mkdir } from "node:fs/promises";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { env } from "./env.js";
import { UPLOADS_DIR } from "./lib/uploads.js";
import { GLOBAL_MAX } from "./lib/rateLimits.js";
import { runMigrations } from "./db/migrate.js";
import { registerErrorHandler } from "./plugins/errors.js";
import { authRoutes } from "./routes/auth.js";
import { announcementRoutes } from "./routes/announcements.js";
import { matchRoutes } from "./routes/matches.js";
import { registrationRoutes } from "./routes/registration.js";
import { activityRoutes } from "./routes/activity.js";
import { eventRoutes } from "./routes/events.js";
import { adminRoutes } from "./routes/admin.js";
import { clubRoutes } from "./routes/club.js";
import { relationRoutes } from "./routes/relations.js";
import { locationRoutes } from "./routes/location.js";

const app = Fastify({
  logger: {
    // Un jeton ou un mot de passe qui atterrit dans les journaux y reste :
    // les champs sensibles sont masqués avant écriture.
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", "req.body.password", "req.body.refreshToken"],
      censor: "[masqué]",
    },
  },
  // Derrière le proxy Next : sans cela l'adresse vue est celle du proxy, et la
  // limitation de débit compterait tout le trafic sur un seul compteur.
  trustProxy: true,
  // 1 Mo suffit à tous les corps JSON de l'application (les images passent par
  // le multipart, qui a ses propres limites).
  bodyLimit: 1_048_576,
});

// En production, seules les origines déclarées sont acceptées. Le navigateur
// ne parle normalement qu'au service web, qui proxifie l'API : une origine
// tierce n'a aucune raison légitime d'appeler l'API directement.
await app.register(cors, {
  origin: env.NODE_ENV === "production" ? (env.CORS_ORIGINS ?? []) : true,
  credentials: false,
});

await app.register(helmet, {
  // L'API sert des photos de profil. La politique la plus stricte compatible
  // avec un fichier image servi tel quel : rien n'est exécutable, rien n'est
  // encadrable, et le type déclaré ne peut pas être deviné autrement.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      imgSrc: ["'self'", "data:"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "no-referrer" },
  // HSTS n'a de sens que servi en HTTPS : laissé au reverse proxy en façade.
  hsts: env.NODE_ENV === "production" ? { maxAge: 15_552_000, includeSubDomains: true } : false,
});

/**
 * Limitation de débit. Le plafond global protège l'API d'un client emballé ;
 * les routes d'authentification ont le leur, bien plus bas, parce qu'elles
 * sont les seules où l'on peut deviner quelque chose par répétition.
 */
await app.register(rateLimit, {
  global: true,
  max: GLOBAL_MAX,
  timeWindow: "1 minute",
  // Un coach derrière le NAT d'un club partage l'adresse de ses collègues :
  // une fois authentifié, on compte par compte plutôt que par adresse.
  keyGenerator: (request) => {
    const header = request.headers.authorization;
    return header?.startsWith("Bearer ") ? header.slice(7, 40) : (request.ip ?? "anonyme");
  },
  // Objet en forme d'erreur : le gestionnaire d'erreurs global le reçoit tel
  // quel et se fie à `statusCode`. Sans lui, le dépassement de quota ressortait
  // en 500 — un client bien élevé ne saurait pas qu'il doit ralentir.
  errorResponseBuilder: () => ({ statusCode: 429, message: "Trop de requêtes, patientez un instant" }),
});

await app.register(multipart, {
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 10, parts: 20 },
});

// Photos de profil : le navigateur y accède via le proxy du web, sous /api/uploads/*
await mkdir(UPLOADS_DIR, { recursive: true });
await app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: "/uploads/",
  decorateReply: false,
  cacheControl: true,
  maxAge: "7d",
});

registerErrorHandler(app);

app.get("/health", async () => ({ status: "ok" }));

app.register((instance) => authRoutes(instance));
app.register((instance) => announcementRoutes(instance));
app.register((instance) => matchRoutes(instance));
app.register((instance) => registrationRoutes(instance));
app.register((instance) => activityRoutes(instance));
app.register((instance) => eventRoutes(instance));
app.register((instance) => adminRoutes(instance));
app.register((instance) => clubRoutes(instance));
app.register((instance) => relationRoutes(instance));
app.register((instance) => locationRoutes(instance));

try {
  await runMigrations();
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
