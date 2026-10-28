import { getDamageRange, shotSequence, strikeSequence, takeDamage } from './battle-damage.js'
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
import { getHeroLuck, getHeroMorale } from './morale-and-luck.js'

const MORALE_CHANCE_IN = 24
// Bad morale freezes twice as often as good morale gives an extra turn.
const BAD_MORALE_CHANCE_FACTOR = 2

// A shot at a target more than this many hexes away does half damage.
const SHOOTING_PENALTY_DISTANCE = 10

// Griffins strike back twice a round and Royal Griffins every time; everyone else once.
function getRetaliationsPerRound(abilities) {
  if (abilities.includes('unlimitedRetaliations')) {
    return Number.POSITIVE_INFINITY
  }

  return abilities.includes('twoRetaliations') ? 2 : 1
}

// Stats for a creature missing from the definitions.
const UNKNOWN_CREATURE = Object.freeze({
  speed: 0,
  attack: 0,
  defense: 0,
  damage: { min: 1, max: 1 },
  health: 1,
  shots: 0,
  abilities: []
})

function createStacks({ side, army, skills, morale = 0, luck = 0, definitions }) {
  const stacks = army.flatMap((stack, slot) => (stack ? [{ ...stack, slot }] : []))
  const startHexes = getStartHexes({ side, stackCount: stacks.length })
  return stacks.map(({ creature, count, slot }, index) => {
    const definition = { ...UNKNOWN_CREATURE, ...definitions?.monsters?.[creature] }
    const { abilities } = definition
    const retaliationsPerRound = getRetaliationsPerRound(abilities)
    const shooter = abilities.includes('ranged')
    const unaffectedByMorale = abilities.includes('undead')
    return {
      id: `${side}-${slot}`,
      side,
      ...describeStack({ creature, count }, definitions),
      initialCount: count,
      speed: definition.speed,
      flying: abilities.includes('flying'),
      doubleWide: abilities.includes('doubleWide'),
      attack: definition.attack + (skills?.attack ?? 0),
      defense: definition.defense + (skills?.defense ?? 0),
      damage: definition.damage,
      health: definition.health,
      topHealth: definition.health,
      strikes: abilities.includes('strikesTwice') ? 2 : 1,
      retaliationsPerRound,
      retaliationsLeft: retaliationsPerRound,
      defenseBonus: 0,
      shots: shooter ? definition.shots : 0,
      shotsPerTurn: abilities.includes('shootsTwice') ? 2 : 1,
      meleePenalty: shooter && !abilities.includes('noMeleePenalty'),
      morale: unaffectedByMorale ? 0 : morale,
      luck,
      hex: startHexes[index]
    }
  })
}

