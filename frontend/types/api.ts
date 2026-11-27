// Types for data coming from the SEVS backend API.
// They mirror API_CONTRACT.md (sections 3 and 4) exactly: same field names,
// same enum values. When the backend changes, update this file in the same
// commit as API_CONTRACT.md.
//
// The older files in types/ (election.ts, candidate.ts, ...) describe the mock
// data and are being replaced page by page as each portal is connected.

// ---------- Response envelope ----------

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: ApiFieldError[]; // only on 422 validation failures
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// ---------- Enums ----------

export type UserRole = "MEMBER" | "ELECTION_OFFICER" | "ELECTION_ADMINISTRATOR" | "AUDITOR";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED" | "PENDING_ACTIVATION";
export type MembershipStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "EXITED";

export type ElectionStatus =
  | "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SCHEDULED"
  | "ACTIVE" | "CLOSED" | "RESULTS_PUBLISHED" | "ARCHIVED";

export type CandidateStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export type ApprovalActionType =
  | "ELECTION_ACTIVATION" | "ELECTION_CANCELLATION" | "ELECTION_RESCHEDULE" | "RESULT_PUBLICATION";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "EXECUTED";

export type ResultStatus = "DRAFT" | "PUBLISHED";

export type NotificationType =
  | "ELECTION_ACTIVATED" | "ELECTION_CLOSED" | "RESULTS_PUBLISHED" | "APPROVAL_DECIDED"
  | "ELECTION_SCHEDULED" | "ELECTION_CLOSING_SOON" | "APPROVAL_REQUESTED"
  | "CANDIDATE_STATUS_CHANGED" | "SYSTEM_ALERT";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

// ---------- Auth ----------

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  mfaEnabled: boolean;
  membershipNumber: string | null;
  // Staff without two-factor: only the setup screen is available until done.
  mfaSetupRequired?: boolean;
}

export interface LoginSuccess {
  accessToken: string;
  user: User;
}

export interface MfaChallenge {
  mfaRequired: true;
  mfaChallengeToken: string;
}

export type LoginResponse = LoginSuccess | MfaChallenge;

export function isMfaChallenge(r: LoginResponse): r is MfaChallenge {
  return "mfaRequired" in r && r.mfaRequired === true;
}

export interface MfaEnrollment {
  totpSecret: string;
  qrCodeDataUrl: string; // use as <img src>
  issuer: string;
}

// ---------- Elections ----------

export interface Election {
  id: string;
  name: string;
  description: string | null;
  startDate: string; // ISO, UTC
  endDate: string;
  status: ElectionStatus;
  requiredApprovals: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  activatedAt: string | null;
  closedAt: string | null;
  resultsPublishedAt: string | null;
  archivedAt: string | null;
}

export interface Position {
  id: string;
  electionId: string;
  name: string;
  description: string | null;
  seats: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  electionId: string;
  positionId: string;
  memberId?: string | null; // staff only; members never receive it
  displayName: string;
  manifesto: string | null;
  photoUrl: string | null;
  status: CandidateStatus;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Voting ----------

export interface BallotCandidate {
  id: string;
  displayName: string;
  manifesto: string | null;
  photoUrl: string | null;
}

export interface BallotPosition {
  id: string;
  name: string;
  description: string | null;
  seats: number;
  candidates: BallotCandidate[];
}

export interface Ballot {
  electionId: string;
  electionName: string;
  positions: BallotPosition[];
}

export interface BallotSelection {
  positionId: string;
  candidateId: string;
}

export interface Participation {
  hasVoted: boolean;
  votedAt: string | null;
}

// ---------- Approvals (DAT) ----------

export type ApprovalPayload =
  | { reason: string } // cancellation
  | { startDate: string; endDate: string } // reschedule
  | null;

export interface ApprovalRequest {
  id: string;
  actionType: ApprovalActionType;
  resourceType: "Election";
  resourceId: string;
  electionId: string | null;
  requestedById: string;
  requiredApprovals: number;
  status: ApprovalStatus;
  approveCount: number;
  rejectCount: number;
  payload: ApprovalPayload;
  expiresAt: string;
  createdAt: string;
  decidedAt: string | null;
  executedAt: string | null;
}

// ---------- Results ----------

export interface Result {
  id: string;
  positionId: string;
  positionName: string;
  candidateId: string;
  candidateName: string;
  voteCount: number;
  isWinner: boolean;
  status: ResultStatus;
  publishedAt: string | null;
}

// ---------- Notifications ----------

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  readAt: string | null;
  electionId: string | null;
  createdAt: string;
}

// ---------- Audit ----------

export interface AuditLogEntry {
  id: string;
  actorId: string | null; // null = system action (e.g. automatic close)
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  electionId: string | null;
  outcome: "SUCCESS" | "FAILURE";
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ChainVerification {
  recordsChecked: number;
  intact: boolean;
  breaks: { auditLogId: string; reason: "HASH_MISMATCH" | "LINK_MISMATCH"; createdAt: string }[];
}

// ---------- AI governance ----------

export interface AIInsight {
  id: string;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  riskLevel: RiskLevel;
  recommendation: string;
  reasoning: string;
  evidence: Record<string, unknown> | null;
  confidence: number;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface ElectionReport {
  electionId: string;
  name: string;
  status: ElectionStatus;
  positionCount: number;
  candidateCount: number;
  participationCount: number; // live turnout (staff only)
  openInsightCount: number;
}

export interface CopilotAnswer {
  answer: string;
  disclaimer: string;
}

// ---------- Paginated lists (the collection key differs per endpoint) ----------

export interface UserList { users: User[]; pagination: Pagination }
export interface ElectionList { elections: Election[]; pagination: Pagination }
export interface ApprovalRequestList { requests: ApprovalRequest[]; pagination: Pagination }
export interface AuditLogList { logs: AuditLogEntry[]; pagination: Pagination }
export interface NotificationList { notifications: Notification[]; pagination: Pagination }
export interface InsightList { insights: AIInsight[]; pagination: Pagination }



// ---------- Member-only additions (Member portal part 2) ----------

// GET /candidates/mine: the member's own nominations, any status.
export interface MyCandidacy extends Candidate {
  election: { id: string; name: string; status: ElectionStatus; startDate: string; endDate: string };
  position: { id: string; name: string };
}

// GET /elections/:id/turnout. Members get it only after results are published.
export interface Turnout {
  votesCast: number;
  eligibleVoters: number | null; // null for elections closed before this was recorded
  turnoutPercent: number | null;
  isLive: boolean; // true while voting is open
}


// ---------- Profile and two-factor (GET /auth/profile, /auth/mfa/*) ----------

export interface Profile extends User {
  phoneNumber: string | null;
  branch: string | null;
  membershipStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "EXITED" | null;
  memberSince: string;
  backupCodesRemaining: number | null; // null when two-factor is off
  mfaRequired: boolean; // staff cannot turn it off
}