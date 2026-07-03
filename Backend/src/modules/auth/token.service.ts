import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";
import { env } from "@config/env.js";
import { parseDurationMs } from "@shared/duration.js";
import { AuthenticationError } from "@shared/errors.js";
import type { AuthenticatedUser } from "@middleware/authenticate.js";

export function signAccessToken(payload: AuthenticatedUser): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"] });
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface IssuedRefreshToken {
  token: string;      // the opaque value returned to the client
  tokenHash: string;  // what's actually stored in the DB
  expiresAt: Date;
}

export function generateRefreshToken(): IssuedRefreshToken {
  const token = randomBytes(40).toString("hex");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL)),
  };
}

// Pre-auth tokens are issued after a correct password but before a
// successful TOTP check, for accounts where TOTP is enabled. They carry no
// authority of their own — authenticate() will never accept one, since it
// only checks for a `typ: "totp_pending"` claim that a normal access token
// never has, and every downstream route requires a full access token.
const PRE_AUTH_TTL = "5m";
const PRE_AUTH_TYPE = "totp_pending" as const;

interface PreAuthPayload {
  typ: typeof PRE_AUTH_TYPE;
  userId: string;
}

export function signPreAuthToken(userId: string): string {
  const payload: PreAuthPayload = { typ: PRE_AUTH_TYPE, userId };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: PRE_AUTH_TTL });
}

export function verifyPreAuthToken(token: string): { userId: string } {
  let decoded: PreAuthPayload;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as PreAuthPayload;
  } catch {
    throw new AuthenticationError("Invalid or expired TOTP session, please log in again");
  }
  if (decoded.typ !== PRE_AUTH_TYPE) {
    throw new AuthenticationError("Invalid token for this operation");
  }
  return { userId: decoded.userId };
}