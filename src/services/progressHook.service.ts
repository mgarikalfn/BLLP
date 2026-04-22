import { Types } from "mongoose";
import { StudyStats } from "../modules/study/study.statts.models";
import { ACHIEVEMENT_CONFIG } from "../constants/achievements";

export interface ProgressPayload {
  xpEarned: number;
  isPerfect: boolean;
  lessonsCompleted: number;
  currentStreak?: number; // optionally passed to ensure up-to-date streak
}

export const updateQuestAndAchievementProgress = async (
  userId: string | Types.ObjectId,
  payload: ProgressPayload
) => {
  try {
    const stats = await StudyStats.findOne({ userId });
    if (!stats) return;

    let isModified = false;

    // Update Daily Quests
    if (stats.dailyQuests && stats.dailyQuests.length > 0) {
      for (const quest of stats.dailyQuests) {
        if (quest.isClaimed) continue; // Skip claimed

        switch (quest.type) {
          case "XP":
            quest.currentValue += payload.xpEarned;
            isModified = true;
            break;
          case "LESSONS":
            quest.currentValue += payload.lessonsCompleted;
            isModified = true;
            break;
          case "ACCURACY":
            if (payload.isPerfect) {
              quest.currentValue += 1;
              isModified = true;
            }
            break;
        }

        // Cap at targetValue
        if (quest.currentValue > quest.targetValue) {
          quest.currentValue = quest.targetValue;
        }
      }
    }

    // Update Lifetime Achievements
    if (stats.achievements && stats.achievements.length > 0) {
      for (const achievement of stats.achievements) {
        const config = ACHIEVEMENT_CONFIG.find(c => c.type === achievement.type);
        if (!config || achievement.currentLevel > config.targetValues.length) continue;
        
        if (achievement.isClaimable) continue; // Skip claimed ones waiting for regeneration

        const targetValue = config.targetValues[achievement.currentLevel - 1];

        switch (achievement.type) {
          case "STREAK":
            if (payload.currentStreak || stats.currentStreak) {
              const streak = payload.currentStreak || stats.currentStreak;
              if (achievement.currentProgress < streak) {
                achievement.currentProgress = streak;
                isModified = true;
              }
            }
            break;
          case "TOTAL_XP":
            achievement.currentProgress = stats.xp + payload.xpEarned;
            isModified = true;
            break;
        }

        if (achievement.currentProgress >= targetValue) {
          achievement.currentProgress = targetValue;
          achievement.isClaimable = true;
        }
      }
    }

    if (isModified) {
      await stats.save();
    }
  } catch (error) {
    console.error("Error in updateQuestAndAchievementProgress:", error);
  }
};
