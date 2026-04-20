import { Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../../middleware/auth.middleware";
import { Notification } from "./notification.model";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.id;

  if (!userId || Array.isArray(userId)) {
    throw new Error("Invalid authenticated user id");
  }

  return userId;
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const notificationId = typeof id === "string" ? id : id[0];

    if (!notificationId || !Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true } },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } },
    );

    return res.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
