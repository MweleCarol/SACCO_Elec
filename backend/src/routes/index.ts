import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import usersRoutes from "../modules/users/users.routes";
import membershipSyncRoutes from "../modules/membership-sync/membership-sync.routes";
import electionsRoutes from "../modules/elections/elections.routes";
import { nestedRouter as positionsNestedRoutes, standaloneRouter as positionsStandaloneRoutes } from "../modules/positions/positions.routes";
import { nestedRouter as candidatesNestedRoutes, standaloneRouter as candidatesStandaloneRoutes } from "../modules/candidates/candidates.routes";
import { router as votingRoutes } from "../modules/voting/voting.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/membership-sync", membershipSyncRoutes);
router.use("/elections", electionsRoutes);
router.use("/elections/:electionId/positions", positionsNestedRoutes);
router.use("/positions", positionsStandaloneRoutes);
router.use("/elections/:electionId/candidates", candidatesNestedRoutes);
router.use("/candidates", candidatesStandaloneRoutes);
router.use("/elections/:electionId", votingRoutes);

export default router;