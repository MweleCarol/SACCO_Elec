import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { PrismaClient } from "@prisma/client";
import { buildTrustRouter } from "@modules/trust/trust.routes.js";
import { errorHandler } from "@middleware/errorHandler.js";

export function buildApp(prisma: PrismaClient) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // Modules to add as they're built out: /auth, /members, /elections,
  // /candidates, /votes, /results, /audit — following the same
  // buildXRouter(prisma) pattern used here for /trust.
  app.use("/trust", buildTrustRouter(prisma));

  app.use(errorHandler);

  return app;
}