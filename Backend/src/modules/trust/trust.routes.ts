import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate, requireRole } from "@middleware/authenticate.js";
import { authAttemptLimiter } from "@middleware/rateLimiter.js";
import { asyncHandler, validateBody } from "@shared/asyncHandler.js";
import { ProposeActionSchema, ApprovalDecisionInputSchema } from "./trust.schemas.js";
import { buildTrustController } from "./trust.controller.js";

export function buildTrustRouter(prisma: PrismaClient): Router {
  const router = Router();
  const controller = buildTrustController(prisma);

  router.use(authenticate, requireRole("TRUSTEE_ADMIN"));

  router.post("/actions", validateBody(ProposeActionSchema), asyncHandler(controller.propose));
  router.get("/actions", asyncHandler(controller.list));
  router.get("/actions/:id", asyncHandler(controller.getOne));
  router.post(
    "/actions/:id/approve",
    authAttemptLimiter,
    validateBody(ApprovalDecisionInputSchema),
    asyncHandler(controller.approve)
  );
  router.post(
    "/actions/:id/reject",
    authAttemptLimiter,
    validateBody(ApprovalDecisionInputSchema),
    asyncHandler(controller.reject)
  );

  return router;
}