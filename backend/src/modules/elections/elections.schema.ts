import { z } from "zod";

export const createElectionSchema = z
  .object({
    name: z.string().trim().min(3, "Election name must be at least 3 characters."),
    description: z.string().trim().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    requiredApprovals: z.coerce.number().int().min(1).max(10).default(2),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date.",
    path: ["endDate"],
  })
  .refine((data) => data.startDate > new Date(), {
    message: "Start date must be in the future.",
    path: ["startDate"],
  });

export type CreateElectionInput = z.infer<typeof createElectionSchema>;

// Same date/order rules as create, but every field optional since this is
// a PATCH — validated together at the service layer once merged with the
// existing record, since a partial update could still produce an invalid
// combination (e.g. only endDate supplied, landing before the unchanged
// startDate).
export const updateElectionSchema = z.object({
  name: z.string().trim().min(3).optional(),
  description: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  requiredApprovals: z.coerce.number().int().min(1).max(10).optional(),
});

export type UpdateElectionInput = z.infer<typeof updateElectionSchema>;

export const rescheduleElectionSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date.",
    path: ["endDate"],
  });

export type RescheduleElectionInput = z.infer<typeof rescheduleElectionSchema>;

export const cancelElectionSchema = z.object({
  reason: z.string().trim().min(5, "A cancellation reason is required."),
});

export type CancelElectionInput = z.infer<typeof cancelElectionSchema>;

// Temporary stopgap decision endpoint — see the note in
// elections.service.ts. Shape mirrors what the real DAT decision endpoint
// (Phase 7) will look like, so swapping the implementation later doesn't
// require frontend changes to this part of the flow.
export const reviewApprovalSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().trim().optional(),
});

export type ReviewApprovalInput = z.infer<typeof reviewApprovalSchema>;

export const electionIdParamSchema = z.object({
  id: z.string().uuid("Invalid election id."),
});

export const listElectionsQuerySchema = z.object({
  status: z.enum([
    "DRAFT", "PENDING_APPROVAL", "APPROVED", "SCHEDULED", "ACTIVE", "CLOSED", "RESULTS_PUBLISHED", "ARCHIVED",
  ]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListElectionsQuery = z.infer<typeof listElectionsQuerySchema>;