import { artifactsCancelInBattle } from './artifacts.js'
import { getDamageRange, shotSequence, strikeSequence, takeDamage } from './battle-damage.js'
import { isSpellTarget } from './battle-spells.js'
import {
  areEnemies,
  fightsFor,
  getShotDamagePercent,
  getStackDefense,
  getStackMorale,
  getStackSpeed,
  isBerserk,
  isBlind
} from './battle-stats.js'
import {
  findHexPath,
  getAreaHexes,
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

function createStacks({
  side,
  army,
  skills,
  morale = 0,
  luck = 0,
  cancelledInBattle = [],
  definitions
}) {
  const stacks = army.flatMap((stack, slot) => (stack ? [{ ...stack, slot }] : []))
  const startHexes = getStartHexes({ side, stackCount: stacks.length })
  return stacks.map(({ creature, count, slot }, index) => {
    const definition = { ...UNKNOWN_CREATURE, ...definitions?.monsters?.[creature] }
    const { abilities } = definition
    const retaliationsPerRound = getRetaliationsPerRound(abilities)
    const shooter = abilities.includes('ranged')
    const undead = abilities.includes('undead')
    const unaffectedByMorale = undead
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
      retaliationsUsed: 0,
      defenseBonus: 0,
      shots: shooter ? definition.shots : 0,
      shotsPerTurn: abilities.includes('shootsTwice') ? 2 : 1,
      shooter,
      meleePenalty: shooter && !abilities.includes('noMeleePenalty'),
      morale: unaffectedByMorale ? 0 : morale,
      unaffectedByMorale,
      undead,
      king: definition.king ?? null,
      luck,
      cancelledInBattle,
      spells: [],
      hex: startHexes[index]
    }
  })
}

// An artifact that cancels morale or luck in battle leaves only the armies' penalties, on both
// sides, and the spells' effects on them count for nothing.
const cancelledKinds = (heroArtifacts, definitions) =>
  ['morale', 'luck'].filter((kind) => artifactsCancelInBattle(heroArtifacts, kind, definitions))

// Morale and luck are the armies' as the battle starts. A monster has no hero, so no luck.
export function createBattle({
  heroArmy,
  heroSkills,
  heroSecondarySkills,
  heroBattleBonuses,
  heroArtifacts,
  monsterArmy,
  definitions
}) {
  const hero = {
    army: heroArmy ?? [],
    secondarySkills: heroSecondarySkills,
    battleBonuses: heroBattleBonuses,
    artifacts: heroArtifacts
  }
  const cancelledInBattle = cancelledKinds(heroArtifacts, definitions)
  const inBattle = (kind, value) => (cancelledInBattle.includes(kind) ? Math.min(0, value) : value)
  return {
    stacks: [
      ...createStacks({
        side: 'attacker',
        army: hero.army,
        skills: heroSkills,
        morale: inBattle('morale', getHeroMorale({ entity: hero, definitions }).value),
        luck: inBattle('luck', getHeroLuck({ entity: hero, definitions }).value),
        cancelledInBattle,
        definitions
      }),
      ...createStacks({
        side: 'defender',
        army: monsterArmy,
        morale: inBattle(
          'morale',
          getHeroMorale({ entity: { army: monsterArmy }, definitions }).value
        ),
        cancelledInBattle,
        definitions
      })
    ],
    actedStackIds: [],
    heroCastThisRound: false,
    waitedStackIds: [],
    // The stacks whose morale took effect this round, for good or bad: it does so once a round.
    moraleStackIds: [],
    // The stack whose turn goes on whatever the turn order says: its extra turn from good morale,
    // or its turn after the hero cast a spell that changed the order.
    turnStackId: null,
    // Each time morale or luck took effect, in order: { stackId, kind }.
    effects: [],
    messages: [],
    definitions
  }
}

export const isAlive = (stack) => stack.count > 0

const livingStacks = (battle) => battle.stacks.filter(isAlive)

// A blind stack loses its turns; once it can see again it takes its place by its speed.
const actingStacks = (battle) => livingStacks(battle).filter((stack) => !isBlind(stack))

const wakeUp = (stack) => ({
  ...stack,
  spells: (stack.spells ?? []).filter(({ effects }) => effects.blind === undefined)
})

