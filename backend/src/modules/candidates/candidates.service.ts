import { Candidate } from "@prisma/client";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { ConflictError } from "../../shared/errors/ConflictError";
import { writeAuditLog } from "../audit/audit.service";
import * as candidatesRepository from "./candidates.repository";
import { findElectionById } from "../elections/elections.repository";
import { toCandidateDto, CandidateDto } from "./candidates.dto";
import { CreateCandidateInput, UpdateCandidateInput, CandidateDecisionInput, ListCandidatesQuery } from "./candidates.schema";

// Candidate lists/edits are locked once an election goes ACTIVE — changing
// who's on a ballot after voting starts would be a serious integrity
// problem, not just an inconvenience. DRAFT/PENDING_APPROVAL/APPROVED/
// SCHEDULED are all still "before voting," so registration stays open
// through officer review and approval, up to activation.
const CANDIDATE_EDITABLE_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SCHEDULED"];

async function getCandidateOrThrow(id: string): Promise<Candidate> {
  const candidate = await candidatesRepository.findCandidateById(id);
  if (!candidate) throw new NotFoundError("Candidate");
  return candidate;
}

async function assertElectionAcceptsCandidateChanges(electionId: string): Promise<void> {
  const election = await findElectionById(electionId);
  if (!election) throw new NotFoundError("Election");
  if (!CANDIDATE_EDITABLE_STATUSES.includes(election.status)) {
    throw new ForbiddenError("Candidates cannot be modified once the election is active or later.");
  }
}

export async function listCandidates(
  electionId: string, query: ListCandidatesQuery
): Promise<CandidateDto[]> {
  const candidates = await candidatesRepository.listCandidatesByElection(electionId, query);
  return candidates.map(toCandidateDto);
}

export async function registerCandidate(
  officerId: string, electionId: string, input: CreateCandidateInput
): Promise<CandidateDto> {
  await assertElectionAcceptsCandidateChanges(electionId);

  const positionValid = await candidatesRepository.positionBelongsToElection(input.positionId, electionId);
  if (!positionValid) {
    throw new NotFoundError("Position (in this election)");
  }

  const candidate = await candidatesRepository.createCandidate({ electionId, ...input });

  await writeAuditLog({
    actorId: officerId, action: "CANDIDATE_REGISTERED", resourceType: "Candidate",
    resourceId: candidate.id, electionId, outcome: "SUCCESS",
  });

  return toCandidateDto(candidate);
}

export async function updateCandidate(
  officerId: string, candidateId: string, input: UpdateCandidateInput
): Promise<CandidateDto> {
  const candidate = await getCandidateOrThrow(candidateId);
  await assertElectionAcceptsCandidateChanges(candidate.electionId);

  if (candidate.status === "WITHDRAWN" || candidate.status === "REJECTED") {
    throw new ConflictError("Cannot edit a withdrawn or rejected candidate.");
  }

  const updated = await candidatesRepository.updateCandidate(candidateId, input);

  await writeAuditLog({
    actorId: officerId, action: "CANDIDATE_UPDATED", resourceType: "Candidate",
    resourceId: candidateId, electionId: candidate.electionId, outcome: "SUCCESS",
  });

  return toCandidateDto(updated);
}

export async function decideCandidate(
  officerId: string, candidateId: string, input: CandidateDecisionInput
): Promise<CandidateDto> {
  const candidate = await getCandidateOrThrow(candidateId);
  await assertElectionAcceptsCandidateChanges(candidate.electionId);

  if (candidate.status !== "PENDING_REVIEW") {
    throw new ConflictError("Only candidates awaiting review can be approved or rejected.");
  }

  const nextStatus = input.decision === "APPROVE" ? "APPROVED" : "REJECTED";
  const updated = await candidatesRepository.setCandidateStatus(candidateId, nextStatus);

  await writeAuditLog({
    actorId: officerId,
    action: input.decision === "APPROVE" ? "CANDIDATE_APPROVED" : "CANDIDATE_REJECTED",
    resourceType: "Candidate", resourceId: candidateId, electionId: candidate.electionId,
    outcome: "SUCCESS", metadata: { comment: input.comment },
  });

  return toCandidateDto(updated);
}

// Withdrawal is allowed by the officer managing the election, OR by the
// candidate themselves if this candidate entry is linked to their own
// member account (memberId matches the caller). requesterId/requesterRole
// come from req.user in the controller — the actual "am I allowed" check
// lives here, not scattered across route middleware, since "officer OR
// the linked member" isn't expressible with authorize()'s simple role list.
export async function withdrawCandidate(
  requesterId: string, requesterRole: string, candidateId: string, reason?: string
): Promise<CandidateDto> {
  const candidate = await getCandidateOrThrow(candidateId);
  await assertElectionAcceptsCandidateChanges(candidate.electionId);

  const isOwnCandidacy = candidate.memberId === requesterId;
  const isOfficer = requesterRole === "ELECTION_OFFICER";

  if (!isOwnCandidacy && !isOfficer) {
    throw new ForbiddenError("You can only withdraw your own candidacy.");
  }

  if (candidate.status === "WITHDRAWN" || candidate.status === "REJECTED") {
    throw new ConflictError("This candidate has already been withdrawn or rejected.");
  }

  const updated = await candidatesRepository.setCandidateStatus(candidateId, "WITHDRAWN", new Date());

  await writeAuditLog({
    actorId: requesterId, action: "CANDIDATE_WITHDRAWN", resourceType: "Candidate",
    resourceId: candidateId, electionId: candidate.electionId,
    outcome: "SUCCESS", metadata: { reason, selfWithdrawn: isOwnCandidacy },
  });

  return toCandidateDto(updated);
}