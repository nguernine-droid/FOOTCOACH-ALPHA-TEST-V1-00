import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { env } from "../env.js";

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../drizzle");

// Verrou consultatif : avec plusieurs réplicas API, un seul exécute les migrations à la fois.
export async function runMigrations() {
  const client = postgres(env.DATABASE_URL, { max: 1 });
  try {
    await client`SELECT pg_advisory_lock(727001)`;
    await migrate(drizzle(client), { migrationsFolder });
    await client`SELECT pg_advisory_unlock(727001)`;
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log("Migrations appliquées.");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
