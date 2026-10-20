// A battle between the hero's army and a monster: where each stack stands and whose turn it is.
// Rows and columns count from 0. The state is a plain value; each function returns a new one.
import { findHexPath, getReachableHexes, getStartHexes } from './battlefield.js'
import { describeStack } from './hero-army.js'

function createStacks({ side, army, definitions }) {
  const stacks = army.flatMap((stack, slot) => (stack ? [{ ...stack, slot }] : []))
  const startHexes = getStartHexes({ side, stackCount: stacks.length })
  return stacks.map(({ creature, count, slot }, index) => {
    const definition = definitions?.monsters?.[creature]
    return {
      id: `${side}-${slot}`,
      side,
      ...describeStack({ creature, count }, definitions),
      speed: definition?.speed ?? 0,
      flying: definition?.abilities?.includes('flying') ?? false,
      hex: startHexes[index]
    }
  })
}

export function createBattle({ heroArmy, monster, definitions }) {
  return {
    stacks: [
      ...createStacks({ side: 'attacker', army: heroArmy ?? [], definitions }),
      ...createStacks({ side: 'defender', army: [monster], definitions })
    ],
    actedStackIds: []
  }
}

// Faster stacks act first. On a tie the attacker goes first, and within one army the earlier slot.
// Sorting is stable and the attacker's stacks come first in slot order, so speed alone decides.
export function getTurnOrder(battle) {
  return [...battle.stacks].sort((a, b) => b.speed - a.speed)
}

export function getActiveStack(battle) {
  return getTurnOrder(battle).find(({ id }) => !battle.actedStackIds.includes(id)) ?? null
}

// Once every stack has acted, a new round starts.
export function endTurn(battle, stackId) {
  const actedStackIds = [...battle.actedStackIds, stackId]
  return {
    ...battle,
    actedStackIds: actedStackIds.length >= battle.stacks.length ? [] : actedStackIds
  }
}

export function moveStack(battle, stackId, hex) {
  return {
    ...battle,
    stacks: battle.stacks.map((stack) => (stack.id === stackId ? { ...stack, hex } : stack))
  }
}

const isSameHex = (a, b) => a.row === b.row && a.column === b.column

function isFreeFor(battle) {
  return (hex) => !battle.stacks.some((stack) => isSameHex(stack.hex, hex))
}

export function getActiveStackReach(battle) {
  const stack = getActiveStack(battle)
  if (!stack) {
    return []
  }

  return getReachableHexes({
    from: stack.hex,
    speed: stack.speed,
    flying: stack.flying,
    isFree: isFreeFor(battle)
  })
}

// The hexes the active stack goes through to get to `hex`, the last one being `hex`: a flying stack
// goes straight there. Null when it cannot get there this turn.
export function planActiveStackMove(battle, hex) {
  const stack = getActiveStack(battle)
  if (!stack || !getActiveStackReach(battle).some((reachable) => isSameHex(reachable, hex))) {
    return null
  }

  if (stack.flying) {
    return [hex]
  }

  return findHexPath({ from: stack.hex, to: hex, isFree: isFreeFor(battle) })
}
