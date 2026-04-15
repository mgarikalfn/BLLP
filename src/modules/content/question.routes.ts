import { Router } from "express";
import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  getQuestions,
  toggleQuestionVerification,
  updateQuestion,
} from "./question.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticate, checkRole(["ADMIN"]));

/**
 * @openapi
 * /api/questions:
 *   post:
 *     tags:
 *       - Questions
 *     summary: Create a question
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Question created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post("/", createQuestion);

/**
 * @openapi
 * /api/questions:
 *   get:
 *     tags:
 *       - Questions
 *     summary: List questions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: topicId
 *         schema:
 *           type: string
 *       - in: query
 *         name: lessonId
 *         schema:
 *           type: string
 *       - in: query
 *         name: intendedFor
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Questions returned
 *       500:
 *         description: Server error
 */
router.get("/", getQuestions);

/**
 * @openapi
 * /api/questions/{id}:
 *   get:
 *     tags:
 *       - Questions
 *     summary: Get question by id
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
 *         description: Question found
 *       404:
 *         description: Question not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getQuestionById);

/**
 * @openapi
 * /api/questions/{id}:
 *   put:
 *     tags:
 *       - Questions
 *     summary: Update question
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
 *         description: Updated question
 *       404:
 *         description: Question not found
 *       500:
 *         description: Server error
 */
router.put("/:id", updateQuestion);

/**
 * @openapi
 * /api/questions/{id}:
 *   delete:
 *     tags:
 *       - Questions
 *     summary: Delete question
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
 *         description: Question deleted
 *       404:
 *         description: Question not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", deleteQuestion);

/**
 * @openapi
 * /api/questions/{id}/verify:
 *   patch:
 *     tags:
 *       - Questions
 *     summary: Toggle question verification
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
 *         description: Verification updated
 *       404:
 *         description: Question not found
 *       500:
 *         description: Server error
 */
router.patch("/:id/verify", toggleQuestionVerification);

export default router;
