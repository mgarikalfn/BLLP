import { Router } from "express";
import { dictionaryLookup } from "./ai.controller";

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

export default router;
