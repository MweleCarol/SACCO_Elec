import bcrypt from "bcrypt";
import crypto from "crypto";
import QRCode from "qrcode";
import { authenticator } from "otplib";
import { User } from "@prisma/client";
import { env } from "../../config/env";
import { AuthError } from "../../shared/errors/AuthError";
import { ConflictError } from "../../shared/errors/ConflictError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { parseDurationMs } from "../../shared/utils/duration";
import { signAccessToken, signMfaChallengeToken, verifyMfaChallengeToken } from "../../shared/utils/jwt";
import { writeAuditLog } from "../audit/audit.service";
import * as authRepository from "./auth.repository";
import { RegisterInput, LoginInput, VerifyMfaInput, ChangePasswordInput } from "./auth.schema";
import { SafeUserDto, AuthenticatedSessionDto, MfaChallengeDto, MfaEnrollmentDto } from "./auth.dto";

function toSafeUser(user: User): SafeUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    mfaEnabled: user.mfaEnabled,
    membershipNumber: user.membershipNumber,
  };
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

async function issueSession(
  user: User,
  ip: string | undefined
): Promise<{ session: AuthenticatedSessionDto; rawRefreshToken: string; refreshExpiresAt: Date }> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  const rawRefreshToken = crypto.randomBytes(64).toString("hex");
  const refreshExpiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: refreshExpiresAt,
    createdByIp: ip,
  });

  return { session: { accessToken, user: toSafeUser(user) }, rawRefreshToken, refreshExpiresAt };
}

// One generic message for every credential-related failure branch in
// login() — never reveals whether the email exists or whether it was
// specifically the password that was wrong (standard defense against
// account enumeration).
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

export async function login(
  input: LoginInput,
  ip: string | undefined
): Promise<{ result: AuthenticatedSessionDto | MfaChallengeDto; rawRefreshToken?: string }> {
  const user = await authRepository.findUserByEmail(input.email);

  if (!user) {
    await writeAuditLog({
      actorId: null,
      action: "LOGIN_FAILED",
      outcome: "DENIED",
      metadata: { email: input.email, reason: "no_such_user" },
    });
    throw new AuthError(INVALID_CREDENTIALS_MESSAGE);
  }

  if (user.status === "PENDING_ACTIVATION") {
    throw new ForbiddenError("This account has not been activated yet. Please complete registration first.");
  }
  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    await writeAuditLog({
      actorId: user.id,
      action: "LOGIN_FAILED",
      outcome: "DENIED",
      metadata: { reason: `account_${user.status.toLowerCase()}` },
    });
    throw new ForbiddenError("This account is not active. Contact an administrator.");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    await writeAuditLog({
      actorId: user.id,
      action: "LOGIN_FAILED",
      outcome: "DENIED",
      metadata: { reason: "bad_password" },
    });
    throw new AuthError(INVALID_CREDENTIALS_MESSAGE);
  }

  if (user.mfaEnabled) {
    await writeAuditLog({ actorId: user.id, action: "LOGIN_MFA_CHALLENGE_ISSUED", outcome: "SUCCESS" });
    return { result: { mfaRequired: true, mfaChallengeToken: signMfaChallengeToken(user.id) } };
  }

  const { session, rawRefreshToken } = await issueSession(user, ip);
  await writeAuditLog({ actorId: user.id, action: "LOGIN_SUCCESS", outcome: "SUCCESS" });

  return { result: session, rawRefreshToken };
}

