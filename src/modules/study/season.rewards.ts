export const getSeasonReward = (tier: string) => {
  switch (tier) {
    case "Diamond":
      return { xpBonus: 500, badge: "Diamond Champion" };
    case "Platinum":
      return { xpBonus: 300, badge: "Platinum Finisher" };
    case "Gold":
      return { xpBonus: 150, badge: "Gold Achiever" };
    case "Silver":
      return { xpBonus: 75, badge: "Silver Participant" };
    default:
      return { xpBonus: 25, badge: "Bronze Participant" };
  }
};