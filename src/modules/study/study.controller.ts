import { Request, Response } from "express";
import { Progress } from "./progress.model";
import { calculateSM2 } from "./sm2.utils";
import { Lesson } from "../content/lesson.model";
import { StudyStats } from "./study.statts.models";
import { User } from "../user/user.model";
import { CURRENT_SEASON } from "./season.config";
import { calculateTier } from "./tier.utils";
import { getSeasonReward } from "./season.rewards";

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
      progress.easeFactor,
    );

    progress.repetition = result.repetition;
    progress.interval = result.interval;
    progress.easeFactor = result.easeFactor;
    progress.lastReviewed = new Date();
    progress.nextReview = new Date(
      Date.now() + result.interval * 24 * 60 * 60 * 1000,
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
        (today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24);

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

    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);

    stats.lastStudyDate = new Date();
    await stats.save();

    if (stats.seasonId !== CURRENT_SEASON.id) {
      stats.seasonId = CURRENT_SEASON.id;
      stats.seasonXp = 0;
    }

    // ===== XP CALCULATION =====
    let xpEarned = 0;

    // Base XP depends on quality
    xpEarned = quality * 10; // 0–50 XP

    // Bonus for weak lesson recovery
    if (progress.easeFactor < 2.0 && quality >= 4) {
      xpEarned += 20;
    }

    // Streak milestone bonus
    if (stats.currentStreak > 0 && stats.currentStreak % 7 === 0) {
      xpEarned += 50;
    }

    stats.xp = (stats.xp || 0) + xpEarned;

    stats.seasonXp += xpEarned;

    // Recalculate level
    const newLevel = calculateLevel(stats.xp);
    const leveledUp = newLevel > stats.level;
    stats.level = newLevel;

    await stats.save();

    // ===== RESPONSE =====
    return res.json({
      message: "Review recorded",
      nextReview: progress.nextReview,
      streak: stats.currentStreak,
      todayCount: stats.todayCount,
      dailyGoal: stats.dailyGoal,
      xpEarned,
      totalXP: stats.xp,
      level: stats.level,
      leveledUp,
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
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const now = new Date();

    // ===== FETCH POOLS =====
    const dueProgress = await Progress.find({
      userId,
      nextReview: { $lte: now },
    }).populate("lessonId");

    const weakProgress = await Progress.find({
      userId,
      easeFactor: { $lt: 2.0 },
      nextReview: { $gt: now },
    }).populate("lessonId");

    const seenProgress = await Progress.find({ userId }).select("lessonId");
    const seenIds = seenProgress.map((p) => p.lessonId.toString());

    const newLessons = await Lesson.find({
      _id: { $nin: seenIds },
      isVerified: true,
    });

    // ===== EXTRACT LESSON OBJECTS =====
    const dueLessons = dueProgress.map((p) => p.lessonId);
    const weakLessons = weakProgress.map((p) => p.lessonId);

    // Shuffle helper
    const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5);

    const shuffledDue = shuffle([...dueLessons]);
    const shuffledWeak = shuffle([...weakLessons]);
    const shuffledNew = shuffle([...newLessons]);

    // ... Shuffling code stays same ...

    // ===== SENIOR PICKING LOGIC =====
    // We prioritize Due, then Weak, then New until we hit the LIMIT.
    const combinedPool = [
      ...shuffledDue,
      ...shuffledWeak,
      ...shuffledNew
    ];

    const sessionLessons: any[] = [];
    const usedIds = new Set<string>();

    for (const lesson of combinedPool) {
      if (sessionLessons.length >= limit) break; // Fill up to the limit (e.g., 10)
      
      const id = lesson._id.toString();
      if (!usedIds.has(id)) {
        sessionLessons.push(lesson);
        usedIds.add(id);
      }
    }

    // Final check: if still empty, your Lesson collection might be empty or unverified
    return res.json({
      lessons: sessionLessons,
      userStats: authReq.user, // Ensure this matches your frontend UserStats interface!
      breakdown: {
        due: shuffledDue.length,
        weak: shuffledWeak.length,
        new: shuffledNew.length,
      },
      total: sessionLessons.length,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getStudyStats = async (req: Request, res: Response) => {
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
      message: "Server error",
    });
  }
};

