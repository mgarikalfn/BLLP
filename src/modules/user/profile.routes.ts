import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { getMyProfile, updateProfile } from "./profile.controller";

const router = Router();

/**
 * @openapi
 * /api/profile/me:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get the authenticated user's profile dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data returned
 */
router.get("/me", authenticate, getMyProfile);

/**
 * @openapi
 * /api/profile/update:
 *   patch:
 *     tags:
 *       - Profile
 *     summary: Update editable profile fields
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatarUrl:
 *                 type: string
 *               bio:
 *                 type: string
 *                 maxLength: 160
 *               learningDirection:
 *                 type: string
 *                 enum: [AM_TO_OR, OR_TO_AM]
 *               targetLanguage:
 *                 type: string
 *                 enum: [AMHARIC, OROMO]
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch("/update", authenticate, updateProfile);

export default router;