// Morale and luck are the armies' as the battle starts. A monster has no hero, so no luck.
export function createBattle({
  heroArmy,
  heroSkills,
  heroSecondarySkills,
  monsterArmy,
  definitions
}) {
  const hero = { army: heroArmy ?? [], secondarySkills: heroSecondarySkills }
  return {
    stacks: [
      ...createStacks({
        side: 'attacker',
        army: hero.army,
        skills: heroSkills,
        morale: getHeroMorale({ entity: hero, definitions }).value,
        luck: getHeroLuck({ entity: hero, definitions }).value,
        definitions
      }),
      ...createStacks({
        side: 'defender',
        army: monsterArmy,
        morale: getHeroMorale({ entity: { army: monsterArmy }, definitions }).value,
        definitions
      })
    ],
    actedStackIds: [],
    waitedStackIds: [],
    // The stacks whose morale took effect this round, for good or bad: it does so once a round.
    moraleStackIds: [],
    extraTurnStackId: null,
    // Each time morale or luck took effect, in order: { stackId, kind }.
    effects: [],
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

// The stacks that waited act once every other stack has, the slowest first.
export function getActiveStack(battle) {
  const extraTurn = livingStacks(battle).find(({ id }) => id === battle.extraTurnStackId)
  if (extraTurn) {
    return extraTurn
  }

  const yetToAct = getTurnOrder(battle).filter(({ id }) => !battle.actedStackIds.includes(id))
  return yetToAct.find(({ id }) => !battle.waitedStackIds.includes(id)) ?? yetToAct.at(-1) ?? null
}

export const hasWaited = (battle, stackId) => battle.waitedStackIds.includes(stackId)

// A defending stack keeps its Defense bonus until its next turn starts.
function startNextTurn(battle) {
  const active = getActiveStack(battle)
  if (!active?.defenseBonus) {
    return battle
  }

  return {
    ...battle,
    stacks: battle.stacks.map((stack) =>
      stack.id === active.id
        ? { ...stack, defense: stack.defense - stack.defenseBonus, defenseBonus: 0 }
        : stack
    )
  }
}

// A new round also gives every stack its retaliations back.
export function endTurn(battle, stackId) {
  const actedStackIds = [...battle.actedStackIds, stackId]
  if (livingStacks(battle).some(({ id }) => !actedStackIds.includes(id))) {
    return startNextTurn({ ...battle, actedStackIds, extraTurnStackId: null })
  }

  return startNextTurn({
    ...battle,
    actedStackIds: [],
    waitedStackIds: [],
    moraleStackIds: [],
    extraTurnStackId: null,
    stacks: battle.stacks.map((stack) => ({
      ...stack,
      retaliationsLeft: stack.retaliationsPerRound
    }))
  })
}

export function waitStack(battle, stackId) {
  return startNextTurn({
    ...battle,
    waitedStackIds: [...battle.waitedStackIds, stackId],
    extraTurnStackId: null
  })
}

const hadMorale = (battle, stackId) => battle.moraleStackIds.includes(stackId)

// After a stack moved, attacked or shot, and its target struck back: never after it defended,
// died or won the battle, and once a round.
export function getGoodMoraleChance(battle, stackId) {
  const stack = livingStacks(battle).find(({ id }) => id === stackId)
  const battleGoesOn = hasLivingStacks(battle, 'attacker') && hasLivingStacks(battle, 'defender')
  if (!stack || !battleGoesOn || stack.morale <= 0 || hadMorale(battle, stackId)) {
    return 0
  }

  return stack.morale / MORALE_CHANCE_IN
}

// As the stack's turn starts; not when a stack that waited gets its turn back, nor on an extra
// turn.
export function getBadMoraleChance(battle, stackId) {
  const stack = livingStacks(battle).find(({ id }) => id === stackId)
  if (!stack || stack.morale >= 0 || hasWaited(battle, stackId) || hadMorale(battle, stackId)) {
    return 0
  }

  return (-stack.morale * BAD_MORALE_CHANCE_FACTOR) / MORALE_CHANCE_IN
}

const nameOf = (battle, stackId) => battle.stacks.find(({ id }) => id === stackId).name

function giveExtraTurn(battle, stackId) {
  return {
    ...battle,
    moraleStackIds: [...battle.moraleStackIds, stackId],
    extraTurnStackId: stackId,
    effects: [...battle.effects, { stackId, kind: 'goodMorale' }],
    messages: [
      ...battle.messages,
      `High morale enables the ${nameOf(battle, stackId)} to attack again.`
    ]
  }
}

// A stack whose morale took effect acts again; any other's turn ends.
export function finishAction(battle, { stackId, goodMorale = false }) {
  return goodMorale ? giveExtraTurn(battle, stackId) : endTurn(battle, stackId)
}

export function freezeStack(battle, stackId) {
  return endTurn(
    {
      ...battle,
      moraleStackIds: [...battle.moraleStackIds, stackId],
      effects: [...battle.effects, { stackId, kind: 'badMorale' }],
      messages: [
        ...battle.messages,
        `Low morale causes the ${nameOf(battle, stackId)} to freeze in panic.`
      ]
    },
    stackId
  )
}

// +20% Defense, and at least 1 point.
export function defendStack(battle, stackId) {
  const defended = {
    ...battle,
    stacks: battle.stacks.map((stack) => {
      if (stack.id !== stackId) {
        return stack
      }

      const defenseBonus = Math.max(1, Math.floor(stack.defense / 5))
      return { ...stack, defense: stack.defense + defenseBonus, defenseBonus }
    })
  }
  return endTurn(defended, stackId)
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
// puts its back half there instead.
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

// Stays when already on `fromHex`, else the front half goes there, else the back half.
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

// However many turns it takes; null when the stack cannot get there.
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

// Every hex next to a living enemy the stack can get to, in army slot order, which settles ties.
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

const livingEnemiesOf = (battle, stack) =>
  livingStacks(battle).filter((other) => other.side !== stack.side)

// A shooter with an enemy next to it can only fight hand to hand.
export function canShoot(battle, stack) {
  if (stack.shots === 0) {
    return false
  }

  const enemies = livingEnemiesOf(battle, stack)
  return !getHexesNextTo(stack).some((hex) => enemies.some((enemy) => coversHex(enemy, hex)))
}

// Measured from the shooter's hex to the nearest hex of the target.
function hasDistancePenalty(stack, target) {
  return getStackHexes(target).every(
    (hex) => getHexDistance(stack.hex, hex) > SHOOTING_PENALTY_DISTANCE
  )
}

export function getShotTargets(battle, stack) {
  if (!canShoot(battle, stack)) {
    return []
  }

  return livingEnemiesOf(battle, stack).map((target) => {
    const distancePenalty = hasDistancePenalty(stack, target)
    return {
      stackId: target.id,
      distancePenalty,
      damage: getDamageRange({ attacker: stack, defender: target, halved: distancePenalty })
    }
  })
}

// A shooter that can shoot does not walk up to attack.
export function getAttackTargets(battle, stack) {
  if (canShoot(battle, stack)) {
    return []
  }

  return livingEnemiesOf(battle, stack)
    .map((target) => ({
      stackId: target.id,
      fromHexes: getHexesNextTo(target).filter((hex) => planAttackPosition(battle, stack, hex)),
      damage: getDamageRange({ attacker: stack, defender: target, halved: stack.meleePenalty })
    }))
    .filter(({ fromHexes }) => fromHexes.length > 0)
}

// The way there and every strike with its rolled damage, or null when the stack cannot attack
// the target from `fromHex`.
export function planStackAttack(battle, stack, { targetId, fromHex, random, luckRandom }) {
  const target = livingStacks(battle).find(({ id }) => id === targetId)
  const isNextToTarget =
    !canShoot(battle, stack) &&
    target &&
    fromHex &&
    target.side !== stack.side &&
    getHexesNextTo(target).some((hex) => isSameHex(hex, fromHex))
  const path = isNextToTarget ? planAttackPosition(battle, stack, fromHex) : null
  if (!path) {
    return null
  }

  return {
    path,
    strikes: strikeSequence({ attacker: stack, defender: target, random, luckRandom })
  }
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

function applyStrike(battle, { attackerId, defenderId, damage, lucky }, retaliatorId) {
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
    effects: lucky
      ? [...battle.effects, { stackId: attackerId, kind: 'goodLuck' }]
      : battle.effects,
    messages: [
      ...battle.messages,
      ...(lucky ? [`Good luck shines on the ${attacker.name}.`] : []),
      describeStrike({ attacker, damage, killed, nameFor })
    ]
  }
}

// The attack itself, before the attacker's turn ends.
export function resolveAttack(battle, { stackId, targetId, path, strikes }) {
  const moved = path.length > 0 ? moveStack(battle, stackId, path.at(-1)) : battle
  return strikes.reduce((current, strike) => applyStrike(current, strike, targetId), moved)
}

export const attackStack = (battle, attack) => finishAction(resolveAttack(battle, attack), attack)

// Every shot with its rolled damage, or null when the stack cannot shoot the target.
export function planStackShot(battle, stack, { targetId, random, luckRandom }) {
  const target = livingEnemiesOf(battle, stack).find(({ id }) => id === targetId)
  if (!target || !canShoot(battle, stack)) {
    return null
  }

  return {
    strikes: shotSequence({
      attacker: stack,
      defender: target,
      random,
      luckRandom,
      halved: hasDistancePenalty(stack, target)
    })
  }
}

// The shot itself, before the shooter's turn ends.
export function resolveShot(battle, { stackId, strikes }) {
  const shot = strikes.reduce((current, strike) => applyStrike(current, strike, null), battle)
  return {
    ...shot,
    stacks: shot.stacks.map((stack) =>
      stack.id === stackId ? { ...stack, shots: stack.shots - strikes.length } : stack
    )
  }
}

export const shootStack = (battle, shot) => finishAction(resolveShot(battle, shot), shot)

export function getHeroArmyAfterBattle(battle, heroArmy) {
  return heroArmy.map((slot, index) => {
    const stack = battle.stacks.find(({ id }) => id === `attacker-${index}`)
    return slot && stack?.count > 0 ? { creature: stack.creature, count: stack.count } : null
  })
}

// The hero earns the health of every enemy creature killed.
export function getExperienceForWin(battle) {
  return battle.stacks
    .filter((stack) => stack.side === 'defender')
    .reduce((sum, stack) => sum + stack.initialCount * stack.health, 0)
}
