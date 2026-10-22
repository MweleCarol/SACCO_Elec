import { z } from "zod";

// Query-string booleans are parsed explicitly: z.coerce.boolean() treats any
// non-empty string, including "false", as true.
export const listNotificationsQuerySchema = z.object({
  unreadOnly: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export const notificationIdParamSchema = z.object({ id: z.string().uuid() });