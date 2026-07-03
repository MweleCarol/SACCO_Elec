import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "@config/env.js";
import { logger } from "@config/logger.js";
import { buildApp } from "./app.js";
import { Pool } from "pg";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const pool = new Pool({ connectionString: env.DATABASE_URL });

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