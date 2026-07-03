import type { Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { proposeAction, submitApproval } from "./trust.service.js";
import { NotFoundError, ValidationError } from "@shared/errors.js";

// Express 5's ParamsDictionary types values as `string | string[]` (to allow
// repeated route params); our routes never repeat a param name, so this
// narrows it back to the single string we actually expect.
function paramId(value: string | string[]): string {
  if (Array.isArray(value)) throw new ValidationError("Malformed route parameter");
  return value;
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
      const { signature } = res.locals.validated;
      // NOTE: totpCode re-verification against the trustee's TotpSecret happens
      // here once the auth module's TOTP verifier is available; omitted in
      // this scaffold to avoid a half-implemented security check.
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
      const { signature } = res.locals.validated;
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