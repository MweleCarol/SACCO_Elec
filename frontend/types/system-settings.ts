export interface SystemSettings {
  datApprovalsRequired: number; // display/edit only — approvals.ts is still hardcoded to 2 stages
  mfaRequiredForPrivilegedRoles: boolean;
  accessTokenExpiryMinutes: number;
  refreshTokenExpiryDays: number;
  allowEarlyClosureRequests: boolean;
  membershipSyncFrequencyHours: number;
  notifyOnHighRiskEvents: boolean;
}