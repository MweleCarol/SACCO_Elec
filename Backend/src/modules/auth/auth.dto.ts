/**
 * Auth Module — Data Transfer Objects
 *
 * External-facing shapes only: request bodies, response payloads, and
 * anything a controller or route touches directly. Internal-only types
 * (JWT payload shapes, token purpose) live in auth.types.ts instead —
 * see that file's header for the split rationale.
 */
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface';
export type { AuthenticatedUser };

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
  identifier: string; // email OR membership number
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
 * the type-level enforcement of the two-step flow: the controller
 * CANNOT accidentally read `.accessToken` off a result that's
 * actually the MFA-required branch — TypeScript won't let it compile.
 * Compare this to returning one loosely-shaped object with optional
 * fields on both branches; that approach would let a typo silently
 * read `undefined` instead of failing to compile.
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

/**
 * Discriminated union — same pattern as LoginResult.
 * TOTP_SETUP_REQUIRED means: account is now ACTIVE, password set,
 * but this role mandates TOTP. The access token is real and scoped
 * to let the client immediately call /auth/totp/setup and /auth/totp/confirm.
 * After confirm, the next login will issue a full session normally.
 */
export type StaffActivationVerifyResult =
  | { status: 'ACTIVATED'; tokens: TokenPair }
  | { status: 'TOTP_SETUP_REQUIRED'; accessToken: string };