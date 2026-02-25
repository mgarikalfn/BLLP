export function calculateSM2(
  quality: number,
  repetition: number,
  interval: number,
  easeFactor: number
) {
  if (quality < 3) {
    return {
      repetition: 0,
      interval: 1,
      easeFactor
    };
  }

  if (repetition === 0) interval = 1;
  else if (repetition === 1) interval = 6;
  else interval = Math.round(interval * easeFactor);

  repetition += 1;

  easeFactor =
    easeFactor +
    (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  if (easeFactor < 1.3) easeFactor = 1.3;

  return { repetition, interval, easeFactor };
}