import { Router } from "express";
import {
  reviewLesson,
  getDueLessons,
  startStudySession,
  getStudyStats,
  getWeakAreas,
  getUserLevel,
  getLeaderboard,
  getRelativeLeaderboard,
  getSeasonLeaderboard,
  getSeasonTier,
} from "./study.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();



/**
 * @openapi
 * /api/study/review:
 *   post:
 *     tags:
 *       - Study
 *     summary: POST /review
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessonId, quality]
 *             properties:
 *               lessonId:
 *                 type: string
 *                 description: Lesson ObjectId
 *               quality:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *                 description: SM-2 quality score
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/review", authenticate, reviewLesson);


/**
 * @openapi
 * /api/study/due:
 *   get:
 *     tags:
 *       - Study
 *     summary: GET /due
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/due", authenticate, getDueLessons);


/**
 * @openapi
 * /api/study/session:
 *   get:
 *     tags:
 *       - Study
 *     summary: GET /session
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/session", authenticate, startStudySession);


/**
 * @openapi
 * /api/study/stats:
 *   get:
 *     tags:
 *       - Study
 *     summary: GET /stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/stats", authenticate, getStudyStats);


/**
 * @openapi
 * /api/study/weak:
 *   get:
 *     tags:
 *       - Study
 *     summary: GET /weak
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/weak", authenticate, getWeakAreas);


/**
 * @openapi
 * /api/study/level:
 *   get:
 *     tags:
 *       - Study
 *     summary: GET /level
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/level", authenticate, getUserLevel);


/**
 * @openapi
 * /api/study/leaderboard:
 *   get:
 *     tags:
 *       - Study
 *     summary: GET /leaderboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/leaderboard", authenticate, getLeaderboard);


/**
 * @openapi
 * /api/study/leaderboard/relative:
 *   get:
 *     tags:
 *       - Study
 *     summary: GET /leaderboard/relative
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/leaderboard/relative", authenticate, getRelativeLeaderboard);


/**
 * @openapi
 * /api/study/leaderboard/season:
 *   get:
 *     tags:
 *       - Study
 *     summary: GET /leaderboard/season
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/leaderboard/season", authenticate, getSeasonLeaderboard);


/**
 * @openapi
 * /api/study/season/tier:
 *   get:
 *     tags:
 *       - Study
 *     summary: GET /season/tier
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/season/tier", authenticate, getSeasonTier);

export default router;
