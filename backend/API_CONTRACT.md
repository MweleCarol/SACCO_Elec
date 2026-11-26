# SEVS API Contract

**Status:** generated on 20 Nov 2026 from the backend source (routes, Zod schemas, DTOs) and from a full end-to-end run against the live API. Every example response below is a real response, with tokens and ids shortened.
**Replaces:** the design-stage `API_CONTRACT.md`, which no longer matches the backend.
**Rule:** if this document and the backend disagree, the backend is right. Update this file in the same commit as any API change.

---

## 1. Conventions

### Base URL
```
http://localhost:4000/api/v1          (development)
GET http://localhost:4000/health      (unversioned health check)
```

### Response envelope (every endpoint)
```json
{ "success": true,  "message": "Election created successfully.", "data": { } }
{ "success": false, "message": "Validation failed.", "errors": [ { "field": "name", "message": "Election name must be at least 3 characters." } ] }
```
`errors` appears only on validation failures (422). `message` is always safe to show to the user.

### Status codes
| Code | Meaning | What the UI should do |
|---|---|---|
| 200 / 201 | Success | — |
| 400 | Malformed JSON | Bug in the client |
| 401 | Not logged in, token expired, or account no longer active | Try `POST /auth/refresh` once, then send to login |
| 403 | Logged in but not allowed (role, or a business rule such as "voting is closed") | Show `message` |
| 404 | Not found **or hidden from this role** (members get 404 for draft elections) | Show "not found" |
| 409 | Conflict (already voted, invalid lifecycle step, duplicate, expired approval) | Show `message` |
| 413 | Request body over 1 MB | — |
| 422 | Validation failed | Show `errors[]` next to the matching form fields |
| 429 | Too many attempts (per account or per IP) | Show `message`, disable the button for a while |
| 500 | Server error (details never exposed) | Generic error |
| 502 / 503 | Copilot unavailable or not configured | Show `message` |

### Pagination
List endpoints accept `page` (default 1) and `pageSize` (default 20, max 100; audit logs default 50, max 200) and return:
```json
{ "<collection>": [ ], "pagination": { "page": 1, "pageSize": 20, "totalCount": 3, "totalPages": 1 } }
```
The collection key differs per endpoint: `users`, `elections`, `requests`, `logs`, `notifications`, `insights`.
Sort order is fixed per endpoint (newest first), with no client sort parameter.
Candidates, positions and results are **not** paginated: they return a plain array.

### Dates
All dates are ISO 8601 strings in **UTC** (`"2026-11-20T10:51:33.087Z"`). Convert to local time (Africa/Nairobi) for display. Send dates the same way, e.g. `new Date(localValue).toISOString()`.

---

## 2. Authentication

### Tokens
* **Access token:** JWT, valid **15 minutes**, returned in the response body. Keep it **in memory only** (not localStorage). Send it on every request: `Authorization: Bearer <accessToken>`.
* **Refresh token:** an **httpOnly cookie** named `refreshToken`, path `/api/v1/auth`, valid 7 days, rotated on every refresh. JavaScript cannot read it. The browser sends it automatically **only if** requests use credentials:
  ```ts
  axios.create({ baseURL: "http://localhost:4000/api/v1", withCredentials: true })
  ```
  The backend allows the origin in `CORS_ORIGIN` (default `http://localhost:3000`) with credentials.
* Reusing an old refresh token (e.g. one that was stolen) **logs the user out everywhere**.

### Recommended client flow
```
login ──► 200 { accessToken, user }                      → store token in memory, go to dashboard
      └─► 200 { mfaRequired: true, mfaChallengeToken }   → show 6-digit code screen → POST /auth/verify-mfa

any request ──► 401 → POST /auth/refresh (once, body {}) ──► 200 → retry the original request
                                                          └─► 401 → clear state, go to /login

app start (page reload) → POST /auth/refresh → if 200, fetch GET /users/me → restore session
```
Only one refresh should run at a time: queue other requests that get a 401 until it finishes.

