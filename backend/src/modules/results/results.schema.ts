import { z } from "zod";

export const electionIdParamSchema = z.object({ electionId: z.string().uuid() });