export function spellTargetIds(battle, targeting) {
  const caster = getActiveStack(battle)
  return caster
    ? livingStacks(battle)
        .filter((target) => isSpellTarget(targeting, target, fightsFor(caster)))
        .map(({ id }) => id)
    : []
}

export function areaTargetIds(battle, area, hex) {
  const areaHexes = getAreaHexes(hex, area)
  return livingStacks(battle)
    .filter((stack) =>
      getStackHexes(stack).some((own) => areaHexes.some((inArea) => isSameHex(own, inArea)))
    )
    .map(({ id }) => id)
}

function nearestHexes(from, stacks) {
  const hexes = stacks.flatMap((stack) => getStackHexes(stack).map((hex) => ({ stack, hex })))
  const nearest = Math.min(...hexes.map(({ hex }) => getHexDistance(from, hex)))
  return hexes.filter(({ hex }) => getHexDistance(from, hex) === nearest)
}

// The bolt jumps from the hex it landed on to the nearest hex of a living stack it hasn't hit yet,
// either side's; a tie between hexes as near is rolled.
export function chainTargetIds(battle, { targetId, hex, strikes, random }) {
  const hitIds = [targetId]
  let from = hex
  while (hitIds.length < strikes) {
    const left = livingStacks(battle).filter(({ id }) => !hitIds.includes(id))
    if (left.length === 0) {
      break
    }
    const ties = nearestHexes(from, left)
    const next = ties[Math.min(ties.length - 1, Math.floor(random() * ties.length))]
    hitIds.push(next.stack.id)
    from = next.hex
  }
  return hitIds
}

export const hasLivingStacks = (battle, side) =>
  livingStacks(battle).some((stack) => stack.side === side)

// Stable sort: on a speed tie the attacker's stacks, already first in slot order, keep going first.
export function getTurnOrder(battle) {
  return livingStacks(battle).sort((a, b) => getStackSpeed(b) - getStackSpeed(a))
}

// The stacks that waited act once every other stack has, the slowest first.
export function getActiveStack(battle) {
  const turnGoesOn = livingStacks(battle).find(({ id }) => id === battle.turnStackId)
  if (turnGoesOn) {
    return turnGoesOn
  }

  const yetToAct = getTurnOrder(battle).filter(
    (stack) => !isBlind(stack) && !battle.actedStackIds.includes(stack.id)
  )
  return yetToAct.find(({ id }) => !battle.waitedStackIds.includes(id)) ?? yetToAct.at(-1) ?? null
}

export const hasWaited = (battle, stackId) => battle.waitedStackIds.includes(stackId)

// A spell that ends on the stack's own turn was cast for two rounds: it ends as the stack's turn
// starts in the round after the cast.
const endsNow = ({ endsOnOwnTurn, roundsLeft }) => endsOnOwnTurn && roundsLeft === 1

// A defending stack keeps its Defense bonus until its next turn starts.
function startNextTurn(battle) {
  const active = getActiveStack(battle)
  if (!active?.defenseBonus && !(active?.spells ?? []).some(endsNow)) {
    return battle
  }

  return {
    ...battle,
    stacks: battle.stacks.map((stack) =>
      stack.id === active.id
        ? { ...stack, defenseBonus: 0, spells: stack.spells?.filter((spell) => !endsNow(spell)) }
        : stack
    )
  }
}

// A spell cast for N rounds is gone as the (N + 1)th round from its cast starts. One with no
// rounds lasts until the battle ends.
function countDownSpells(stack) {
  const spells = (stack.spells ?? [])
    .map((spell) =>
      spell.roundsLeft === null ? spell : { ...spell, roundsLeft: spell.roundsLeft - 1 }
    )
    .filter(({ roundsLeft }) => roundsLeft === null || roundsLeft > 0)
  return { ...stack, spells }
}

// A new round also gives every stack its retaliations back, and the hero a spell to cast.
export function endTurn(battle, stackId) {
  const actedStackIds = [...battle.actedStackIds, stackId]
  if (actingStacks(battle).some(({ id }) => !actedStackIds.includes(id))) {
    return startNextTurn({ ...battle, actedStackIds, turnStackId: null })
  }

  return startNextTurn({
    ...battle,
    actedStackIds: [],
    heroCastThisRound: false,
    waitedStackIds: [],
    moraleStackIds: [],
    turnStackId: null,
    stacks: battle.stacks.map((stack) => ({
      ...countDownSpells(stack),
      retaliationsUsed: 0
    }))
  })
}

