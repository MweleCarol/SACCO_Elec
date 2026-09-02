import { z } from "zod";

export const createPositionSchema = z.object({
  name: z.string().trim().min(2, "Position name must be at least 2 characters."),
  description: z.string().trim().optional(),
  seats: z.coerce.number().int().min(1).default(1),
  order: z.coerce.number().int().min(0).default(0),
});

export type CreatePositionInput = z.infer<typeof createPositionSchema>;

export const updatePositionSchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  seats: z.coerce.number().int().min(1).optional(),
  order: z.coerce.number().int().min(0).optional(),
});

export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;

export const electionIdParamSchema = z.object({ electionId: z.string().uuid() });
export const positionIdParamSchema = z.object({ id: z.string().uuid() });