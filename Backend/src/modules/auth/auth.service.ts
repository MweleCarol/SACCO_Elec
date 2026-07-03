import bcrypt from "bcrypt";
import type { PrismaClient } from "@prisma/client";
import { AuthenticationError, NotFoundError } from "@shared/errors.js";
import { isAdminTierRole } from "@shared/roles.js";
import { enrollTotp as generateTotpEnrollment, verifyTotpCode } from "./totp.service.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  signPreAuthToken,
  verifyPreAuthToken,
} from "./token.service.js";
import type { AuthenticatedUser } from "@middleware/authenticate.js";

async function buildAuthenticatedUserPayload(
  prisma: PrismaClient,
  userId: string,
  role: string
): Promise<AuthenticatedUser> {
  if (role === "TRUSTEE_ADMIN") {
    const trustee = await prisma.trustee.findUnique({ where: { userId } });
    return { userId, role, trusteeId: trustee?.id };
  }
  return { userId, role };
}

async function issueTokenPair(prisma: PrismaClient, userId: string, role: string) {
  const payload = await buildAuthenticatedUserPayload(prisma, userId, role);
  const accessToken = signAccessToken(payload);
  const refresh = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId, tokenHash: refresh.tokenHash, expiresAt: refresh.expiresAt },
  });

  return { accessToken, refreshToken: refresh.token };
}

interface LoginInput {
  email: string;
  password: string;
}

export type LoginResult =
  | { status: "TOTP_REQUIRED"; preAuthToken: string }
  | { status: "AUTHENTICATED"; accessToken: string; refreshToken: string; totpEnrollmentRequired: boolean };

export async function login(prisma: PrismaClient, input: LoginInput): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { totpSecret: true },
  });

  // Deliberately identical error for "no such user" and "wrong password" —
  // do not let this endpoint be used to enumerate registered emails.
  const genericFailure = () => new AuthenticationError("Invalid email or password");

  if (!user || !user.isActive) throw genericFailure();

  const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordOk) throw genericFailure();

  const totpEnabled = user.totpSecret?.enabled ?? false;

  if (totpEnabled) {
    return { status: "TOTP_REQUIRED", preAuthToken: signPreAuthToken(user.id) };
  }

  // Admin-tier roles are allowed to log in once without TOTP only so they
  // can reach the enrollment endpoint; the frontend/route guards should
  // treat totpEnrollmentRequired as "block everything except /auth/totp/*".
  const totpEnrollmentRequired = isAdminTierRole(user.role) && !totpEnabled;

  const tokens = await issueTokenPair(prisma, user.id, user.role);
  return { status: "AUTHENTICATED", ...tokens, totpEnrollmentRequired };
}

interface CompleteTotpLoginInput {
  preAuthToken: string;
  code: string;
}

export async function completeTotpLogin(prisma: PrismaClient, input: CompleteTotpLoginInput) {
  const { userId } = verifyPreAuthToken(input.preAuthToken);

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { totpSecret: true } });
  if (!user || !user.isActive || !user.totpSecret?.enabled) {
    throw new AuthenticationError("TOTP is not enabled for this account");
  }

  const valid = await verifyTotpCode(user.totpSecret.secret, input.code);
  if (!valid) throw new AuthenticationError("Invalid TOTP code");

  return issueTokenPair(prisma, user.id, user.role);
}

export async function refreshTokens(prisma: PrismaClient, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revoked || stored.expiresAt.getTime() < Date.now()) {
    throw new AuthenticationError("Refresh token is invalid or expired");
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || !user.isActive) throw new AuthenticationError("Account is no longer active");

  // Rotate: revoke the presented token and issue a brand new pair. A reused
  // (already-revoked) refresh token is a strong signal of theft; a stricter
  // implementation would revoke the entire token family here.
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

  return issueTokenPair(prisma, user.id, user.role);
}

export async function logout(prisma: PrismaClient, refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revoked: false },
    data: { revoked: true },
  });
}

export async function startTotpEnrollment(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");

  const { secret, otpauthUri } = generateTotpEnrollment(user.email);

  // upsert: re-enrolling before confirming simply replaces the pending secret.
  await prisma.totpSecret.upsert({
    where: { userId },
    create: { userId, secret, enabled: false },
    update: { secret, enabled: false },
  });

  return { otpauthUri };
}

export async function confirmTotpEnrollment(prisma: PrismaClient, userId: string, code: string): Promise<void> {
  const totpSecret = await prisma.totpSecret.findUnique({ where: { userId } });
  if (!totpSecret) throw new AuthenticationError("No pending TOTP enrollment for this account");

  const valid = await verifyTotpCode(totpSecret.secret, code);
  if (!valid) throw new AuthenticationError("Invalid TOTP code");

  await prisma.totpSecret.update({ where: { userId }, data: { enabled: true } });
}