import { Candidate, UserRole } from "@prisma/client";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { ConflictError } from "../../shared/errors/ConflictError";
import { writeAuditLog } from "../audit/audit.service";
import * as candidatesRepository from "./candidates.repository";
import { findElectionById } from "../elections/elections.repository";
import {
  assertElectionVisible,
  memberVisibleElectionWhere,
  seesEverything,
} from "../../shared/constants/visibility";
import { prisma } from "../../config/prisma";
import { notify, notifyRole } from "../notifications/notifications.service";
import {
  toCandidateDto,
  toPublicCandidateDto,
  CandidateDto,
  PublicCandidateDto,
  MyCandidacyDto,
} from "./candidates.dto";
import {
  CreateCandidateInput,
  UpdateCandidateInput,
  CandidateDecisionInput,
  ListCandidatesQuery,
  SelfNominationInput,
} from "./candidates.schema";
// Candidate lists/edits are locked once an election goes ACTIVE — changing
// who's on a ballot after voting starts would be a serious integrity
// problem, not just an inconvenience. DRAFT/PENDING_APPROVAL/APPROVED/
// SCHEDULED are all still "before voting," so registration stays open
// through officer review and approval, up to activation.
const CANDIDATE_EDITABLE_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SCHEDULED",
];

async function getCandidateOrThrow(id: string): Promise<Candidate> {
  const candidate = await candidatesRepository.findCandidateById(id);
  if (!candidate) throw new NotFoundError("Candidate");
  return candidate;
}

async function assertElectionAcceptsCandidateChanges(
  electionId: string,
): Promise<void> {
  const election = await findElectionById(electionId);
  if (!election) throw new NotFoundError("Election");
  if (!CANDIDATE_EDITABLE_STATUSES.includes(election.status)) {
    throw new ForbiddenError(
      "Candidates cannot be modified once the election is active or later.",
    );
  }
}

// Members see APPROVED candidates only, whatever status filter they send:
// pending, rejected and withdrawn nominations stay internal to officers.
export async function listCandidates(
  role: UserRole,
  electionId: string,
  query: ListCandidatesQuery,
): Promise<CandidateDto[] | PublicCandidateDto[]> {
  assertElectionVisible(role, await findElectionById(electionId));

  if (!seesEverything(role) && query.status && query.status !== "APPROVED") {
    return [];
  }
  const filters = seesEverything(role)
    ? query
    : { ...query, status: "APPROVED" as const };

  const candidates = await candidatesRepository.listCandidatesByElection(
    electionId,
    filters,
  );
  return seesEverything(role)
    ? candidates.map(toCandidateDto)
    : candidates.map(toPublicCandidateDto);
}

export async function registerCandidate(
  officerId: string,
  electionId: string,
  input: CreateCandidateInput,
): Promise<CandidateDto> {
  await assertElectionAcceptsCandidateChanges(electionId);

  const positionValid = await candidatesRepository.positionBelongsToElection(
    input.positionId,
    electionId,
  );
  if (!positionValid) {
    throw new NotFoundError("Position (in this election)");
  }

  const candidate = await candidatesRepository.createCandidate({
    electionId,
    ...input,
  });

  await writeAuditLog({
    actorId: officerId,
    action: "CANDIDATE_REGISTERED",
    resourceType: "Candidate",
    resourceId: candidate.id,
    electionId,
    outcome: "SUCCESS",
  });

  return toCandidateDto(candidate);
}

export async function updateCandidate(
  officerId: string,
  candidateId: string,
  input: UpdateCandidateInput,
): Promise<CandidateDto> {
  const candidate = await getCandidateOrThrow(candidateId);
  await assertElectionAcceptsCandidateChanges(candidate.electionId);

  if (candidate.status === "WITHDRAWN" || candidate.status === "REJECTED") {
    throw new ConflictError("Cannot edit a withdrawn or rejected candidate.");
  }

  const updated = await candidatesRepository.updateCandidate(
    candidateId,
    input,
  );

  await writeAuditLog({
    actorId: officerId,
    action: "CANDIDATE_UPDATED",
    resourceType: "Candidate",
    resourceId: candidateId,
    electionId: candidate.electionId,
    outcome: "SUCCESS",
  });

  return toCandidateDto(updated);
}

