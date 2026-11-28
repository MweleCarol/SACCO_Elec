import { z } from "zod";

// A rejection closes the request for everyone (veto), so it must say why:
// the requester is told the reason.
export const decisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    comment: z.string().trim().max(1000, "Keep the comment under 1000 characters.").optional(),
  })
  .refine((d) => d.decision !== "REJECT" || (d.comment?.length ?? 0) >= 10, {
    message: "Explain why you are rejecting, in at least 10 characters. The requester will see it.",
    path: ["comment"],
  });

export type DecisionInput = z.infer<typeof decisionSchema>;

export const listApprovalRequestsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "EXPIRED", "EXECUTED"]).optional(),
  actionType: z.enum([
    "ELECTION_ACTIVATION", "ELECTION_CANCELLATION", "ELECTION_RESCHEDULE",
    "CANDIDATE_APPROVAL", "RESULT_PUBLICATION", "MEMBERSHIP_SYNC_OVERRIDE",
  ]).optional(),
  // "true": still waiting (PENDING), most urgent first. "false": decided or
  // expired, newest first. Ignored when a specific status is given.
  open: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListApprovalRequestsQuery = z.infer<typeof listApprovalRequestsQuerySchema>;

export const requestIdParamSchema = z.object({ id: z.string().uuid() });