/**
 * Auth Module — Internal Types
 *
 * JWT payload shapes and token purpose only — types that token.util.ts
 * and auth.service.ts use internally, never seen directly by a
 * controller or the outside world. External-facing shapes (request/
 * response bodies) live in auth.dto.ts instead.
 */

/**
 * Every JWT this system issues declares what it's FOR. This is what
 * lets authenticate.middleware.ts categorically reject an mfa_pending
 * token on a protected route. A token without a declared purpose is a
 * token any code path might misuse by accident.
 *
 * Only two members — 'access' and 'mfa_pending' — because refresh
 * tokens are deliberately NOT JWTs in this design (see token.util.ts:
 * they're opaque random bytes, hashed, and stored in RefreshToken).
 * A 'refresh' purpose and RefreshTokenPayload type existed in an
 * earlier draft when refresh tokens were still JWTs; removed here
 * since nothing in token.util.ts signs or verifies that shape anymore
 * — keeping it would silently imply a code path that doesn't exist.
 */
export type TokenPurpose = 'access' | 'mfa_pending';

export interface AccessTokenPayload {
  purpose: 'access';
  userId: string;
  roleId: string;
}

export interface MfaPendingTokenPayload {
  purpose: 'mfa_pending';
  userId: string;
}

/** Discriminated union over the `purpose` field. TypeScript will
 * narrow this automatically once you check `.purpose` in a
 * conditional — same pattern as the AppError hierarchy in shared/errors:
 * one shared shape, narrowed by a literal discriminant. */
export type JwtPayload = AccessTokenPayload | MfaPendingTokenPayload;