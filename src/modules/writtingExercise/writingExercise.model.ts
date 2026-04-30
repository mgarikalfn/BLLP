import { Schema, model, Document, Types } from "mongoose";
import { DifficultyLevel } from "../dialogue/dialogue.model";

export interface IWritingExercise extends Document {
  topicId: Types.ObjectId;
  type: "TRANSLATION" | "OPEN_PROMPT"; // Helps the UI know how to display it
  prompt: {
    am: string;
    ao: string;
  };
  hints?: Array<{
    am: string;
    ao: string;
  }>;
  sampleAnswer: {
    am: string;
    ao: string;
  };
  level: DifficultyLevel;
  isVerified: boolean;
  status?: "DRAFT" | "NEEDS_REVIEW" | "PUBLISHED";
  generatedByAI?: boolean;
  authorId?: Types.ObjectId;
}

const writingExerciseSchema = new Schema<IWritingExercise>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true, index: true },
    type: { type: String, enum: ["TRANSLATION", "OPEN_PROMPT"], default: "TRANSLATION" },
    prompt: {
      am: { type: String, required: true },
      ao: { type: String, required: true },
    },
    hints: [
      {
        am: { type: String },
        ao: { type: String },
      },
    ],
    sampleAnswer: {
      am: { type: String, required: true },
      ao: { type: String, required: true },
    },
    level: {
      type: String,
      enum: Object.values(DifficultyLevel),
      default: DifficultyLevel.BEGINNER,
    },
    isVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["DRAFT", "NEEDS_REVIEW", "PUBLISHED"],
      default: "DRAFT",
    },
    generatedByAI: { type: Boolean, default: false },
    authorId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const WritingExercise = model<IWritingExercise>("WritingExercise", writingExerciseSchema);