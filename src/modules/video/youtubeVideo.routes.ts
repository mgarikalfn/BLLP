import { Router } from "express";
import {
  discoverVideosWithAI,
  searchVideos,
  verifyYoutubeVideo,
} from "./youtubeVideo.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

const router = Router();

/**
 * @openapi
 * /api/youtube-videos/search:
 *   get:
 *     tags:
 *       - YoutubeVideos
 *     summary: Search verified YouTube videos
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Text search query
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/search", searchVideos);

/**
 * @openapi
 * /api/youtube-videos/discover:
 *   post:
 *     tags:
 *       - YoutubeVideos
 *     summary: Discover YouTube videos using AI
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topicId, level]
 *             properties:
 *               topicId:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *               targetLanguage:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI discovery results
 */
router.post(
  "/discover",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  discoverVideosWithAI,
);

/**
 * @openapi
 * /api/youtube-videos/{id}/verify:
 *   patch:
 *     tags:
 *       - YoutubeVideos
 *     summary: Verify a YouTube video
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: YoutubeVideo ObjectId
 *     responses:
 *       200:
 *         description: Verification status updated
 */
router.patch("/:id/verify", authenticate, checkRole(["EXPERT", "ADMIN"]), verifyYoutubeVideo);

export default router;