export function waitStack(battle, stackId) {
  return startNextTurn({
    ...battle,
    waitedStackIds: [...battle.waitedStackIds, stackId],
    turnStackId: null
  })
}

const hadMorale = (battle, stackId) => battle.moraleStackIds.includes(stackId)

// After a stack moved, attacked or shot, and its target struck back: never after it defended,
// died or won the battle, and once a round.
export function getGoodMoraleChance(battle, stackId) {
  const stack = livingStacks(battle).find(({ id }) => id === stackId)
  const battleGoesOn = hasLivingStacks(battle, 'attacker') && hasLivingStacks(battle, 'defender')
  const morale = stack ? getStackMorale(stack) : 0
  if (!battleGoesOn || morale <= 0 || hadMorale(battle, stackId)) {
    return 0
  }

  return morale / MORALE_CHANCE_IN
}

// As the stack's turn starts; not when a stack that waited gets its turn back, nor on an extra
// turn.
export function getBadMoraleChance(battle, stackId) {
  const stack = livingStacks(battle).find(({ id }) => id === stackId)
  const morale = stack ? getStackMorale(stack) : 0
  if (morale >= 0 || hasWaited(battle, stackId) || hadMorale(battle, stackId)) {
    return 0
  }

  return (-morale * BAD_MORALE_CHANCE_FACTOR) / MORALE_CHANCE_IN
}

const nameOf = (battle, stackId) => battle.stacks.find(({ id }) => id === stackId).name

