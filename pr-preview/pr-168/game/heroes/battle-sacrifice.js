import { getStackHexes, isAlive } from './battle.js'
import { isImmuneTo } from './battle-spells.js'
import { fightsFor, isBerserk } from './battle-stats.js'
import { isSameHex } from './battlefield.js'

const sharesHex = (stack, other) =>
  getStackHexes(stack).some((hex) => getStackHexes(other).some((own) => isSameHex(own, hex)))

const isCoveredCorpse = (stacks, corpse) =>
  stacks.some((stack) => isAlive(stack) && sharesHex(stack, corpse))

const hasLost = (stack) => stack.count < stack.initialCount || stack.topHealth < stack.health

function canBeRaised(stacks, stack, { targeting, casterSide }) {
  if (stack.side !== casterSide || stack.sacrificed || stack.cloneOf) {
    return false
  }
  if (isImmuneTo(targeting, stack)) {
    return false
  }
  return isAlive(stack) ? hasLost(stack) : !isCoveredCorpse(stacks, stack)
}

// Only a stack of the hero's own that the hero controls: not one the enemy hypnotized, nor a
// berserk one.
export const canBeSacrificed = (stack, { raisedId, targeting, casterSide }) =>
  isAlive(stack) &&
  stack.id !== raisedId &&
  stack.side === casterSide &&
  fightsFor(stack) === casterSide &&
  !stack.cloneOf &&
  !isBerserk(stack) &&
  !isImmuneTo(targeting, stack)

export function sacrificeTargetIds(stacks, aim) {
  return stacks
    .filter(
      (stack) =>
        canBeRaised(stacks, stack, aim) &&
        stacks.some((other) => canBeSacrificed(other, { ...aim, raisedId: stack.id }))
    )
    .map(({ id }) => id)
}
