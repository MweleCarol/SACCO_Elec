import jwt from "jsonwebtoken";
import { UserRole } from "@prisma/client";
import { env } from "../../config/env";
import { AuthError } from "../errors/AuthError";

export interface AccessTokenPayload {
  sub: string; // userId
  role: UserRole;
}

// Both token kinds are signed with JWT_ACCESS_SECRET, so the signature alone
// cannot tell them apart. Every token therefore carries an explicit `type`
// claim, and each verifier accepts only its own type. Without this, the MFA
// challenge token issued after the password step worked as a full access
// token, which skipped MFA entirely.
const ACCESS_TOKEN_TYPE = "access";
const MFA_CHALLENGE_TOKEN_TYPE = "mfa_challenge";

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(
    { sub: payload.sub, role: payload.role, type: ACCESS_TOKEN_TYPE },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  let payload: jwt.JwtPayload | string;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new AuthError("Invalid or expired access token.");
  }

  if (typeof payload === "string" || payload.type !== ACCESS_TOKEN_TYPE || typeof payload.sub !== "string") {
    throw new AuthError("Invalid or expired access token.");
  }

  return { sub: payload.sub, role: payload.role as UserRole };
}

// Short-lived, single-purpose token bridging /auth/login -> /auth/verify-mfa.
// It is rejected by verifyAccessToken (wrong `type`), and an access token is
// rejected here, so neither can stand in for the other.
export function signMfaChallengeToken(userId: string): string {
  return jwt.sign({ sub: userId, type: MFA_CHALLENGE_TOKEN_TYPE }, env.JWT_ACCESS_SECRET, { expiresIn: "5m" });
}

export function verifyMfaChallengeToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
    if (typeof payload === "string" || payload.type !== MFA_CHALLENGE_TOKEN_TYPE || typeof payload.sub !== "string") {
      throw new Error("wrong token type");
    }
    return payload.sub;
  } catch {
    throw new AuthError("Invalid or expired MFA challenge. Please log in again.");
  }
}