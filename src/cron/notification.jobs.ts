import cron from "node-cron";
import { Progress } from "../modules/study/progress.model";
import { StudyStats } from "../modules/study/study.statts.models";
import { NotificationService } from "../modules/notifications/notification.service";

const getStartOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const runReviewDueScanner = async () => {
  const now = new Date();

  const dueByUser = await Progress.aggregate([
    { $match: { nextReview: { $lte: now }, contentType: "VOCABULARY" } },
    { $group: { _id: "$userId", dueCount: { $sum: 1 } } },
    { $match: { dueCount: { $gt: 5 } } },
  ]);

  for (const row of dueByUser) {
    await NotificationService.create({
      userId: row._id,
      type: "REVIEW_DUE",
      title: "Review Time",
      message: `You have ${row.dueCount} cards due. Keep your streak alive by reviewing now.`,
      metadata: { dueCount: row.dueCount },
    });
  }
};

const runStreakSavior = async () => {
  const startOfToday = getStartOfToday();

  const atRiskUsers = await StudyStats.find({
    currentStreak: { $gt: 0 },
    $or: [
      { lastStudyDate: { $lt: startOfToday } },
      { lastStudyDate: { $exists: false } },
      { lastStudyDate: null },
    ],
  })
    .select("userId currentStreak")
    .lean();

  for (const stats of atRiskUsers) {
    await NotificationService.create({
      userId: stats.userId,
      type: "STREAK_ALERT",
      title: "Streak In Danger",
      message: `Your ${stats.currentStreak}-day streak expires at midnight. Complete one lesson to save it.`,
      metadata: { currentStreak: stats.currentStreak },
    });
  }
};

export const startNotificationJobs = () => {
  // Every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    try {
      await runReviewDueScanner();
    } catch (error) {
      console.error("Review Due scanner failed:", error);
    }
  });

  // Every day at 8:00 PM
  cron.schedule("0 20 * * *", async () => {
    try {
      await runStreakSavior();
    } catch (error) {
      console.error("Streak Savior job failed:", error);
    }
  });
};
