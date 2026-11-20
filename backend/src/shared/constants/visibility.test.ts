import { ElectionStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { api, bearer, createCandidate, createElection, createPosition, createUser } from "../../../tests/helpers";

// Read-visibility policy (K6): members see elections from APPROVED onwards
// and APPROVED candidates only; officers, administrators and auditors see
// everything. Hidden elections are 404 for members, never 403.

// "ARCHIVED_DRAFT" is an election cancelled before it was ever approved
// (ARCHIVED with no approvedAt). Members must not see it.
const HIDDEN = ["DRAFT", "PENDING_APPROVAL", "ARCHIVED_DRAFT"] as const;
const VISIBLE: ElectionStatus[] = ["APPROVED", "ACTIVE", "CLOSED", "RESULTS_PUBLISHED", "ARCHIVED"];

async function oneOfEach() {
  const officer = await createUser("ELECTION_OFFICER");
  const byStatus: Record<string, string> = {};
  const approvedAt = new Date(Date.now() - 864e5);
  for (const status of ["DRAFT", "PENDING_APPROVAL"] as const) {
    byStatus[status] = (await createElection(officer.id, { status })).id;
  }
  byStatus.ARCHIVED_DRAFT = (await createElection(officer.id, { status: "ARCHIVED", approvedAt: null })).id;
  for (const status of VISIBLE) {
    byStatus[status] = (await createElection(officer.id, { status, approvedAt })).id;
  }
  return { officer, byStatus };
}

describe("election visibility", () => {
  it("members list only elections from APPROVED onwards, with matching totals", async () => {
    await oneOfEach();
    const member = await createUser("MEMBER");
    const res = await api().get("/api/v1/elections?pageSize=50").set(bearer(member));
    expect(res.status).toBe(200);
    const statuses = res.body.data.elections.map((e: { status: string }) => e.status).sort();
    expect(statuses).toEqual([...VISIBLE].sort());
    expect(res.body.data.pagination.totalCount).toBe(VISIBLE.length);
  });

  it("a member filtering by a hidden status gets an empty list, not the drafts", async () => {
    await oneOfEach();
    const member = await createUser("MEMBER");
    const res = await api().get("/api/v1/elections?status=DRAFT").set(bearer(member));
    expect(res.status).toBe(200);
    expect(res.body.data.elections).toEqual([]);
    expect(res.body.data.pagination.totalCount).toBe(0);
    // Filtering by ARCHIVED returns the approved-then-cancelled one, not the cancelled draft.
    const archived = await api().get("/api/v1/elections?status=ARCHIVED").set(bearer(member));
    expect(archived.body.data.elections).toHaveLength(1);
    expect(archived.body.data.elections[0].approvedAt).not.toBeNull();
  });

  it("officers, administrators and auditors list every election", async () => {
    await oneOfEach();
    for (const role of ["ELECTION_OFFICER", "ELECTION_ADMINISTRATOR", "AUDITOR"] as const) {
      const res = await api().get("/api/v1/elections?pageSize=50").set(bearer(await createUser(role)));
      expect(res.body.data.pagination.totalCount).toBe(HIDDEN.length + VISIBLE.length);
    }
  });

  it("a member gets 404 (not 403) for a hidden election and its positions and candidates", async () => {
    const { byStatus } = await oneOfEach();
    const member = await createUser("MEMBER");
    for (const status of HIDDEN) {
      const id = byStatus[status];
      for (const path of [`/api/v1/elections/${id}`, `/api/v1/elections/${id}/positions`, `/api/v1/elections/${id}/candidates`]) {
        const res = await api().get(path).set(bearer(member));
        expect({ path: status + " " + path, status: res.status }).toEqual({ path: status + " " + path, status: 404 });
      }
    }
    // Same response as for an election that does not exist at all.
    const ghost = await api().get("/api/v1/elections/5c3e2a1b-5555-4e4e-9f9f-000000000000").set(bearer(member));
    const draft = await api().get(`/api/v1/elections/${byStatus.DRAFT}`).set(bearer(member));
    expect(draft.body).toEqual(ghost.body);
  });

  it("a member can open a visible election; staff can open a draft", async () => {
    const { byStatus } = await oneOfEach();
    expect((await api().get(`/api/v1/elections/${byStatus.APPROVED}`).set(bearer(await createUser("MEMBER")))).status).toBe(200);
    expect((await api().get(`/api/v1/elections/${byStatus.DRAFT}`).set(bearer(await createUser("AUDITOR")))).status).toBe(200);
  });
});

describe("candidate visibility", () => {
  async function mixedCandidates() {
    const officer = await createUser("ELECTION_OFFICER");
    const e = await createElection(officer.id, { status: "APPROVED" });
    const p = await createPosition(e.id);
    for (const status of ["APPROVED", "APPROVED", "PENDING_REVIEW", "REJECTED", "WITHDRAWN"] as const) {
      await createCandidate(e.id, p.id, status);
    }
    return e;
  }

  it("members do not receive the internal memberId; staff do", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const linked = await createUser("MEMBER");
    const e = await createElection(officer.id, { status: "APPROVED", approvedAt: new Date() });
    const p = await createPosition(e.id);
    const c = await createCandidate(e.id, p.id, "APPROVED");
    await prisma.candidate.update({ where: { id: c.id }, data: { memberId: linked.id } });

    const asMember = await api().get(`/api/v1/elections/${e.id}/candidates`).set(bearer(await createUser("MEMBER")));
    expect(asMember.body.data[0]).not.toHaveProperty("memberId");
    expect(JSON.stringify(asMember.body)).not.toContain(linked.id);
    const asOfficer = await api().get(`/api/v1/elections/${e.id}/candidates`).set(bearer(officer));
    expect(asOfficer.body.data[0].memberId).toBe(linked.id);
  });

  it("members see APPROVED candidates only, whatever status filter they send", async () => {
    const e = await mixedCandidates();
    const member = await createUser("MEMBER");
    const all = await api().get(`/api/v1/elections/${e.id}/candidates`).set(bearer(member));
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(2);
    expect(all.body.data.every((c: { status: string }) => c.status === "APPROVED")).toBe(true);

    for (const status of ["PENDING_REVIEW", "REJECTED", "WITHDRAWN"]) {
      const res = await api().get(`/api/v1/elections/${e.id}/candidates?status=${status}`).set(bearer(member));
      expect(res.body.data).toEqual([]);
    }
    expect((await api().get(`/api/v1/elections/${e.id}/candidates?status=APPROVED`).set(bearer(member))).body.data).toHaveLength(2);
  });

  it("staff see every candidate and can filter by any status", async () => {
    const e = await mixedCandidates();
    for (const role of ["ELECTION_OFFICER", "ELECTION_ADMINISTRATOR", "AUDITOR"] as const) {
      const h = bearer(await createUser(role));
      expect((await api().get(`/api/v1/elections/${e.id}/candidates`).set(h)).body.data).toHaveLength(5);
      expect((await api().get(`/api/v1/elections/${e.id}/candidates?status=REJECTED`).set(h)).body.data).toHaveLength(1);
    }
  });

  it("an unknown election is 404 for everyone", async () => {
    const id = "6d4f3b2c-6666-4f5f-8a8a-000000000000";
    for (const role of ["MEMBER", "ELECTION_OFFICER"] as const) {
      const h = bearer(await createUser(role));
      expect((await api().get(`/api/v1/elections/${id}/candidates`).set(h)).status).toBe(404);
      expect((await api().get(`/api/v1/elections/${id}/positions`).set(h)).status).toBe(404);
    }
  });
});

