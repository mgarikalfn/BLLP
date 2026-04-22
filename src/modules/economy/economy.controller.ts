import { Request, Response } from "express";
import { StudyStats } from "../study/study.statts.models";
import { AuthRequest } from "../../middleware/auth.middleware";
import { ACHIEVEMENT_CONFIG } from "../../constants/achievements";

const MAX_HEARTS = 5;
const HEART_REGEN_TIME_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const REFILL_COST = 500;

export const getEconomyStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    let stats = await StudyStats.findOne({ userId });
    if (!stats) {
      res.status(404).json({ message: "Study stats not found" });
      return;
    }

    // Time-based regeneration logic
    const now = new Date();
    const lastRegen = new Date(stats.lastHeartRegeneration || now);
    const msSinceLastRegen = now.getTime() - lastRegen.getTime();

    if (stats.hearts < MAX_HEARTS && msSinceLastRegen >= HEART_REGEN_TIME_MS) {
      const heartsToRegenerate = Math.floor(msSinceLastRegen / HEART_REGEN_TIME_MS);
      const newHearts = Math.min(MAX_HEARTS, stats.hearts + heartsToRegenerate);
      
      if (newHearts !== stats.hearts) {
        // Adjust last regen time accordingly
        const msRemainder = msSinceLastRegen % HEART_REGEN_TIME_MS;
        stats.hearts = newHearts;
        stats.lastHeartRegeneration = new Date(now.getTime() - msRemainder);
        await stats.save();
      }
    }

    // Auto-seed starter Quests if the user has none
    if (!stats.dailyQuests || stats.dailyQuests.length === 0) {
      stats.dailyQuests = [
        { type: "XP", description: "Earn 50 XP", targetValue: 50, currentValue: 0, rewardGems: 10, isClaimed: false } as any,
        { type: "LESSONS", description: "Complete 2 Lessons", targetValue: 2, currentValue: 0, rewardGems: 25, isClaimed: false } as any,
        { type: "ACCURACY", description: "Get 1 Perfect Lesson", targetValue: 1, currentValue: 0, rewardGems: 50, isClaimed: false } as any
      ];
      // Seed initial game economy balance
      if (stats.gems === 0) {
        stats.gems = 500;
      }
      await stats.save();
    }

    res.json({
      gems: stats.gems,
      hearts: stats.hearts,
      streakFreezeActive: stats.streakFreezeActive || 0,
      lastHeartRegeneration: stats.lastHeartRegeneration,
      timeUntilNextHeart: stats.hearts < MAX_HEARTS ? Math.max(0, HEART_REGEN_TIME_MS - (now.getTime() - new Date(stats.lastHeartRegeneration).getTime())) : 0,
      dailyQuests: stats.dailyQuests,
      achievements: stats.achievements
    });
  } catch (error) {
    res.status(500).json({ message: "Error getting economy status", error });
  }
};

export const deductHeart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const stats = await StudyStats.findOne({ userId });
    
    if (!stats) {
      res.status(404).json({ message: "Study stats not found" });
      return;
    }

    if (stats.hearts <= 0) {
      res.status(400).json({ message: "No hearts remaining" });
      return;
    }

    if (stats.hearts === MAX_HEARTS) {
      // Start the regeneration timer if we drop below max
      stats.lastHeartRegeneration = new Date();
    }

    stats.hearts -= 1;
    await stats.save();

    res.json({
      hearts: stats.hearts,
      message: "Heart deducted successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Error deducting heart", error });
  }
};

export const earnHeart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const stats = await StudyStats.findOne({ userId });
    
    if (!stats) {
      res.status(404).json({ message: "Study stats not found" });
      return;
    }

    if (stats.hearts >= MAX_HEARTS) {
      res.status(400).json({ message: "Hearts already at maximum" });
      return;
    }

    stats.hearts += 1;
    if (stats.hearts === MAX_HEARTS) {
      stats.lastHeartRegeneration = new Date();
    }
    await stats.save();

    res.json({
      hearts: stats.hearts,
      message: "Heart earned successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Error earning heart", error });
  }
};

