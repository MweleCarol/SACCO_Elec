import { z } from "zod";

// One record from the simulated "SACCO export." membershipStatus maps
// directly to the MembershipStatus enum already on User — anything other
// than ACTIVE gets synced but won't be eligible to register or vote.
const memberRecordSchema = z.object({
  membershipNumber: z.string().trim().min(1),
  nationalId: z.string().trim().min(1).optional(),
  fullName: z.string().trim().min(2),
  branch: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email().optional(),
  membershipStatus: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "EXITED"]).default("ACTIVE"),
});

export const runSyncSchema = z.object({
  records: z.array(memberRecordSchema).min(1, "At least one member record is required."),
});

export type RunSyncInput = z.infer<typeof runSyncSchema>;
export type MemberRecord = z.infer<typeof memberRecordSchema>;