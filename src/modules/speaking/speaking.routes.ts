import { Router } from "express";
import multer from "multer";
import {
	createSpeakingExercise,
	deleteSpeakingExercise,
	getAllSpeakingExercises,
	getSpeakingExerciseById,
	submitSpeakingExercise,
	updateSpeakingExercise,
} from "./speaking.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

// Setup multer with memory storage so files are kept in memory as Buffers
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Speaking exercise CRUD


/**
 * @openapi
 * /api/speaking:
 *   post:
 *     tags:
 *       - Speaking
 *     summary: POST /
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topicId, prompt, expectedText]
 *             properties:
 *               topicId:
 *                 type: string
 *                 description: Topic ObjectId
 *               level:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *               prompt:
 *                 type: object
 *                 required: [am, ao]
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               expectedText:
 *                 type: object
 *                 required: [am, ao]
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               referenceAudioUrl:
 *                 type: object
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/", authenticate, checkRole(["EXPERT", "ADMIN"]), createSpeakingExercise);


/**
 * @openapi
 * /api/speaking/create:
 *   post:
 *     tags:
 *       - Speaking
 *     summary: POST /create
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topicId, prompt, expectedText]
 *             properties:
 *               topicId:
 *                 type: string
 *                 description: Topic ObjectId
 *               level:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *               prompt:
 *                 type: object
 *                 required: [am, ao]
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               expectedText:
 *                 type: object
 *                 required: [am, ao]
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               referenceAudioUrl:
 *                 type: object
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/create", authenticate, checkRole(["EXPERT", "ADMIN"]), createSpeakingExercise);


/**
 * @openapi
 * /api/speaking:
 *   get:
 *     tags:
 *       - Speaking
 *     summary: GET /
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", getAllSpeakingExercises);


/**
 * @openapi
 * /api/speaking/{id}:
 *   get:
 *     tags:
 *       - Speaking
 *     summary: GET /:id
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/:id", getSpeakingExerciseById);


/**
 * @openapi
 * /api/speaking/{id}:
 *   put:
 *     tags:
 *       - Speaking
 *     summary: PUT /:id
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topicId:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *               prompt:
 *                 type: object
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               expectedText:
 *                 type: object
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               referenceAudioUrl:
 *                 type: object
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Success
 */
router.put("/:id", authenticate, checkRole(["EXPERT", "ADMIN"]), updateSpeakingExercise);


/**
 * @openapi
 * /api/speaking/{id}:
 *   delete:
 *     tags:
 *       - Speaking
 *     summary: DELETE /:id
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.delete("/:id", authenticate, checkRole(["EXPERT", "ADMIN"]), deleteSpeakingExercise);

// Route: Submit speaking audio for evaluation
// Accepts a multipart/form-data request with an 'audio' file field and text fields


/**
 * @openapi
 * /api/speaking/submit:
 *   post:
 *     tags:
 *       - Speaking
 *     summary: POST /submit
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [audio, expectedText, targetLang, exerciseId]
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *               expectedText:
 *                 type: string
 *               targetLang:
 *                 type: string
 *                 enum: [am, ao]
 *               exerciseId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/submit", authenticate, upload.single("audio"), submitSpeakingExercise);

export default router;