describe("approvedAt", () => {
  it("is set when an administrator approves, and stays null after a rejection", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    const rejected = await createElection(officer.id, { status: "PENDING_APPROVAL" });
    const approved = await createElection(officer.id, { status: "PENDING_APPROVAL" });

    const r = await api().post(`/api/v1/elections/${rejected.id}/review-approval`).set(bearer(admin)).send({ decision: "REJECT" });
    expect(r.body.data.approvedAt).toBeNull();
    const a = await api().post(`/api/v1/elections/${approved.id}/review-approval`).set(bearer(admin)).send({ decision: "APPROVE" });
    expect(a.body.data.approvedAt).not.toBeNull();
    expect((await prisma.election.findUniqueOrThrow({ where: { id: approved.id } })).approvedAt).not.toBeNull();
  });

  it("an approved election cancelled through DAT stays visible to members; a cancelled draft does not", async () => {
    const [o1, o2, o3] = [await createUser("ELECTION_OFFICER"), await createUser("ELECTION_OFFICER"), await createUser("ELECTION_OFFICER")];
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    const member = await createUser("MEMBER");
    const draft = await createElection(o1.id, { status: "DRAFT" });
    const approved = await createElection(o1.id, { status: "PENDING_APPROVAL" });
    await api().post(`/api/v1/elections/${approved.id}/review-approval`).set(bearer(admin)).send({ decision: "APPROVE" });

    for (const e of [draft, approved]) {
      const req = await api().post(`/api/v1/elections/${e.id}/cancel`).set(bearer(admin)).send({ reason: "Board decision" });
      await api().post(`/api/v1/approval-requests/${req.body.data.id}/decide`).set(bearer(o2)).send({ decision: "APPROVE" });
      await api().post(`/api/v1/approval-requests/${req.body.data.id}/decide`).set(bearer(o3)).send({ decision: "APPROVE" });
      expect((await prisma.election.findUniqueOrThrow({ where: { id: e.id } })).status).toBe("ARCHIVED");
    }

    expect((await api().get(`/api/v1/elections/${approved.id}`).set(bearer(member))).status).toBe(200);
    expect((await api().get(`/api/v1/elections/${draft.id}`).set(bearer(member))).status).toBe(404);
    const list = await api().get("/api/v1/elections").set(bearer(member));
    expect(list.body.data.elections.map((e: { id: string }) => e.id)).toEqual([approved.id]);
  });
});