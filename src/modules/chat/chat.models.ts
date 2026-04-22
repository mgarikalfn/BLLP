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
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Message = model<IMessage>("Message", messageSchema);

// --- Report Model ---
export interface IReport extends Document {
  reporterId: Types.ObjectId;
  reportedUserId: Types.ObjectId;
  messageId?: Types.ObjectId;
  reason: string;
  status: "PENDING" | "REVIEWED" | "DISMISSED";
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messageId: { type: Schema.Types.ObjectId, ref: "Message" }, // The specific offensive message
    reason: { type: String, required: true }, // e.g., "Inappropriate language", "Harassment"
    status: { type: String, enum: ["PENDING", "REVIEWED", "DISMISSED"], default: "PENDING" }
  },
  { timestamps: true }
);

export const Report = model<IReport>("Report", reportSchema);
