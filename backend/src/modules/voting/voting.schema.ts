import { z } from "zod";

const ballotSelectionSchema = z.object({
  positionId: z.string().uuid(),
  candidateId: z.string().uuid(),
});

export const submitBallotSchema = z.object({
  selections: z.array(ballotSelectionSchema).min(1, "At least one selection is required."),
});

export type SubmitBallotInput = z.infer<typeof submitBallotSchema>;

export const electionIdParamSchema = z.object({ electionId: z.string().uuid() });