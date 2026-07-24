import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { runMigrations } from "./db/migrate.js";
import { registerErrorHandler } from "./plugins/errors.js";
import { authRoutes } from "./routes/auth.js";
import { announcementRoutes } from "./routes/announcements.js";
import { matchRoutes } from "./routes/matches.js";
import { carpoolRoutes } from "./routes/carpools.js";
import { registrationRoutes } from "./routes/registration.js";
import { lineupRoutes } from "./routes/lineups.js";
import { activityRoutes } from "./routes/activity.js";
import { eventRoutes } from "./routes/events.js";
import { adminRoutes } from "./routes/admin.js";
import { clubRoutes } from "./routes/club.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
registerErrorHandler(app);

app.get("/health", async () => ({ status: "ok" }));

app.register((instance) => authRoutes(instance));
app.register((instance) => announcementRoutes(instance));
app.register((instance) => matchRoutes(instance));
app.register((instance) => carpoolRoutes(instance));
app.register((instance) => registrationRoutes(instance));
app.register((instance) => lineupRoutes(instance));
app.register((instance) => activityRoutes(instance));
app.register((instance) => eventRoutes(instance));
app.register((instance) => adminRoutes(instance));
app.register((instance) => clubRoutes(instance));

try {
  await runMigrations();
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