export const getWeakAreas = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;

    // 1️⃣ Weak lessons (low ease factor)
    const weakProgress = await Progress.find({
      userId,
      easeFactor: { $lt: 2.0 },
    }).populate("lessonId");

    const weakLessons = weakProgress.map((p) => ({
      lesson: p.lessonId,
      easeFactor: p.easeFactor,
      interval: p.interval,
      repetition: p.repetition,
    }));

    // 2️⃣ Aggregate weak topics
    const topicMap: Record<string, number> = {};

    weakProgress.forEach((p) => {
      const lesson: any = p.lessonId;
      const topicId = lesson.topicId.toString();

      topicMap[topicId] = (topicMap[topicId] || 0) + 1;
    });

    const weakTopics = Object.entries(topicMap)
      .map(([topicId, count]) => ({
        topicId,
        weakLessonCount: count,
      }))
      .sort((a, b) => b.weakLessonCount - a.weakLessonCount);

    res.json({
      weakLessons,
      weakTopics,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getUserLevel = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  try {
    const stats = await StudyStats.findOne({ userId });

    if (!stats) {
      return res.json({
        xp: 0,
        level: 1,
      });
    }

    res.json({
      xp: stats.xp,
      level: stats.level,
      streak: stats.currentStreak,
      longestStreak: stats.longestStreak,
    });
  } catch {
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const leaders = await StudyStats.find()
      .sort({ xp: -1, currentStreak: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach basic user info safely
    const userIds = leaders.map((l) => l.userId);

    const users = await User.find({
      _id: { $in: userIds },
    })
      .select("username")
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u.username]));

    const result = leaders.map((l, index) => ({
      rank: skip + index + 1,
      username: userMap.get(l.userId.toString()) || "Unknown",
      xp: l.xp,
      level: l.level,
      streak: l.currentStreak,
    }));

    return res.json({
      page,
      leaders: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getRelativeLeaderboard = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  try {
    const currentStats = await StudyStats.findOne({ userId });

    if (!currentStats) {
      return res.status(404).json({
        message: "User stats not found",
      });
    }

    // Count users ahead (higher XP OR same XP but higher streak)
    const rank =
      (await StudyStats.countDocuments({
        $or: [
          { xp: { $gt: currentStats.xp } },
          {
            xp: currentStats.xp,
            currentStreak: { $gt: currentStats.currentStreak },
          },
        ],
      })) + 1;

    const windowSize = 5;

    const startRank = Math.max(rank - windowSize, 1);
    const skip = startRank - 1;
    const limit = windowSize * 2 + 1;

    const windowUsers = await StudyStats.find()
      .sort({ xp: -1, currentStreak: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds = windowUsers.map((u) => u.userId);

    const users = await User.find({
      _id: { $in: userIds },
    })
      .select("username")
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u.username]));

    const leaders = windowUsers.map((u, index) => ({
      rank: skip + index + 1,
      username: userMap.get(u.userId.toString()) || "Unknown",
      xp: u.xp,
      level: u.level,
      streak: u.currentStreak,
      isCurrentUser: u.userId.toString() === userId,
    }));

    return res.json({
      currentRank: rank,
      leaders,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getSeasonLeaderboard = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const leaders = await StudyStats.find({
      seasonId: CURRENT_SEASON.id,
    })
      .sort({ seasonXp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds = leaders.map((l) => l.userId);

    const users = await User.find({
      _id: { $in: userIds },
    })
      .select("username")
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u.username]));

    const result = leaders.map((l, index) => ({
      rank: skip + index + 1,
      username: userMap.get(l.userId.toString()) || "Unknown",
      seasonXp: l.seasonXp,
      level: l.level,
    }));

    return res.json({
      season: CURRENT_SEASON.name,
      page,
      leaders: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};


export const getSeasonTier = async (
  req: Request,
  res: Response
) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  try {
    const totalPlayers = await StudyStats.countDocuments({
      seasonId: CURRENT_SEASON.id
    });

    const userStats = await StudyStats.findOne({
      userId,
      seasonId: CURRENT_SEASON.id
    });

    if (!userStats) {
      return res.status(404).json({
        message: "Stats not found"
      });
    }

    const rank =
      (await StudyStats.countDocuments({
        seasonId: CURRENT_SEASON.id,
        seasonXp: { $gt: userStats.seasonXp }
      })) + 1;

    const tier = calculateTier(rank, totalPlayers);

    // Save tier
    userStats.seasonTier = tier;
    await userStats.save();

    return res.json({
      season: CURRENT_SEASON.name,
      rank,
      totalPlayers,
      tier,
      seasonXp: userStats.seasonXp
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};


export const finalizeSeason = async (
  req: Request,
  res: Response
) => {
  try {
    const players = await StudyStats.find({
      seasonId: CURRENT_SEASON.id
    });

    for (const player of players) {
      const reward = getSeasonReward(player.seasonTier);

      player.xp += reward.xpBonus;
      player.badges.push(
        `${CURRENT_SEASON.id}_${player.seasonTier}`
      );

      player.seasonXp = 0;
      player.seasonTier = "Bronze";

      await player.save();
    }

    return res.json({
      message: "Season finalized successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });
  }
};

const getStartOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const calculateLevel = (xp: number) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};
