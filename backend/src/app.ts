import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { apiLimiter } from "./shared/middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./shared/middleware/errorHandler";
import { sendSuccess } from "./shared/responses/ApiResponse";
import apiRouter from "./routes";

export function createApp(): Application {
  const app = express();

  // Security headers first, before anything else touches the request.
  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true, // required so the refresh-token httpOnly cookie (Phase 2) is sent/received
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  // Backstop rate limit on the whole API — authLimiter (stricter) gets
  // applied on top of this at the auth routes specifically, in Phase 2.
  app.use(apiLimiter);

  // Unauthenticated, unversioned — for uptime checks / load balancer
  // health probes, not part of the public API contract.
  app.get("/health", (req, res) => {
    sendSuccess(res, { status: "ok", timestamp: new Date().toISOString() }, "Service is healthy.");
  });

  app.use("/api/v1", apiRouter);

  // Must come after every real route: catches anything that didn't match.
  app.use(notFoundHandler);

  // Must be the LAST app.use() call of all: Express identifies this as an
  // error handler specifically because it has 4 parameters (err, req, res,
  // next) — any middleware/route calling next(err) anywhere above lands here.
  app.use(errorHandler);

  return app;
}