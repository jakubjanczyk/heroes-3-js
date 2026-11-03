export const getStackSpeed = (stack) => stack.speed

export const getStackAttack = (stack) => stack.attack

export const getStackDefense = (stack) => stack.defense + (stack.defenseBonus ?? 0)
