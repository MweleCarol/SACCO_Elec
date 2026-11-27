import bcrypt from "bcrypt";
import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { User } from "@prisma/client";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";
import { AuthError } from "../../shared/errors/AuthError";
import { ConflictError } from "../../shared/errors/ConflictError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { parseDurationMs } from "../../shared/utils/duration";
import { encryptPayload, decryptPayload } from "../../shared/utils/crypto";
import {
  signAccessToken,
  signMfaChallengeToken,
  verifyMfaChallengeToken,
} from "../../shared/utils/jwt";
import {
  writeAuditLog,
  countRecentFailedAuthAttempts,
} from "../audit/audit.service";
import * as authRepository from "./auth.repository";
import { devSkipMfa, isStaffRole, mfaSetupRequired } from "../../shared/utils/mfaPolicy";
import {
  RegisterInput,
  LoginInput,
  VerifyMfaInput,
  ChangePasswordInput,
  DisableMfaInput,
} from "./auth.schema";
import {
  SafeUserDto,
  AuthenticatedSessionDto,
  MfaChallengeDto,
  MfaEnrollmentDto,
  BackupCodesDto,
  ProfileDto,
} from "./auth.dto";



// ---------- Backup codes ----------
// 8 codes of 8 characters, shown as "ABCD-EFGH". The alphabet leaves out
// 0/O and 1/I so codes can be read aloud or copied by hand without mistakes.
const BACKUP_CODE_COUNT = 8;
const BACKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newBackupCode(): string {
  const bytes = crypto.randomBytes(8);
  const chars = Array.from(
    bytes,
    (b) => BACKUP_ALPHABET[b % BACKUP_ALPHABET.length],
  ).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

// Users may type lower case, spaces or no dash.
function normalizeBackupCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Keyed hash: a copy of the database alone is not enough to test guesses.
function hashBackupCode(code: string): string {
  return crypto
    .createHmac("sha256", env.ENCRYPTION_KEY)
    .update(normalizeBackupCode(code))
    .digest("hex");
}

async function issueBackupCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, newBackupCode);
  await authRepository.replaceBackupCodes(userId, codes.map(hashBackupCode));
  return codes;
}

// Account lockout: this many failed password or MFA attempts inside the window
// blocks the account until the window clears. Tune here.
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

function toSafeUser(user: User): SafeUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    mfaEnabled: user.mfaEnabled,
    membershipNumber: user.membershipNumber,
    mfaSetupRequired: mfaSetupRequired(user),
  };
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// New TOTP secrets are stored encrypted as iv:tag:ciphertext. Secrets saved
// before that are plain base32 with no colon: still accepted, and re-encrypted
// the first time they are used.
function isEncryptedSecret(stored: string): boolean {
  return stored.includes(":");
}

function readTotpSecret(stored: string): string {
  return isEncryptedSecret(stored) ? decryptPayload(stored) : stored;
}

async function upgradeLegacySecret(user: User): Promise<void> {
  if (user.totpSecret && !isEncryptedSecret(user.totpSecret)) {
    await authRepository.updateTotpSecret(
      user.id,
      encryptPayload(user.totpSecret),
    );
  }
}

// Blocked attempts are logged as LOGIN_BLOCKED, which the failure count ignores,
// so an attacker who keeps trying cannot extend the lock for the real owner.
async function assertNotLockedOut(userId: string): Promise<void> {
  const failures = await countRecentFailedAuthAttempts(
    userId,
    new Date(Date.now() - LOCKOUT_WINDOW_MS),
  );
  if (failures >= LOCKOUT_THRESHOLD) {
    await writeAuditLog({
      actorId: userId,
      action: "LOGIN_BLOCKED",
      outcome: "DENIED",
      metadata: { reason: "too_many_failures" },
    });
    throw new AppError(
      "Too many failed attempts. Please try again later.",
      429,
    );
  }
}

async function issueSession(
  user: User,
  ip: string | undefined,
): Promise<{
  session: AuthenticatedSessionDto;
  rawRefreshToken: string;
  refreshExpiresAt: Date;
}> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  const rawRefreshToken = crypto.randomBytes(64).toString("hex");
  const refreshExpiresAt = new Date(
    Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
  );

  await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: refreshExpiresAt,
    createdByIp: ip,
  });

  return {
    session: { accessToken, user: toSafeUser(user) },
    rawRefreshToken,
    refreshExpiresAt,
  };
}

// One generic message for every credential failure in login(): it never reveals
// whether the email exists or which part was wrong.
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

