import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { ConflictError } from "../../shared/errors/ConflictError";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { encryptPayload } from "../../shared/utils/crypto";
import { checkEligibility } from "../verification/verification.service";
import { writeAuditLog } from "../audit/audit.service";
import * as votingRepository from "./voting.repository";
import { BallotDto, ParticipationStatusDto } from "./voting.dto";
import { SubmitBallotInput } from "./voting.schema";

export async function getBallot(userId: string, electionId: string): Promise<BallotDto> {
  // Fast, friendly failure before doing any real work — the transaction's
  // unique constraint in recordVote() is the actual authoritative gate,
  // this is just so a member gets a clear "you've already voted" message
  // instead of a generic error if they try to fetch a ballot twice.
  await checkEligibility(userId, electionId);

  const election = await votingRepository.findElectionById(electionId);
  if (!election) throw new NotFoundError("Election");

  const positions = await votingRepository.getBallotStructure(electionId);

  return {
    electionId: election.id,
    electionName: election.name,
    positions: positions.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      seats: p.seats,
      candidates: p.candidates.map((c) => ({
        id: c.id, displayName: c.displayName, manifesto: c.manifesto, photoUrl: c.photoUrl,
      })),
    })),
  };
}

export async function submitBallot(
  userId: string, electionId: string, input: SubmitBallotInput
): Promise<{ votedAt: Date }> {
  await checkEligibility(userId, electionId);

  const validation = await votingRepository.validateSelections(electionId, input.selections);
  if (!validation.valid) {
    throw new ConflictError(validation.invalidReason ?? "Invalid ballot selections.");
  }

  const votes = input.selections.map((s) => ({
    positionId: s.positionId,
    candidateId: s.candidateId,
    // Encrypts just the candidateId — see the Phase 6 design note on why
    // this is defense-in-depth rather than the primary confidentiality
    // mechanism (that's the Participation/Vote table split).
    encryptedPayload: encryptPayload(JSON.stringify({ candidateId: s.candidateId })),
    anonymousToken: crypto.randomBytes(32).toString("hex"),
  }));

  let votedAt: Date;
  try {
    votedAt = await votingRepository.recordVote(electionId, userId, votes);
  } catch (err) {
    // P2002 here specifically means the unique constraint on
    // (electionId, userId) rejected a concurrent second attempt — this is
    // the real enforcement point, not just a duplicate of the
    // checkEligibility check above.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("You have already voted in this election.");
    }
    throw err;
  }

  // Audit log records that a vote was cast and by whom — NEVER what was
  // selected. This is intentionally kept as a best-effort write (general
  // policy from Phase 2), not transactional with recordVote() above: the
  // Participation row created inside that transaction is itself the
  // authoritative, tamper-resistant record that this member voted. A
  // failed audit write here would be a supplementary logging gap, not a
  // loss of the actual proof of participation.
  await writeAuditLog({
    actorId: userId, action: "VOTE_CAST", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS",
  });

  return { votedAt };
}

export async function getParticipationStatus(
  userId: string, electionId: string
): Promise<ParticipationStatusDto> {
  const participation = await votingRepository.findParticipation(electionId, userId);
  return { hasVoted: participation !== null, votedAt: participation?.votedAt ?? null };
}