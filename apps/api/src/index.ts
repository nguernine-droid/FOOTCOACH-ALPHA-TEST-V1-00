import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { runMigrations } from "./db/migrate.js";
import { registerErrorHandler } from "./plugins/errors.js";
import { authRoutes } from "./routes/auth.js";
import { announcementRoutes } from "./routes/announcements.js";
import { matchRoutes } from "./routes/matches.js";
import { carpoolRoutes } from "./routes/carpools.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
registerErrorHandler(app);

app.get("/health", async () => ({ status: "ok" }));

app.register((instance) => authRoutes(instance));
app.register((instance) => announcementRoutes(instance));
app.register((instance) => matchRoutes(instance));
app.register((instance) => carpoolRoutes(instance));

try {
  await runMigrations();
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
