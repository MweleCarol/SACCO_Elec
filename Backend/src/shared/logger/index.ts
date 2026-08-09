import winston from 'winston';
import { config } from '@config/index';

const customLevels = {
  levels: {
    audit: 0,
    security: 1,
    error: 2,
    warn: 3,
    info: 4,
    debug: 5,
  },
  colors: {
    audit: 'magenta',
    security: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
  },
};

winston.addColors(customLevels.colors);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: config.logging.level,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        }),
      ),
    }),
    new winston.transports.File({ filename: 'logs/security.log', level: 'security' }),
    new winston.transports.File({ filename: 'logs/audit.log', level: 'audit' }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
});

export const auditLog = (message: string, meta?: Record<string, unknown>): void => {
  logger.log('audit', message, meta);
};

export const securityLog = (message: string, meta?: Record<string, unknown>): void => {
  logger.log('security', message, meta);
};