import { z } from "zod";

export const ActionTypeEnum = z.enum([
  "CREATE_ELECTION",
  "PUBLISH_ELECTION",
  "FORCE_OPEN_CLOSE",
  "TRIGGER_TALLY",
  "PUBLISH_RESULTS",
  "ADD_TRUSTEE",
  "REMOVE_TRUSTEE",
  "CHANGE_THRESHOLD",
]);

export const ProposeActionSchema = z.object({
  actionType: ActionTypeEnum,
  payload: z.record(z.string(), z.unknown()),
});

export const ApprovalDecisionInputSchema = z.object({
  signature: z.string().min(1, "signature is required"),
  totpCode: z.string().length(6, "TOTP code must be 6 digits"),
});