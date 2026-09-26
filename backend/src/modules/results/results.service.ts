import { Prisma } from "@prisma/client";
import { ConflictError } from "../../shared/errors/ConflictError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { findElectionById } from "../elections/elections.repository";
import { writeAuditLog } from "../audit/audit.service";
import { requestApproval } from "../approvals/approvals.service";
import { notifyAllActiveMembers } from "../notifications/notifications.service";
import * as resultsRepository from "./results.repository";
import { ResultDto } from "./results.dto";

async function getElectionOrThrow(electionId: string) {
  const election = await findElectionById(electionId);
  if (!election) throw new ConflictError("Election not found.");
  return election;
}

export async function tallyResults(officerId: string, electionId: string): Promise<void> {
  const election = await getElectionOrThrow(electionId);

  // Only CLOSED: tally can be re-run to fix a mistake, but never after
  // publication has made results final.
  if (election.status !== "CLOSED") {
    throw new ForbiddenError("Results can only be tallied once voting has closed.");
  }

  const [tally, positions] = await Promise.all([
    resultsRepository.getVoteTally(electionId),
    resultsRepository.getApprovedCandidatesByPosition(electionId),
  ]);

  const tallyMap = new Map(tally.map((t) => [`${t.positionId}:${t.candidateId}`, t.voteCount]));

  const results: { positionId: string; candidateId: string; voteCount: number; isWinner: boolean }[] = [];

  for (const position of positions) {
    const withCounts = position.candidates.map((c) => ({
      candidateId: c.id,
      voteCount: tallyMap.get(`${position.id}:${c.id}`) ?? 0,
    }));

    // Candidates arrive in createdAt order and Array.sort is stable, so
    // ties resolve to earliest-registered-wins (the LLD specifies no tie rule).
    withCounts.sort((a, b) => b.voteCount - a.voteCount);

    withCounts.forEach((c, index) => {
      results.push({
        positionId: position.id, candidateId: c.candidateId, voteCount: c.voteCount,
        isWinner: index < position.seats,
      });
    });
  }

  await resultsRepository.replaceResults(electionId, results);

  await writeAuditLog({
    actorId: officerId, action: "RESULTS_TALLIED", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS", metadata: { resultCount: results.length },
  });
}

// Requests DAT approval to publish, using the same quorum/veto machinery
// as election activation.
export async function requestPublish(officerId: string, electionId: string) {
  const election = await getElectionOrThrow(electionId);

  if (election.status !== "CLOSED") {
    throw new ForbiddenError("Results can only be published once voting has closed.");
  }

  const existingResults = await resultsRepository.listResults(electionId);
  if (existingResults.length === 0) {
    throw new ConflictError("Results must be tallied before publication can be requested.");
  }

  return requestApproval({
    actionType: "RESULT_PUBLICATION",
    electionId,
    requestedById: officerId,
    requiredApprovals: election.requiredApprovals,
  });
}

// Called only by approvals.service.ts after DAT quorum is reached.
export async function executePublish(
  electionId: string, officerId: string, tx: Prisma.TransactionClient
): Promise<void> {
  await tx.election.update({
    where: { id: electionId }, data: { status: "RESULTS_PUBLISHED", resultsPublishedAt: new Date() },
  });
  await resultsRepository.publishResults(electionId, tx);

  await writeAuditLog({
    actorId: officerId, action: "RESULTS_PUBLISHED", resourceType: "Election",
    resourceId: electionId, electionId, outcome: "SUCCESS",
  });

  notifyAllActiveMembers({
    type: "RESULTS_PUBLISHED", title: "Election results published",
    message: `Results for this election have been published.`, electionId,
  }).catch(() => {});
}

export async function getResults(
  requesterRole: string, electionId: string
): Promise<ResultDto[]> {
  const election = await getElectionOrThrow(electionId);

  const privilegedRoles = ["ELECTION_OFFICER", "ELECTION_ADMINISTRATOR", "AUDITOR"];
  if (election.status !== "RESULTS_PUBLISHED" && !privilegedRoles.includes(requesterRole)) {
    throw new ForbiddenError("Results have not been published yet.");
  }

  const results = await resultsRepository.listResults(electionId);
  return results.map((r) => ({
    id: r.id, positionId: r.positionId, positionName: r.position.name,
    candidateId: r.candidateId, candidateName: r.candidate.displayName,
    voteCount: r.voteCount, isWinner: r.isWinner, status: r.status, publishedAt: r.publishedAt,
  }));
}