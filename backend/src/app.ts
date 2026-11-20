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

  // Behind a reverse proxy or load balancer, trust that many hops so req.ip is
  // the real client IP. Without this, rate limiting treats everyone as one user.
  if (env.TRUST_PROXY_HOPS > 0) {
    app.set("trust proxy", env.TRUST_PROXY_HOPS);
  }

  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true, // lets the httpOnly refresh cookie be sent and received
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use(apiLimiter);

  app.get("/health", (_req, res) => {
    sendSuccess(res, { status: "ok", timestamp: new Date().toISOString() }, "Service is healthy.");
  });

  app.use("/api/v1", apiRouter);

  // After every real route: catches anything that didn't match.
  app.use(notFoundHandler);

  // Must be the last app.use(): Express recognises it by its 4 parameters.
  app.use(errorHandler);

  return app;
}