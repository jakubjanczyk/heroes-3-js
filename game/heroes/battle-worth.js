export const healthOf = (stack) => Math.max(0, (stack.count - 1) * stack.health + stack.topHealth)

const aiValueOf = (battle, stack) => battle.definitions?.monsters?.[stack.creature]?.aiValue ?? 0

export const worthOf = (battle, stack) => aiValueOf(battle, stack) * stack.count

// The damage at the worth of a health point, and the creatures killed at theirs.
export function worthOfLoss(battle, stack, { damage, killed }) {
  const aiValue = aiValueOf(battle, stack)
  return (damage * aiValue) / stack.health + killed * aiValue
}
