import { getDamageRange, strikeSequence, takeDamage } from './battle-damage.js'
import {
  findHexPath,
  getHexDistance,
  getHexNeighbours,
  getReachableHexes,
  getStartHexes,
  isSameHex
} from './battlefield.js'
import { describeStack } from './hero-army.js'

// Griffins strike back twice a round and Royal Griffins every time; everyone else once.
function getRetaliationsPerRound(abilities) {
  if (abilities.includes('unlimitedRetaliations')) {
    return Number.POSITIVE_INFINITY
  }

  return abilities.includes('twoRetaliations') ? 2 : 1
}

function createStacks({ side, army, skills, definitions }) {
  const stacks = army.flatMap((stack, slot) => (stack ? [{ ...stack, slot }] : []))
  const startHexes = getStartHexes({ side, stackCount: stacks.length })
  return stacks.map(({ creature, count, slot }, index) => {
    const definition = definitions?.monsters?.[creature]
    const abilities = definition?.abilities ?? []
    const retaliationsPerRound = getRetaliationsPerRound(abilities)
    return {
      id: `${side}-${slot}`,
      side,
      ...describeStack({ creature, count }, definitions),
      initialCount: count,
      speed: definition?.speed ?? 0,
      flying: abilities.includes('flying'),
      attack: (definition?.attack ?? 0) + (skills?.attack ?? 0),
      defense: (definition?.defense ?? 0) + (skills?.defense ?? 0),
      damage: definition?.damage ?? { min: 1, max: 1 },
      health: definition?.health ?? 1,
      topHealth: definition?.health ?? 1,
      strikes: abilities.includes('strikesTwice') ? 2 : 1,
      retaliationsPerRound,
      retaliationsLeft: retaliationsPerRound,
      hex: startHexes[index]
    }
  })
}

// `heroSkills` are the attacking hero's primary skills: Attack and Defense add to their stacks'.
export function createBattle({ heroArmy, heroSkills, monster, definitions }) {
  return {
    stacks: [
      ...createStacks({ side: 'attacker', army: heroArmy ?? [], skills: heroSkills, definitions }),
      ...createStacks({ side: 'defender', army: [monster], definitions })
    ],
    actedStackIds: [],
    messages: [],
    definitions
  }
}

export const isAlive = (stack) => stack.count > 0

const livingStacks = (battle) => battle.stacks.filter(isAlive)

export const hasLivingStacks = (battle, side) =>
  livingStacks(battle).some((stack) => stack.side === side)

// Stable sort: on a speed tie the attacker's stacks, already first in slot order, keep going first.
// The dead get no turn.
export function getTurnOrder(battle) {
  return livingStacks(battle).sort((a, b) => b.speed - a.speed)
}

export function getActiveStack(battle) {
  return getTurnOrder(battle).find(({ id }) => !battle.actedStackIds.includes(id)) ?? null
}

// When every living stack has acted a new round starts, and each stack can strike back again.
export function endTurn(battle, stackId) {
  const actedStackIds = [...battle.actedStackIds, stackId]
  if (livingStacks(battle).some(({ id }) => !actedStackIds.includes(id))) {
    return { ...battle, actedStackIds }
  }

  return {
    ...battle,
    actedStackIds: [],
    stacks: battle.stacks.map((stack) => ({
      ...stack,
      retaliationsLeft: stack.retaliationsPerRound
    }))
  }
}

export function moveStack(battle, stackId, hex) {
  return {
    ...battle,
    stacks: battle.stacks.map((stack) => (stack.id === stackId ? { ...stack, hex } : stack))
  }
}

// Corpses lie on the ground: other stacks walk over them and stand on them.
function isFreeFor(battle) {
  return (hex) => !livingStacks(battle).some((stack) => isSameHex(stack.hex, hex))
}

export function getStackReach(battle, stack) {
  return getReachableHexes({
    from: stack.hex,
    speed: stack.speed,
    flying: stack.flying,
    isFree: isFreeFor(battle)
  })
}