export async function decideCandidate(
  officerId: string,
  candidateId: string,
  input: CandidateDecisionInput,
): Promise<CandidateDto> {
  const candidate = await getCandidateOrThrow(candidateId);
  await assertElectionAcceptsCandidateChanges(candidate.electionId);

  if (candidate.status !== "PENDING_REVIEW") {
    throw new ConflictError(
      "Only candidates awaiting review can be approved or rejected.",
    );
  }

  const nextStatus = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
  const updated = await candidatesRepository.setCandidateStatus(
    candidateId,
    nextStatus,
  );

  await writeAuditLog({
    actorId: officerId,
    action:
      input.decision === "APPROVE"
        ? "CANDIDATE_APPROVED"
        : "CANDIDATE_REJECTED",
    resourceType: "Candidate",
    resourceId: candidateId,
    electionId: candidate.electionId,
    outcome: "SUCCESS",
    metadata: { comment: input.comment },
  });

  // Tell the member, if this candidacy belongs to a member account.
  if (candidate.memberId) {
    const approved = input.decision === "APPROVE";
    notify([candidate.memberId], {
      type: "CANDIDATE_STATUS_CHANGED",
      title: approved
        ? "Your nomination was approved"
        : "Your nomination was not approved",
      message: approved
        ? "You are now a candidate. Members will see your manifesto on the ballot."
        : `An election officer did not approve your nomination.${input.comment ? ` Reason: ${input.comment}` : ""}`,
      electionId: candidate.electionId,
    }).catch(() => {});
  }

  return toCandidateDto(updated);
}

// Withdrawal is allowed by the officer managing the election, OR by the
// candidate themselves if this candidate entry is linked to their own
// member account (memberId matches the caller). requesterId/requesterRole
// come from req.user in the controller — the actual "am I allowed" check
// lives here, not scattered across route middleware, since "officer OR
// the linked member" isn't expressible with authorize()'s simple role list.
export async function withdrawCandidate(
  requesterId: string,
  requesterRole: string,
  candidateId: string,
  reason?: string,
): Promise<CandidateDto> {
  const candidate = await getCandidateOrThrow(candidateId);
  await assertElectionAcceptsCandidateChanges(candidate.electionId);

  const isOwnCandidacy = candidate.memberId === requesterId;
  const isOfficer = requesterRole === "ELECTION_OFFICER";

  if (!isOwnCandidacy && !isOfficer) {
    throw new ForbiddenError("You can only withdraw your own candidacy.");
  }

  if (candidate.status === "WITHDRAWN" || candidate.status === "REJECTED") {
    throw new ConflictError(
      "This candidate has already been withdrawn or rejected.",
    );
  }

  const updated = await candidatesRepository.setCandidateStatus(
    candidateId,
    "WITHDRAWN",
    new Date(),
  );

  await writeAuditLog({
    actorId: requesterId,
    action: "CANDIDATE_WITHDRAWN",
    resourceType: "Candidate",
    resourceId: candidateId,
    electionId: candidate.electionId,
    outcome: "SUCCESS",
    metadata: { reason, selfWithdrawn: isOwnCandidacy },
  });

  return toCandidateDto(updated);
}

// Self-nomination is open while the election is announced to members but
// voting has not started: APPROVED or SCHEDULED. (DRAFT and PENDING_APPROVAL
// are hidden from members; from ACTIVE onwards the ballot is fixed.)
const NOMINATION_OPEN_STATUSES = ["APPROVED", "SCHEDULED"];

export async function nominateSelf(
  memberId: string,
  electionId: string,
  input: SelfNominationInput,
): Promise<CandidateDto> {
  const election = await findElectionById(electionId);
  assertElectionVisible("MEMBER", election);
  if (!NOMINATION_OPEN_STATUSES.includes(election.status)) {
    throw new ForbiddenError("Nominations for this election are closed.");
  }

  const member = await prisma.user.findUnique({ where: { id: memberId } });
  if (!member || member.role !== "MEMBER")
    throw new ForbiddenError("Only members can nominate themselves.");
  if (member.membershipStatus !== "ACTIVE") {
    throw new ForbiddenError(
      "Only members with an active SACCO membership can stand for election.",
    );
  }

  if (
    !(await candidatesRepository.positionBelongsToElection(
      input.positionId,
      electionId,
    ))
  ) {
    throw new NotFoundError("Position (in this election)");
  }

  const candidate = await candidatesRepository.createSelfNomination({
    electionId,
    positionId: input.positionId,
    memberId,
    displayName: member.fullName,
    manifesto: input.manifesto,
  });
  if (!candidate) {
    throw new ConflictError(
      "You already have a nomination in this election. Withdraw it first if you want to stand for a different position.",
    );
  }

  await writeAuditLog({
    actorId: memberId,
    action: "CANDIDATE_REGISTERED",
    resourceType: "Candidate",
    resourceId: candidate.id,
    electionId,
    outcome: "SUCCESS",
    metadata: { selfNominated: true },
  });

  notifyRole("ELECTION_OFFICER", {
    type: "CANDIDATE_STATUS_CHANGED",
    title: "New nomination to review",
    message: `${member.fullName} has nominated themselves in "${election.name}".`,
    electionId,
  }).catch(() => {});

  return toCandidateDto(candidate);
}

// The member's own nominations, in any status, for elections they can see.
export async function listMyCandidacies(
  memberId: string,
): Promise<MyCandidacyDto[]> {
  const rows = await candidatesRepository.listCandidaciesForMember(
    memberId,
    memberVisibleElectionWhere,
  );
  return rows.map((row) => ({
    ...toCandidateDto(row),
    election: row.election,
    position: row.position,
  }));
}
