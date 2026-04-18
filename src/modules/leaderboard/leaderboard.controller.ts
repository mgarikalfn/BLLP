import { Request, Response } from "express";
import mongoose from "mongoose";
import { StudyStats } from "../study/study.statts.models";

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

export const getLeaderboard = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    // 1️⃣ Find current user stats to determine current tier scope.
    const currentUserStats = await StudyStats.findOne({ userId })
      .populate("userId", "username avatarUrl")
      .lean();

    if (!currentUserStats) {
      return res.status(404).json({
        success: false,
        message: "Study stats not found for current user"
      });
    }

    const tier = currentUserStats.seasonTier;

    // 2️⃣ Top players in the SAME tier only, ranked by season XP.
    const topUsers = await StudyStats.find({ seasonTier: tier })
      .sort({ seasonXp: -1, currentStreak: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "username avatarUrl")
      .select("userId seasonXp level currentStreak seasonTier")
      .lean();

    const leaderboard = topUsers.map((entry: any) => ({
      id: entry.userId?._id ?? null,
      username: entry.userId?.username ?? "Unknown",
      avatarUrl: entry.userId?.avatarUrl ?? null,
      seasonXp: entry.seasonXp,
      level: entry.level,
      currentStreak: entry.currentStreak,
      seasonTier: entry.seasonTier,
    }));

    // 3️⃣ Total users in this tier.
    const totalInTier = await StudyStats.countDocuments({ seasonTier: tier });

    // 4️⃣ Accurate local rank in current tier by season XP.
    const userRank = await StudyStats.countDocuments({
      seasonTier: tier,
      seasonXp: { $gt: currentUserStats.seasonXp }
    }) + 1;

    // 5️⃣ Promotion/Demotion zone.
    let zone: "PROMOTION" | "DEMOTION" | "SAFE" = "SAFE";
    if (userRank <= 10) {
      zone = "PROMOTION";
    } else if (totalInTier - userRank < 10) {
      zone = "DEMOTION";
    }

    return res.status(200).json({
      success: true,
      data: {
        leaderboard,
        pagination: {
          page,
          totalPages: Math.ceil(totalInTier / limit),
          totalInTier,
          tier,
        },
        currentUser: {
          rank: userRank,
          id: (currentUserStats.userId as any)?._id ?? userId,
          username: (currentUserStats.userId as any)?.username ?? "Unknown",
          avatarUrl: (currentUserStats.userId as any)?.avatarUrl ?? null,
          seasonXp: currentUserStats.seasonXp,
          level: currentUserStats.level,
          tier,
          zone,
        }
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Leaderboard fetch failed"
    });
  }
};