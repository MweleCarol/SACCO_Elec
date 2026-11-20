import { prisma } from "../../config/prisma";
import { checkEligibility } from "./verification.service";
import { createElection, createOpenElection, createUser } from "../../../tests/helpers";

describe("checkEligibility", () => {
  it("passes an active member in an open election", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const { election } = await createOpenElection(officer.id);
    const m = await createUser("MEMBER");
    await expect(checkEligibility(m.id, election.id)).resolves.toBeUndefined();
  });

  it.each([
    ["a non-member role", async () => ({ user: await createUser("ELECTION_OFFICER") }), 403],
    ["an inactive SACCO membership", async () => ({ user: await createUser("MEMBER", { membershipStatus: "INACTIVE" }) }), 403],
  ])("refuses %s", async (_label, make, status) => {
    const officer = await createUser("ELECTION_OFFICER");
    const { election } = await createOpenElection(officer.id);
    const { user } = await make();
    await expect(checkEligibility(user.id, election.id)).rejects.toMatchObject({ statusCode: status });
  });

  it("refuses elections that are not ACTIVE or are outside their window, and repeat voters", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const m = await createUser("MEMBER");
    const approved = await createElection(officer.id, { status: "APPROVED" });
    await expect(checkEligibility(m.id, approved.id)).rejects.toMatchObject({ statusCode: 403 });

    const early = await createElection(officer.id, { status: "ACTIVE" }); // starts tomorrow
    await expect(checkEligibility(m.id, early.id)).rejects.toMatchObject({ statusCode: 403 });

    const { election } = await createOpenElection(officer.id);
    await prisma.participation.create({ data: { electionId: election.id, userId: m.id } });
    await expect(checkEligibility(m.id, election.id)).rejects.toMatchObject({ statusCode: 409 });
  });
});