### Endpoints
| Method & path | Who | Body | Success `data` |
|---|---|---|---|
| `POST /auth/register` | Public | `{ membershipNumber, fullName, email, password, confirmPassword }` | `User` (201) |
| `POST /auth/login` | Public | `{ email, password }` | `{ accessToken, user: User }` **or** `{ mfaRequired: true, mfaChallengeToken }` |
| `POST /auth/verify-mfa` | Public | `{ mfaChallengeToken, totpCode }` (6 digits) | `{ accessToken, user: User }` |
| `POST /auth/refresh` | Cookie | `{}` | `{ accessToken }` |
| `POST /auth/logout` | Logged in | — | `null` (clears the cookie) |
| `GET /auth/me` | Logged in | — | `{ id, role }` |
| `POST /auth/mfa/enroll` | Logged in | — | `{ totpSecret, qrCodeDataUrl, issuer }`. Show the QR image (`<img src={qrCodeDataUrl}>`). 409 if MFA is already on. |
| `POST /auth/mfa/confirm` | Logged in | `{ totpCode }` | `null` (MFA now on) |
| `PATCH /auth/me/password` | Logged in | `{ currentPassword, newPassword, confirmNewPassword }` | `null`. Logs out other devices. |

**Rules the frontend must mirror in its forms**
* Password: at least 8 characters, with at least one uppercase letter, one lowercase letter and one number.
* Registration only works for members already imported by membership sync. The backend checks `membershipNumber` plus `fullName` (case-insensitive) and gives **one generic message** for any mismatch. Don't try to say which field was wrong.
* After 5 wrong passwords or codes, the account is locked for 15 minutes (429, "Too many failed attempts…"). Separately, more than 10 failed auth requests from one IP in 15 minutes gets 429 ("Too many attempts. Please wait…").

**Example: login**
```json
{ "success": true, "message": "Login successful.",
  "data": { "accessToken": "<jwt>",
            "user": { "id": "7cba…", "email": "amina@example.com", "fullName": "Amina Wanjiru",
                      "role": "MEMBER", "status": "ACTIVE", "mfaEnabled": false, "membershipNumber": "CAP-1" } } }
```

---

## 3. Roles and enums

```ts
type UserRole = "MEMBER" | "ELECTION_OFFICER" | "ELECTION_ADMINISTRATOR" | "AUDITOR";
type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED" | "PENDING_ACTIVATION";
type MembershipStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "EXITED";

type ElectionStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SCHEDULED"
                    | "ACTIVE" | "CLOSED" | "RESULTS_PUBLISHED" | "ARCHIVED";   // SCHEDULED is never used yet
type CandidateStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN";

type ApprovalActionType = "ELECTION_ACTIVATION" | "ELECTION_CANCELLATION" | "ELECTION_RESCHEDULE" | "RESULT_PUBLICATION";
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "EXECUTED";
type ResultStatus = "DRAFT" | "PUBLISHED";

type NotificationType = "ELECTION_ACTIVATED" | "ELECTION_CLOSED" | "RESULTS_PUBLISHED" | "APPROVAL_DECIDED"
                      | "ELECTION_SCHEDULED" | "ELECTION_CLOSING_SOON" | "APPROVAL_REQUESTED"
                      | "CANDIDATE_STATUS_CHANGED" | "SYSTEM_ALERT";            // first four are sent today
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
```

### Election lifecycle
```
DRAFT ──submit──► PENDING_APPROVAL ──admin approves──► APPROVED ──DAT activation──► ACTIVE ──close (officer or automatic at endDate)──► CLOSED
  ▲                      │ admin rejects                  │                                                                        │ tally, then DAT publication
  └──────────────────────┘                                └──DAT cancellation──► ARCHIVED ◄─────────────── RESULTS_PUBLISHED ◄─────┘
DRAFT ──DAT cancellation──► ARCHIVED
```
* **DAT** (Distributed Administration Trust): the action is not done immediately. It creates an **approval request**; it runs only after `requiredApprovals` distinct officers or administrators approve, and never the person who asked. **One rejection cancels the request.** Requests expire after 7 days.
* The server closes elections automatically up to one minute after `endDate`.

### What each role can see
| | Member | Officer / Administrator / Auditor |
|---|---|---|
| Elections | `APPROVED` onwards; `ARCHIVED` only if it was approved first. Others return **404**. | All |
| Candidates | `APPROVED` only, **without `memberId`** | All, any status |
| Turnout (`GET /elections/:id/turnout`) | After publication only (403 before) | Any time, live while voting is open |
| Their own nominations | `GET /candidates/mine`, any status | — |
| Votes per candidate | After publication only | After the tally (before publication) |

---

## 4. Data types (exactly as returned)

