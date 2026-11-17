// Sums the daily income of the given mines per resource type, e.g. { GOLD_PILE: 2000 }.
export function dailyIncomeOfMines({ mines, definitions = {} }) {
  const income = {}

  for (const mine of mines) {
    const mineIncome = definitions.mines?.[mine.type]?.income
    const amount = Number(mineIncome?.amount)
    if (typeof mineIncome?.resource !== 'string' || !Number.isFinite(amount) || amount <= 0) {
      continue
    }

    income[mineIncome.resource] = (income[mineIncome.resource] ?? 0) + amount
  }

  return income
}
