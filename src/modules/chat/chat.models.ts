import { Schema, model, Document, Types } from "mongoose";

// --- Conversation Model ---
export interface IConversation extends Document {
  participants: Types.ObjectId[];
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const Conversation = model<IConversation>("Conversation", conversationSchema);

// --- Message Model ---
export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  text: string;
  isRead: boolean;
  isDeleted: boolean; // Soft delete
  reportCount: number; // For auto-hiding
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Message = model<IMessage>("Message", messageSchema);

// --- Report Model ---
export type ReportType = "SPAM" | "HARASSMENT" | "INCORRECT_LANGUAGE" | "INAPPROPRIATE_CONTENT" | "OTHER";
export type ReportStatus = "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";

export interface IReport extends Document {
  targetId: Types.ObjectId; // Generic target (usually Message)
  reporterId: Types.ObjectId;
  reportedUserId: Types.ObjectId;
  type: ReportType;
  reason: string;
  context?: string; // Snapshot of the content at time of report
  status: ReportStatus;
  resolutionDetails?: {
    actionTaken: "DISMISS" | "WARN" | "DELETE_MESSAGE" | "FLAG_USER";
    resolvedBy: Types.ObjectId;
    resolvedAt: Date;
    note?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    targetId: { type: Schema.Types.ObjectId, ref: "Message", required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { 
      type: String, 
      enum: ["SPAM", "HARASSMENT", "INCORRECT_LANGUAGE", "INAPPROPRIATE_CONTENT", "OTHER"],
      default: "OTHER"
    },
    reason: { type: String, required: true },
    context: { type: String },
    status: { 
      type: String, 
      enum: ["PENDING", "UNDER_REVIEW", "RESOLVED", "REJECTED"], 
      default: "PENDING" 
    },
    resolutionDetails: {
      actionTaken: { type: String, enum: ["DISMISS", "WARN", "DELETE_MESSAGE", "FLAG_USER"] },
      resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      resolvedAt: { type: Date },
      note: { type: String }
    }
  },
  { timestamps: true }
);

export const Report = model<IReport>("Report", reportSchema);
