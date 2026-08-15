import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from '@config/index';
import { logger } from '@shared/logger';

//Route endpoints
import {authRoutes} from '@modules/auth/index';
import { usersRoutes } from '@modules/users/index';
import { membershipSyncRoutes } from '@modules/membership-sync/index';

const app: Application = express();

app.use(helmet());
app.use(cors({
  origin: config.server.nodeEnv === 'development' ? '*' : [],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'SEVS SACCO API is running',
    environment: config.server.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// Routes registered here as modules are built
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/membership-sync', membershipSyncRoutes);






// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errorCode: 'ROUTE_NOT_FOUND',
  });
});

// Global error handler (placeholder — full version in M3)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errorCode: 'INTERNAL_ERROR',
  });
});

export default app;