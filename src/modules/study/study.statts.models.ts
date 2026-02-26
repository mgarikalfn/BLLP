import { Schema, model, Types } from "mongoose";

export interface IStudyStats {
  userId: Types.ObjectId;

  currentStreak: number;
  longestStreak: number;

  lastStudyDate?: Date;

  dailyGoal: number;
  todayCount: number;

  xp: number;
  level: number;
}

const statsSchema = new Schema<IStudyStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },

    lastStudyDate: { type: Date },

    dailyGoal: { type: Number, default: 10 },
    todayCount: { type: Number, default: 0 },

    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
  },
  { timestamps: true },
);
statsSchema.index({ xp: -1 });
export const StudyStats = model<IStudyStats>("StudyStats", statsSchema);
