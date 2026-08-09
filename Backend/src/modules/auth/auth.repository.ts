import { prisma } from '@database/client';

// ---------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------

/**
 * Returns null on no match — NEVER throws "not found". The service
 * layer must return the exact same generic response whether the
 * membership number doesn't exist, the email doesn't match, or the
 * account is already ACTIVE. A thrown error here would force the
 * service to distinguish those cases, which is precisely what the
 * anti-enumeration design forbids exposing.
 */
export async function findPendingUserByMembershipAndEmail(
  membershipNumber: string,
  email: string,
): Promise<{ id: string } | null> {
  return prisma.user.findFirst({
    where: {
      email,
      status: 'PENDING_ACTIVATION',
      member: { membershipNumber },
    },
    select: { id: true },
  });
}

export async function createActivationCode(
  userId: string,
  codeHash: string,
  expiresAt: Date,
): Promise<void> {
  await prisma.accountActivation.create({
    data: { userId, codeHash, expiresAt },
  });
}

/**
 * "Most recent" matters: a member might request a code twice (the
 * first email was slow). Only the newest should ever verify
 * successfully — older ones simply age out via their own expiresAt
 * rather than needing an explicit "invalidate previous codes" write
 * every time a new one is issued. Simpler write path, same security
 * property.
 */
export async function findValidActivationCode(
  userId: string,
): Promise<{ id: string; codeHash: string } | null> {
  return prisma.accountActivation.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, codeHash: true },
  });
}

/**
 * Atomic: marks the code used AND activates the user together. The
 * array form of $transaction (not the interactive callback form) is
 * sufficient because neither write depends on reading the other's
 * result — they're two independent updates that must succeed or fail
 * as one unit. There is no reachable state where a code is consumed
 * but the account stays PENDING_ACTIVATION, or vice versa.
 */
export async function consumeActivationCodeAndActivateUser(
  activationId: string,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.accountActivation.update({
      where: { id: activationId },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', passwordHash },
    }),
  ]);
}

// ---------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------

/**
 * Matches email OR membership number, restricted to ACTIVE only.
 * PENDING_ACTIVATION accounts have no real passwordHash to compare
 * against yet; SUSPENDED ones might still have a valid old one and
 * must be rejected regardless of password correctness.
 */
export async function findActiveUserByIdentifier(
  identifier: string,
): Promise<{ id: string; passwordHash: string | null; roleId: string } | null> {
  return prisma.user.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [{ email: identifier }, { member: { membershipNumber: identifier } }],
    },
    select: { id: true, passwordHash: true, roleId: true },
  });
}

/**
 * TOTP lives as columns on User (totpSecret, totpConfirmedAt), not a
 * separate table — see schema.prisma comment on User for why. secret
 * is null until setupTotp() has been called at least once; verified
 * is derived from totpConfirmedAt being non-null, not a separate flag
 * (mfaEnabled mirrors this for fast boolean filtering elsewhere, but
 * this function reads the timestamp directly as the source of truth).
 */
export async function findTotpSecretByUserId(
  userId: string,
): Promise<{ secret: string; verified: boolean } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpConfirmedAt: true },
  });

  if (!user || !user.totpSecret) {
    return null;
  }

  return { secret: user.totpSecret, verified: user.totpConfirmedAt !== null };
}

export async function findPendingUserByMembershipNumber(
  membershipNumber: string,
): Promise<{ id: string } | null> {
  return prisma.user.findFirst({
    where: { status: 'PENDING_ACTIVATION', member: { membershipNumber } },
    select: { id: true },
  });
}

export async function findUserById(
  userId: string,
): Promise<{ email: string; roleId: string } | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, roleId: true },
  });
}

// ---------------------------------------------------------------------
// Refresh token lifecycle — opaque + hashed
// ---------------------------------------------------------------------

export async function createRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

/**
 * "Valid" — not revoked, not expired — is encoded directly in the
 * query, same style as findValidActivationCode above. The service
 * layer never separately checks revokedAt/expiresAt; if this returns
 * null, the token is invalid for some reason, and per the
 * anti-enumeration principle, the caller shouldn't be told which one.
 */
export async function findValidRefreshTokenByHash(
  tokenHash: string,
): Promise<{ id: string; userId: string } | null> {
  return prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, userId: true },
  });
}

export async function revokeRefreshToken(tokenRowId: string): Promise<void> {
  await prisma.refreshToken.update({
    where: { id: tokenRowId },
    data: { revokedAt: new Date() },
  });
}

// ---------------------------------------------------------------------
// TOTP enrollment
// ---------------------------------------------------------------------

/**
 * A user re-running /totp/setup (lost their authenticator app before
 * ever confirming) overwrites the previous unconfirmed secret rather
 * than needing an upsert against a separate table's unique
 * constraint — it's just a User update. totpConfirmedAt and
 * mfaEnabled are force-reset on every call — an existing secret can
 * never be silently "renewed" into confirmed status; it must pass
 * through /totp/confirm again, every time.
 */
export async function upsertTotpSecret(userId: string, secret: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret, totpConfirmedAt: null, mfaEnabled: false },
  });
}

export async function confirmTotpSecret(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { totpConfirmedAt: new Date(), mfaEnabled: true },
  });
}

/**
 * Finds a PENDING_ACTIVATION user by email, excluding users who have
 * a MemberSync relation — email-only lookup is strictly for
 * non-member (staff) accounts. A member who somehow calls the staff
 * endpoint should get the same generic non-response as a completely
 * unknown email, not accidentally activate via the weaker
 * single-factor path.
 */
export async function findPendingStaffUserByEmail(
  email: string,
): Promise<{ id: string; roleId: string } | null> {
  return prisma.user.findFirst({
    where: {
      email,
      status: 'PENDING_ACTIVATION',
      member: null, // excludes any user with a MemberSync row
    },
    select: { id: true, roleId: true },
  });
}