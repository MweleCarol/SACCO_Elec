import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AuthError } from "../errors/AuthError";

// Populates req.user from the Bearer token, or throws AuthError (caught by
// the global error handler) if missing/invalid/expired. Every route past
// this point can trust req.user without re-checking anything about the
// token — see the AuthenticatedUser type in express.d.ts.
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new AuthError("Authentication required. Include a Bearer token.");
  }

  const token = header.slice("Bearer ".length).trim();
  const payload = verifyAccessToken(token);

  req.user = { id: payload.sub, role: payload.role };
  next();
}