export const refillHearts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const stats = await StudyStats.findOne({ userId });
    
    if (!stats) {
      res.status(404).json({ message: "Study stats not found" });
      return;
    }

    if (stats.gems < REFILL_COST) {
      res.status(400).json({ message: "Insufficient funds" });
      return;
    }

    if (stats.hearts >= MAX_HEARTS) {
      res.status(400).json({ message: "Hearts already at maximum" });
      return;
    }

    stats.gems -= REFILL_COST;
    stats.hearts = MAX_HEARTS;
    stats.lastHeartRegeneration = new Date();
    await stats.save();

    res.json({
      gems: stats.gems,
      hearts: stats.hearts,
      message: "Hearts refilled successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Error refilling hearts", error });
  }
};

export const awardGems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount } = req.body;
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ message: "Invalid gem amount" });
      return;
    }

    const userId = req.user?.id;
    const stats = await StudyStats.findOne({ userId });
    
    if (!stats) {
      res.status(404).json({ message: "Study stats not found" });
      return;
    }

    stats.gems += amount;
    await stats.save();

    res.json({
      gems: stats.gems,
      message: `${amount} gems awarded successfully`
    });
  } catch (error) {
    res.status(500).json({ message: "Error awarding gems", error });
  }
};

export const claimReward = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { type, id } = req.body; // type: "QUEST" | "ACHIEVEMENT"
    
    if (!type || !id || !['QUEST', 'ACHIEVEMENT'].includes(type)) {
      res.status(400).json({ message: "Invalid request payload" });
      return;
    }

    const stats = await StudyStats.findOne({ userId });
    if (!stats) {
      res.status(404).json({ message: "Study stats not found" });
      return;
    }

    let rewardAmount = 0;
    let found = false;

    if (type === "QUEST") {
      const quest = stats.dailyQuests.find(q => q._id?.toString() === id);
      if (quest) {
        if (quest.isClaimed || quest.currentValue < quest.targetValue) {
          res.status(400).json({ message: "Reward not eligible for claiming" });
          return;
        }
        quest.isClaimed = true;
        rewardAmount = quest.rewardGems;
        found = true;
      }
    } else if (type === "ACHIEVEMENT") {
      const achievement = stats.achievements.find(a => a._id?.toString() === id);
      if (achievement) {
        if (!achievement.isClaimable) {
          res.status(400).json({ message: "Reward not eligible for claiming" });
          return;
        }
        
        const config = ACHIEVEMENT_CONFIG.find(c => c.type === achievement.type);
        if (!config) {
          res.status(404).json({ message: "Achievement config not found" });
          return;
        }

        achievement.isClaimable = false;
        rewardAmount = config.gemReward * achievement.currentLevel;
        achievement.totalGemsEarned += rewardAmount;
        found = true;
        
        // Auto-generate the next level logic
        achievement.currentLevel += 1;
        // Current progress is kept as-is, so they can progress to the next tier naturally
      }
    }

    if (!found) {
      res.status(404).json({ message: "Quest or Achievement not found" });
      return;
    }

    stats.gems += rewardAmount;
    await stats.save();

    res.json({
      gems: stats.gems,
      claimedReward: rewardAmount,
      message: "Reward claimed successfully!"
    });
  } catch (error) {
    res.status(500).json({ message: "Error claiming reward", error });
  }
};

export const buyItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { itemType } = req.body;
    
    if (!itemType || itemType !== 'STREAK_FREEZE') {
      res.status(400).json({ message: "Invalid item type" });
      return;
    }

    const stats = await StudyStats.findOne({ userId });
    if (!stats) {
      res.status(404).json({ message: "Study stats not found" });
      return;
    }

    const cost = 200;

    if (stats.gems < cost) {
      res.status(400).json({ message: "Insufficient funds" });
      return;
    }

    stats.gems -= cost;
    if (itemType === 'STREAK_FREEZE') {
      stats.streakFreezeActive = (stats.streakFreezeActive || 0) + 1;
    }

    await stats.save();

    res.json({
      gems: stats.gems,
      streakFreezeActive: stats.streakFreezeActive,
      message: "Item purchased successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Error buying item", error });
  }
};
