import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate } from "@middleware/authenticate.js";
import { authAttemptLimiter, refreshLimiter } from "@middleware/rateLimiter.js";
import { asyncHandler, validateBody } from "@shared/asyncHandler.js";
import {
  LoginSchema,
  VerifyTotpLoginSchema,
  EnrollTotpSchema,
  EnrollTotpConfirmSchema,
  RefreshSchema,
  LogoutSchema,
} from "./auth.schemas.js";
import { buildAuthController } from "./auth.controller.js";

export function buildAuthRouter(prisma: PrismaClient): Router {
  const router = Router();
  const controller = buildAuthController(prisma);

  router.post("/login", authAttemptLimiter, validateBody(LoginSchema), asyncHandler(controller.login));
  router.post(
    "/verify-totp",
    authAttemptLimiter,
    validateBody(VerifyTotpLoginSchema),
    asyncHandler(controller.verifyTotpLogin)
  );
  router.post("/refresh", refreshLimiter, validateBody(RefreshSchema), asyncHandler(controller.refresh));
  router.post("/logout", validateBody(LogoutSchema), asyncHandler(controller.logout));

  // Authenticated: a user (any role) enrolling/confirming their own TOTP device.
  router.post(
    "/totp/enroll",
    authenticate,
    authAttemptLimiter,
    validateBody(EnrollTotpSchema),
    asyncHandler(controller.enrollTotp)
  );
  router.post(
    "/totp/confirm",
    authenticate,
    authAttemptLimiter,
    validateBody(EnrollTotpConfirmSchema),
    asyncHandler(controller.confirmTotp)
  );

  return router;
}