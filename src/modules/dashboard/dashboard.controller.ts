import { Request, Response } from "express";
import mongoose from "mongoose";
import { getRecommendedLesson } from "./dashboard.service";
import { StudyStats } from "../study/study.statts.models";
import { Progress } from "../study/progress.model";

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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    /**
     * 1️⃣ USER STATS
     */

    const statsPromise = StudyStats.findOne({ userId }).lean();

    /**
     * 2️⃣ PROGRESS AGGREGATION
     */

    const progressAggregationPromise = Progress.aggregate([
      {
        $match: { userId }
      },

      {
        $facet: {
          /** Due Reviews */
          dueReviews: [
            { $match: { nextReview: { $lte: now } } },
            { $count: "count" }
          ],

          /** Weak Topics */
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
          ],

          /** Mastery Score */
          mastery: [
            {
              $group: {
                _id: null,
                avgEase: { $avg: "$easeFactor" }
              }
            }
          ],

          /** Lessons completed today */
          lessonsToday: [
            {
              $match: {
                completed: true,
                updatedAt: { $gte: todayStart }
              }
            },
            { $count: "count" }
          ],

          /** Reviews done today */
          reviewsToday: [
            {
              $match: {
                reviewedAt: { $gte: todayStart }
              }
            },
            { $count: "count" }
          ],

          /** Continue lesson */
          continueLesson: [
            { $match: { completed: false } },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
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
              $project: {
                _id: 0,
                id: "$lesson._id",
                title: "$lesson.title",
                topicId: "$lesson.topicId"
              }
            }
          ]
        }
      }
    ]);

    /**
     * 3️⃣ RECOMMENDED LESSON
     */

    const recommendedLessonPromise = getRecommendedLesson(req.user.id);

    /**
     * Run queries in parallel
     */

    const [stats, progressAggregation, recommendedLesson] = await Promise.all([
      statsPromise,
      progressAggregationPromise,
      recommendedLessonPromise
    ]);

    const agg = progressAggregation?.[0] ?? {};

    const dueReviews = agg?.dueReviews?.[0]?.count ?? 0;
    const weakTopics = agg?.weakTopics ?? [];
    const mastery = agg?.mastery?.[0]?.avgEase
      ? Number((agg.mastery[0].avgEase / 2.5).toFixed(2))
      : 0;

    const lessonsToday = agg?.lessonsToday?.[0]?.count ?? 0;
    const reviewsToday = agg?.reviewsToday?.[0]?.count ?? 0;

    const continueLesson = agg?.continueLesson?.[0] ?? null;

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
          dueReviews,
          recommendedLesson,
          continueLesson
        },

        insights: {
          weakTopics,
          mastery
        },

        activity: {
          lessonsToday,
          reviewsToday
        }
      }
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Dashboard aggregation failed"
    });
  }
};