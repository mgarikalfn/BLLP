import { Router } from "express";
import {
	createDialogue,
	deleteDialogue,
	getAllDialogues,
	getDialogueById,
	getDialoguesByTopic,
	toggleDialogueVerification,
	updateDialogue,
} from "./dialogue.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

const router = Router();



/**
 * @openapi
 * /api/dialogues:
 *   post:
 *     tags:
 *       - Dialogue
 *     summary: POST /
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topicId, scenario, characters, lines]
 *             properties:
 *               topicId:
 *                 type: string
 *                 description: Topic ObjectId
 *               scenario:
 *                 type: object
 *                 required: [am, ao]
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               characters:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [characterId, name]
 *                   properties:
 *                     characterId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *               lines:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [order, characterId, content]
 *                   properties:
 *                     order:
 *                       type: integer
 *                     characterId:
 *                       type: string
 *                     content:
 *                       type: object
 *                       required: [am, ao]
 *                       properties:
 *                         am:
 *                           type: string
 *                         ao:
 *                           type: string
 *                     isInteractive:
 *                       type: boolean
 *                     question:
 *                       type: object
 *                       properties:
 *                         am:
 *                           type: string
 *                         ao:
 *                           type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           am:
 *                             type: string
 *                           ao:
 *                             type: string
 *                     correctAnswerIndex:
 *                       type: integer
 *               level:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/", authenticate, checkRole(["EXPERT", "ADMIN"]), createDialogue);


/**
 * @openapi
 * /api/dialogues:
 *   get:
 *     tags:
 *       - Dialogue
 *     summary: GET /
 *     parameters:
 *       - in: query
 *         name: topicId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: level
 *         required: false
 *         schema:
 *           type: string
 *           enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *       - in: query
 *         name: verified
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", getAllDialogues);


/**
 * @openapi
 * /api/dialogues/topic/{topicId}:
 *   get:
 *     tags:
 *       - Dialogue
 *     summary: GET /topic/:topicId
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
router.get("/topic/:topicId", getDialoguesByTopic);


/**
 * @openapi
 * /api/dialogues/{id}:
 *   get:
 *     tags:
 *       - Dialogue
 *     summary: GET /:id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dialogue ObjectId
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/:id", getDialogueById);


/**
 * @openapi
 * /api/dialogues/{id}:
 *   put:
 *     tags:
 *       - Dialogue
 *     summary: PUT /:id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dialogue ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topicId:
 *                 type: string
 *                 description: Topic ObjectId
 *               scenario:
 *                 type: object
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               characters:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     characterId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *               lines:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     order:
 *                       type: integer
 *                     characterId:
 *                       type: string
 *                     content:
 *                       type: object
 *                       properties:
 *                         am:
 *                           type: string
 *                         ao:
 *                           type: string
 *                     isInteractive:
 *                       type: boolean
 *                     question:
 *                       type: object
 *                       properties:
 *                         am:
 *                           type: string
 *                         ao:
 *                           type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           am:
 *                             type: string
 *                           ao:
 *                             type: string
 *                     correctAnswerIndex:
 *                       type: integer
 *               level:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Success
 */
router.put("/:id", authenticate, checkRole(["EXPERT", "ADMIN"]), updateDialogue);


/**
 * @openapi
 * /api/dialogues/{id}/verify:
 *   patch:
 *     tags:
 *       - Dialogue
 *     summary: PATCH /:id/verify
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dialogue ObjectId
 *     responses:
 *       200:
 *         description: Success
 */
router.patch(
	"/:id/verify",
	authenticate,
	checkRole(["EXPERT", "ADMIN"]),
	toggleDialogueVerification,
);


/**
 * @openapi
 * /api/dialogues/{id}:
 *   delete:
 *     tags:
 *       - Dialogue
 *     summary: DELETE /:id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dialogue ObjectId
 *     responses:
 *       200:
 *         description: Success
 */
router.delete("/:id", authenticate, checkRole(["EXPERT", "ADMIN"]), deleteDialogue);

export default router;
