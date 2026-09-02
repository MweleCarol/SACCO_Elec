import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { ValidationError } from "../errors/ValidationError";

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

// Parses/coerces req.body|query|params against the given Zod schema(s) and
// stores the RESULT on res.locals.validated — controllers read from there,
// never from req.body directly, so there's one place guaranteeing "this
// data has already passed validation" (task spec §15).
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validated: { body?: unknown; query?: unknown; params?: unknown } = {};

    for (const [key, schema] of Object.entries(schemas) as [keyof ValidationSchemas, ZodType][]) {
      const result = schema.safeParse((req as never)[key]);
      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join(".") || key,
          message: issue.message,
        }));
        throw new ValidationError(errors);
      }
      validated[key] = result.data;
    }

    res.locals.validated = validated;
    next();
  };
}