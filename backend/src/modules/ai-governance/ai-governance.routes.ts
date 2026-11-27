import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import { aiLimiter } from "../../shared/middleware/rateLimiter";
import * as controller from "./ai-governance.controller";
import {
   listInsightsQuerySchema, insightIdParamSchema, askCopilotSchema, askAssistantSchema, electionIdParamSchema,
} from "./ai-governance.schema";

const router = Router();
router.use(authenticate);

const readRoles = ["ELECTION_OFFICER", "ELECTION_ADMINISTRATOR", "AUDITOR"] as const;

router.post("/insights/scan", authorize("ELECTION_ADMINISTRATOR"), controller.scan);
router.get("/insights", authorize(...readRoles), validate({ query: listInsightsQuerySchema }), controller.list);
router.get("/insights/:id", authorize(...readRoles), validate({ params: insightIdParamSchema }), controller.getById);
router.post(
  "/insights/:id/acknowledge", authorize("ELECTION_OFFICER", "ELECTION_ADMINISTRATOR"),
  validate({ params: insightIdParamSchema }), controller.acknowledge
);
router.post(
  "/copilot/query", authorize("ELECTION_OFFICER", "ELECTION_ADMINISTRATOR"), aiLimiter,
  validate({ body: askCopilotSchema }), controller.askCopilot
);
// Members' help assistant: public election information only.
router.post(
  "/assistant/query", authorize("MEMBER"), aiLimiter,
  validate({ body: askAssistantSchema }), controller.askAssistant
);
router.get(
  "/reports/:electionId", authorize(...readRoles),
  validate({ params: electionIdParamSchema }), controller.getReport
);

export default router;