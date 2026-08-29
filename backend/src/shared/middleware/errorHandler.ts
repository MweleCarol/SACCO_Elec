import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError";
import { sendError } from "../responses/ApiResponse";
import { logger } from "../../config/logger";

// Handles Postgres/Prisma errors that are really business-rule violations
// in disguise (e.g. a unique constraint) rather than genuine server bugs —
// translates them to the same 4xx shape AppError subclasses produce,
// instead of letting them fall through to the generic 500 branch below.
function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
} {
  switch (err.code) {
    case "P2002": {
      const target = (err.meta?.target as string[] | undefined)?.join(", ");
      return {
        statusCode: 409,
        message: target
          ? `A record with this ${target} already exists.`
          : "A record with these values already exists.",
      };
    }
    case "P2025":
      return { statusCode: 404, message: "Record not found." };
    case "P2003":
      return { statusCode: 409, message: "This action conflicts with related data." };
    default:
      return { statusCode: 500, message: "A database error occurred." };
  }
}

// Express recognizes this as an error-handling middleware specifically
// because it takes 4 arguments — must be mounted last in app.ts, after
// every route and after notFoundHandler.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { path: req.path, method: req.method, stack: err.stack });
    }
    sendError(res, err.message, err.statusCode, err.errors);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const { statusCode, message } = handlePrismaError(err);
    if (statusCode >= 500) {
      logger.error("Unhandled Prisma error", { code: err.code, path: req.path });
    }
    sendError(res, message, statusCode);
    return;
  }

  // Anything else is a genuine bug (or an error type we haven't accounted
  // for) — log it in full for debugging, but never let its message or
  // stack trace reach the client (task spec §24/§25).
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error("Unexpected error", {
    path: req.path,
    method: req.method,
    message: error.message,
    stack: error.stack,
  });
  sendError(res, "An unexpected error occurred. Please try again later.", 500);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Cannot ${req.method} ${req.path}.`, 404);
}