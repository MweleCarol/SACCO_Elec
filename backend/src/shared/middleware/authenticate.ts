import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AuthError } from "../errors/AuthError";
import { ForbiddenError } from "../errors/ForbiddenError";
import { mfaSetupRequired } from "../utils/mfaPolicy";
import { findUserById } from "../../modules/auth/auth.repository";

// What a staff account without two-factor may still reach: everything under
// /auth (setup, profile, password, logout) and reading its own user record.
function mayUseBeforeMfaSetup(req: Request): boolean {
  const path = req.originalUrl.split("?")[0] ?? "";
  return path.startsWith("/api/v1/auth/") || (req.method === "GET" && path === "/api/v1/users/me");
}

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

  // Staff must set up two-factor before using anything but their own account.
  // Checked here, on every request, so no staff route can forget it.
  if (mfaSetupRequired(user) && !mayUseBeforeMfaSetup(req)) {
    throw new ForbiddenError("Set up two-factor sign-in before using staff features.");
  }

  req.user = { id: user.id, role: user.role };
  next();
}