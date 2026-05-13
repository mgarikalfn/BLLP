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
  deletedBy?: Types.ObjectId; // Expert who deleted the message
  deletedAt?: Date; // When the message was deleted
  isAutoHidden: boolean; // Auto-hidden due to multiple reports
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
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    deletedAt: { type: Date, required: false },
    isAutoHidden: { type: Boolean, default: false },
    reportCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Create compound index on (conversationId, isDeleted, isAutoHidden) for chat queries
messageSchema.index({ conversationId: 1, isDeleted: 1, isAutoHidden: 1 });

export const Message = model<IMessage>("Message", messageSchema);

// --- Report Model ---
export enum ReportType {
  SPAM = "SPAM",
  HARASSMENT = "HARASSMENT",
  INCORRECT_LANGUAGE = "INCORRECT_LANGUAGE",
  INAPPROPRIATE_CONTENT = "INAPPROPRIATE_CONTENT"
}

export enum ReportStatus {
  PENDING = "PENDING",
  UNDER_REVIEW = "UNDER_REVIEW",
  RESOLVED = "RESOLVED",
  REJECTED = "REJECTED"
}

export interface ResolutionDetails {
  actionTaken: "DISMISSED" | "WARNING" | "MESSAGE_DELETED" | "USER_FLAGGED";
  resolvedBy: Types.ObjectId;
  resolvedAt: Date;
  notes?: string;
}

export interface IReport extends Document {
  reporterId: Types.ObjectId;
  reportedUserId: Types.ObjectId;
  messageId?: Types.ObjectId;
  type: ReportType;
  reason: string;
  context: string; // Snapshot of the message text at time of report
  status: ReportStatus;
  resolutionDetails?: ResolutionDetails;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messageId: { type: Schema.Types.ObjectId, ref: "Message", required: false },
    type: { 
      type: String, 
      enum: Object.values(ReportType),
      required: true
    },
    reason: { type: String, required: true },
    context: { type: String, required: true },
    status: { 
      type: String, 
      enum: Object.values(ReportStatus),
      default: ReportStatus.PENDING 
    },
    resolutionDetails: {
      actionTaken: { type: String, enum: ["DISMISSED", "WARNING", "MESSAGE_DELETED", "USER_FLAGGED"] },
      resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      resolvedAt: { type: Date },
      notes: { type: String }
    }
  },
  { timestamps: true }
);

// Create unique compound index on (reporterId, messageId) for duplicate prevention
reportSchema.index({ reporterId: 1, messageId: 1 }, { unique: true, sparse: true });

// Create index on messageId for report count aggregation
reportSchema.index({ messageId: 1 });

// Create index on status for queue queries
reportSchema.index({ status: 1 });

export const Report = model<IReport>("Report", reportSchema);
