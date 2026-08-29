import { PrismaClient } from "@prisma/client";
import { isProduction } from "./env";
import { logger } from "./logger";

// Singleton pattern: without this, tsx's watch-mode restarts (and, in a
// serverless deployment, cold starts) can spin up multiple PrismaClient
// instances and exhaust the Postgres connection pool.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isProduction
      ? [{ emit: "event", level: "error" }]
      : [
          { emit: "event", level: "query" },
          { emit: "event", level: "error" },
          { emit: "event", level: "warn" },
        ],
  });

if (!isProduction) {
  global.__prisma = prisma;
}

// Route Prisma's own event log through our logger instead of its default
// console output, so log format stays consistent app-wide.
prisma.$on("error" as never, (e: unknown) => {
  logger.error("Prisma error", { detail: e });
});

if (!isProduction) {
  prisma.$on("warn" as never, (e: unknown) => {
    logger.warn("Prisma warning", { detail: e });
  });
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}