```ts
interface User {
  id: string; email: string; fullName: string; role: UserRole; status: UserStatus;
  mfaEnabled: boolean; membershipNumber: string | null;
}

interface Election {
  id: string; name: string; description: string | null;
  startDate: string; endDate: string; status: ElectionStatus; requiredApprovals: number;
  createdById: string; createdAt: string; updatedAt: string;
  approvedAt: string | null; activatedAt: string | null; closedAt: string | null;
  resultsPublishedAt: string | null; archivedAt: string | null;
}

interface Position {
  id: string; electionId: string; name: string; description: string | null;
  seats: number; order: number; createdAt: string; updatedAt: string;
}

interface Candidate {
  id: string; electionId: string; positionId: string;
  memberId?: string | null;          // staff only; absent for members
  displayName: string; manifesto: string | null; photoUrl: string | null;
  status: CandidateStatus; withdrawnAt: string | null; createdAt: string; updatedAt: string;
}

interface Ballot {
  electionId: string; electionName: string;
  positions: { id: string; name: string; description: string | null; seats: number;
               candidates: { id: string; displayName: string; manifesto: string | null; photoUrl: string | null }[] }[];
}

interface Participation { hasVoted: boolean; votedAt: string | null }

interface ApprovalRequest {
  id: string; actionType: ApprovalActionType; resourceType: "Election"; resourceId: string; electionId: string | null;
  requestedById: string; requiredApprovals: number; status: ApprovalStatus;
  approveCount: number; rejectCount: number;
  payload: { reason: string } | { startDate: string; endDate: string } | null;   // cancellation | reschedule
  expiresAt: string; createdAt: string; decidedAt: string | null; executedAt: string | null;
}

interface Result {
  id: string; positionId: string; positionName: string; candidateId: string; candidateName: string;
  voteCount: number; isWinner: boolean; status: ResultStatus; publishedAt: string | null;
}

interface Notification {
  id: string; type: NotificationType; title: string; message: string;
  read: boolean; readAt: string | null; electionId: string | null; createdAt: string;
}

interface AuditLogEntry {
  id: string; actorId: string | null;       // null = system (e.g. automatic close)
  action: string; resourceType: string | null; resourceId: string | null; electionId: string | null;
  outcome: "SUCCESS" | "FAILURE"; metadata: Record<string, unknown> | null; createdAt: string;
}

interface AIInsight {
  id: string; eventType: string; resourceType: string | null; resourceId: string | null;
  riskLevel: RiskLevel; recommendation: string; reasoning: string;
  evidence: Record<string, unknown> | null; confidence: number;
  acknowledgedBy: string | null; acknowledgedAt: string | null; createdAt: string;
}
```

---

## 5. Endpoints

**Legend:** M = Member, O = Election Officer, A = Election Administrator, Au = Auditor, Any = any logged-in user.

### Users
| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `GET /users/me` | Any | — | `User` |
| `PATCH /users/me` | Any | `{ email?, phoneNumber? }`. Other fields are silently ignored. | `User` |
| `GET /users` | A | `?role=&status=&search=&page=&pageSize=` | `{ users: User[], pagination }` |
| `POST /users` | A | `{ email, fullName, role }`, role ∈ O / A / Au (members come only from sync) | `{ user: User, temporaryPassword }` (201). Show the password once; it is never shown again. |
| `PATCH /users/:id` | A | `{ email?, phoneNumber?, role?, status? }`. An admin cannot change their own role or status (403). | `User` |

### Membership sync
| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `POST /membership-sync/run` | A | `{ records: [{ membershipNumber, fullName, branch, email?, nationalId?, membershipStatus? }] }` | `{ recordsProcessed, recordsCreated, recordsUpdated, recordsFailed, errors: [{ membershipNumber, reason }] }` |

A bad row does not stop the batch; it appears in `errors`.

