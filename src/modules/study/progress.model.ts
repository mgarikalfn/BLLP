import { Schema, model, Types } from "mongoose";

export interface IProgress {
  userId: Types.ObjectId;
  lessonId: Types.ObjectId;

  repetition: number;
  interval: number;
  easeFactor: number;

  nextReview: Date;
  lastReviewed?: Date;
}

const progressSchema = new Schema<IProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", required: true },

    repetition: { type: Number, default: 0 },
    interval: { type: Number, default: 0 },
    easeFactor: { type: Number, default: 2.5 },

    nextReview: { type: Date, default: Date.now },
    lastReviewed: { type: Date }
  },
  { timestamps: true }
);

progressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const Progress = model<IProgress>("Progress", progressSchema);