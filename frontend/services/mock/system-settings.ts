import type { SystemSettings } from "@/types/system-settings";

export const mockSystemSettings: SystemSettings = {
  datApprovalsRequired: 2,
  mfaRequiredForPrivilegedRoles: true,
  accessTokenExpiryMinutes: 15,
  refreshTokenExpiryDays: 7,
  allowEarlyClosureRequests: true,
  membershipSyncFrequencyHours: 24,
  notifyOnHighRiskEvents: true,
};

export function updateSystemSettings(patch: Partial<SystemSettings>): void {
  Object.assign(mockSystemSettings, patch);
}