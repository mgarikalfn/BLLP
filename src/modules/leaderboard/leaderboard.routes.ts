import { Router } from "express";
import { getLeaderboard } from "./leaderboard.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", authenticate, getLeaderboard);

export default router;