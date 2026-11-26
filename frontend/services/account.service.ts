import { api } from "@/services/api/axios";
import type { ApiSuccess, MfaEnrollment, Profile } from "@/types/api";

// The signed-in user's own account: profile, password and two-factor.

export async function getProfile(): Promise<Profile> {
  const res = await api.get<ApiSuccess<Profile>>("/auth/profile");
  return res.data.data;
}

export async function startMfaSetup(): Promise<MfaEnrollment> {
  const res = await api.post<ApiSuccess<MfaEnrollment>>("/auth/mfa/enroll", {});
  return res.data.data;
}

// Returns the backup codes. They are shown once and can never be fetched again.
export async function confirmMfaSetup(totpCode: string): Promise<string[]> {
  const res = await api.post<ApiSuccess<{ backupCodes: string[] }>>(
    "/auth/mfa/confirm",
    { totpCode },
  );
  return res.data.data.backupCodes;
}

export async function regenerateBackupCodes(
  totpCode: string,
): Promise<string[]> {
  const res = await api.post<ApiSuccess<{ backupCodes: string[] }>>(
    "/auth/mfa/backup-codes",
    { totpCode },
  );
  return res.data.data.backupCodes;
}

export async function disableMfa(
  password: string,
  totpCode: string,
): Promise<void> {
  await api.post("/auth/mfa/disable", { password, totpCode });
}

// Ends every session, including this one: the caller signs the user out.
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}) {
  await api.patch("/auth/me/password", input);
}
