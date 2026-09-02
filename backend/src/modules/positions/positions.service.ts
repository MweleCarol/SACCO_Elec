import { Position } from "@prisma/client";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { ConflictError } from "../../shared/errors/ConflictError";
import { writeAuditLog } from "../audit/audit.service";
import * as positionsRepository from "./positions.repository";
import { findElectionById } from "../elections/elections.repository";
import { CreatePositionInput, UpdatePositionInput } from "./positions.schema";

// Positions define the ballot structure — allowing edits after an
// election leaves DRAFT would mean changing what people are voting on
// after it's already been reviewed/approved/activated. This check is
// shared by create/update/delete below rather than duplicated per
// function.
async function assertElectionIsDraft(electionId: string): Promise<void> {
  const election = await findElectionById(electionId);
  if (!election) throw new NotFoundError("Election");
  if (election.status !== "DRAFT") {
    throw new ForbiddenError("Positions can only be modified while the election is in DRAFT status.");
  }
}

export async function listPositions(electionId: string): Promise<Position[]> {
  return positionsRepository.listPositionsByElection(electionId);
}

export async function createPosition(
  officerId: string, electionId: string, input: CreatePositionInput
): Promise<Position> {
  await assertElectionIsDraft(electionId);

  const position = await positionsRepository.createPosition({ electionId, ...input });

  await writeAuditLog({
    actorId: officerId, action: "POSITION_CREATED", resourceType: "Position",
    resourceId: position.id, electionId, outcome: "SUCCESS",
  });

  return position;
}

export async function updatePosition(
  officerId: string, positionId: string, input: UpdatePositionInput
): Promise<Position> {
  const position = await positionsRepository.findPositionById(positionId);
  if (!position) throw new NotFoundError("Position");

  await assertElectionIsDraft(position.electionId);

  const updated = await positionsRepository.updatePosition(positionId, input);

  await writeAuditLog({
    actorId: officerId, action: "POSITION_UPDATED", resourceType: "Position",
    resourceId: positionId, electionId: position.electionId, outcome: "SUCCESS",
  });

  return updated;
}

export async function deletePosition(officerId: string, positionId: string): Promise<void> {
  const position = await positionsRepository.findPositionById(positionId);
  if (!position) throw new NotFoundError("Position");

  await assertElectionIsDraft(position.electionId);

  const candidateCount = await positionsRepository.countCandidatesForPosition(positionId);
  if (candidateCount > 0) {
    throw new ConflictError("Cannot delete a position that already has candidates registered.");
  }

  await positionsRepository.deletePosition(positionId);

  await writeAuditLog({
    actorId: officerId, action: "POSITION_DELETED", resourceType: "Position",
    resourceId: positionId, electionId: position.electionId, outcome: "SUCCESS",
  });
}