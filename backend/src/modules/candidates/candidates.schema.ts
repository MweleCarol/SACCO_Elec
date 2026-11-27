import { z } from "zod";



export const candidateDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().trim().optional(),
});

export type CandidateDecisionInput = z.infer<typeof candidateDecisionSchema>;

// Officers must give a reason (checked in the service, because members
// withdrawing themselves need not); the member is told it.
export const withdrawCandidateSchema = z.object({
  reason: z.string().trim().max(500, "Keep the reason under 500 characters.").optional(),
});

export type WithdrawCandidateInput = z.infer<typeof withdrawCandidateSchema>;

export const electionIdParamSchema = z.object({ electionId: z.string().uuid() });
export const candidateIdParamSchema = z.object({ id: z.string().uuid() });

export const listCandidatesQuerySchema = z.object({
  status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED", "WITHDRAWN"]).optional(),
  positionId: z.string().uuid().optional(),
});

export type ListCandidatesQuery = z.infer<typeof listCandidatesQuerySchema>;


// A member putting themselves forward. Name and account come from the
// logged-in user, never from the request body.
export const selfNominationSchema = z.object({
  positionId: z.string().uuid("Choose a position."),
  manifesto: z
    .string()
    .trim()
    .min(50, "Your manifesto must be at least 50 characters.")
    .max(5000, "Your manifesto must be 5,000 characters or fewer."),
});

export type SelfNominationInput = z.infer<typeof selfNominationSchema>;