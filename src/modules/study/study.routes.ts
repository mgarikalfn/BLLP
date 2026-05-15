import { Router } from "express";
import {
  reviewFlashcard,
  getDueLessons,
  startStudySession,
  submitTopicTest,
  getStudyStats,
  getWeakAreas,
  getUserLevel,
  getLeaderboard,
  getRelativeLeaderboard,
  getSeasonLeaderboard,
  getSeasonTier,
} from "./study.controller";
import { startCertification, submitCertification, getCertificate } from "./certification.controller";
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
 *             required: [targetId, type, quality]
 *             properties:
 *               targetId:
 *                 type: string
 *                 description: Vocabulary ObjectId
 *               type:
 *                 type: string
 *                 enum: [VOCABULARY]
 *               quality:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *                 description: SM-2 quality score
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/review", authenticate, reviewFlashcard);


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
 * /api/study/progress/topic-test:
 *   post:
 *     tags:
 *       - Study
 *     summary: POST /progress/topic-test
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topicId, score]
 *             properties:
 *               topicId:
 *                 type: string
 *               score:
 *                 type: number
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/progress/topic-test", authenticate, submitTopicTest);


/**
 * @openapi
 * /api/study/certifications/start:
 *   post:
 *     tags:
 *       - Study
 *     summary: POST /certifications/start
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [level]
 *             properties:
 *               level:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/certifications/start", authenticate, startCertification);


/**
 * @openapi
 * /api/study/certifications/{attemptId}/submit:
 *   post:
 *     tags:
 *       - Study
 *     summary: POST /certifications/{attemptId}/submit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers]
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [questionId, answerGiven]
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     answerGiven:
 *                       nullable: true
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/certifications/:attemptId/submit", authenticate, submitCertification);


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
/**
 * @openapi
 * /api/study/certifications/{attemptId}:
 *   get:
 *     tags:
 *       - Study
 *     summary: GET /certifications/{attemptId}
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Certificate not found
 */
router.get("/certifications/:attemptId", authenticate, getCertificate);

export default router;
