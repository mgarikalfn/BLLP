import { Router } from "express";
import { register, login } from "./auth.controller";

const router = Router();



/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, username, targetLanguage, proficiencyLevel]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               username:
 *                 type: string
 *               targetLanguage:
 *                 type: string
 *                 enum: [AMHARIC, OROMO]
 *               proficiencyLevel:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED]
 *               learningDirection:
 *                 type: string
 *                 enum: [AM_TO_OR, OR_TO_AM]
 *               avatarUrl:
 *                 type: string
 *               bio:
 *                 type: string
 *                 maxLength: 160
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: Validation error
 */
router.post("/register", register);


/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials or missing fields
 */
router.post("/login", login);

export default router;
