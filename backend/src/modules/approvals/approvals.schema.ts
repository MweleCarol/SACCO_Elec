import { z } from "zod";

export const decisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().trim().max(1000).optional(),
});

export type DecisionInput = z.infer<typeof decisionSchema>;

export const listApprovalRequestsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED", "EXECUTED"]).optional(),
  actionType: z.enum([
    "ELECTION_ACTIVATION", "ELECTION_CANCELLATION", "ELECTION_RESCHEDULE",
    "CANDIDATE_APPROVAL", "RESULT_PUBLICATION", "MEMBERSHIP_SYNC_OVERRIDE",
  ]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListApprovalRequestsQuery = z.infer<typeof listApprovalRequestsQuerySchema>;

export const requestIdParamSchema = z.object({ id: z.string().uuid() });