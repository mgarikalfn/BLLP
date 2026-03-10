import { Schema, model, Document, Types } from "mongoose";

export interface IWritingAttempt extends Document {
  userId: Types.ObjectId;
  exerciseId: Types.ObjectId;
  topicId: Types.ObjectId; // Denormalized for easy querying later
  submittedText: string;
  targetLanguage: "am" | "ao"; // Did they write in Amharic or Oromo?
  isCompleted: boolean;
}

const writingAttemptSchema = new Schema<IWritingAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    exerciseId: { type: Schema.Types.ObjectId, ref: "WritingExercise", required: true },
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
    submittedText: { type: String, required: true },
    targetLanguage: { type: String, enum: ["am", "ao"], required: true },
    isCompleted: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const WritingAttempt = model<IWritingAttempt>("WritingAttempt", writingAttemptSchema);