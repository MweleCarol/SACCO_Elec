import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { PrismaClient } from "@prisma/client";
import { buildAuthRouter } from "@modules/auth/auth.routes.js";
import { buildTrustRouter } from "@modules/trust/trust.routes.js";
import { errorHandler } from "@middleware/errorHandler.js";

export function buildApp(prisma: PrismaClient) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Modules to add as they're built out: /members, /elections,
  // /candidates, /votes, /results, /audit — following the same
  // buildXRouter(prisma) pattern used here.
  app.use("/auth", buildAuthRouter(prisma));
  app.use("/trust", buildTrustRouter(prisma));

  app.use(errorHandler);

  return app;
}