import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const databaseDir = path.resolve("C:/Users/PC/Desktop/SPA Saloon/.embedded-postgres");
await mkdir(databaseDir, { recursive: true });

const embedded = new EmbeddedPostgres({
  databaseDir,
  user: "spa_saloon",
  password: "spa_saloon",
  port: 5432,
  persistent: true,
});

await embedded.initialise();
await embedded.start();
console.log("EMBEDDED_POSTGRES_READY:5432");

const shutdown = async () => {
  try {
    await embedded.stop();
  } catch {}
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
setInterval(() => {}, 1 << 30);
