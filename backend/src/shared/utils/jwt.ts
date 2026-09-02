import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../../config/env";
import { AuthError } from "../errors/AuthError";

export interface AccessTokenPayload {
  sub: string; // userId
  role: UserRole;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw new AuthError("Invalid or expired access token.");
  }
}

// Short-lived, single-purpose token bridging /auth/login -> /auth/verify-mfa.
// Deliberately signed with a distinct `type` claim (not just reusing the
// access token shape) so a leaked challenge token can never be mistaken
// for, or misused as, a real API access token — it fails
// verifyAccessToken's implicit shape checks, and vice versa.
export function signMfaChallengeToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "mfa_challenge" }, env.JWT_ACCESS_SECRET, { expiresIn: "5m" });
}

export function verifyMfaChallengeToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; type: string };
    if (payload.type !== "mfa_challenge") throw new Error("wrong token type");
    return payload.sub;
  } catch {
    throw new AuthError("Invalid or expired MFA challenge. Please log in again.");
  }
}