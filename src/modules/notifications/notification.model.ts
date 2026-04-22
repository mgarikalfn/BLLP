import { Schema, model, Types } from "mongoose";

export type NotificationType =
  | "REVIEW_DUE"
  | "STREAK_ALERT"
  | "LEVEL_UP"
  | "TOPIC_COMPLETE"
  | "ACHIEVEMENT"
  | "CHAT_REQUEST";

export interface INotification {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, any>;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["REVIEW_DUE", "STREAK_ALERT", "LEVEL_UP", "TOPIC_COMPLETE", "ACHIEVEMENT", "CHAT_REQUEST"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = model<INotification>("Notification", notificationSchema);
