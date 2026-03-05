import { Schema, model, Document, Types } from "mongoose";

// Enums ensure the AI and Experts stick to your predefined levels
export enum DifficultyLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
}

// Interface for individual chat lines
interface IDialogueLine {
  order: number;
  characterId: string;
  content: {
    am: string; // Amharic
    ao: string; // Oromo
  };
  isInteractive: boolean;
  question?: {
    am: string;
    ao: string;
  };
  options?: Array<{
    am: string;
    ao: string;
  }>;
  correctAnswerIndex?: number;
}

// Interface for characters in the story
interface ICharacter {
  characterId: string;
  name: string;
  avatarUrl?: string;
}

export interface IDialogue extends Document {
  topicId: Types.ObjectId;
  scenario: {
    am: string;
    ao: string;
  };
  characters: ICharacter[];
  lines: IDialogueLine[];
  level: DifficultyLevel;
  isVerified: boolean; // For your Language Expert to toggle
}

const dialogueSchema = new Schema<IDialogue>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true, index: true },
    scenario: {
      am: { type: String, required: true },
      ao: { type: String, required: true },
    },
    characters: [
      {
        characterId: { type: String, required: true },
        name: { type: String, required: true },
        avatarUrl: { type: String },
      },
    ],
    lines: [
      {
        order: { type: Number, required: true },
        characterId: { type: String, required: true },
        content: {
          am: { type: String, required: true },
          ao: { type: String, required: true },
        },
        isInteractive: { type: String, default: false },
        question: {
          am: { type: String },
          ao: { type: String },
        },
        options: [
          {
            am: { type: String },
            ao: { type: String },
          },
        ],
        correctAnswerIndex: { type: Number },
      },
    ],
    level: {
      type: String,
      enum: Object.values(DifficultyLevel),
      default: DifficultyLevel.BEGINNER,
    },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Dialogue = model<IDialogue>("Dialogue", dialogueSchema);