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
    const userId = new mongoose.Types.ObjectId(req.user!.id);

    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // 1️⃣ Top players (paginated)
    const topUsers = await StudyStats.find()
      .sort({ xp: -1 })
      .skip(skip)
      .limit(limit)
      .select("xp level seasonTier currentStreak");

    // 2️⃣ Get total users count
    const totalUsers = await StudyStats.countDocuments();

    // 3️⃣ Get current user rank
    const currentUserStats = await StudyStats.findOne({ userId });

    const userRank = await StudyStats.countDocuments({
      xp: { $gt: currentUserStats!.xp }
    }) + 1;

    return res.status(200).json({
      success: true,
      data: {
        leaderboard: topUsers,
        pagination: {
          page,
          totalPages: Math.ceil(totalUsers / limit)
        },
        currentUser: {
          rank: userRank,
          xp: currentUserStats!.xp,
          level: currentUserStats!.level,
          tier: currentUserStats!.seasonTier
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