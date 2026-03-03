import { Request, Response } from "express";
import mongoose from "mongoose";
import { StudyStats } from "../study/study.statts.models";
import { Progress } from "../study/progress.model";
import { getRecommendedLesson } from "./dashboard.service";

type AuthRequest = Request & {
  user?: {
    id: string;
  };
};

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();

    // 1️⃣ Fetch StudyStats (single document lookup — cheap)
    const stats = await StudyStats.findOne({ userId });

    // 2️⃣ Aggregation on Progress
    const progressAggregation = await Progress.aggregate([
      {
        $match: { userId }
      },
      {
        $facet: {
          dueCount: [{ $match: { nextReview: { $lte: now } } }, { $count: "count" }],
          weakTopics: [
            { $match: { easeFactor: { $lt: 2.0 } } },
            {
              $lookup: {
                from: "lessons",
                localField: "lessonId",
                foreignField: "_id",
                as: "lesson"
              }
            },
            { $unwind: "$lesson" },
            {
              $group: {
                _id: "$lesson.topicId",
                weakCount: { $sum: 1 }
              }
            },
            { $sort: { weakCount: -1 } },
            { $limit: 3 }
          ]
        }
      }
    ]);

    const dueCount = progressAggregation?.[0]?.dueCount?.[0]?.count ?? 0;
    const weakTopics = progressAggregation?.[0]?.weakTopics ?? [];
    const recommendedLesson = await getRecommendedLesson(req.user.id);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          xp: stats?.xp ?? 0,
          level: stats?.level ?? 1,
          streak: stats?.currentStreak ?? 0,
          tier: stats?.seasonTier ?? "Bronze"
        },
        actions: {
          dueCount,
          isReviewPriority: dueCount > 5,
          recommendedLesson
        },
        insights: {
          weakTopics
        }
      }
    });
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Dashboard aggregation failed"
    });
  }
};