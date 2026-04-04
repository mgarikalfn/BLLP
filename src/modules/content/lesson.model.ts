import { Schema, model, Document, Types } from "mongoose";

export interface ILesson extends Document {
  topicId: Types.ObjectId;
  order: number;
  title: {
    am: string; // Amharic
    ao: string; // Afan Oromo
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
  // 2. ASSESSMENT (The "Gatekeeper")
  quiz: Array<{
    question: { am: string; ao: string };
    options: Array<{ am: string; ao: string }>;
    correctAnswerIndex: number;
  }>;
  isVerified: boolean;
}

const lessonSchema = new Schema<ILesson>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true, index: true },
    order: { type: Number, required: true },
    title: {
      am: { type: String, required: true },
      ao: { type: String, required: true },
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
    quiz: [
      {
        question: {
          am: { type: String, required: true },
          ao: { type: String, required: true },
        },
        options: [
          {
            am: { type: String, required: true },
            ao: { type: String, required: true },
          },
        ],
        correctAnswerIndex: { type: Number, required: true },
      },
    ],
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Lesson = model<ILesson>("Lesson", lessonSchema);