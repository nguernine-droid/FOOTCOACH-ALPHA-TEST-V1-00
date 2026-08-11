import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { env } from "./env.js";
import { UPLOADS_DIR, ensureUploadsDir } from "./lib/uploads.js";
import { MAX_AVATAR_BYTES } from "./lib/images.js";
import { rateLimitOptions } from "./plugins/rateLimit.js";
import { startSosRelay } from "./lib/sosRelay.js";
import { runMigrations } from "./db/migrate.js";
import { registerErrorHandler } from "./plugins/errors.js";
import { authRoutes } from "./routes/auth.js";
import { announcementRoutes } from "./routes/announcements.js";
import { matchRoutes } from "./routes/matches.js";
import { tournamentRoutes } from "./routes/tournaments.js";
import { clubDirectoryRoutes } from "./routes/clubs.js";
import { coachCardRoutes } from "./routes/coaches.js";
import { registrationRoutes } from "./routes/registration.js";
import { activityRoutes } from "./routes/activity.js";
import { eventRoutes } from "./routes/events.js";
import { adminRoutes } from "./routes/admin.js";
import { clubRoutes } from "./routes/club.js";
import { relationRoutes } from "./routes/relations.js";
import { messageRoutes } from "./routes/messages.js";
import { publicationRoutes } from "./routes/publications.js";
import { locationRoutes } from "./routes/location.js";
import { feedbackRoutes } from "./routes/feedback.js";

const app = Fastify({
  logger: {
    // Un jeton ou un mot de passe qui atterrit dans les journaux y reste :
    // les champs sensibles sont masqués avant écriture.
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", "req.body.password", "req.body.refreshToken"],
      censor: "[masqué]",
    },
  },
  // Qui l'on croit quand une requête annonce son adresse dans X-Forwarded-For.
  // Déclaré par le déploiement (TRUST_PROXY), jamais deviné : `true` revenait à
  // laisser le client choisir son adresse, donc son compteur de débit. Voir la
  // note détaillée dans env.ts.
  trustProxy: env.TRUST_PROXY,
  // 1 Mo suffit à tous les corps JSON de l'application (les images passent par
  // le multipart, qui a ses propres limites).
  bodyLimit: 1_048_576,
});

// Dire à voix haute ce que la limitation de débit vaut réellement. Sans saut de
// confiance déclaré, elle fonctionne — mais tout le trafic anonyme partage le
// compteur du conteneur web, ce qui n'est pas ce qu'on croit avoir déployé.
if (env.NODE_ENV === "production" && env.TRUST_PROXY === false) {
  app.log.warn(
    "TRUST_PROXY n'est pas renseigné : l'adresse des clients anonymes est celle du service web, " +
      "donc tout leur trafic partage un seul compteur de débit. Derrière un reverse proxy qui " +
      "complète X-Forwarded-For, régler TRUST_PROXY (voir .env.example).",
  );
}

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

// Limitation de débit — réglages dans plugins/rateLimit.ts, exercés par un test
await app.register(rateLimit, rateLimitOptions);

await app.register(multipart, {
  // Même constante que la route d'avatar : la limite était écrite deux fois,
  // libre de diverger d'un côté sans l'autre.
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1, fields: 10, parts: 20 },
});

// Photos de profil : le navigateur y accède via le proxy du web, sous /api/uploads/*
// Vérifié ici, avec un message explicite : un dossier inaccessible arrêtait le
// conteneur sur une trace d'exécution, sans dire quoi réparer.
try {
  await ensureUploadsDir();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
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
app.register((instance) => tournamentRoutes(instance));
app.register((instance) => clubRoutes(instance));
app.register((instance) => registrationRoutes(instance));
app.register((instance) => activityRoutes(instance));
app.register((instance) => eventRoutes(instance));
app.register((instance) => adminRoutes(instance));
app.register((instance) => clubDirectoryRoutes(instance));
app.register((instance) => coachCardRoutes(instance));
app.register((instance) => relationRoutes(instance));
app.register((instance) => messageRoutes(instance));
app.register((instance) => publicationRoutes(instance));
app.register((instance) => locationRoutes(instance));
app.register((instance) => feedbackRoutes(instance));

try {
  await runMigrations();
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  // Relance des SOS restés sans réponse. Tourne dans chaque réplique : la
  // réclamation en base garantit qu'une annonce n'est relancée qu'une fois.
  startSosRelay({ info: (msg) => app.log.info(msg), error: (err) => app.log.error(err) });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
