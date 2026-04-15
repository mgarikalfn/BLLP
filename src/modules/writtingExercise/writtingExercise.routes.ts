// writing.routes.ts
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { createWritingExercise, submitWritingExercise, getWritingExerciseById } from "./writingExercise.controller";

const router = Router();

// User Route: Get exercise by ID


/**
 * @openapi
 * /api/writing/{id}:
 *   get:
 *     tags:
 *       - WrittingExercise
 *     summary: GET /:id
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/:id", authenticate, getWritingExerciseById);

// User Route: Submit an answer


/**
 * @openapi
 * /api/writing/submit:
 *   post:
 *     tags:
 *       - WrittingExercise
 *     summary: POST /submit
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exerciseId, topicId, submittedText, targetLanguage]
 *             properties:
 *               exerciseId:
 *                 type: string
 *               topicId:
 *                 type: string
 *               submittedText:
 *                 type: string
 *               targetLanguage:
 *                 type: string
 *                 enum: [am, ao]
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/submit", authenticate, submitWritingExercise);

// Admin Route: Insert a new exercise


/**
 * @openapi
 * /api/writing/create:
 *   post:
 *     tags:
 *       - WrittingExercise
 *     summary: POST /create
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topicId, prompt, sampleAnswer]
 *             properties:
 *               topicId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [TRANSLATION, OPEN_PROMPT]
 *               prompt:
 *                 type: object
 *                 required: [am, ao]
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               hints:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     am:
 *                       type: string
 *                     ao:
 *                       type: string
 *               sampleAnswer:
 *                 type: object
 *                 required: [am, ao]
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               level:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/create", authenticate, createWritingExercise);

export default router;