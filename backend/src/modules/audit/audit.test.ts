import { prisma } from "../../config/prisma";
import { computeAuditHash } from "../../shared/utils/hash";
import { writeAuditLog } from "./audit.service";
import { api, bearer, createUser } from "../../../tests/helpers";

async function writeSome(n: number, actorId: string) {
  for (let i = 0; i < n; i++) {
    await writeAuditLog({ actorId, action: "TEST_EVENT", outcome: "SUCCESS", metadata: { i, nested: { b: 2, a: 1 } } });
  }
}

describe("audit hashing", () => {
  it("is independent of metadata key order (jsonb reorders keys)", () => {
    const base = {
      actorId: "u", action: "A", resourceType: null, resourceId: null, electionId: null,
      outcome: "SUCCESS", createdAt: "2026-01-01T00:00:00.000Z", previousHash: "0".repeat(64),
    };
    expect(computeAuditHash({ ...base, metadata: { a: 1, b: { y: 2, x: 1 } } }))
      .toBe(computeAuditHash({ ...base, metadata: { b: { x: 1, y: 2 }, a: 1 } }));
    expect(computeAuditHash({ ...base, metadata: { a: 1 } })).not.toBe(computeAuditHash({ ...base, metadata: { a: 2 } }));
  });
});

describe("audit API", () => {
  it("only auditors and administrators can read the log", async () => {
    for (const role of ["MEMBER", "ELECTION_OFFICER"] as const) {
      const u = await createUser(role);
      expect((await api().get("/api/v1/audit-logs").set(bearer(u))).status).toBe(403);
      expect((await api().get("/api/v1/audit-logs/verify-chain").set(bearer(u))).status).toBe(403);
    }
  });

  it("lists, filters and fetches one entry", async () => {
    const auditor = await createUser("AUDITOR");
    await writeSome(3, auditor.id);
    await writeAuditLog({ actorId: auditor.id, action: "OTHER", outcome: "SUCCESS" });
    const res = await api().get("/api/v1/audit-logs?action=TEST_EVENT&pageSize=2").set(bearer(auditor));
    expect(res.body.data.logs).toHaveLength(2);
    expect(res.body.data.pagination.totalCount).toBe(3);
    const one = await api().get(`/api/v1/audit-logs/${res.body.data.logs[0].id}`).set(bearer(auditor));
    expect(one.status).toBe(200);
  });

  it("entries chain in strictly increasing time order", async () => {
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    await Promise.all(Array.from({ length: 10 }, (_, i) => writeAuditLog({ actorId: admin.id, action: "PARALLEL", outcome: "SUCCESS", metadata: { i } })));
    const rows = await prisma.auditLog.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].createdAt.getTime()).toBeGreaterThan(rows[i - 1].createdAt.getTime());
      expect(rows[i].previousHash).toBe(rows[i - 1].currentHash);
    }
  });

  it("verify-chain reports intact, then pinpoints a tampered row and a deleted row", async () => {
    const auditor = await createUser("AUDITOR");
    await writeSome(6, auditor.id);
    const ok = await api().get("/api/v1/audit-logs/verify-chain").set(bearer(auditor));
    expect(ok.body.data).toMatchObject({ recordsChecked: 6, intact: true, breaks: [] });

    const rows = await prisma.auditLog.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    await prisma.auditLog.update({ where: { id: rows[2].id }, data: { action: "TAMPERED" } });
    const tampered = await api().get("/api/v1/audit-logs/verify-chain").set(bearer(auditor));
    expect(tampered.body.data.intact).toBe(false);
    expect(tampered.body.data.breaks).toEqual([expect.objectContaining({ auditLogId: rows[2].id, reason: "HASH_MISMATCH" })]);

    await prisma.auditLog.update({ where: { id: rows[2].id }, data: { action: "TEST_EVENT" } });
    await prisma.auditLog.delete({ where: { id: rows[4].id } });
    const deleted = await api().get("/api/v1/audit-logs/verify-chain").set(bearer(auditor));
    expect(deleted.body.data.breaks).toEqual([expect.objectContaining({ auditLogId: rows[5].id, reason: "LINK_MISMATCH" })]);
  });

  it("a date-ranged verification checks only that range", async () => {
    const auditor = await createUser("AUDITOR");
    await writeSome(4, auditor.id);
    const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } });
    const res = await api().get(`/api/v1/audit-logs/verify-chain?dateFrom=${rows[1].createdAt.toISOString()}`).set(bearer(auditor));
    expect(res.body.data).toMatchObject({ recordsChecked: 3, intact: true });
  });

  it("never stores credentials in audit metadata during auth flows", async () => {
    const u = await createUser("MEMBER");
    await api().post("/api/v1/auth/login").send({ email: u.email, password: "WrongPass123" });
    await api().post("/api/v1/auth/login").send({ email: "ghost@test.local", password: "Secret123" });
    const all = JSON.stringify(await prisma.auditLog.findMany());
    expect(all).not.toContain("WrongPass123");
    expect(all).not.toContain("Secret123");
  });
});