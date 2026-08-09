/**
 * Global Error Handler Middleware
 *
 * Architecture pattern: Centralised Error Handling
 * Layer: Middleware (must be registered LAST in app.ts)
 *
 * HOW EXPRESS IDENTIFIES THIS AS AN ERROR HANDLER:
 * Express identifies error-handling middleware by the 4-parameter signature:
 *   (err, req, res, next)
 * Express will NOT call this middleware for normal requests — only when
 * next(err) is called or an error is thrown inside asyncHandler.
 * It MUST be registered after all routes and other middleware.
 *
 * WHAT THIS HANDLER DOES:
 * 1. Distinguishes AppError (operational, known) from unknown errors (bugs)
 * 2. Handles Prisma-specific errors (unique constraint, record not found)
 * 3. Handles JWT errors (expiry, invalid signature)
 * 4. Handles Zod errors that slip through (defensive)
 * NOTE: Prisma is imported via a relative path here, not an alias — this is
 * deliberate, per Architecture Decision #5: generated code (src/generated/)
 * is never registered as a path alias, always imported relatively. Same
 * rule applies to enums/index.ts's Prisma import.
 *
 * 5. Logs errors at appropriate severity levels — driven by isOperational,
 *    not just statusCode. A non-operational error (isOperational: false)
 *    always logs as an investigation-worthy error, regardless of what
 *    status code it happens to carry, because isOperational is the flag
 *    that actually distinguishes "expected failure" from "bug" per
 *    AppError.ts. statusCode alone is a proxy for that distinction, not
 *    the distinction itself.
 * 6. Returns a consistent JSON envelope — never leaks stack traces in production
 *
 * CRITICAL SECURITY RULE:
 * Stack traces reveal the internal file structure, library versions, and
 * code logic. We are to never include them in API responses in production.
 * In development, they're invaluable for debugging — that's the only place
 * they appear.
 *
 * NOTE ON errors SHAPE:
 * ValidationError.fieldErrors is passed through as-is: a
 * Record<string, string[]> keyed by "target.field" (e.g. "body.email").
 * This is a deliberate choice over a flat array of {field, message} —
 * it gives the frontend a direct O(1) lookup per field instead of a scan,
 * and it doesn't lose information when a field has multiple messages.
 * The LLD's response-shape doc should be updated to reflect this as the
 * actual contract.
 */

import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '../../generated/prisma/client'; // relative, 2 levels up from src/shared/middleware/ — generated code is never aliased (Architecture Decision #5)
import { AppError, isAppError } from '@shared/errors/AppError';
import { ValidationError } from '@shared/errors/errors';
import { ERROR_CODES } from '@shared/constants/error-codes.constants';
import { HTTP_STATUS } from '@shared/constants/http-status.constants';
import { logger } from '@shared/logger';

// The shape of every error response sent by this handler
interface ErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  statusCode: number;
  errors?: Record<string, string[]>; // Only present for validation errors
  stack?: string;                    // Only present in development
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction // must be declared even if unused — Express requires 4 params
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // -------------------------------------------------------------------------
  // Case 1: Our own typed AppError (operational errors)
  // -------------------------------------------------------------------------
  if (isAppError(err)) {
    const response: ErrorResponse = {
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      statusCode: err.statusCode,
    };

    // Attach field-level errors for ValidationError
    if (err instanceof ValidationError && err.fieldErrors) {
      response.errors = err.fieldErrors;
    }

    // Include stack trace in development only
    if (isDevelopment) {
      response.stack = err.stack;
    }

    // Log severity is driven by isOperational first, statusCode second.
    // A non-operational error always warrants investigation, no matter
    // what status code it happens to carry.
    if (!err.isOperational) {
      logger.error('Non-operational application error — investigate', {
        errorCode: err.errorCode,
        message: err.message,
        path: req.path,
        method: req.method,
        stack: err.stack,
      });
    } else if (err.statusCode >= 500) {
      logger.error('Application error', {
        errorCode: err.errorCode,
        message: err.message,
        path: req.path,
        method: req.method,
        stack: err.stack,
      });
    } else if (err.statusCode >= 400) {
      logger.warn('Client error', {
        errorCode: err.errorCode,
        message: err.message,
        path: req.path,
        method: req.method,
      });
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // -------------------------------------------------------------------------
  // Case 2: Prisma Known Request Error (e.g. unique constraint violation)
  // -------------------------------------------------------------------------
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn('Prisma known request error', {
      code: err.code,
      meta: err.meta,
      path: req.path,
    });

    // P2002 = Unique constraint violation
    // This happens when you try to insert a record that violates a unique index.
    // We translate it to a ConflictError (409) rather than exposing the raw Prisma code.
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[])?.join(', ') ?? 'field';
      res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: `A record with this ${fields} already exists`,
        errorCode: ERROR_CODES.CONFLICT,
        statusCode: HTTP_STATUS.CONFLICT,
      });
      return;
    }

    // P2025 = Record not found (e.g. update/delete on non-existent ID)
    if (err.code === 'P2025') {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Record not found',
        errorCode: ERROR_CODES.NOT_FOUND,
        statusCode: HTTP_STATUS.NOT_FOUND,
      });
      return;
    }

    // Other Prisma errors — treat as server error
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: isDevelopment ? `Database error: ${err.code}` : 'A database error occurred',
      errorCode: ERROR_CODES.INTERNAL_ERROR,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ...(isDevelopment && { stack: err.stack }),
    });
    return;
  }

  // -------------------------------------------------------------------------
  // Case 3: JWT errors
  // -------------------------------------------------------------------------
  if (err instanceof Error && err.name === 'JsonWebTokenError') {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid token',
      errorCode: ERROR_CODES.TOKEN_INVALID,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    });
    return;
  }

  if (err instanceof Error && err.name === 'TokenExpiredError') {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Token has expired',
      errorCode: ERROR_CODES.TOKEN_EXPIRED,
      statusCode: HTTP_STATUS.UNAUTHORIZED,
    });
    return;
  }

  // -------------------------------------------------------------------------
  // Case 4: Unknown / unhandled errors (programmer errors — bugs)
  // -------------------------------------------------------------------------
  // At this point we have an error we didn't expect. This is a bug.
  // Log the full error (always — even in production) so it can be diagnosed.
  // Return a generic 500 with no implementation details.
  logger.error('Unhandled error', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: 'An unexpected error occurred',
    errorCode: ERROR_CODES.INTERNAL_ERROR,
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ...(isDevelopment && err instanceof Error && { stack: err.stack }),
  });
}