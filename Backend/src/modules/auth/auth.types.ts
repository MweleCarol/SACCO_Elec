import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface';
export type { AuthenticatedUser };

/**
 * Every JWT this system issues declares what it's FOR. This single
 * union is the foundation of the entire two-step login design — it's
 * what lets authenticate.middleware.ts categorically reject an
 * mfa_pending token on a protected route, and what would let you
 * reject a refresh token if someone tried presenting it as an access
 * token instead of using it on /auth/refresh. A token without a
 * declared purpose is a token any code path might misuse by accident.
 */
export type TokenPurpose = 'access' | 'mfa_pending' | 'refresh';

export interface AccessTokenPayload {
  purpose: 'access';
  userId: string;
  roleId: string;
}

export interface RefreshTokenPayload {
  purpose: 'refresh';
  userId: string;
  /** tokenId ties this JWT to its row in the RefreshToken table —
   * this is what makes server-side revocation possible at all. A
   * stateless JWT alone can't be revoked before it expires; this ID
   * is what auth.repository.ts looks up to check "has this been
   * revoked?" on every refresh attempt. */
  tokenId: string;
}

export interface MfaPendingTokenPayload {
  purpose: 'mfa_pending';
  userId: string;
}

/** Discriminated union over the `purpose` field. TypeScript will
 * narrow this automatically once you check `.purpose` in a
 * conditional — this is the same pattern as the AppError hierarchy
 * from M3: one shared shape, narrowed by a literal discriminant.
 * Covers all three token kinds the system issues — access, mfa_pending,
 * and refresh — so any code that needs to handle "any JWT this system
 * issues" generically can do so through this one union. */
export type JwtPayload = AccessTokenPayload | MfaPendingTokenPayload | RefreshTokenPayload;

// ---------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------

export interface ActivationInitiateInput {
  membershipNumber: string;
  email: string;
}

export interface ActivationVerifyInput {
  membershipNumber: string;
  otp: string;
  password: string;
}

// ---------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------

export interface LoginInput {
  identifier: string; // email OR admission number
  password: string;
}

export interface TotpLoginInput {
  mfaToken: string;
  code: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * The discriminated return shape for the login service call. This is
 * the type-level enforcement of the two-step flow we designed: the
 * controller CANNOT accidentally read `.accessToken` off a result
 * that's actually the MFA-required branch — TypeScript won't let it
 * compile. Compare this to returning one loosely-shaped object with
 * optional fields on both branches; that approach would let a typo
 * silently read `undefined` instead of failing to compile.
 *
 * Discriminated union — same pattern as StaffActivationVerifyResult.
 * TOTP_SETUP_REQUIRED means: account is now ACTIVE, password set,
 * but this role mandates TOTP. The access token is real and scoped
 * to let the client immediately call /auth/totp/setup and /auth/totp/confirm.
 * After confirm, the next login will issue a full session normally.
 */
export type LoginResult =
  | { status: 'AUTHENTICATED'; tokens: TokenPair }
  | { status: 'MFA_REQUIRED'; mfaToken: string }
  | { status: 'TOTP_SETUP_REQUIRED'; accessToken: string };

// ---------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------

export interface RefreshInput {
  refreshToken: string;
}

export interface LogoutInput {
  refreshToken: string;
}

// ---------------------------------------------------------------------
// TOTP enrollment
// ---------------------------------------------------------------------

export interface TotpSetupResult {
  /** otpauth:// URI — what gets encoded into the QR code the frontend renders */
  otpAuthUrl: string;
}

export interface TotpConfirmInput {
  code: string;
}

// ---------------------------------------------------------------------
// Staff activation
// ---------------------------------------------------------------------

export interface StaffActivationInitiateInput {
  email: string;
}

export interface StaffActivationVerifyInput {
  email: string;
  otp: string;
  password: string;
}

export type StaffActivationVerifyResult =
  | { status: 'ACTIVATED'; tokens: TokenPair }
  | { status: 'TOTP_SETUP_REQUIRED'; accessToken: string };