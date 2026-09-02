import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./candidates.controller";
import {
  createCandidateSchema, updateCandidateSchema, candidateDecisionSchema, withdrawCandidateSchema,
  listCandidatesQuerySchema, electionIdParamSchema, candidateIdParamSchema,
} from "./candidates.schema";

// Nested under /elections/:electionId/candidates
export const nestedRouter = Router({ mergeParams: true });
nestedRouter.use(authenticate);
nestedRouter.get("/", validate({ params: electionIdParamSchema, query: listCandidatesQuerySchema }), controller.list);
nestedRouter.post(
  "/", authorize("ELECTION_OFFICER"),
  validate({ params: electionIdParamSchema, body: createCandidateSchema }), controller.register
);

// Standalone /candidates/:id
export const standaloneRouter = Router();
standaloneRouter.use(authenticate);
standaloneRouter.patch(
  "/:id", authorize("ELECTION_OFFICER"),
  validate({ params: candidateIdParamSchema, body: updateCandidateSchema }), controller.update
);
standaloneRouter.post(
  "/:id/approve", authorize("ELECTION_OFFICER"),
  validate({ params: candidateIdParamSchema, body: candidateDecisionSchema }), controller.decide
);
// Note: /approve and /reject both hit the same controller.decide — the
// "decision" field in the (shared) body determines which. Two routes are
// exposed to match the API_CONTRACT.md endpoint list, but they're not
// actually distinct in the schema — see the note below the code block.
standaloneRouter.post(
  "/:id/reject", authorize("ELECTION_OFFICER"),
  validate({ params: candidateIdParamSchema, body: candidateDecisionSchema }), controller.decide
);
standaloneRouter.post(
  "/:id/withdraw", // no authorize() here — ELECTION_OFFICER or the candidate's own account, checked in the service
  validate({ params: candidateIdParamSchema, body: withdrawCandidateSchema }), controller.withdraw
);