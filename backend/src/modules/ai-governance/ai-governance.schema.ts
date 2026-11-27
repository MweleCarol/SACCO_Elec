import { z } from "zod";

export const listInsightsQuerySchema = z.object({
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  eventType: z.string().optional(),
  // Parsed explicitly: z.coerce.boolean() would treat "false" as true.
  acknowledgedOnly: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
export type ListInsightsQuery = z.infer<typeof listInsightsQuerySchema>;

export const insightIdParamSchema = z.object({ id: z.string().uuid() });

// The last few turns of the conversation, so follow-up questions make sense.
// Kept short: it is sent to the model with every question.
const chatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(2000),
});

export const askCopilotSchema = z.object({
  question: z.string().trim().min(3, "Question is too short.").max(1000, "Keep your question under 1000 characters."),
  history: z.array(chatTurnSchema).max(6).default([]),
});
export type AskCopilotInput = z.infer<typeof askCopilotSchema>;
export type ChatTurn = z.infer<typeof chatTurnSchema>;

// The member help assistant takes the same shape.
export const askAssistantSchema = askCopilotSchema;

export const electionIdParamSchema = z.object({ electionId: z.string().uuid() });