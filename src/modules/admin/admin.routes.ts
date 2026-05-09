import { Router } from "express";
import { authenticate, isAdmin } from "../../middleware/auth.middleware";
import {
  getUsers,
  updateUserRole,
  toggleUserStatus,
  getContentStats,
  getAnalytics,
  getSystemConfig,
  updateSystemConfig,
} from "./admin.controller";

const router = Router();

// Protect all routes with authenticate and isAdmin middleware
router.use(authenticate, isAdmin);

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get paginated list of users with optional search
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (starts at 1)
 *       - in: query
 *         name: pageSize
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by username or email (case-insensitive regex)
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Error fetching users
 */
router.get("/users", getUsers);

/**
 * @openapi
 * /api/admin/users/{userId}/role:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update user role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, EXPERT, LEARNER]
 *                 description: The new role for the user
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Invalid role provided
 *       404:
 *         description: User not found
 *       500:
 *         description: Error updating user role
 */
router.put("/users/:userId/role", updateUserRole);

/**
 * @openapi
 * /api/admin/users/{userId}/status:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Toggle user status between ACTIVE and BANNED
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User status toggled successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Error toggling user status
 */
router.put("/users/:userId/status", toggleUserStatus);

/**
 * @openapi
 * /api/admin/content-stats:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get dashboard statistics (counts of users, content, etc.)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved content statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       description: Total number of users
 *                     totalExperts:
 *                       type: integer
 *                       description: Total number of expert users
 *                     totalTopics:
 *                       type: integer
 *                       description: Total number of topics
 *                     totalLessons:
 *                       type: integer
 *                       description: Total number of lessons
 *                     totalQuestions:
 *                       type: integer
 *                       description: Total number of questions
 *                     lessonsPendingReview:
 *                       type: integer
 *                       description: Number of lessons pending verification
 *       500:
 *         description: Error fetching content stats
 */
router.get("/content-stats", getContentStats);

/**
 * @openapi
 * /api/admin/analytics:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get platform analytics (DAU, daily signups, and weak content metrics)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     dailyActiveUsers:
 *                       type: integer
 *                       description: Number of users active today
 *                     usersJoinedToday:
 *                       type: integer
 *                       description: Number of users created today
 *                     weakContent:
 *                       type: array
 *                       description: Top 10 worst performing content pieces
 *                       items:
 *                         type: object
 *                         properties:
 *                           contentId:
 *                             type: string
 *                           contentType:
 *                             type: string
 *                           averageEaseFactor:
 *                             type: number
 *                           numberOfReviews:
 *                             type: integer
 *                           preview:
 *                             type: string
 *       500:
 *         description: Error fetching analytics
 */
router.get("/analytics", getAnalytics);

/**
 * @openapi
 * /api/admin/config:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get the single system configuration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       500:
 *         description: Error fetching system config
 */
router.get("/config", getSystemConfig);

/**
 * @openapi
 * /api/admin/config:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update system configuration fields
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAIGenerationEnabled:
 *                 type: boolean
 *               activeSeasonId:
 *                 type: string
 *               maintenanceMode:
 *                 type: boolean
 *               dailyXpCap:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       500:
 *         description: Error updating system config
 */
router.put("/config", updateSystemConfig);

export default router;
