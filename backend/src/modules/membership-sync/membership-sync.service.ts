import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma";
import { writeAuditLog } from "../audit/audit.service";
import { MemberRecord } from "./membership-sync.schema";

export interface SyncResultDto {
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: { membershipNumber: string; reason: string }[];
}

// Placeholder email for members whose export record has no email yet —
// they cannot log in with this (no password is ever set for it), and
// /auth/register requires them to supply a real email before activation,
// at which point this placeholder gets overwritten. Needed because User.email
// is @unique and NOT NULL, so a synced-but-not-yet-registered member must
// have SOME value here.
function placeholderEmail(membershipNumber: string): string {
  return `pending+${membershipNumber.toLowerCase()}@sevs.local`;
}

// One record at a time, not a single bulk operation, deliberately: a
// malformed row 400 records into a 500-record export shouldn't roll back
// the 399 good ones ahead of it. Each record's success/failure is
// independent and reported individually in the result.
async function syncOneRecord(
  record: MemberRecord
): Promise<{ outcome: "created" | "updated" | "failed"; reason?: string }> {
  try {
    const existing = await prisma.user.findUnique({
      where: { membershipNumber: record.membershipNumber },
    });

    if (existing) {
      // Only touch fields that are genuinely re-synced from the source of
      // truth. Never touch email, passwordHash, or status here — those
      // belong to the member once they've registered, and a re-sync must
      // not silently reactivate a password or flip an ACTIVE member back
      // to PENDING_ACTIVATION.
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: record.fullName,
          nationalId: record.nationalId,
          branch: record.branch,
          membershipStatus: record.membershipStatus,
          lastSyncedAt: new Date(),
        },
      });
      return { outcome: "updated" };
    }

    const unusableHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

    await prisma.user.create({
      data: {
        email: record.email ?? placeholderEmail(record.membershipNumber),
        passwordHash: unusableHash,
        role: "MEMBER",
        status: "PENDING_ACTIVATION",
        fullName: record.fullName,
        membershipNumber: record.membershipNumber,
        nationalId: record.nationalId,
        branch: record.branch,
        membershipStatus: record.membershipStatus,
        lastSyncedAt: new Date(),
      },
    });
    return { outcome: "created" };
  } catch (err) {
    return { outcome: "failed", reason: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function runMembershipSync(
  records: MemberRecord[],
  actingAdminId: string
): Promise<SyncResultDto> {
  const result: SyncResultDto = {
    recordsProcessed: records.length,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    errors: [],
  };

  for (const record of records) {
    const outcome = await syncOneRecord(record);
    if (outcome.outcome === "created") result.recordsCreated++;
    else if (outcome.outcome === "updated") result.recordsUpdated++;
    else {
      result.recordsFailed++;
      result.errors.push({ membershipNumber: record.membershipNumber, reason: outcome.reason ?? "Unknown" });
    }
  }

  // This IS the "MembershipSyncRun" history from the original 17-table
  // design, now living as a single AuditLog row instead of its own table
  // — the consolidation decision from Section 2.1 of the schema review.
  await writeAuditLog({
    actorId: actingAdminId,
    action: "MEMBERSHIP_SYNC_COMPLETED",
    outcome: result.recordsFailed > 0 ? "SUCCESS" : "SUCCESS", // sync can partially fail without the overall action being a failure
    metadata: {
      recordsProcessed: result.recordsProcessed,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      recordsFailed: result.recordsFailed,
      errorSummary: result.errors,
    },
  });

  return result;
}