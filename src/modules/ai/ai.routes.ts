import { Router } from "express";
import { chatWithTutor, dictionaryLookup } from "./ai.controller";

const router = Router();

/**
 * @openapi
 * /api/ai/dictionary:
 *   post:
 *     tags:
 *       - AI
 *     summary: Context-aware dictionary lookup via Gemini
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text, learningDirection]
 *             properties:
 *               text:
 *                 type: string
 *               topicId:
 *                 type: string
 *               learningDirection:
 *                 type: string
 *                 enum: [AM_TO_OR, OR_TO_AM]
 *     responses:
 *       200:
 *         description: Dictionary response in strict JSON format
 */
router.post("/dictionary", dictionaryLookup);

/**
 * @openapi
 * /api/ai/chat:
 *   post:
 *     tags:
 *       - AI
 *     summary: Context-aware AI tutor chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages, learningDirection]
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [role, content]
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, model]
 *                     content:
 *                       type: string
 *               topicId:
 *                 type: string
 *               learningDirection:
 *                 type: string
 *                 enum: [AM_TO_OR, OR_TO_AM]
 *     responses:
 *       200:
 *         description: AI tutor response
 */
router.post("/chat", chatWithTutor);

export default router;