export async function verifyMfa(
  input: VerifyMfaInput,
  ip: string | undefined
): Promise<{ session: AuthenticatedSessionDto; rawRefreshToken: string }> {
  const userId = verifyMfaChallengeToken(input.mfaChallengeToken);
  const user = await authRepository.findUserById(userId);

  if (!user || !user.mfaEnabled || !user.totpSecret) {
    throw new AuthError("MFA is not configured correctly for this account.");
  }

  // checkDelta reports WHICH time-step (relative to now) actually matched
  // within otplib's tolerance window — that precision is what makes
  // per-step replay protection possible below, rather than just knowing
  // "this code was valid at some point recently."
  const delta = authenticator.checkDelta(input.totpCode, user.totpSecret);

  if (delta === null) {
    await writeAuditLog({
      actorId: user.id,
      action: "MFA_VERIFICATION_FAILED",
      outcome: "DENIED",
      metadata: { reason: "invalid_code" },
    });
    throw new AuthError("Invalid authentication code.");
  }

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const acceptedStep = currentStep + delta;

  if (user.lastUsedTimeStep !== null && acceptedStep <= user.lastUsedTimeStep) {
    await writeAuditLog({
      actorId: user.id,
      action: "MFA_VERIFICATION_FAILED",
      outcome: "DENIED",
      metadata: { reason: "replayed_code" },
    });
    throw new AuthError("This code has already been used. Please wait for a new one.");
  }

  await authRepository.updateLastUsedTimeStep(user.id, acceptedStep);

  const { session, rawRefreshToken } = await issueSession(user, ip);
  await writeAuditLog({ actorId: user.id, action: "LOGIN_SUCCESS", outcome: "SUCCESS", metadata: { mfaUsed: true } });

  return { session, rawRefreshToken };
}

