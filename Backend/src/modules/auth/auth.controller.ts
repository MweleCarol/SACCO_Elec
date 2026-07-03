import type { Request, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import * as authService from "./auth.service.js";
import { AuthenticationError } from "@shared/errors.js";

export function buildAuthController(prisma: PrismaClient) {
  return {
    async login(_req: Request, res: Response) {
      const { email, password } = res.locals.validated;
      const result = await authService.login(prisma, { email, password });
      res.status(200).json({ data: result });
    },

    async verifyTotpLogin(_req: Request, res: Response) {
      const { preAuthToken, code } = res.locals.validated;
      const tokens = await authService.completeTotpLogin(prisma, { preAuthToken, code });
      res.status(200).json({ data: { status: "AUTHENTICATED", ...tokens } });
    },

    async refresh(_req: Request, res: Response) {
      const { refreshToken } = res.locals.validated;
      const tokens = await authService.refreshTokens(prisma, refreshToken);
      res.status(200).json({ data: tokens });
    },

    async logout(_req: Request, res: Response) {
      const { refreshToken } = res.locals.validated;
      await authService.logout(prisma, refreshToken);
      res.status(204).send();
    },

    async enrollTotp(req: Request, res: Response) {
      if (!req.user) throw new AuthenticationError();
      const result = await authService.startTotpEnrollment(prisma, req.user.userId);
      res.status(200).json({ data: result });
    },

    async confirmTotp(req: Request, res: Response) {
      if (!req.user) throw new AuthenticationError();
      const { code } = res.locals.validated;
      await authService.confirmTotpEnrollment(prisma, req.user.userId, code);
      res.status(200).json({ data: { enabled: true } });
    },
  };
}