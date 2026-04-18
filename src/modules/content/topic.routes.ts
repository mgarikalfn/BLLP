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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, level]
 *             properties:
 *               title:
 *                 type: object
 *                 required: [am, ao]
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               description:
 *                 type: object
 *                 required: [am, ao]
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               level:
 *                 type: string
 *               thumbnailUrl:
 *                 type: string
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: object
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               description:
 *                 type: object
 *                 properties:
 *                   am:
 *                     type: string
 *                   ao:
 *                     type: string
 *               level:
 *                 type: string
 *               thumbnailUrl:
 *                 type: string
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ObjectId
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
 *     parameters:
 *       - in: path
 *         name: topicId
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic ObjectId
 *       - in: query
 *         name: size
 *         required: falses
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of random test questions to sample
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
