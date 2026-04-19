import { Response } from "express";
import mongoose from "mongoose";
import {
  LearningDirection,
  Role,
  targetLanguage,
  User,
} from "./user.model";
import { StudyStats } from "../study/study.statts.models";
import { Progress } from "../study/progress.model";
import { Lesson } from "../content/lesson.model";
import { AuthRequest } from "../../middleware/auth.middleware";

const getCurrentTopicName = (topicTitle: any, lang: targetLanguage) => {
  if (!topicTitle) return null;
  if (lang === targetLanguage.OROMO) return topicTitle.ao ?? null;
  return topicTitle.am ?? null;
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);

    const [user, stats] = await Promise.all([
      User.findById(userId)
        .select(
          "username email avatarUrl bio targetLanguage learningDirection role createdAt",
        )
        .lean(),
      StudyStats.findOne({ userId })
        .select(
          "xp level currentStreak longestStreak todayCount dailyGoal seasonTier badges",
        )
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!stats) {
      return res.status(404).json({ success: false, message: "Study stats not found" });
    }

    const completedLessonProgress = await Progress.find({
      userId,
      contentType: "LESSON",
    })
      .select("contentId")
      .lean();

    const completedLessonIds = completedLessonProgress.map((p: any) => p.contentId);
    const completedLessons = completedLessonIds.length;

    const completedTopics = completedLessonIds.length
      ? await Lesson.distinct("topicId", { _id: { $in: completedLessonIds } })
      : [];

    const nextLesson = await Lesson.findOne({
      _id: { $nin: completedLessonIds },
      isVerified: true,
    })
      .sort({ order: 1 })
      .populate("topicId", "title")
      .lean();

    const currentTopicName = getCurrentTopicName(
      (nextLesson as any)?.topicId?.title,
      user.targetLanguage,
    );

    return res.status(200).json({
      success: true,
      data: {
        identity: {
          id: user._id,
          username: user.username,
          avatarUrl: user.avatarUrl ?? null,
          bio: user.bio ?? null,
          joinedAt: user.createdAt,
        },
        learningSettings: {
          targetLanguage: user.targetLanguage,
          learningDirection: user.learningDirection,
        },
        stats: {
          level: stats.level,
          totalXp: stats.xp,
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          todayProgress: `${stats.todayCount} / ${stats.dailyGoal}`,
          tier: stats.seasonTier,
        },
        achievements: {
          badges: stats.badges ?? [],
        },
        courseProgress: {
          completedTopics: completedTopics.length,
          completedLessons,
          currentTopicName,
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { avatarUrl, bio, learningDirection, targetLanguage: nextTargetLanguage } = req.body;

    const updates: Record<string, unknown> = {};

    if (avatarUrl !== undefined) {
      if (typeof avatarUrl !== "string") {
        return res
          .status(400)
          .json({ success: false, message: "avatarUrl must be a string" });
      }
      updates.avatarUrl = avatarUrl;
    }

    if (bio !== undefined) {
      if (typeof bio !== "string") {
        return res.status(400).json({ success: false, message: "bio must be a string" });
      }
      if (bio.length > 160) {
        return res.status(400).json({ success: false, message: "bio must be 160 characters or fewer" });
      }
      updates.bio = bio;
    }

    if (learningDirection !== undefined) {
      if (!Object.values(LearningDirection).includes(learningDirection)) {
        return res.status(400).json({
          success: false,
          message: "learningDirection must be AM_TO_OR or OR_TO_AM",
        });
      }
      updates.learningDirection = learningDirection;
    }

    if (nextTargetLanguage !== undefined) {
      if (!Object.values(targetLanguage).includes(nextTargetLanguage)) {
        return res.status(400).json({
          success: false,
          message: "targetLanguage must be AMHARIC or OROMO",
        });
      }
      updates.targetLanguage = nextTargetLanguage;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No valid fields provided. Allowed: avatarUrl, bio, learningDirection, targetLanguage",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    )
      .select(
        "username email avatarUrl bio targetLanguage learningDirection role createdAt",
      )
      .lean();

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl ?? null,
        bio: updatedUser.bio ?? null,
        targetLanguage: updatedUser.targetLanguage,
        learningDirection: updatedUser.learningDirection,
        role: updatedUser.role as Role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
