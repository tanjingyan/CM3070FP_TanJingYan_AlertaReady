export function getLevelFromXp(
  xp: number
) {
  if (xp >= 1000) return 5;
  if (xp >= 500) return 4;
  if (xp >= 250) return 3;
  if (xp >= 100) return 2;

  return 1;
}

export function getSimulationScore(
  safeDecisions: number,
  totalStages: number
) {
  if (totalStages <= 0) {
    return 0;
  }

  return Math.round(
    (safeDecisions / totalStages) * 100
  );
}

export function getEligibleSimulationXp(
  safeDecisions: number
) {
  return safeDecisions * 10;
}

export function getAdditionalSimulationXp(
  eligibleXp: number,
  previousXpAwarded: number
) {
  return Math.max(
    0,
    eligibleXp - previousXpAwarded
  );
}