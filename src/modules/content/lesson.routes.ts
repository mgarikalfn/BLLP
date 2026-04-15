import { Router } from "express";
import { createLesson, deleteLesson, getLessonById, resumeLessonAudioGeneration, getLessonsByTopic, toggleVerification, updateLesson } from "./lesson.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";     

const router = Router();

/**
 * @openapi
 * /api/lessons:
 *   post:
 *     tags:
 *       - Lessons
 *     summary: Create a lesson package
 *     description: Creates lesson content and optionally creates related quiz questions.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Lesson created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  createLesson
);

/**
 * @openapi
 * /api/lessons/{id}:
 *   put:
 *     tags:
 *       - Lessons
 *     summary: Update a lesson
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated lesson
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  updateLesson
);

/**
 * @openapi
 * /api/lessons/{id}/generate-audio:
 *   put:
 *     tags:
 *       - Lessons
 *     summary: Resume audio generation for a lesson
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audio generation result
 *       404:
 *         description: Lesson or vocabulary not found
 *       500:
 *         description: Server error
 */
router.put("/:id/generate-audio", resumeLessonAudioGeneration);

/**
 * @openapi
 * /api/lessons/{id}:
 *   delete:
 *     tags:
 *       - Lessons
 *     summary: Delete a lesson
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson deleted
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  deleteLesson
);

/**
 * @openapi
 * /api/lessons/{id}/verify:
 *   patch:
 *     tags:
 *       - Lessons
 *     summary: Toggle lesson verification status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification status updated
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/:id/verify",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  toggleVerification
);

/**
 * @openapi
 * /api/lessons/{id}:
 *   get:
 *     tags:
 *       - Lessons
 *     summary: Get lesson by id
 *     description: Returns lesson details aggregated with quiz questions.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson found
 *       404:
 *         description: Lesson not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getLessonById);

/**
 * @openapi
 * /api/lessons/topic/{topicId}:
 *   get:
 *     tags:
 *       - Lessons
 *     summary: Get lessons by topic
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: verified
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Topic lessons returned
 *       500:
 *         description: Server error
 */
router.get("/topic/:topicId", getLessonsByTopic);

export default router;