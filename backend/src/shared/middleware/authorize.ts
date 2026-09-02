import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { ForbiddenError } from "../errors/ForbiddenError";
import { AuthError } from "../errors/AuthError";

// Usage: router.post("/elections", authenticate, authorize("ELECTION_OFFICER"), ...)
// Always mounted AFTER authenticate — relies on req.user already being set.
// Multiple roles allowed where a spec table lists more than one (e.g. some
// audit-log endpoints permit both AUDITOR and ELECTION_ADMINISTRATOR).
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Defensive check — should be unreachable if authenticate always
      // runs first, but never trust middleware ordering silently.
      throw new AuthError("Authentication required.");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError();
    }

    next();
  };
}