export async function login(
  input: LoginInput,
  ip: string | undefined,
): Promise<{
  result: AuthenticatedSessionDto | MfaChallengeDto;
  rawRefreshToken?: string;
}> {
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
    throw new ForbiddenError(
      "This account has not been activated yet. Please complete registration first.",
    );
  }
  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    await writeAuditLog({
      actorId: user.id,
      action: "LOGIN_FAILED",
      outcome: "DENIED",
      metadata: { reason: `account_${user.status.toLowerCase()}` },
    });
    throw new ForbiddenError(
      "This account is not active. Contact an administrator.",
    );
  }

  await assertNotLockedOut(user.id);

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );
  if (!passwordMatches) {
    await writeAuditLog({
      actorId: user.id,
      action: "LOGIN_FAILED",
      outcome: "DENIED",
      metadata: { reason: "bad_password" },
    });
    throw new AuthError(INVALID_CREDENTIALS_MESSAGE);
  }

   if (user.mfaEnabled && !devSkipMfa) {
    await writeAuditLog({ actorId: user.id, action: "LOGIN_MFA_CHALLENGE_ISSUED", outcome: "SUCCESS" });
    return {
      result: {
        mfaRequired: true,
        mfaChallengeToken: signMfaChallengeToken(user.id),
      },
    };
  }

  const { session, rawRefreshToken } = await issueSession(user, ip);
  await writeAuditLog({
    actorId: user.id, action: "LOGIN_SUCCESS", outcome: "SUCCESS",
    // Recorded so a development shortcut can never pass unnoticed in the audit trail.
    ...(user.mfaEnabled && devSkipMfa ? { metadata: { mfaSkipped: "DEV_SKIP_MFA" } } : {}),
  });

    return { result: session, rawRefreshToken };
}

export async function verifyMfa(
  input: VerifyMfaInput,
  ip: string | undefined,
): Promise<{ session: AuthenticatedSessionDto; rawRefreshToken: string }> {
  const userId = verifyMfaChallengeToken(input.mfaChallengeToken);
  const user = await authRepository.findUserById(userId);

  if (!user || !user.mfaEnabled || !user.totpSecret) {
    throw new AuthError("MFA is not configured correctly for this account.");
  }
  // The account may have been suspended between the password step and this one.
  if (user.status !== "ACTIVE") {
    throw new AuthError("Account is not active.");
  }

  await assertNotLockedOut(user.id);

  // Lost phone: a one-time backup code instead of the app code.
  if (input.backupCode) {
    const spent = await authRepository.spendBackupCode(
      user.id,
      hashBackupCode(input.backupCode),
    );
    if (!spent) {
      await writeAuditLog({
        actorId: user.id,
        action: "MFA_VERIFICATION_FAILED",
        outcome: "DENIED",
        metadata: { reason: "invalid_backup_code" },
      });
      throw new AuthError(
        "That backup code is not valid or has already been used.",
      );
    }
    const remaining = await authRepository.countUnusedBackupCodes(user.id);
    await writeAuditLog({
      actorId: user.id,
      action: "MFA_BACKUP_CODE_USED",
      outcome: "SUCCESS",
      metadata: { remaining },
    });
    const { session, rawRefreshToken } = await issueSession(user, ip);
    await writeAuditLog({
      actorId: user.id,
      action: "LOGIN_SUCCESS",
      outcome: "SUCCESS",
      metadata: { mfaUsed: true, backupCode: true },
    });
    return { session, rawRefreshToken };
  }

  // checkDelta reports WHICH time-step matched, which is what makes per-step
  // replay protection possible below.
  const delta = authenticator.checkDelta(
    input.totpCode!,
    readTotpSecret(user.totpSecret),
  );

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
    throw new AuthError(
      "This code has already been used. Please wait for a new one.",
    );
  }

  await authRepository.updateLastUsedTimeStep(user.id, acceptedStep);
  await upgradeLegacySecret(user);

  const { session, rawRefreshToken } = await issueSession(user, ip);
  await writeAuditLog({
    actorId: user.id,
    action: "LOGIN_SUCCESS",
    outcome: "SUCCESS",
    metadata: { mfaUsed: true },
  });

  return { session, rawRefreshToken };
}

