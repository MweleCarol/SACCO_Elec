import { UserRole, UserStatus } from "@prisma/client";

// What the client is allowed to see about a User — deliberately excludes
// passwordHash, totpSecret, lastUsedTimeStep, nationalId, and every other
// field that isn't presentation-relevant. Every auth response shape below
// is built from this, never from a raw Prisma User row.
export interface SafeUserDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  mfaEnabled: boolean;
  membershipNumber: string | null;
}

export interface AuthenticatedSessionDto {
  accessToken: string;
  user: SafeUserDto;
  // Note: the refresh token itself is NEVER in this DTO — it goes out
  // exclusively as an httpOnly cookie, set directly on the Response object
  // in the controller. Putting it here would risk some future call site
  // accidentally logging or otherwise exposing this DTO with the refresh
  // token embedded in it.
}

export interface MfaChallengeDto {
  mfaRequired: true;
  mfaChallengeToken: string;
}

// The /auth/login response is one of these two shapes — the controller
// decides which based on whether the user has MFA enabled.
export type LoginResponseDto = AuthenticatedSessionDto | MfaChallengeDto;

export interface MfaEnrollmentDto {
  totpSecret: string;
  qrCodeDataUrl: string;
  issuer: string;
}

export interface RefreshResponseDto {
  accessToken: string;
}