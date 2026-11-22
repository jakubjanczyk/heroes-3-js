const ALL_ENEMIES_OUT_BONUS = 25
const NORMAL = { name: 'Normal', multiplier: 1 }

const rankOf = (score, ranks) =>
  Object.entries(ranks).find(([, { from, to }]) => score >= from && score <= to)?.[0] ?? null

// The days over the towns is whole-number division: its remainder is dropped.
export function scoreOf({ day, towns, allEnemiesOut, ranks = {} }) {
  const baseScore =
    200 - Math.floor((day + 10) / (towns + 5)) + (allEnemiesOut ? ALL_ENEMIES_OUT_BONUS : 0)
  const finalScore = Math.floor(baseScore * NORMAL.multiplier)
  return {
    days: day,
    baseScore,
    difficulty: NORMAL.name,
    finalScore,
    rank: rankOf(finalScore, ranks)
  }
}
