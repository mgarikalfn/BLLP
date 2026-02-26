import { Schema, model, Types } from "mongoose";

export interface IStudyStats {
  userId: Types.ObjectId;

  currentStreak: number;
  longestStreak: number;

  lastStudyDate?: Date;

  dailyGoal: number;
  todayCount: number;
}

const statsSchema = new Schema<IStudyStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },

    lastStudyDate: { type: Date },

    dailyGoal: { type: Number, default: 10 },
    todayCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const StudyStats = model<IStudyStats>(
  "StudyStats",
  statsSchema
);