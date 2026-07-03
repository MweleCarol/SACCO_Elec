import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { authenticate } from "@middleware/authenticate.js";
import { asyncHandler, validateBody } from "@shared/asyncHandler.js";
import {
  LoginSchema,
  VerifyTotpLoginSchema,
  EnrollTotpConfirmSchema,
  RefreshSchema,
  LogoutSchema,
} from "./auth.schemas.js";
import { buildAuthController } from "./auth.controller.js";

export function buildAuthRouter(prisma: PrismaClient): Router {
  const router = Router();
  const controller = buildAuthController(prisma);

  router.post("/login", validateBody(LoginSchema), asyncHandler(controller.login));
  router.post("/verify-totp", validateBody(VerifyTotpLoginSchema), asyncHandler(controller.verifyTotpLogin));
  router.post("/refresh", validateBody(RefreshSchema), asyncHandler(controller.refresh));
  router.post("/logout", validateBody(LogoutSchema), asyncHandler(controller.logout));

  // Authenticated: a user (any role) enrolling/confirming their own TOTP device.
  router.post("/totp/enroll", authenticate, asyncHandler(controller.enrollTotp));
  router.post(
    "/totp/confirm",
    authenticate,
    validateBody(EnrollTotpConfirmSchema),
    asyncHandler(controller.confirmTotp)
  );

  return router;
}