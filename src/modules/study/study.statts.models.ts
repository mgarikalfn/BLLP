import { Schema, model, Types } from "mongoose";

export interface IDailyQuest {
  _id?: Types.ObjectId;
  type: "XP" | "LESSONS" | "ACCURACY";
  description: string;
  targetValue: number;
  currentValue: number;
  rewardGems: number;
  isClaimed: boolean;
}

export interface IAchievement {
  _id?: Types.ObjectId;
  type: string;
  title: string;
  currentLevel: number;
  currentProgress: number;
  isClaimable: boolean;
  totalGemsEarned: number;
}

export interface IStudyStats {
  userId: Types.ObjectId;

  currentStreak: number;
  longestStreak: number;

  lastStudyDate?: Date;

  dailyGoal: number;
  todayCount: number;

  xp: number;
  level: number;

  seasonXp: number;
  seasonId: string;

  seasonTier:string;
  badges:string[];

  gems: number;
  hearts: number;
  lastHeartRegeneration: Date;

  dailyQuests: IDailyQuest[];
  achievements: IAchievement[];
  streakFreezeActive: number;
}

const questSchema = new Schema<IDailyQuest>({
  type: { type: String, enum: ["XP", "LESSONS", "ACCURACY"], required: true },
  description: { type: String, required: true },
  targetValue: { type: Number, required: true },
  currentValue: { type: Number, default: 0 },
  rewardGems: { type: Number, required: true },
  isClaimed: { type: Boolean, default: false }
});

const achievementSchema = new Schema<IAchievement>({
  type: { type: String, required: true },
  title: { type: String },
  currentLevel: { type: Number, default: 1 },
  currentProgress: { type: Number, default: 0 },
  isClaimable: { type: Boolean, default: false },
  totalGemsEarned: { type: Number, default: 0 }
});

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

    seasonXp: { type: Number, default: 0 },
    seasonId: { type: String, default: "S1" },

    seasonTier: { type: String, default: "Bronze" },
    badges: [{ type: String }],
    
    gems: { type: Number, default: 500 },
    hearts: { type: Number, default: 5, max: 5 },
    lastHeartRegeneration: { type: Date, default: Date.now },

    dailyQuests: { type: [questSchema], default: [] },
    achievements: { type: [achievementSchema], default: [] },
    streakFreezeActive: { type: Number, default: 0 }
  },
  { timestamps: true },
);

statsSchema.index({ seasonId: 1, seasonXp: -1  , seasonTier: 1});
export const StudyStats = model<IStudyStats>("StudyStats", statsSchema);
