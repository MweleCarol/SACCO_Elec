import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AuthError } from "../errors/AuthError";
import { findUserById } from "../../modules/auth/auth.repository";

// Verifies the token, then loads the account. A suspended, deactivated or
// deleted user, or a changed role, takes effect on the next request rather than
// when the token expires. The role is read from the database, not the token.
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new AuthError("Authentication required. Include a Bearer token.");
  }

  const token = header.slice("Bearer ".length).trim();
  const payload = verifyAccessToken(token);

  const user = await findUserById(payload.sub);
  if (!user || user.status !== "ACTIVE") {
    throw new AuthError("Account is not active.");
  }

  req.user = { id: user.id, role: user.role };
  next();
}