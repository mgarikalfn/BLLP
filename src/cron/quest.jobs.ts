import cron from "node-cron";
import { StudyStats } from "../modules/study/study.statts.models";

// ─── Quest Pool ───────────────────────────────────────────────────────────────
// Each night we randomly pick 3 quests (1 per tier) from these pools so the
// experience stays fresh instead of giving identical quests every day.

const BRONZE_QUESTS = [
  { type: "XP" as const, description: "Earn 50 XP today", targetValue: 50, rewardGems: 10 },
  { type: "XP" as const, description: "Earn 30 XP today", targetValue: 30, rewardGems: 10 },
  { type: "LESSONS" as const, description: "Complete 1 Lesson", targetValue: 1, rewardGems: 10 },
];

const SILVER_QUESTS = [
  { type: "LESSONS" as const, description: "Complete 2 Lessons", targetValue: 2, rewardGems: 25 },
  { type: "XP" as const, description: "Earn 100 XP today", targetValue: 100, rewardGems: 25 },
  { type: "ACCURACY" as const, description: "Get 1 Perfect Lesson (all correct)", targetValue: 1, rewardGems: 25 },
];

const GOLD_QUESTS = [
  { type: "ACCURACY" as const, description: "Get 2 Perfect Lessons", targetValue: 2, rewardGems: 50 },
  { type: "LESSONS" as const, description: "Complete 4 Lessons", targetValue: 4, rewardGems: 50 },
  { type: "XP" as const, description: "Earn 200 XP today", targetValue: 200, rewardGems: 50 },
];

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ─── Reset Logic ──────────────────────────────────────────────────────────────

const resetDailyQuests = async (): Promise<void> => {
  console.log("[QuestReset] Starting midnight quest reset...");

  try {
    // Fetch minimal projection — we only need _id and dailyQuests
    const allStats = await StudyStats.find({}).select("_id dailyQuests").lean();

    const bulkOps = allStats.map((stats) => ({
      updateOne: {
        filter: { _id: stats._id },
        update: {
          $set: {
            dailyQuests: [
              { ...pickRandom(BRONZE_QUESTS), currentValue: 0, isClaimed: false },
              { ...pickRandom(SILVER_QUESTS), currentValue: 0, isClaimed: false },
              { ...pickRandom(GOLD_QUESTS), currentValue: 0, isClaimed: false },
            ],
          },
        },
      },
    }));

    if (bulkOps.length > 0) {
      const result = await StudyStats.bulkWrite(bulkOps);
      console.log(
        `[QuestReset] ✅ Reset complete. Modified ${result.modifiedCount} / ${allStats.length} user records.`
      );
    } else {
      console.log("[QuestReset] No users to reset.");
    }
  } catch (error) {
    console.error("[QuestReset] ❌ Failed to reset daily quests:", error);
  }
};

// ─── Scheduler ───────────────────────────────────────────────────────────────

export const startQuestJobs = (): void => {
  // Every night at midnight (server local time)
  cron.schedule("0 0 * * *", async () => {
    await resetDailyQuests();
  });

  console.log("[QuestReset] Midnight quest reset job registered (runs at 00:00 daily).");
};