### Elections
| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `GET /elections` | Any | `?status=&page=&pageSize=` | `{ elections: Election[], pagination }` (members: visible ones only) |
| `GET /elections/:id` | Any | — | `Election` (404 if hidden from a member) |
| `POST /elections` | O | `{ name, description?, startDate, endDate, requiredApprovals? (1–10, default 2) }`. Start must be in the future; end after start. | `Election` (201, `DRAFT`) |
| `PATCH /elections/:id` | O | Any create field. **DRAFT only.** | `Election` |
| `POST /elections/:id/submit-approval` | O | — | `Election` (`PENDING_APPROVAL`). **409** if the election has no positions. |
| `POST /elections/:id/review-approval` | A | `{ decision: "APPROVE" \| "REJECT", comment? }` | `Election` (`APPROVED` or back to `DRAFT`). The officer who created it gets an `APPROVAL_DECIDED` notification that includes the comment. |
| `POST /elections/:id/activate` | O | — | `ApprovalRequest` **(DAT)**. **409** unless the ballot is complete: at least one position, every position with at least one `APPROVED` candidate, and `endDate` still in the future. Checked again when the final approval executes (a candidate may have withdrawn); if it fails then, the decision returns 409 and the election stays as it was. |
| `POST /elections/:id/reschedule` | O | `{ startDate, endDate }`. Not while `ACTIVE`. | `ApprovalRequest` **(DAT)** |
| `POST /elections/:id/cancel` | A | `{ reason }` (5+ characters) | `ApprovalRequest` **(DAT)** |
| `POST /elections/:id/close` | O | — | `Election` (`CLOSED`). Direct, no DAT. |

Calling `activate`, `reschedule` or `cancel` again while a request is pending returns **the same** pending request.

### Positions (define the ballot; editable only while the election is `DRAFT`)
| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `GET /elections/:electionId/positions` | Any | — | `Position[]` (ordered by `order`) |
| `POST /elections/:electionId/positions` | O | `{ name, description?, seats? (default 1), order? }` | `Position` (201). 409 if the name exists in this election. |
| `PATCH /positions/:id` | O | Any create field | `Position` |
| `DELETE /positions/:id` | O | — | `null`. 409 if it has candidates. |

### Candidates (changes locked once the election is `ACTIVE`)

Every candidate is a member who applied (see *Self-nomination*). There is no officer endpoint to add or edit a candidate: officers review applications with approve/reject. A member changes their application by withdrawing and applying again.

| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `GET /elections/:electionId/candidates` | Any | `?status=&positionId=` | `Candidate[]` (members: approved only, no `memberId`) |
| `POST /candidates/:id/approve` | O | `{ decision: "APPROVE", comment? }` | `Candidate` |
| `POST /candidates/:id/reject` | O | `{ decision: "REJECT", comment? }` | `Candidate`. A rejected candidate cannot be approved later (409). |

On both routes the `decision` field in the body decides the outcome, not the URL, so always send the matching value.

| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `POST /candidates/:id/withdraw` | O, or the linked member | `{ reason? }` (body optional) | `Candidate` (`WITHDRAWN`) |

### Self-nomination (members)
| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `POST /elections/:electionId/nominations` | M | `{ positionId, manifesto }` (manifesto 50–5,000 characters) | `Candidate` (201, `PENDING_REVIEW`). `displayName` is the member's own `fullName` and `memberId` is the caller; neither can be sent. |
| `GET /candidates/mine` | M | — | `MyCandidacy[]`: `Candidate` plus `election { id, name, status, startDate, endDate }` and `position { id, name }`, newest first |

* Open while the election is `APPROVED` or `SCHEDULED`; **403** once it is `ACTIVE` or later. Draft elections are **404** (members cannot see them).
* **403** if the member's SACCO membership is not `ACTIVE`.
* **409** if the member already has a nomination `PENDING_REVIEW` or `APPROVED` in the same election (any position). Withdrawing it frees them to nominate again.
* Election officers get a `CANDIDATE_STATUS_CHANGED` notification ("New nomination to review"). Officers approve or reject it with the normal candidate endpoints; the member is then notified, with the officer's comment as the reason on a rejection.

### Voting (members only)
| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `GET /elections/:electionId/ballot` | M | — | `Ballot`: positions in order, approved candidates only |
| `POST /elections/:electionId/ballot` | M | `{ selections: [{ positionId, candidateId }] }`: exactly **one per position**, every position | `{ votedAt }` |
| `GET /elections/:electionId/participation/me` | M | — | `Participation` |

* Refused with **403** when the member's SACCO membership isn't active, or the election isn't `ACTIVE` and inside its dates. Refused with **409** if they already voted or a selection is invalid.
* **Vote secrecy:** nothing ever links a member to their choices. No receipt or reference is issued, and the API cannot show a member who they voted for. Show the choices on a **review screen before submitting**.