// Sync-bound registration: the membership number must already exist as a
// PENDING_ACTIVATION row created by membership sync. A client-supplied
// membership number is validated against that record, never trusted outright.
export async function register(input: RegisterInput): Promise<SafeUserDto> {
  const REGISTRATION_FAILURE_MESSAGE =
    "Unable to verify your membership details. Please check your membership number and full name, or contact your SACCO administrator.";

  const pendingUser = await authRepository.findUserByMembershipNumber(
    input.membershipNumber,
  );

  // Same generic message whether the number doesn't exist, is already claimed,
  // or the name doesn't match, so valid numbers can't be enumerated.
  if (!pendingUser || pendingUser.status !== "PENDING_ACTIVATION") {
    await writeAuditLog({
      actorId: null,
      action: "REGISTRATION_FAILED",
      outcome: "DENIED",
      metadata: {
        membershipNumber: input.membershipNumber,
        reason: "not_pending",
      },
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
    throw new ForbiddenError(
      "This membership is not currently active. Contact your SACCO administrator.",
    );
  }

  // The full-name match is a lightweight second factor proving the registrant is
  // the member the sync record describes, not just someone holding the number.
  const nameMatches =
    pendingUser.fullName.trim().toLowerCase() ===
    input.fullName.trim().toLowerCase();
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
    throw new ValidationError([
      { field: "email", message: "This email address is already in use." },
    ]);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const activated = await authRepository.activateUser(pendingUser.id, {
    passwordHash,
    email: input.email,
    fullName: input.fullName,
  });

  await writeAuditLog({
    actorId: activated.id,
    action: "REGISTRATION_COMPLETED",
    outcome: "SUCCESS",
  });

  return toSafeUser(activated);
}

export async function refresh(
  rawRefreshToken: string,
  ip: string | undefined,
): Promise<{ accessToken: string; newRawRefreshToken: string }> {
  const existing = await authRepository.findRefreshTokenByHash(
    hashToken(rawRefreshToken),
  );

  if (!existing) {
    throw new AuthError("Invalid session. Please log in again.");
  }

  if (existing.revoked) {
    // A revoked token presented again was already rotated away once: this IS the
    // reuse/theft signal. Every session for this user is revoked, since the
    // owner cannot know what else an attacker captured.
    await authRepository.revokeAllUserTokens(existing.userId);
    await writeAuditLog({
      actorId: existing.userId,
      action: "REFRESH_TOKEN_REUSE_DETECTED",
      outcome: "DENIED",
      metadata: { ip },
    });
    throw new AuthError(
      "Session invalidated for security reasons. Please log in again.",
    );
  }

  if (existing.expiresAt < new Date()) {
    throw new AuthError("Session expired. Please log in again.");
  }

  const user = await authRepository.findUserById(existing.userId);
  if (!user || user.status !== "ACTIVE") {
    throw new AuthError("Account is not active.");
  }

  const newRawRefreshToken = crypto.randomBytes(64).toString("hex");
  const refreshExpiresAt = new Date(
    Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
  );

  await authRepository.rotateRefreshToken(existing.id, {
    userId: user.id,
    tokenHash: hashToken(newRawRefreshToken),
    expiresAt: refreshExpiresAt,
    createdByIp: ip,
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  await writeAuditLog({
    actorId: user.id,
    action: "TOKEN_REFRESHED",
    outcome: "SUCCESS",
  });

  return { accessToken, newRawRefreshToken };
}

export async function logout(
  rawRefreshToken: string | undefined,
  userId: string | undefined,
): Promise<void> {
  if (!rawRefreshToken) return;

  const existing = await authRepository.findRefreshTokenByHash(
    hashToken(rawRefreshToken),
  );
  if (existing && !existing.revoked) {
    await authRepository.revokeRefreshToken(existing.id);
    await writeAuditLog({
      actorId: userId ?? existing.userId,
      action: "LOGOUT",
      outcome: "SUCCESS",
    });
  }
}

export async function enrollMfa(userId: string): Promise<MfaEnrollmentDto> {
  const user = await authRepository.findUserById(userId);
  if (!user) throw new AuthError("User not found.");

  // Without this, anyone holding a stolen access token could replace the
  // authenticator secret on an account that already has MFA and lock the owner out.
  if (user.mfaEnabled) {
    await writeAuditLog({
      actorId: userId,
      action: "MFA_ENROLL_REFUSED",
      outcome: "DENIED",
      metadata: { reason: "already_enabled" },
    });
    throw new ConflictError("MFA is already enabled on this account.");
  }

  const totpSecret = authenticator.generateSecret();
  const otpauthUri = authenticator.keyuri(
    user.email,
    env.TOTP_ISSUER,
    totpSecret,
  );
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

  // The secret is stored encrypted and mfaEnabled stays false until
  // confirmMfaEnrollment proves the user can produce a valid code with it.
  await authRepository.enrollMfa(userId, encryptPayload(totpSecret));

  return { totpSecret, qrCodeDataUrl, issuer: env.TOTP_ISSUER };
}

export async function confirmMfaEnrollment(
  userId: string,
  totpCode: string,
): Promise<BackupCodesDto> {
  const user = await authRepository.findUserById(userId);
  if (!user || !user.totpSecret) {
    throw new ValidationError([
      { message: "No MFA enrollment in progress for this account." },
    ]);
  }

  const isValid = authenticator.check(
    totpCode,
    readTotpSecret(user.totpSecret),
  );
  if (!isValid) {
    throw new ValidationError([
      { field: "totpCode", message: "Invalid authentication code." },
    ]);
  }

  // Codes first: if saving them fails, two-factor stays off instead of being
  // left on with no backup codes.
  const backupCodes = await issueBackupCodes(userId);
  await authRepository.confirmMfa(userId);
  await writeAuditLog({
    actorId: userId,
    action: "MFA_ENABLED",
    outcome: "SUCCESS",
  });
  return { backupCodes };
}

// Throws unless the code is right for this user's authenticator.
async function assertCurrentTotp(
  userId: string,
  totpCode: string,
  purpose: string,
): Promise<void> {
  const user = await authRepository.findUserById(userId);
  if (!user || !user.mfaEnabled || !user.totpSecret) {
    throw new ConflictError(
      "Two-factor sign-in is not turned on for this account.",
    );
  }
  if (!authenticator.check(totpCode, readTotpSecret(user.totpSecret))) {
    await writeAuditLog({
      actorId: userId,
      action: "MFA_VERIFICATION_FAILED",
      outcome: "DENIED",
      metadata: { reason: "invalid_code", purpose },
    });
    throw new ValidationError([
      {
        field: "totpCode",
        message: "That code is not right. Check the app and try again.",
      },
    ]);
  }
}

// New set of backup codes; the old ones stop working.
export async function regenerateBackupCodes(
  userId: string,
  totpCode: string,
): Promise<BackupCodesDto> {
  await assertNotLockedOut(userId);
  await assertCurrentTotp(userId, totpCode, "regenerate_backup_codes");
  const backupCodes = await issueBackupCodes(userId);
  await writeAuditLog({
    actorId: userId,
    action: "MFA_BACKUP_CODES_REGENERATED",
    outcome: "SUCCESS",
  });
  return { backupCodes };
}

// Members may turn two-factor off again; staff may not.
export async function disableMfa(
  userId: string,
  input: DisableMfaInput,
): Promise<void> {
  const user = await authRepository.findUserById(userId);
  if (!user) throw new AuthError("User not found.");
  if (isStaffRole(user.role)) {
    throw new ForbiddenError(
      "Two-factor sign-in is required for your role and cannot be turned off.",
    );
  }
  await assertNotLockedOut(userId);
  if (!(await bcrypt.compare(input.password, user.passwordHash))) {
    await writeAuditLog({
      actorId: userId,
      action: "MFA_DISABLE_FAILED",
      outcome: "DENIED",
      metadata: { reason: "bad_password" },
    });
    throw new ValidationError([
      { field: "password", message: "That password is not right." },
    ]);
  }
  await assertCurrentTotp(userId, input.totpCode, "disable_mfa");
  await authRepository.disableMfa(userId);
  await writeAuditLog({
    actorId: userId,
    action: "MFA_DISABLED",
    outcome: "SUCCESS",
  });
}

export async function getProfile(userId: string): Promise<ProfileDto> {
  const user = await authRepository.findUserById(userId);
  if (!user) throw new AuthError("User not found.");
  return {
    ...toSafeUser(user),
    phoneNumber: user.phoneNumber,
    branch: user.branch,
    membershipStatus: user.membershipStatus,
    memberSince: user.createdAt,
    backupCodesRemaining: user.mfaEnabled
      ? await authRepository.countUnusedBackupCodes(userId)
      : null,
     mfaRequired: isStaffRole(user.role),
  };
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await authRepository.findUserById(userId);
  if (!user) throw new AuthError("User not found.");

  const currentMatches = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash,
  );
  if (!currentMatches) {
    throw new ValidationError([
      { field: "currentPassword", message: "Current password is incorrect." },
    ]);
  }

  const newHash = await bcrypt.hash(input.newPassword, 12);
  await authRepository.updatePassword(userId, newHash);

  // Ends every session, so a stolen session cannot outlive the password change.
  await authRepository.revokeAllUserTokens(userId);

  await writeAuditLog({
    actorId: userId,
    action: "PASSWORD_CHANGED",
    outcome: "SUCCESS",
  });
}
