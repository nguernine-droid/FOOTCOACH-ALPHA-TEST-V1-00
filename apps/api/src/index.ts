import { mkdir } from "node:fs/promises";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { env } from "./env.js";
import { UPLOADS_DIR } from "./lib/uploads.js";
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

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(multipart);

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

try {
  await runMigrations();
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