### Approval requests (DAT)
| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `GET /approval-requests` | O, A, Au | `?status=&actionType=&page=&pageSize=` | `{ requests: ApprovalRequest[], pagination }` |
| `GET /approval-requests/:id` | O, A, Au | — | `ApprovalRequest` |
| `POST /approval-requests/:id/decide` | O, A | `{ decision: "APPROVE" \| "REJECT", comment? }` | `ApprovalRequest`. Status becomes `EXECUTED` once enough approvals arrive, or `REJECTED` on the first rejection. |

Errors: 403 on your own request; 409 if you already decided, it's already resolved, or it has expired.
Show progress as e.g. **"1 of 2 approvals"** using `approveCount` / `requiredApprovals`.

### Results
| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `POST /elections/:electionId/results/tally` | O | — | `null`. Only when `CLOSED`; can be re-run until publication. |
| `POST /elections/:electionId/results/publish` | O | — | `ApprovalRequest` **(DAT)**. 409 if not tallied yet. |
| `GET /elections/:electionId/results` | Any | — | `Result[]`. Members: 403 until published. |
| `GET /elections/:electionId/turnout` | Any | — | `{ votesCast, eligibleVoters, turnoutPercent, isLive }`. Members: 403 until published. |

Turnout: `eligibleVoters` is the number of members with an `ACTIVE` SACCO membership, **recorded when voting closes** so it does not change afterwards. While voting is open (`isLive: true`) it is today's count. It is `null` (and so is `turnoutPercent`) for elections closed before this was recorded. `turnoutPercent` has one decimal place.

Ties go to the earliest-registered candidate. Group by `positionName` for display.

### Notifications (own only)
| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `GET /notifications` | Any | `?unreadOnly=true\|false&page=&pageSize=` | `{ notifications: Notification[], pagination }` |
| `PATCH /notifications/:id/read` | Any | — | `Notification` |
| `PATCH /notifications/read-all` | Any | — | `null` |

### Audit (read-only)
| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `GET /audit-logs` | Au, A | `?actorId=&action=&resourceType=&resourceId=&electionId=&dateFrom=&dateTo=&page=&pageSize=` | `{ logs: AuditLogEntry[], pagination }` |
| `GET /audit-logs/:id` | Au, A | — | `AuditLogEntry` |
| `GET /audit-logs/verify-chain` | Au, A | `?dateFrom=&dateTo=` | `{ recordsChecked, intact, breaks: [{ auditLogId, reason: "HASH_MISMATCH" \| "LINK_MISMATCH", createdAt }] }` |

### AI governance (advisory only: nothing here changes any data except acknowledging)
| Method & path | Roles | Request | `data` |
|---|---|---|---|
| `POST /governance/insights/scan` | A | — | `{ scannedSince }` |
| `GET /governance/insights` | O, A, Au | `?riskLevel=&eventType=&acknowledgedOnly=true\|false&page=&pageSize=` | `{ insights: AIInsight[], pagination }` |
| `GET /governance/insights/:id` | O, A, Au | — | `AIInsight` |
| `POST /governance/insights/:id/acknowledge` | O, A | — | `AIInsight` |
| `GET /governance/reports/:electionId` | O, A, Au | — | `{ electionId, name, status, positionCount, candidateCount, participationCount, openInsightCount }`. `participationCount` is the **live turnout**. |
| `POST /governance/copilot/query` | O, A | `{ question }` (3–1000 characters) | `{ answer, disclaimer }`. 503 when no Gemini key is configured. |

---

## 6. Not in the backend yet (frontend features waiting on backend work)

| Frontend feature | Status / decision |
|---|---|
| Live turnout on the member dashboard | **Decided: hide from members.** Members see turnout with the published results. |
| "Ballot Reference" after voting | **Decided: remove.** Conflicts with vote secrecy. |
| "Invalid votes" and the votes-over-time chart on results | Remove. Electronic ballots are validated before saving, and vote times are deliberately hidden. |
| Candidate photo / supporting-document upload | No file storage yet. Nominations are text only. |
| Forgot password | Not available. Hide the link or replace it with "Contact your SACCO office". |
| Audit log actor name, role, IP address, device, risk level | `AuditLogEntry` has `actorId` only. Look up names via `GET /users` (administrators), or add fields to the backend later. |
| `branch` and phone number on the profile | Not in `User` yet; needs a small backend addition. |
| Approval types `CANDIDATE_APPROVAL`, `ELECTION_CLOSURE` | Not DAT actions: candidate approval and closing are direct officer actions. |