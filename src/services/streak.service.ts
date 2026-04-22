import { StudyStats } from "../modules/study/study.statts.models";

const getStartOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const updateStreakAndDailyGoal = async (userId: string | any) => {
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
      // Missed one or more days - check for active freeze
      if (stats.streakFreezeActive > 0) {
        stats.streakFreezeActive -= 1;
        // Simulate that they studied yesterday to keep the streak going today
        stats.currentStreak += 1; 
        stats.todayCount = 1;
      } else {
        stats.currentStreak = 1;
        stats.todayCount = 1;
      }
    }
  }

  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
  stats.lastStudyDate = new Date();
  await stats.save();

  return stats;
};
