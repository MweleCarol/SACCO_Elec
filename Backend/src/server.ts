import app from './app';
import { config } from '@config/index';
import { logger } from '@shared/logger';
import { connectDatabase, disconnectDatabase } from '@database/client';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const server = app.listen(config.server.port, () => {
      logger.info('SEVS SACCO Backend running', {
        port: config.server.port,
        environment: config.server.nodeEnv,
        version: config.server.apiVersion,
      });
    });

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Promise Rejection', { reason });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();