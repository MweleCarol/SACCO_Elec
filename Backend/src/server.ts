import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "@config/env.js";
import { logger } from "@config/logger.js";
import { buildApp } from "./app.js";

// Prisma 7 removed the internal connection engine entirely — PrismaClient
// must always be constructed with a driver adapter. We build our own `pg`
// Pool here rather than handing adapter-pg a bare connection string, since
// that's the form documented for the current adapter-pg release.
const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = buildApp(prisma);

const server = app.listen(env.PORT, () => {
  logger.info(`SACCO EVS backend listening on port ${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));