import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "./errors.js";

/** Wraps an async route handler so rejected promises reach Express's error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/**
 * Express 5 makes req.body/query/params partly getter-only in some
 * configurations; we always write validated data to res.locals.validated
 * rather than mutating req directly, matching the SEVS convention.
 */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(result.error.issues.map((i) => i.message).join("; "));
    }
    res.locals.validated = result.data;
    next();
  };
}