import { prisma } from "../../config/prisma";
import { User, RefreshToken } from "@prisma/client";

// --- User queries ---

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

// Used by registration (Option 1 / sync-bound flow): finds the
// PENDING_ACTIVATION row that membership-sync already created.
export function findUserByMembershipNumber(membershipNumber: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { membershipNumber } });
}

// Called at the end of registration: sets the real password hash and
// flips PENDING_ACTIVATION -> ACTIVE in one write.
export function activateUser(
  userId: string,
  data: { passwordHash: string; email: string; fullName: string }
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: data.passwordHash,
      email: data.email,
      fullName: data.fullName,
      status: "ACTIVE",
    },
  });
}

export function updatePassword(userId: string, passwordHash: string): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

// enrollMfa stores the secret but does NOT set mfaEnabled — that only
// happens in confirmMfa, after the user proves they can actually generate
// a valid code with it. Storing lastUsedTimeStep reset to null so a stale
// value from a previous enrollment attempt can't block the first real code.
export function enrollMfa(userId: string, totpSecret: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { totpSecret, lastUsedTimeStep: null },
  });
}

export function confirmMfa(userId: string): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
}

// Persists which 30-second TOTP time-step was last accepted for this user
// — the replay-protection check in auth.service.ts rejects a code reused
// within the same step, even though otp libraries alone don't prevent that.
export function updateLastUsedTimeStep(userId: string, step: number): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { lastUsedTimeStep: step } });
}

// --- Refresh token queries ---

export function createRefreshToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdByIp?: string;
}): Promise<RefreshToken> {
  return prisma.refreshToken.create({ data });
}

export function findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

// Rotation as one transaction: the old token is marked revoked AND
// pointed at the new one, and the new token is created, atomically. If
// either half failed independently, a token could end up looking valid
// on one side and not the other — exactly the kind of inconsistency
// transactions exist to prevent (task spec §16/§23).
export async function rotateRefreshToken(
  oldTokenId: string,
  newTokenData: { userId: string; tokenHash: string; expiresAt: Date; createdByIp?: string }
): Promise<RefreshToken> {
  return prisma.$transaction(async (tx) => {
    const newToken = await tx.refreshToken.create({ data: newTokenData });

    await tx.refreshToken.update({
      where: { id: oldTokenId },
      data: { revoked: true, revokedAt: new Date(), replacedById: newToken.id },
    });

    return newToken;
  });
}

export function revokeRefreshToken(id: string): Promise<RefreshToken> {
  return prisma.refreshToken.update({
    where: { id },
    data: { revoked: true, revokedAt: new Date() },
  });
}

// Called on detected token reuse (theft indicator): nukes every active
// session for the user, not just the one that got replayed, since a
// stolen token's owner has no way to know which other sessions the
// attacker may have also captured.
export function revokeAllUserTokens(userId: string): Promise<{ count: number }> {
  return prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true, revokedAt: new Date() },
  });
}