import { StudyStats } from "../modules/study/study.statts.models";
import { ACHIEVEMENT_CONFIG } from "../constants/achievements";

export const initializeUserAchievements = async (userId: string) => {
  try {
    const stats = await StudyStats.findOne({ userId });
    if (!stats) return;

    // Check if achievements are already populated, if not map from config
    const existingTypes = stats.achievements?.map(a => a.type) || [];
    
    let isModified = false;
    for (const config of ACHIEVEMENT_CONFIG) {
      if (!existingTypes.includes(config.type)) {
        stats.achievements.push({
          type: config.type,
          title: config.title,
          currentLevel: 1,
          currentProgress: 0,
          isClaimable: false,
          totalGemsEarned: 0
        });
        isModified = true;
      }
    }

    if (isModified) {
      await stats.save();
    }
  } catch (error) {
    console.error("Error initializing achievements:", error);
  }
};

export const updateAchievementProgress = async (
  userId: string, 
  metricType: string, 
  incrementValue: number
) => {
  try {
    const stats = await StudyStats.findOne({ userId });
    if (!stats) return;

    let isModified = false;
    const achievement = stats.achievements.find(a => a.type === metricType);
    
    if (achievement) {
      const config = ACHIEVEMENT_CONFIG.find(c => c.type === metricType);
      
      // If valid config and user hasn't beaten all levels
      if (config && achievement.currentLevel <= config.targetValues.length) {
        achievement.currentProgress += incrementValue;
        
        const targetForCurrentLevel = config.targetValues[achievement.currentLevel - 1];

        // If they reached the tier and it wasn't already claimable
        if (achievement.currentProgress >= targetForCurrentLevel && !achievement.isClaimable) {
          achievement.currentProgress = targetForCurrentLevel; // Cap at the tier requirement
          achievement.isClaimable = true;
        }

        isModified = true;
      }
    }

    if (isModified) {
      await stats.save();
    }
  } catch (error) {
    console.error("Error updating achievement progress:", error);
  }
};

export const updateQuestProgress = async (
  userId: string,
  metricType: "XP" | "LESSONS" | "ACCURACY",
  incrementValue: number
) => {
  try {
    const stats = await StudyStats.findOne({ userId });
    if (!stats) return;

    let isModified = false;
    for (const quest of stats.dailyQuests) {
      if (quest.type === metricType && !quest.isClaimed && quest.currentValue < quest.targetValue) {
        quest.currentValue += incrementValue;
        if (quest.currentValue > quest.targetValue) {
          quest.currentValue = quest.targetValue;
        }
        isModified = true;
      }
    }

    if (isModified) {
      await stats.save();
    }
  } catch (error) {
    console.error("Error updating quest progress:", error);
  }
};