// Sync-bound registration (Option 1, per our earlier decision): the
// membership number must already exist as a PENDING_ACTIVATION row from
// membership-sync. This is the one place a client-supplied membership
// number gets validated against a pre-synced record instead of trusted
// outright.
export async function register(input: RegisterInput): Promise<SafeUserDto> {
  const REGISTRATION_FAILURE_MESSAGE =
    "Unable to verify your membership details. Please check your membership number and full name, or contact your SACCO administrator.";

  const pendingUser = await authRepository.findUserByMembershipNumber(input.membershipNumber);

  // Same generic message whether the number doesn't exist, is already
  // claimed, or the name doesn't match — distinguishing between those
  // would let an attacker enumerate valid membership numbers one field at
  // a time.
  if (!pendingUser || pendingUser.status !== "PENDING_ACTIVATION") {
    await writeAuditLog({
      actorId: null,
      action: "REGISTRATION_FAILED",
      outcome: "DENIED",
      metadata: { membershipNumber: input.membershipNumber, reason: "not_pending" },
    });
    throw new ConflictError(REGISTRATION_FAILURE_MESSAGE);
  }

  if (pendingUser.membershipStatus !== "ACTIVE") {
    await writeAuditLog({
      actorId: pendingUser.id,
      action: "REGISTRATION_FAILED",
      outcome: "DENIED",
      metadata: { reason: "membership_not_active" },
    });
    throw new ForbiddenError("This membership is not currently active. Contact your SACCO administrator.");
  }

  // Full-name match acts as a lightweight second factor proving the
  // registrant is the actual member the sync record describes, not just
  // someone who guessed or obtained the membership number alone.
  const nameMatches = pendingUser.fullName.trim().toLowerCase() === input.fullName.trim().toLowerCase();
  if (!nameMatches) {
    await writeAuditLog({
      actorId: pendingUser.id,
      action: "REGISTRATION_FAILED",
      outcome: "DENIED",
      metadata: { reason: "name_mismatch" },
    });
    throw new ConflictError(REGISTRATION_FAILURE_MESSAGE);
  }

  const existingEmailUser = await authRepository.findUserByEmail(input.email);
  if (existingEmailUser && existingEmailUser.id !== pendingUser.id) {
    throw new ValidationError([{ field: "email", message: "This email address is already in use." }]);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const activated = await authRepository.activateUser(pendingUser.id, {
    passwordHash,
    email: input.email,
    fullName: input.fullName,
  });

  await writeAuditLog({ actorId: activated.id, action: "REGISTRATION_COMPLETED", outcome: "SUCCESS" });

  return toSafeUser(activated);
}

export async function refresh(
  rawRefreshToken: string,
  ip: string | undefined
): Promise<{ accessToken: string; newRawRefreshToken: string }> {
  const existing = await authRepository.findRefreshTokenByHash(hashToken(rawRefreshToken));

  if (!existing) {
    throw new AuthError("Invalid session. Please log in again.");
  }

  if (existing.revoked) {
    // A revoked token being presented again means it was already rotated
    // away once — this IS the reuse/theft signal, not merely "not found."
    // Every session for this user gets nuked, not just this one, since a
    // stolen token's legitimate owner has no way to know what else the
    // attacker may have captured.
    await authRepository.revokeAllUserTokens(existing.userId);
    await writeAuditLog({
      actorId: existing.userId,
      action: "REFRESH_TOKEN_REUSE_DETECTED",
      outcome: "DENIED",
      metadata: { ip },
    });
    throw new AuthError("Session invalidated for security reasons. Please log in again.");
  }

  if (existing.expiresAt < new Date()) {
    throw new AuthError("Session expired. Please log in again.");
  }

  const user = await authRepository.findUserById(existing.userId);
  if (!user || user.status !== "ACTIVE") {
    throw new AuthError("Account is not active.");
  }

  const newRawRefreshToken = crypto.randomBytes(64).toString("hex");
  const refreshExpiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));

  await authRepository.rotateRefreshToken(existing.id, {
    userId: user.id,
    tokenHash: hashToken(newRawRefreshToken),
    expiresAt: refreshExpiresAt,
    createdByIp: ip,
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  await writeAuditLog({ actorId: user.id, action: "TOKEN_REFRESHED", outcome: "SUCCESS" });

  return { accessToken, newRawRefreshToken };
}

export async function logout(rawRefreshToken: string | undefined, userId: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;

  const existing = await authRepository.findRefreshTokenByHash(hashToken(rawRefreshToken));
  if (existing && !existing.revoked) {
    await authRepository.revokeRefreshToken(existing.id);
    await writeAuditLog({ actorId: userId ?? existing.userId, action: "LOGOUT", outcome: "SUCCESS" });
  }
}

export async function enrollMfa(userId: string): Promise<MfaEnrollmentDto> {
  const user = await authRepository.findUserById(userId);
  if (!user) throw new AuthError("User not found.");

  const totpSecret = authenticator.generateSecret();
  const otpauthUri = authenticator.keyuri(user.email, env.TOTP_ISSUER, totpSecret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

  // Secret is stored now, but mfaEnabled stays false until confirmMfaEnrollment
  // proves the user can actually generate a valid code with it — otherwise
  // an interrupted enrollment could lock an account into "MFA required" with
  // no working authenticator app.
  await authRepository.enrollMfa(userId, totpSecret);

  return { totpSecret, qrCodeDataUrl, issuer: env.TOTP_ISSUER };
}

export async function confirmMfaEnrollment(userId: string, totpCode: string): Promise<void> {
  const user = await authRepository.findUserById(userId);
  if (!user || !user.totpSecret) {
    throw new ValidationError([{ message: "No MFA enrollment in progress for this account." }]);
  }

  const isValid = authenticator.check(totpCode, user.totpSecret);
  if (!isValid) {
    throw new ValidationError([{ field: "totpCode", message: "Invalid authentication code." }]);
  }

  await authRepository.confirmMfa(userId);
  await writeAuditLog({ actorId: userId, action: "MFA_ENABLED", outcome: "SUCCESS" });
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await authRepository.findUserById(userId);
  if (!user) throw new AuthError("User not found.");

  const currentMatches = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!currentMatches) {
    throw new ValidationError([{ field: "currentPassword", message: "Current password is incorrect." }]);
  }

  const newHash = await bcrypt.hash(input.newPassword, 12);
  await authRepository.updatePassword(userId, newHash);

  // Forces re-login on every other device too — a changed password should
  // invalidate sessions an attacker (or the user, on a lost device)
  // already holds, not just block new logins with the old password.
  await authRepository.revokeAllUserTokens(userId);

  await writeAuditLog({ actorId: userId, action: "PASSWORD_CHANGED", outcome: "SUCCESS" });
}