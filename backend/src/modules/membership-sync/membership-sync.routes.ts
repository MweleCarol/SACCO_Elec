import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./membership-sync.controller";
import { runSyncSchema } from "./membership-sync.schema";

const router = Router();

router.use(authenticate, authorize("ELECTION_ADMINISTRATOR"));

router.post("/run", validate({ body: runSyncSchema }), controller.runSync);

export default router;