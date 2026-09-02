import { z } from "zod";

export const createCandidateSchema = z.object({
  positionId: z.string().uuid("Invalid position id."),
  displayName: z.string().trim().min(2, "Display name must be at least 2 characters."),
  manifesto: z.string().trim().max(5000).optional(),
  photoUrl: z.string().url("Must be a valid URL.").optional(),
  // Optional: links this candidate entry to an actual member account, e.g.
  // for displaying "verified member" status. A candidate can also just be
  // a name/profile with no linked account — the LLD doesn't require every
  // candidate to be a pre-existing member.
  memberId: z.string().uuid().optional(),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

export const updateCandidateSchema = z.object({
  displayName: z.string().trim().min(2).optional(),
  manifesto: z.string().trim().max(5000).optional(),
  photoUrl: z.string().url().optional(),
});

export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;

export const candidateDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().trim().optional(),
});

export type CandidateDecisionInput = z.infer<typeof candidateDecisionSchema>;

export const withdrawCandidateSchema = z.object({
  reason: z.string().trim().optional(),
});

export type WithdrawCandidateInput = z.infer<typeof withdrawCandidateSchema>;

export const electionIdParamSchema = z.object({ electionId: z.string().uuid() });
export const candidateIdParamSchema = z.object({ id: z.string().uuid() });

export const listCandidatesQuerySchema = z.object({
  status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED", "WITHDRAWN"]).optional(),
  positionId: z.string().uuid().optional(),
});

export type ListCandidatesQuery = z.infer<typeof listCandidatesQuerySchema>;