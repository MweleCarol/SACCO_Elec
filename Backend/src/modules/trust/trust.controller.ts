import type { Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { proposeAction, submitApproval } from "./trust.service.js";
import { NotFoundError, ValidationError, AuthenticationError } from "@shared/errors.js";
import { verifyTotpCode } from "@modules/auth/totp.service.js";

// Express 5's ParamsDictionary types values as `string | string[]` (to allow
// repeated route params); our routes never repeat a param name, so this
// narrows it back to the single string we actually expect.
function paramId(value: string | string[]): string {
  if (Array.isArray(value)) throw new ValidationError("Malformed route parameter");
  return value;
}

/**
 * Re-verifies the acting trustee's TOTP code at the moment of an
 * approve/reject decision — a signature alone only proves possession of
 * the private key; TOTP additionally proves the human is present and
 * authenticated right now, matching HLD 8.2/8.5.
 */
async function assertLiveTotp(prisma: PrismaClient, userId: string, code: string): Promise<void> {
  const totpSecret = await prisma.totpSecret.findUnique({ where: { userId } });
  if (!totpSecret?.enabled) {
    throw new AuthenticationError("TOTP must be enabled on this trustee's account to approve or reject actions");
  }
  const valid = await verifyTotpCode(totpSecret.secret, code);
  if (!valid) throw new AuthenticationError("Invalid TOTP code");
}

export function buildTrustController(prisma: PrismaClient) {
  return {
    async propose(req: Request, res: Response) {
      const { actionType, payload } = res.locals.validated;
      const trusteeId = req.user!.trusteeId!;
      const action = await proposeAction(prisma, { actionType, payload, proposedByTrusteeId: trusteeId });
      res.status(201).json({ data: action });
    },

    async list(_req: Request, res: Response) {
      const actions = await prisma.pendingAction.findMany({
        include: { approvals: true, proposedBy: { select: { id: true, userId: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json({ data: actions });
    },

    async getOne(req: Request, res: Response) {
      const action = await prisma.pendingAction.findUnique({
        where: { id: paramId(req.params.id) },
        include: { approvals: true },
      });
      if (!action) throw new NotFoundError("PendingAction");
      res.json({ data: action });
    },

    async approve(req: Request, res: Response) {
      const { signature, totpCode } = res.locals.validated;
      await assertLiveTotp(prisma, req.user!.userId, totpCode);
      const trusteeId = req.user!.trusteeId!;
      const action = await submitApproval(prisma, {
        pendingActionId: paramId(req.params.id),
        trusteeId,
        decision: "APPROVE",
        signatureBase64: signature,
      });
      res.json({ data: action });
    },

    async reject(req: Request, res: Response) {
      const { signature, totpCode } = res.locals.validated;
      await assertLiveTotp(prisma, req.user!.userId, totpCode);
      const trusteeId = req.user!.trusteeId!;
      const action = await submitApproval(prisma, {
        pendingActionId: paramId(req.params.id),
        trusteeId,
        decision: "REJECT",
        signatureBase64: signature,
      });
      res.json({ data: action });
    },
  };
}