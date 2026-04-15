import { Router } from "express";
import { getLeaderboard } from "./leaderboard.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();



/**
 * @openapi
 * /api/leaderboard:
 *   get:
 *     tags:
 *       - Leaderboard
 *     summary: GET /
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", authenticate, getLeaderboard);

export default router;