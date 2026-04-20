import { Types } from "mongoose";
import { Notification, NotificationType } from "./notification.model";

interface CreateNotificationInput {
  userId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  static async create(input: CreateNotificationInput) {
    return Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata || {},
    });
  }
}
