import type { PrismaClient, ActionType, ApprovalDecision } from "@prisma/client";
import { hashPayload } from "@shared/canonicalHash.js";
import { verifyApprovalSignature } from "./trust.crypto.js";
import {
  DuplicateApprovalError,
  InvalidSignatureError,
  ActionExpiredError,
  ActionAlreadyFinalizedError,
  TrusteeInactiveError,
  NotFoundError,
  ThresholdMisconfiguredError,
} from "@shared/errors.js";
import { env } from "@config/env.js";

/**
 * An action handler executes the real side effect (e.g. actually opening an
 * election, actually triggering a tally) once quorum has been reached.
 * Handlers must be idempotent: EXECUTED is a terminal state and the handler
 * for a given PendingAction id will never be invoked twice, but it should
 * still tolerate being re-run safely (defence in depth).
 *
 * Each module (elections, votes, trust itself for trustee lifecycle changes)
 * registers its own handler for the ActionTypes it owns; this module never
 * hard-codes knowledge of what an election or a tally actually is.
 */
export type ActionHandler = (payload: unknown, prisma: PrismaClient) => Promise<void>;

const handlers = new Map<ActionType, ActionHandler>();

export function registerActionHandler(type: ActionType, handler: ActionHandler): void {
  handlers.set(type, handler);
}

interface ProposeActionInput {
  actionType: ActionType;
  payload: unknown;
  proposedByTrusteeId: string;
}

export async function proposeAction(prisma: PrismaClient, input: ProposeActionInput) {
  const proposer = await prisma.trustee.findUnique({ where: { id: input.proposedByTrusteeId } });
  if (!proposer) throw new NotFoundError("Trustee");
  if (!proposer.isActive) throw new TrusteeInactiveError();

  if (env.TRUST_THRESHOLD_M < 2 || env.TRUST_THRESHOLD_M > env.TRUST_POOL_SIZE_N) {
    throw new ThresholdMisconfiguredError();
  }

  const payloadHash = hashPayload(input.payload);
  const expiresAt = new Date(Date.now() + env.TRUST_ACTION_EXPIRY_HOURS * 60 * 60 * 1000);

  return prisma.pendingAction.create({
    data: {
      actionType: input.actionType,
      payloadJson: input.payload as any,
      payloadHash,
      proposedByTrusteeId: input.proposedByTrusteeId,
      threshold: env.TRUST_THRESHOLD_M,
      expiresAt,
      status: "PENDING",
    },
  });
}

interface SubmitApprovalInput {
  pendingActionId: string;
  trusteeId: string;
  decision: ApprovalDecision;
  signatureBase64: string;
}

/**
 * Records one trustee's signed decision on a PendingAction. If this
 * approval brings the running total to (or past) the configured threshold,
 * the associated action handler is executed exactly once within the same
 * transaction that flips status to EXECUTED, so a crash between "counted"
 * and "executed" cannot happen.
 */
export async function submitApproval(prisma: PrismaClient, input: SubmitApprovalInput) {
  return prisma.$transaction(async (tx) => {
    const action = await tx.pendingAction.findUnique({
      where: { id: input.pendingActionId },
      include: { approvals: true },
    });
    if (!action) throw new NotFoundError("PendingAction");

    if (action.status !== "PENDING") {
      throw new ActionAlreadyFinalizedError();
    }
    if (action.expiresAt.getTime() < Date.now()) {
      await tx.pendingAction.update({ where: { id: action.id }, data: { status: "EXPIRED" } });
      throw new ActionExpiredError();
    }

    const trustee = await tx.trustee.findUnique({ where: { id: input.trusteeId } });
    if (!trustee) throw new NotFoundError("Trustee");
    if (!trustee.isActive) throw new TrusteeInactiveError();

    const alreadyDecided = action.approvals.some((a) => a.trusteeId === input.trusteeId);
    if (alreadyDecided) throw new DuplicateApprovalError();

    const validSignature = verifyApprovalSignature(
      action.payloadHash,
      input.signatureBase64,
      trustee.publicKey
    );
    if (!validSignature) throw new InvalidSignatureError();

    await tx.approval.create({
      data: {
        pendingActionId: action.id,
        trusteeId: input.trusteeId,
        decision: input.decision,
        signature: input.signatureBase64,
      },
    });

    if (input.decision === "REJECT") {
      // Rejections are recorded but do not block other trustees from still
      // approving — only an explicit reject-threshold policy (not modelled
      // here) would short-circuit early. Absence of quorum is handled by
      // natural expiry.
      return tx.pendingAction.findUniqueOrThrow({ where: { id: action.id }, include: { approvals: true } });
    }

    const approveCount = action.approvals.filter((a) => a.decision === "APPROVE").length + 1;

    if (approveCount < action.threshold) {
      return tx.pendingAction.findUniqueOrThrow({ where: { id: action.id }, include: { approvals: true } });
    }

    // Threshold reached: execute the registered handler for this action type.
    const handler = handlers.get(action.actionType);
    if (handler) {
      await handler(action.payloadJson, tx as unknown as PrismaClient);
    }

    return tx.pendingAction.update({
      where: { id: action.id },
      data: { status: "EXECUTED", executedAt: new Date() },
      include: { approvals: true },
    });
  });
}

/**
 * Sweeps PendingActions whose expiry has passed without reaching quorum and
 * marks them EXPIRED. Intended to be run on a schedule (cron/worker), since
 * an action with too few approvals should not silently stay PENDING forever.
 */
export async function expireOverdueActions(prisma: PrismaClient): Promise<number> {
  const result = await prisma.pendingAction.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  return result.count;
}