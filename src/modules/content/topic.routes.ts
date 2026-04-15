import { Router } from "express";
import {
  createTopic,
  deleteTopic,
  getAllTopics,
  getTopicTest,
  updateTopic,
} from "./topic.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";
// import { getTopicWorkspace } from "../workspace/workspace.controller";

const router = Router();



/**
 * @openapi
 * /api/topics:
 *   post:
 *     tags:
 *       - Content
 *     summary: POST /
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post("/", authenticate, checkRole(["EXPERT", "ADMIN"]), createTopic);


/**
 * @openapi
 * /api/topics/{id}:
 *   put:
 *     tags:
 *       - Content
 *     summary: PUT /:id
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.put("/:id", authenticate, checkRole(["EXPERT", "ADMIN"]), updateTopic);
// 

/**
 * @openapi
 * /api/topics/{id}/workspace:
 *   get:
 *     tags:
 *       - Content
 *     summary: GET /:id/workspace
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
// router.get("/:id/workspace",authenticate,getTopicWorkspace);


/**
 * @openapi
 * /api/topics/{id}:
 *   delete:
 *     tags:
 *       - Content
 *     summary: DELETE /:id
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.delete(
  "/:id",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  deleteTopic,
);


/**
 * @openapi
 * /api/topics/{topicId}/test:
 *   get:
 *     tags:
 *       - Content
 *     summary: GET /:topicId/test
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/:topicId/test", getTopicTest);


/**
 * @openapi
 * /api/topics:
 *   get:
 *     tags:
 *       - Content
 *     summary: GET /
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", getAllTopics);

export default router;