function giveExtraTurn(battle, stackId) {
  return {
    ...battle,
    moraleStackIds: [...battle.moraleStackIds, stackId],
    turnStackId: stackId,
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

      return { ...stack, defenseBonus: Math.max(1, Math.floor(getStackDefense(stack) / 5)) }
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
    speed: getStackSpeed(stack),
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
    return getHexDistance(stack.hex, front) <= getStackSpeed(stack) ? [front] : null
  }

  return findHexPath({ from: stack.hex, to: front, isFree, maxSteps: getStackSpeed(stack) })
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

// Every hex next to a living stack the stack can attack, in army slot order, which settles ties.
export function getApproaches(battle, stack) {
  return attackableBy(battle, stack).flatMap((target) =>
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

// A berserk stack attacks any stack, its own side's too.
function attackableBy(battle, stack) {
  const others = livingStacks(battle).filter(({ id }) => id !== stack.id)
  return isBerserk(stack) ? others : others.filter((other) => areEnemies(other, stack))
}

// A stack that started on the other side from the one the shooter fights for: a hypnotized stack
// doesn't stop its old side's shooters, and its old side stops it shooting. Any stack stops a
// berserk shooter.
const blocksShooter = (shooter, other) => isBerserk(shooter) || other.side !== fightsFor(shooter)

// A shooter with a stack that blocks it next to it can only fight hand to hand.
export function canShoot(battle, stack) {
  if (stack.shots === 0 || getShotDamagePercent(stack) === 0) {
    return false
  }

  const blockers = livingStacks(battle).filter(
    (other) => other.id !== stack.id && blocksShooter(stack, other)
  )
  return !getHexesNextTo(stack).some((hex) => blockers.some((blocker) => coversHex(blocker, hex)))
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

  return attackableBy(battle, stack).map((target) => {
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

  return attackableBy(battle, stack)
    .map((target) => ({
      stackId: target.id,
      fromHexes: getHexesNextTo(target).filter((hex) => planAttackPosition(battle, stack, hex)),
      damage: getDamageRange({
        attacker: stack,
        defender: target,
        melee: true,
        halved: stack.meleePenalty
      })
    }))
    .filter(({ fromHexes }) => fromHexes.length > 0)
}

// The way there and every strike with its rolled damage, or null when the stack cannot attack
// the target from `fromHex`.
export function planStackAttack(battle, stack, { targetId, fromHex, random, luckRandom }) {
  const target = attackableBy(battle, stack).find(({ id }) => id === targetId)
  const isNextToTarget =
    !canShoot(battle, stack) &&
    target &&
    fromHex &&
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

function describeLosses(killed, nameFor) {
  return killed === 1 ? `One ${nameFor(1)} perishes.` : `${killed} ${nameFor(killed)} perish.`
}

// "The Angels do 175 damage. 17 Pikemen perish."
function describeDamage(dealt, { killed, nameFor }) {
  return killed === 0 ? dealt : `${dealt} ${describeLosses(killed, nameFor)}`
}

// The stack after taking the damage, and how many of its creatures died.
function damageStack(battle, stackId, damage) {
  const stack = battle.stacks.find(({ id }) => id === stackId)
  const nameFor = (count) =>
    describeStack({ creature: stack.creature, count }, battle.definitions).name
  const wounded = takeDamage(stack, damage)
  const killed = stack.count - wounded.count
  // A corpse keeps the name it fell with.
  const damaged = { ...wounded, name: wounded.count > 0 ? nameFor(wounded.count) : stack.name }
  return { damaged, killed, nameFor }
}

function applyStrike(battle, { attackerId, defenderId, damage, lucky }, retaliatorId) {
  const attacker = battle.stacks.find(({ id }) => id === attackerId)
  const { damaged, ...losses } = damageStack(battle, defenderId, damage)
  const dealt =
    attacker.count === 1
      ? `The ${attacker.name} does ${damage} damage.`
      : `The ${attacker.name} do ${damage} damage.`

  return {
    ...battle,
    stacks: battle.stacks.map((stack) => {
      if (stack.id === defenderId) {
        return wakeUp(damaged)
      }

      if (stack.id === attackerId && attackerId === retaliatorId) {
        return { ...stack, retaliationsUsed: stack.retaliationsUsed + 1 }
      }

      return stack
    }),
    effects: lucky
      ? [...battle.effects, { stackId: attackerId, kind: 'goodLuck' }]
      : battle.effects,
    messages: [
      ...battle.messages,
      ...(lucky ? [`Good luck shines on the ${attacker.name}.`] : []),
      describeDamage(dealt, losses)
    ]
  }
}

// Several stacks hit: the log counts creatures rather than naming any one stack's.
function describeSpellLosses(damaged) {
  const killed = damaged.reduce((sum, hit) => sum + hit.killed, 0)
  const nameFor =
    damaged.length === 1 ? damaged[0].nameFor : (count) => (count === 1 ? 'creature' : 'creatures')
  return { killed, nameFor }
}

// Each stack hit takes its own damage: a Protection lessens it on the stack it is on.
export function castDamageSpell(battle, { heroName, spellName, hits, chained }) {
  const targetIds = hits.map(({ stackId }) => stackId)
  const cast = castOnStacks(battle, { heroName, spellName, targetIds, chained }, (stack) => stack)
  if (hits.length === 0) {
    return cast
  }
  const damaged = hits.map(({ stackId, damage }) => damageStack(battle, stackId, damage))
  const total = hits.reduce((sum, { damage }) => sum + damage, 0)
  return {
    ...cast,
    stacks: cast.stacks.map((stack) => {
      const hit = damaged.find(({ damaged }) => damaged.id === stack.id)
      return hit ? wakeUp(hit.damaged) : stack
    }),
    messages: [
      ...cast.messages,
      describeDamage(`The ${spellName} does ${total} damage.`, describeSpellLosses(damaged))
    ]
  }
}

const addEffects = (earlier, effects) =>
  Object.fromEntries(
    Object.entries(effects).map(([key, value]) => [key, value + (earlier?.[key] ?? 0)])
  )

const longerOf = (rounds, earlier) =>
  rounds === null || earlier === null ? null : Math.max(rounds, earlier ?? 0)

// Cast again on a stack that has it, the spell takes the new effects and the longer duration; a
// spell that adds up adds its effects to the earlier ones.
// A spell that ends others (Berserk and Hypnotize end each other) takes them off the stack.
function putSpellOn(
  stack,
  {
    spellId,
    effects: cast,
    rounds,
    helpful,
    addsUp,
    removable,
    endsOnOwnTurn,
    endsOnOwnAttack,
    endsSpellIds = []
  }
) {
  const earlier = (stack.spells ?? []).find((spell) => spell.spellId === spellId)
  const roundsLeft = longerOf(rounds, earlier?.roundsLeft)
  const effects = addsUp ? addEffects(earlier?.effects, cast) : cast
  const kept = (stack.spells ?? []).filter(
    (spell) => spell.spellId !== spellId && !endsSpellIds.includes(spell.spellId)
  )
  return {
    ...stack,
    spells: [
      ...kept,
      { spellId, effects, roundsLeft, helpful, removable, endsOnOwnTurn, endsOnOwnAttack }
    ]
  }
}

// A strike back is not the stack's own attack.
function endOwnAttackSpells(battle, stackId) {
  return {
    ...battle,
    stacks: battle.stacks.map((stack) =>
      stack.id === stackId
        ? {
            ...stack,
            spells: (stack.spells ?? []).filter(({ endsOnOwnAttack }) => !endsOnOwnAttack)
          }
        : stack
    )
  }
}

const removeSpellsFrom = (stack) => ({
  ...stack,
  spells: (stack.spells ?? []).filter(({ removable }) => removable === false)
})

// Only the top creature is healed: creatures already killed stay dead.
const healTopCreature = (stack, healing) => ({
  ...stack,
  topHealth: Math.min(stack.health, stack.topHealth + healing)
})

function describeCast(battle, { heroName, spellName, targetIds }) {
  if (targetIds.length !== 1) {
    return `${heroName} casts '${spellName}'.`
  }
  const target = battle.stacks.find(({ id }) => id === targetIds[0])
  return `${heroName} casts '${spellName}' on the ${target.name}.`
}

// A chain spell's hits come one after another, each from the stack hit before it.
function spellHitEffects({ spellName, targetIds, chained }) {
  return targetIds.map((stackId, place) =>
    chained && place > 0
      ? { stackId, kind: 'spellHit', spellName, place, from: targetIds[place - 1] }
      : { stackId, kind: 'spellHit', spellName }
  )
}

// The spell changes its targets; the stack whose turn it is keeps it.
function castOnStacks(battle, { heroName, spellName, targetIds, chained, castMessage }, change) {
  const named = castMessage
    ? targetIds.map((id) => castMessage.replace('%s', battle.stacks.find((s) => s.id === id).name))
    : []
  return {
    ...battle,
    heroCastThisRound: true,
    turnStackId: getActiveStack(battle)?.id ?? null,
    stacks: battle.stacks.map((stack) => (targetIds.includes(stack.id) ? change(stack) : stack)),
    effects: [...battle.effects, ...spellHitEffects({ spellName, targetIds, chained })],
    messages: [
      ...battle.messages,
      describeCast(battle, { heroName, spellName, targetIds }),
      ...named
    ]
  }
}

export const castLastingSpell = (
  battle,
  { heroName, spellName, targetIds, castMessage, ...spell }
) =>
  castOnStacks(battle, { heroName, spellName, targetIds, castMessage }, (stack) =>
    putSpellOn(stack, spell)
  )

export const castRemovingSpell = (battle, cast) => castOnStacks(battle, cast, removeSpellsFrom)

export const castHealingSpell = (battle, { healing, ...cast }) =>
  castOnStacks(battle, cast, (stack) => healTopCreature(stack, healing))

// The attack itself, before the attacker's turn ends.
export function resolveAttack(battle, { stackId, targetId, path, strikes }) {
  const moved = path.length > 0 ? moveStack(battle, stackId, path.at(-1)) : battle
  const attacked = strikes.reduce(
    (current, strike) => applyStrike(current, strike, targetId),
    moved
  )
  return endOwnAttackSpells(attacked, stackId)
}

export const attackStack = (battle, attack) => finishAction(resolveAttack(battle, attack), attack)

// Every shot with its rolled damage, or null when the stack cannot shoot the target.
export function planStackShot(battle, stack, { targetId, random, luckRandom }) {
  const target = attackableBy(battle, stack).find(({ id }) => id === targetId)
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
  const shot = endOwnAttackSpells(
    strikes.reduce((current, strike) => applyStrike(current, strike, null), battle),
    stackId
  )
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
