import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { findChatMatch, getConversations, getConversationMessages } from "./chat.controller";

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/chat/match:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Find a chat match based on language and proficiency
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Match found
 *       404:
 *         description: No match found
 */
router.get("/match", findChatMatch);

/**
 * @openapi
 * /api/chat/conversations:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Get all conversations for the user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/conversations", getConversations);

/**
 * @openapi
 * /api/chat/conversations/{conversationId}/messages:
 *   get:
 *     tags:
 *       - Chat
 *     summary: Get historical messages for a given conversation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/conversations/:conversationId/messages", getConversationMessages);

export default router;
