export const ACHIEVEMENT_CONFIG = [
  {
    type: "STREAK",
    title: "Firewalker",
    description: "Keep your daily learning streak alive.",
    gemReward: 50, // Base reward per tier (or could scale differently)
    targetValues: [3, 7, 30, 100] // levels 1 to 4
  },
  {
    type: "TOTAL_XP",
    title: "Scholar",
    description: "Earn total XP across all your lessons.",
    gemReward: 100,
    targetValues: [1000, 5000, 10000, 50000]
  },
  {
    type: "QUESTS",
    title: "Daily Hero",
    description: "Complete Daily Quests.",
    gemReward: 20,
    targetValues: [10, 50, 100]
  },
  {
    type: "LESSONS",
    title: "Master",
    description: "Finish language lessons.",
    gemReward: 75,
    targetValues: [5, 20, 50, 100]
  },
  {
    type: "SPEAKING",
    title: "Speaking King",
    description: "Perfect your pronunciation in Afan Oromo/Amharic.",
    gemReward: 150,
    targetValues: [10, 50, 200]
  },
  {
    type: "WRITING",
    title: "Writing Wizard",
    description: "Master the art of writing in your target language.",
    gemReward: 150,
    targetValues: [5, 25, 100]
  }
];
