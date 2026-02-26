import { Request, Response } from "express";
import { Progress } from "./progress.model";
import { calculateSM2 } from "./sm2.utils";
import { Lesson } from "../content/lesson.model";
import { StudyStats } from "./study.statts.models";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const reviewLesson = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  try {
    const { lessonId, quality } = req.body;

    if (quality < 0 || quality > 5) {
      return res.status(400).json({
        message: "Quality must be between 0 and 5",
      });
    }

    // ===== PROGRESS (SM-2) =====
    let progress = await Progress.findOne({ userId, lessonId });

    if (!progress) {
      progress = new Progress({
        userId,
        lessonId,
      });
    }

    const result = calculateSM2(
      quality,
      progress.repetition,
      progress.interval,
      progress.easeFactor
    );

    progress.repetition = result.repetition;
    progress.interval = result.interval;
    progress.easeFactor = result.easeFactor;
    progress.lastReviewed = new Date();
    progress.nextReview = new Date(
      Date.now() + result.interval * 24 * 60 * 60 * 1000
    );

    await progress.save();

    // ===== STREAK & DAILY GOAL =====
    let stats = await StudyStats.findOne({ userId });

    if (!stats) {
      stats = new StudyStats({ userId });
    }

    const today = getStartOfDay(new Date());
    const lastStudy = stats.lastStudyDate
      ? getStartOfDay(stats.lastStudyDate)
      : null;

    if (!lastStudy) {
      stats.currentStreak = 1;
      stats.todayCount = 1;
    } else {
      const diffDays =
        (today.getTime() - lastStudy.getTime()) /
        (1000 * 60 * 60 * 24);

      if (diffDays === 0) {
        stats.todayCount += 1;
      } else if (diffDays === 1) {
        stats.currentStreak += 1;
        stats.todayCount = 1;
      } else {
        stats.currentStreak = 1;
        stats.todayCount = 1;
      }
    }

    stats.longestStreak = Math.max(
      stats.longestStreak,
      stats.currentStreak
    );

    stats.lastStudyDate = new Date();
    await stats.save();

    // ===== RESPONSE =====
    return res.json({
      message: "Review recorded",
      nextReview: progress.nextReview,
      streak: stats.currentStreak,
      todayCount: stats.todayCount,
      dailyGoal: stats.dailyGoal,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getDueLessons = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;

    const dueLessons = await Progress.find({
      userId,
      nextReview: { $lte: new Date() },
    }).populate("lessonId");

    res.json(dueLessons);
  } catch {
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const startStudySession = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    // 1️⃣ Get due lessons
    const dueProgress = await Progress.find({
      userId,
      nextReview: { $lte: new Date() },
    })
      .populate("lessonId")
      .limit(limit);

    const dueLessons = dueProgress.map((p) => p.lessonId);

    const remainingSlots = limit - dueLessons.length;

    let newLessons: any[] = [];

    if (remainingSlots > 0) {
      // Find lessons user has progress for
      const userProgress = await Progress.find({
        userId,
      }).select("lessonId");

      const seenLessonIds = userProgress.map((p) => p.lessonId.toString());

      newLessons = await Lesson.find({
        _id: { $nin: seenLessonIds },
        isVerified: true,
      })
        .sort({ createdAt: 1 })
        .limit(remainingSlots);
    }

    res.json({
      due: dueLessons,
      new: newLessons,
      total: dueLessons.length + newLessons.length,
    });
  } catch {
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getStudyStats = async (
  req: Request,
  res: Response
) => {
  try {
     const authReq = req as AuthRequest;
    const userId = authReq.user!.id;

    let stats = await StudyStats.findOne({ userId });

    if (!stats) {
      stats = new StudyStats({ userId });
      await stats.save();
    }

    res.json(stats);
  } catch {
    res.status(500).json({
      message: "Server error"
    });
  }
};

export const getWeakAreas = async (
  req: Request,
  res: Response
) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;

    // 1️⃣ Weak lessons (low ease factor)
    const weakProgress = await Progress.find({
      userId,
      easeFactor: { $lt: 2.0 }
    }).populate("lessonId");

    const weakLessons = weakProgress.map(p => ({
      lesson: p.lessonId,
      easeFactor: p.easeFactor,
      interval: p.interval,
      repetition: p.repetition
    }));

    // 2️⃣ Aggregate weak topics
    const topicMap: Record<string, number> = {};

    weakProgress.forEach(p => {
      const lesson: any = p.lessonId;
      const topicId = lesson.topicId.toString();

      topicMap[topicId] = (topicMap[topicId] || 0) + 1;
    });

    const weakTopics = Object.entries(topicMap)
      .map(([topicId, count]) => ({
        topicId,
        weakLessonCount: count
      }))
      .sort((a, b) => b.weakLessonCount - a.weakLessonCount);

    res.json({
      weakLessons,
      weakTopics
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error"
    });
  }
};




const getStartOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};
