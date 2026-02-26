export const calculateTier = (
  rank: number,
  totalPlayers: number
): string => {
  const percentile = rank / totalPlayers;

  if (percentile <= 0.05) return "Diamond";
  if (percentile <= 0.20) return "Platinum";
  if (percentile <= 0.50) return "Gold";
  if (percentile <= 0.80) return "Silver";
  return "Bronze";
};