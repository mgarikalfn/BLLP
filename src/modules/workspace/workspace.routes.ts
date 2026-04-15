import { Router } from "express";

import { getTopicsFeed } from "./workspace.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();



/**
 * @openapi
 * /api/workspace:
 *   get:
 *     tags:
 *       - Workspace
 *     summary: GET /
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/",authenticate, getTopicsFeed);



export default router;
