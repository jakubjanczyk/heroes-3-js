import { getDamageRange, strikeSequence, takeDamage } from './battle-damage.js'
import {
  findHexPath,
  getFrontHexFor,
  getHexDistance,
  getHexNeighbours,
  getOccupiedHexes,
  getReachableHexes,
  getStartHexes,
  hexKey,
  isOnBattlefield,
  isOnBattlefieldOrEdge,
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
      doubleWide: abilities.includes('doubleWide'),
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

export function createBattle({ heroArmy, heroSkills, monsterArmy, definitions }) {
  return {
    stacks: [
      ...createStacks({ side: 'attacker', army: heroArmy ?? [], skills: heroSkills, definitions }),
      ...createStacks({ side: 'defender', army: monsterArmy, definitions })
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
export function getTurnOrder(battle) {
  return livingStacks(battle).sort((a, b) => b.speed - a.speed)
}

export function getActiveStack(battle) {
  return getTurnOrder(battle).find(({ id }) => !battle.actedStackIds.includes(id)) ?? null
}

// A new round also gives every stack its retaliations back.
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

export function getStackHexes(stack, hex = stack.hex) {
  return getOccupiedHexes({ hex, doubleWide: stack.doubleWide, side: stack.side })
}

const coversHex = (stack, hex) => getStackHexes(stack).some((own) => isSameHex(own, hex))

// Corpses lie on the ground: other stacks walk over them and stand on them.
function canStandFor(battle, stack) {
  const others = livingStacks(battle).filter(({ id }) => id !== stack.id)
  return (hex) =>
    isOnBattlefield(hex) &&
    getStackHexes(stack, hex).every(
      (part) => isOnBattlefieldOrEdge(part) && !others.some((other) => coversHex(other, part))
    )
}

export function getFrontHexReach(battle, stack) {
  return getReachableHexes({
    from: stack.hex,
    speed: stack.speed,
    flying: stack.flying,
    isFree: canStandFor(battle, stack)
  })
}

// A double-wide creature's back halves included, as the game shades them.
export function getStackReach(battle, stack) {
  const reach = new Map()
  for (const front of getFrontHexReach(battle, stack)) {
    for (const hex of getStackHexes(stack, front)) {
      if (isOnBattlefield(hex) && !coversHex(stack, hex)) {
        reach.set(hexKey(hex), hex)
      }
    }
  }
  return [...reach.values()]
}

function planPathToFront(battle, stack, front) {
  if (isSameHex(stack.hex, front)) {
    return []
  }

  const isFree = canStandFor(battle, stack)
  if (!isFree(front)) {
    return null
  }

  if (stack.flying) {
    return getHexDistance(stack.hex, front) <= stack.speed ? [front] : null
  }

  return findHexPath({ from: stack.hex, to: front, isFree, maxSteps: stack.speed })
}

// The path of the stack's front half, or null. A double-wide creature that cannot stand on `hex`
// puts its back half there instead (VCMI `BattleActionsController`).
export function planStackMove(battle, stack, hex) {
  if (coversHex(stack, hex)) {
    return null
  }

  const path = planPathToFront(battle, stack, hex)
  if (path || !stack.doubleWide) {
    return path
  }

  return planPathToFront(battle, stack, getFrontHexFor({ hex, side: stack.side }))
}

// Stays when already on `fromHex`, else the front half goes there, else the back half (VCMI
// `Unit::getAttackableHexes`).
function planAttackPosition(battle, stack, fromHex) {
  if (coversHex(stack, fromHex)) {
    return []
  }

  const fronts = stack.doubleWide
    ? [fromHex, getFrontHexFor({ hex: fromHex, side: stack.side })]
    : [fromHex]
  for (const front of fronts) {
    const path = planPathToFront(battle, stack, front)
    if (path) {
      return path
    }
  }
  return null
}

function getHexesNextTo(target) {
  const own = getStackHexes(target)
  const next = new Map()
  for (const hex of own.flatMap((part) => getHexNeighbours(part, { withEdges: true }))) {
    if (!own.some((part) => isSameHex(part, hex))) {
      next.set(hexKey(hex), hex)
    }
  }
  return [...next.values()]
}

// The way for the stack's front half to `front`, however many turns it takes, and how many hexes
// that is: a flyer's straight line, a walker's steps around the other stacks. Null when it cannot
// get there.
function findWayToFront(battle, stack, front) {
  if (isSameHex(stack.hex, front)) {
    return { way: [], distance: 0 }
  }

  const isFree = canStandFor(battle, stack)
  if (!isFree(front)) {
    return null
  }

  if (stack.flying) {
    return { way: [front], distance: getHexDistance(stack.hex, front) }
  }

  const way = findHexPath({ from: stack.hex, to: front, isFree })
  return way && { way, distance: way.length }
}

// Every hex next to a living enemy the stack can get to, however far, in the order of the enemy
// stacks and then of the hexes around each.
export function getApproaches(battle, stack) {
  return livingStacks(battle)
    .filter((target) => target.side !== stack.side)
    .flatMap((target) =>
      getHexesNextTo(target).flatMap((fromHex) => {
        if (coversHex(stack, fromHex)) {
          return [{ targetId: target.id, fromHex, way: [], distance: 0 }]
        }

        const fronts = stack.doubleWide
          ? [fromHex, getFrontHexFor({ hex: fromHex, side: stack.side })]
          : [fromHex]
        const ways = fronts.map((front) => findWayToFront(battle, stack, front)).filter(Boolean)
        if (ways.length === 0) {
          return []
        }

        const nearest = ways.reduce((best, way) => (way.distance < best.distance ? way : best))
        return [{ targetId: target.id, fromHex, ...nearest }]
      })
    )
}

export function getAttackTargets(battle, stack) {
  return livingStacks(battle)
    .filter((target) => target.side !== stack.side)
    .map((target) => ({
      stackId: target.id,
      fromHexes: getHexesNextTo(target).filter((hex) => planAttackPosition(battle, stack, hex)),
      damage: getDamageRange({ attacker: stack, defender: target })
    }))
    .filter(({ fromHexes }) => fromHexes.length > 0)
}

// The way there and every strike with its rolled damage, or null when the stack cannot attack
// the target from `fromHex`.
export function planStackAttack(battle, stack, { targetId, fromHex, random }) {
  const target = livingStacks(battle).find(({ id }) => id === targetId)
  const isNextToTarget =
    target &&
    fromHex &&
    target.side !== stack.side &&
    getHexesNextTo(target).some((hex) => isSameHex(hex, fromHex))
  const path = isNextToTarget ? planAttackPosition(battle, stack, fromHex) : null
  if (!path) {
    return null
  }

  return { path, strikes: strikeSequence({ attacker: stack, defender: target, random }) }
}

// "The Angels do 175 damage. 17 Pikemen perish."
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
