import { z } from "zod";

export const listInsightsQuerySchema = z.object({
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  eventType: z.string().optional(),
  acknowledgedOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type ListInsightsQuery = z.infer<typeof listInsightsQuerySchema>;

export const insightIdParamSchema = z.object({ id: z.string().uuid() });

export const askCopilotSchema = z.object({
  question: z.string().trim().min(3, "Question is too short.").max(1000),
});
export type AskCopilotInput = z.infer<typeof askCopilotSchema>;

export const electionIdParamSchema = z.object({ electionId: z.string().uuid() });