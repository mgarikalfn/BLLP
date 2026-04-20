import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification.controller";

const router = Router();

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: List notifications for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", authenticate, getNotifications);

/**
 * @openapi
 * /api/notifications/read-all:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Mark all notifications as read
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.patch("/read-all", authenticate, markAllNotificationsAsRead);

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Mark a notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.patch("/:id/read", authenticate, markNotificationAsRead);

export default router;
