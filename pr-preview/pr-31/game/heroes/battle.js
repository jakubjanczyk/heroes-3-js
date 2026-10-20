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

// Stable sort: on a speed tie the attacker's stacks, already first in slot order, keep going first.
export function getTurnOrder(battle) {
  return [...battle.stacks].sort((a, b) => b.speed - a.speed)
}

export function getActiveStack(battle) {
  return getTurnOrder(battle).find(({ id }) => !battle.actedStackIds.includes(id)) ?? null
}

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