// The hexes the stack goes through to get to `hex`, or null when it cannot get there this turn.
export function planStackMove(battle, stack, hex) {
  const isFree = isFreeFor(battle)
  if (!isFree(hex)) {
    return null
  }

  if (stack.flying) {
    return getHexDistance(stack.hex, hex) <= stack.speed ? [hex] : null
  }

  return findHexPath({ from: stack.hex, to: hex, isFree, maxSteps: stack.speed })
}

// The way to `hex`, empty when the stack already stands there, or null when it cannot get there.
function planPathTo(battle, stack, hex) {
  return isSameHex(stack.hex, hex) ? [] : planStackMove(battle, stack, hex)
}

// The enemy stacks the stack can attack this turn: the hexes next to each that it can attack
// from, and the damage it would deal.
export function getAttackTargets(battle, stack) {
  return livingStacks(battle)
    .filter((target) => target.side !== stack.side)
    .map((target) => ({
      stackId: target.id,
      fromHexes: getHexNeighbours(target.hex).filter((hex) => planPathTo(battle, stack, hex)),
      damage: getDamageRange({ attacker: stack, defender: target })
    }))
    .filter(({ fromHexes }) => fromHexes.length > 0)
}

// The stack goes next to the target, on `fromHex`, and attacks it. Returns the way there and
// every strike with its rolled damage, or null when it cannot attack the target from there.
export function planStackAttack(battle, stack, { targetId, fromHex, random }) {
  const target = livingStacks(battle).find(({ id }) => id === targetId)
  const isNextToTarget =
    target && fromHex && target.side !== stack.side && getHexDistance(target.hex, fromHex) === 1
  const path = isNextToTarget ? planPathTo(battle, stack, fromHex) : null
  if (!path) {
    return null
  }

  return { path, strikes: strikeSequence({ attacker: stack, defender: target, random }) }
}

// "The Angels do 175 damage. 17 Pikemen perish." as the Heroes 3 combat log says it.
function describeStrike({ attacker, damage, killed, nameFor }) {
  const dealt =
    attacker.count === 1
      ? `The ${attacker.name} does ${damage} damage.`
      : `The ${attacker.name} do ${damage} damage.`
  if (killed === 0) {
    return dealt
  }

  const perished =
    killed === 1 ? `One ${nameFor(1)} perishes.` : `${killed} ${nameFor(killed)} perish.`
  return `${dealt} ${perished}`
}

function applyStrike(battle, { attackerId, defenderId, damage }, retaliatorId) {
  const attacker = battle.stacks.find(({ id }) => id === attackerId)
  const defender = battle.stacks.find(({ id }) => id === defenderId)
  const nameFor = (count) =>
    describeStack({ creature: defender.creature, count }, battle.definitions).name
  const wounded = takeDamage(defender, damage)
  const killed = defender.count - wounded.count
  // A corpse keeps the name it fell with.
  const struck = { ...wounded, name: wounded.count > 0 ? nameFor(wounded.count) : defender.name }

  return {
    ...battle,
    stacks: battle.stacks.map((stack) => {
      if (stack.id === defenderId) {
        return struck
      }

      if (stack.id === attackerId && attackerId === retaliatorId) {
        return { ...stack, retaliationsLeft: stack.retaliationsLeft - 1 }
      }

      return stack
    }),
    messages: [...battle.messages, describeStrike({ attacker, damage, killed, nameFor })]
  }
}

// The stack walks `path` and the strikes land; its turn ends.
export function attackStack(battle, { stackId, targetId, path, strikes }) {
  const moved = path.length > 0 ? moveStack(battle, stackId, path.at(-1)) : battle
  const struck = strikes.reduce((current, strike) => applyStrike(current, strike, targetId), moved)
  return endTurn(struck, stackId)
}

// The hero earns the health of every enemy creature killed.
export function getExperienceForWin(battle) {
  return battle.stacks
    .filter((stack) => stack.side === 'defender')
    .reduce((sum, stack) => sum + stack.initialCount * stack.health, 0)
}
