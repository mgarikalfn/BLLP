import { Router } from "express";
import {
  generateContent,
  getAllContent,
  getDashboardStats,
  getPendingContent,
  rejectContent,
  verifyContent,
  updateContent,
} from "./expert.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticate, checkRole(["EXPERT", "ADMIN"]));

/**
 * @openapi
 * /api/expert/dashboard/stats:
 *   get:
 *     tags:
 *       - Expert
 *     summary: Get dashboard statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/dashboard/stats", getDashboardStats);

/**
 * @openapi
 * /api/expert/content/pending:
 *   get:
 *     tags:
 *       - Expert
 *     summary: Get pending (unverified) content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [LESSON, DIALOGUE, WRITING, SPEAKING, QUESTION]
 *       - in: query
 *         name: topicId
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/content/pending", getPendingContent);

/**
 * @openapi
 * /api/expert/content/all:
 *   get:
 *     tags:
 *       - Expert
 *     summary: Get all content with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [LESSON, DIALOGUE, WRITING, SPEAKING, QUESTION]
 *       - in: query
 *         name: topicId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [DRAFT, NEEDS_REVIEW, PUBLISHED]
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/content/all", getAllContent);

/**
 * @openapi
 * /api/expert/content/{type}/{id}/verify:
 *   patch:
 *     tags:
 *       - Expert
 *     summary: Verify/Publish content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [LESSON, DIALOGUE, WRITING, SPEAKING, QUESTION]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully verified content
 *       404:
 *         description: Content not found
 */
router.patch("/content/:type/:id/verify", verifyContent);

/**
 * @openapi
 * /api/expert/content/{type}/{id}/reject:
 *   patch:
 *     tags:
 *       - Expert
 *     summary: Reject content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [LESSON, DIALOGUE, WRITING, SPEAKING, QUESTION]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully rejected content
 *       404:
 *         description: Content not found
 */
router.patch("/content/:type/:id/reject", rejectContent);

/**
 * @openapi
 * /api/expert/content/{type}/{id}:
 *   put:
 *     tags:
 *       - Expert
 *     summary: Update draft content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [LESSON, DIALOGUE, WRITING, SPEAKING, QUESTION]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Successfully updated content
 *       404:
 *         description: Content not found
 */
router.put("/content/:type/:id", updateContent);

/**
 * @openapi
 * /api/expert/generate:
 *   post:
 *     tags:
 *       - Expert
 *     summary: Generate content via AI
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, topicId]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [LESSON, DIALOGUE, WRITING, SPEAKING, QUESTION]
 *               topicId:
 *                 type: string
 *               level:
 *                 type: string
 *     responses:
 *       201:
 *         description: Successfully generated content
 *       400:
 *         description: Invalid content type or missing topicId
 *       502:
 *         description: AI generation failed
 */
router.post("/generate", generateContent);

export default router;
