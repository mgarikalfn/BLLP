import { Router } from "express";
import {
  getTopicLessons,
  completeLesson,
  getLessonsById,
} from "./learn.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();



/**
 * @openapi
 * /api/learn/topic/{topicId}:
 *   get:
 *     tags:
 *       - Learn
 *     summary: GET /topic/:topicId
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ObjectId
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/topic/:topicId", authenticate, getTopicLessons);


/**
 * @openapi
 * /api/learn/complete:
 *   post:
 *     tags:
 *       - Learn
 *     summary: POST /complete
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lessonId]
 *             properties:
 *               lessonId:
 *                 type: string
 *                 description: Lesson ObjectId
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/complete", authenticate, completeLesson);


/**
 * @openapi
 * /api/learn/lessons/{id}:
 *   get:
 *     tags:
 *       - Learn
 *     summary: GET /lessons/:id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lesson ObjectId
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/lessons/:id",authenticate,getLessonsById);

export default router;