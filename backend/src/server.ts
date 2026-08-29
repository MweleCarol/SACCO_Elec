import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma, disconnectPrisma } from "./config/prisma";

async function main(): Promise<void> {
  // Fail fast on startup if the DB is unreachable, rather than starting
  // the HTTP server and only discovering the problem on the first request.
  await prisma.$connect();
  logger.info("Database connection established.");

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`SEVS backend listening on port ${env.PORT}`, { env: env.NODE_ENV });
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received — shutting down gracefully.`);
    server.close(async () => {
      await disconnectPrisma();
      logger.info("Shutdown complete.");
      process.exit(0);
    });

    // Force-exit if graceful shutdown hangs (e.g. a lingering connection).
    setTimeout(() => {
      logger.error("Forced shutdown after timeout.");
      process.exit(1);
    }, 10_000).unref();
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Fatal error during startup.", {
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});