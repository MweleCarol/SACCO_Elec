import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@config/env.js";
import { AuthenticationError } from "@shared/errors.js";

export interface AuthenticatedUser {
  userId: string;
  role: string;
  trusteeId?: string;
}

// Express 5 makes req.params/req.query getter-only, but req.user is a plain
// property we add ourselves, so this augmentation is safe to assign to.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing bearer token");
  }
  const token = header.slice("Bearer ".length);
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch {
    throw new AuthenticationError("Invalid or expired token");
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AuthenticationError("Insufficient role for this action");
    }
    next();
  };
}