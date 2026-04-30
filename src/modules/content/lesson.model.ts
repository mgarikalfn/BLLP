import { Schema, model, Document, Types } from "mongoose";
import { text } from "stream/consumers";

export interface ILesson extends Document {
  topicId: Types.ObjectId;
  order: number;
  title: {
    am: string; // Amharic
    ao: string; // Afan Oromo
  };

  //theory (optional:explain a rule before learning words)
  grammarNotes?: {
    am: string;
    ao: string;
  };
  // 1. FLASHCARD CONTENT (The "What")
  vocabulary: Array<{
    am: string;
    ao: string;
    audioUrl?: {
      am?: string;
      ao?: string;
    }; // For pronunciation
    example?: {
      am: string;
      ao: string;
      audioUrl?: {
        am?: string;
        ao?: string;
      };
    }; // Context helps memory
  }>;

  dialogue?: Array<{
    speaker: string;
    text: { am: string; ao: string };
    audioUrl?: { am?: string; ao?: string };
  }>;

  isVerified: boolean;
  status?: "DRAFT" | "NEEDS_REVIEW" | "PUBLISHED";
  generatedByAI?: boolean;
  authorId?: Types.ObjectId;
}

const lessonSchema = new Schema<ILesson>(
  {
    topicId: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
      index: true,
    },
    order: { type: Number, required: true },
    title: {
      am: { type: String, required: true },
      ao: { type: String, required: true },
    },
    grammarNotes: {
      am: { type: String },
      ao: { type: String },
    },
    vocabulary: [
      {
        am: { type: String, required: true },
        ao: { type: String, required: true },
        audioUrl: {
          am: { type: String },
          ao: { type: String },
        },
        example: {
          am: { type: String },
          ao: { type: String },
          audioUrl: {
            am: { type: String },
            ao: { type: String },
          },
        },
      },
    ],
    dialogue: [
      {
        speaker: { type: String, required: true },
        text: {
          am: { type: String, required: true },
          ao: { type: String, required: true },
        },
        audioUrl: { am: { type: String }, ao: { type: String } },
      },
    ],
    isVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["DRAFT", "NEEDS_REVIEW", "PUBLISHED"],
      default: "DRAFT",
    },
    generatedByAI: { type: Boolean, default: false },
    authorId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const Lesson = model<ILesson>("Lesson", lessonSchema);
