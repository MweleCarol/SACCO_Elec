import type { Request, Response, NextFunction } from "express";
import { AppError } from "@shared/errors.js";
import { logger } from "@config/logger.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error(err);
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }
  logger.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
}