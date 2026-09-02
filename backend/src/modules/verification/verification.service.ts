import { prisma } from "../../config/prisma";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { ConflictError } from "../../shared/errors/ConflictError";

// The single gate every vote must pass through (LLD §9, task spec §9).
// Called from voting.service.ts in Phase 6 — deliberately has no route or
// controller of its own, since exposing it as a standalone endpoint would
// just let a client probe eligibility without going through the actual
// ballot flow. Throws on the first failed check rather than collecting
// every reason, since the caller only needs to know voting is blocked,
// not enumerate every reason (which could leak information about a
// member's status to someone probing).
export async function checkEligibility(userId: string, electionId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User");

  if (user.role !== "MEMBER") {
    throw new ForbiddenError("Only members may vote.");
  }

  if (user.membershipStatus !== "ACTIVE") {
    throw new ForbiddenError("Your membership is not currently active.");
  }

  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) throw new NotFoundError("Election");

  if (election.status !== "ACTIVE") {
    throw new ForbiddenError("This election is not currently open for voting.");
  }

  const now = new Date();
  if (now < election.startDate || now > election.endDate) {
    // Guards against a status of ACTIVE that's technically outside its
    // own configured window — e.g. an election an officer forgot to close
    // on time. Status is the primary gate; dates are a second independent
    // check, not redundant with it.
    throw new ForbiddenError("This election is not currently within its voting window.");
  }

  const existingParticipation = await prisma.participation.findUnique({
    where: { electionId_userId: { electionId, userId } },
  });
  if (existingParticipation) {
    throw new ConflictError("You have already voted in this election.");
  }
}