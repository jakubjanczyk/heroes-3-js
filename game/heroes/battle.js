import { artifactBattleImmunities, artifactsCancelInBattle } from './artifacts.js'
import { bindStack, describeBinding, withoutBrokenBindings } from './battle-binding.js'
import { breathTargetFinder } from './battle-breath.js'
import { getDamageRange, shotSequence, strikeSequence, takeDamage } from './battle-damage.js'
import { isImmuneTo, isSpellTarget, spellTargeting } from './battle-spells.js'
import {
  areEnemies,
  fightsFor,
  getMovementRange,
  getShotDamagePercent,
  getStackDefense,
  getStackMorale,
  getStackSpeed,
  isBerserk,
  isBlind
} from './battle-stats.js'
import {
  BATTLEFIELD_COLUMNS,
  BATTLEFIELD_ROWS,
  findHexPath,
  getAreaHexes,
  getFrontHexFor,
  getHexDistance,
  getHexNeighbours,
  getOccupiedHexes,
  getReachableHexes,
  getStartHexes,
  getWarMachineHex,
  hexKey,
  isOnBattlefield,
  isOnBattlefieldOrEdge,
  isSameHex
} from './battlefield.js'
import { describeStack } from './hero-army.js'
import { getHeroLuck, getHeroMorale } from './morale-and-luck.js'
import { getHeroPrimarySkills } from './primary-skills.js'
import {
  blocksStanding,
  CATAPULT_HEX,
  canTeleportBetween,
  describeCatapultShot,
  describeEarthquakeHit,
  hasCatapultTarget,
  hitWall,
  isAffectedByTheMoat,
  isMoatHex,
  isShotThroughTheWalls,
  isTowerStanding,
  moatOf,
  planCatapultShot,
  towersOf
} from './siege-walls.js'
import { skillLevelOf } from './spell-book.js'
import { heroMagicResistance, rollResisted } from './spell-resistance.js'
import { addedSkills, NO_DEFENDER_BONUSES } from './town-visit-bonuses.js'

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

const spellTraitsOf = (definition, { immunities, magicResistance, mindless }) => ({
  mindSpellImmune: mindless || immunities.mindSpells,
  spellLevelImmunity: Math.max(immunities.spellLevel, definition.spellLevelImmunity ?? 0),
  magicResistance: Math.min(100, magicResistance + (definition.magicResistance ?? 0)),
  magicResistanceAura: definition.magicResistanceAura ?? 0,
  magicDamper: definition.magicDamper ?? 0,
  magicChanneler: definition.magicChanneler ?? 0,
  spellDamageReduction: definition.spellDamageReduction ?? 0,
  spellSchoolImmunity: definition.spellSchoolImmunity ?? []
})

// The Ballista's 2-3 is multiplied by the hero's Attack plus one.
const timesHeroAttack = ({ min, max }, skills) => {
  const times = (skills?.attack ?? 0) + 1
  return { min: min * times, max: max * times }
}

function shotsOf({ abilities, shots }, shooter) {
  if (!shooter) {
    return 0
  }
  return abilities.includes('unlimitedShots') ? Number.POSITIVE_INFINITY : shots
}

// A hero with the skill at any level aims the war machine; the level sets its shots, chances and
// healing.
function heroControlOf({ controlledBy, abilities }, heroSkillLevelOf) {
  const level = controlledBy ? heroSkillLevelOf(controlledBy.skill) : 0
  return {
    aimedByHero: level > 0,
    shotsPerTurn:
      controlledBy?.shotsPerTurn?.[level] ?? (abilities.includes('shootsTwice') ? 2 : 1),
    doubleDamageChance: controlledBy?.doubleDamageChance?.[level] ?? 0,
    healing: abilities.includes('heals') ? (controlledBy?.healing?.[level] ?? 0) : 0
  }
}

function createStack({
  id,
  side,
  creature,
  count,
  hex,
  skills,
  morale = 0,
  luck = 0,
  cancelledInBattle = [],
  immunities = { mindSpells: false, spellLevel: 0 },
  magicResistance = 0,
  heroSkillLevelOf = () => 0,
  definitions
}) {
  const definition = { ...UNKNOWN_CREATURE, ...definitions?.monsters?.[creature] }
  const { abilities } = definition
  const warMachine = abilities.includes('warMachine')
  const shooter = abilities.includes('ranged')
  const undead = abilities.includes('undead')
  const unaffectedByMorale = undead || warMachine || abilities.includes('neutralMorale')
  return {
    id,
    side,
    ...describeStack({ creature, count }, definitions),
    initialCount: count,
    speed: definition.speed,
    tier: definition.tier ?? 1,
    flying: abilities.includes('flying'),
    doubleWide: abilities.includes('doubleWide'),
    warMachine,
    suppliesShots: abilities.includes('suppliesShots'),
    attack: definition.attack + (skills?.attack ?? 0),
    defense: definition.defense + (skills?.defense ?? 0),
    damage: abilities.includes('damageTimesHeroAttack')
      ? timesHeroAttack(definition.damage, skills)
      : definition.damage,
    health: definition.health,
    topHealth: definition.health,
    strikes: abilities.includes('strikesTwice') ? 2 : 1,
    retaliationsPerRound: warMachine ? 0 : getRetaliationsPerRound(abilities),
    blocksRetaliation: abilities.includes('noRetaliation'),
    retaliationsUsed: 0,
    defenseBonus: 0,
    shots: shotsOf(definition, shooter),
    ...heroControlOf(definition, heroSkillLevelOf),
    shooter,
    meleePenalty: shooter && !abilities.includes('noMeleePenalty'),
    noWallPenalty: abilities.includes('noWallPenalty'),
    morale: unaffectedByMorale ? 0 : morale,
    unaffectedByMorale,
    undead,
    nonLiving: abilities.includes('nonLiving'),
    ...spellTraitsOf(definition, {
      immunities,
      magicResistance,
      mindless: undead || warMachine || abilities.includes('immuneToMindSpells')
    }),
    king: definition.king ?? null,
    binds: Boolean(definition.binds),
    breath: Boolean(definition.breath),
    hates: definition.hates ?? [],
    spellAfterAttack: definition.spellAfterAttack ?? null,
    casts: definition.casts ?? null,
    castsLeft: definition.casts?.times ?? 0,
    luck,
    cancelledInBattle,
    spells: [],
    hex
  }
}

function createStacks({ side, army, ...shared }) {
  const stacks = army.flatMap((stack, slot) => (stack ? [{ ...stack, slot }] : []))
  const startHexes = getStartHexes({ side, stackCount: stacks.length })
  return stacks.map(({ creature, count, slot }, index) =>
    createStack({ id: `${side}-${slot}`, side, creature, count, hex: startHexes[index], ...shared })
  )
}

const CATAPULT_STACK_ID = 'attacker-catapult'
const FIELD_WAR_MACHINE_SLOTS = ['AMMO_CART', 'BALLISTA', 'FIRST_AID_TENT']

const warMachineStackId = (side, slot) => `${side}-${slot.toLowerCase().replaceAll('_', '-')}`

function heroWarMachines(artifacts, definitions) {
  return FIELD_WAR_MACHINE_SLOTS.flatMap((slot) => {
    const creature = definitions?.artifacts?.[artifacts?.worn?.[slot]]?.creature
    return creature ? [{ slot, creature }] : []
  })
}

function createWarMachineStacks({ side, warMachines = [], ...shared }) {
  return warMachines.map(({ slot, creature }) =>
    createStack({
      id: warMachineStackId(side, slot),
      side,
      creature,
      count: 1,
      hex: getWarMachineHex({ side, slot }),
      ...shared
    })
  )
}
const ARROW_TOWER_NAME = 'Arrow Tower'

// An artifact that cancels morale or luck in battle leaves only the armies' penalties, on both
// sides whichever hero wears it, and the spells' effects on them count for nothing.
const cancelledKinds = (sides, definitions) =>
  ['morale', 'luck'].filter((kind) =>
    sides.some((side) => artifactsCancelInBattle(side.artifacts, kind, definitions))
  )

// A hero defending a town fights without their Ballista.
export function heroBattleSide(hero, definitions, { defendingTown = false } = {}) {
  const skills = getHeroPrimarySkills({ entity: hero, definitions })
  return {
    hero: Boolean(hero),
    army: hero?.army ?? [],
    warMachines: heroWarMachines(hero?.artifacts, definitions).filter(
      ({ slot }) => !defendingTown || slot !== 'BALLISTA'
    ),
    skills: Object.fromEntries(skills.map(({ key, value }) => [key, value])),
    secondarySkills: hero?.secondarySkills,
    battleBonuses: hero?.battleBonuses,
    artifacts: hero?.artifacts
  }
}

function catapultShootingOf(attacker, definitions) {
  const { skill, shots, hitChance, damageChance } = definitions.monsters.CATAPULT.siegeShots
  const level = skillLevelOf(attacker, skill)
  return {
    hasBallistics: level > 0,
    shots: shots[level],
    hitChance: Object.fromEntries(
      Object.entries(hitChance).map(([kind, chances]) => [kind, chances[level]])
    ),
    damageChance: damageChance[level]
  }
}

const OPPOSING_SIDE = { attacker: 'defender', defender: 'attacker' }

// Devils lower the luck of the army they fight by 1 however many stacks there are: the lowest counts.
const enemyLuckOf = (army, definitions) =>
  Math.min(
    0,
    ...army.flatMap((stack) =>
      stack ? [definitions?.monsters?.[stack.creature]?.enemyLuck ?? 0] : []
    )
  )

// A side without a hero has its creatures' morale alone, and no luck. The defenders of a town also
// have what its buildings give them (`defenderBonuses`), with a hero or without.
export function createBattle({
  attacker,
  defender,
  walls = null,
  defenderBonuses = NO_DEFENDER_BONUSES,
  definitions
}) {
  const sides = {
    attacker: { army: [], ...attacker },
    defender: {
      army: [],
      ...defender,
      skills: addedSkills(defender?.skills, defenderBonuses.skills)
    }
  }
  const townModifiersOf = (side, kind) => (side === 'defender' ? defenderBonuses[kind] : [])
  const cancelledInBattle = cancelledKinds(Object.values(sides), definitions)
  const inBattle = (kind, value) => (cancelledInBattle.includes(kind) ? Math.min(0, value) : value)
  const sharedOf = (side) => {
    const entity = sides[side]
    return {
      skills: entity.skills,
      morale: inBattle(
        'morale',
        getHeroMorale({
          entity,
          definitions,
          townModifiers: townModifiersOf(side, 'morale')
        }).value
      ),
      luck: inBattle(
        'luck',
        getHeroLuck({ entity, definitions, townModifiers: townModifiersOf(side, 'luck') }).value +
          enemyLuckOf(sides[OPPOSING_SIDE[side]].army, definitions)
      ),
      cancelledInBattle,
      immunities: artifactBattleImmunities(entity.artifacts, definitions),
      magicResistance: heroMagicResistance(entity),
      heroSkillLevelOf: (skill) => skillLevelOf(entity, skill),
      definitions
    }
  }
  const stacksOf = (side) => [
    ...createStacks({ side, army: sides[side].army, ...sharedOf(side) }),
    ...createWarMachineStacks({ side, warMachines: sides[side].warMachines, ...sharedOf(side) })
  ]
  const catapult = walls
    ? [
        createStack({
          id: CATAPULT_STACK_ID,
          side: 'attacker',
          creature: 'CATAPULT',
          count: 1,
          hex: CATAPULT_HEX,
          ...sharedOf('attacker')
        })
      ]
    : []
  const battle = {
    stacks: [...stacksOf('attacker'), ...catapult, ...stacksOf('defender')],
    heroSides: Object.keys(sides).filter((side) => sides[side].hero),
    tactics: null,
    actedStackIds: [],
    sidesCastThisRound: [],
    waitedStackIds: [],
    // The stacks whose morale took effect this round, for good or bad: it does so once a round.
    moraleStackIds: [],
    // The stack whose turn goes on whatever the turn order says: its extra turn from good morale,
    // or its turn after the hero cast a spell that changed the order.
    turnStackId: null,
    // Each time morale or luck took effect, in order: { stackId, kind }.
    effects: [],
    messages: [],
    walls,
    // What shoots as each round starts, in turn, before every stack.
    roundStartShooters: walls ? [...towerIdsOf(walls), CATAPULT] : [],
    catapultShooting: walls ? catapultShootingOf(sides.attacker, definitions) : null,
    towersAimedByHero: Boolean(walls) && skillLevelOf(sides.defender, ARTILLERY) > 0,
    // The parts the catapult aimed at this round, shot by shot.
    catapultAims: [],
    definitions
  }
  const tactics = tacticsOf(sides)
  return tactics ? startTactics(battle, tactics) : battle
}

export const CATAPULT = 'CATAPULT'

const ARTILLERY = 'ARTILLERY'

export const canHeroAimTowers = (battle) => battle.towersAimedByHero

const hasCatapult = (battle) =>
  battle.stacks.some((stack) => stack.id === CATAPULT_STACK_ID && isAlive(stack))

const towerIdsOf = (walls) => towersOf(walls).map(({ tower }) => tower)

const roundStartShootersOf = (battle) => [
  ...towerIdsOf(battle.walls),
  ...(hasCatapult(battle) ? [CATAPULT] : [])
]

const hasRoundStartTarget = (battle, shooter) =>
  shooter === CATAPULT
    ? hasCatapultTarget(battle.walls)
    : isTowerStanding(battle.walls, shooter) && hasLivingStacks(battle, 'attacker')

const isWaitPhase = (battle) => {
  const active = getActiveStack(battle)
  return !active || hasWaited(battle, active.id)
}

const shooterStackIdOf = (shooter) => (shooter === CATAPULT ? CATAPULT_STACK_ID : shooter)

const shooterOfStackId = (battle, stackId) =>
  stackId === CATAPULT_STACK_ID
    ? CATAPULT
    : (towerIdsOf(battle.walls).find((tower) => tower === stackId) ?? null)

const isShootersWaitedTurn = (battle, shooter) =>
  hasWaited(battle, shooterStackIdOf(shooter)) &&
  !battle.actedStackIds.includes(shooterStackIdOf(shooter)) &&
  !battle.turnStackId &&
  hasRoundStartTarget(battle, shooter) &&
  isWaitPhase(battle)

// A tower or the catapult that waited comes back first among the stacks that waited, the towers
// before the catapult.
const waitedShooterOf = (battle) =>
  roundStartShootersOf(battle).find((shooter) => isShootersWaitedTurn(battle, shooter)) ?? null

// The next that shoots before the stacks, passing over one with nothing to shoot at: as the round
// starts, or one that waited once the stacks that didn't wait have acted.
export function getRoundStartShooter(battle) {
  const shooter = battle.roundStartShooters.find((next) => hasRoundStartTarget(battle, next))
  return shooter ?? waitedShooterOf(battle)
}

export const isCatapultsTurn = (battle) => getRoundStartShooter(battle) === CATAPULT

export const getCatapultStack = (battle) =>
  battle.stacks.find(({ id }) => id === CATAPULT_STACK_ID) ?? null

// The hero aims the round's first shot; a second goes where the first was aimed.
export const canHeroAimCatapult = (battle) =>
  Boolean(battle.catapultShooting?.hasBallistics) && battle.catapultAims.length === 0

// A spell cast on a tower's or the catapult's turn, before every stack, leaves the stacks' order to
// their speeds.
function castTurnOf(battle) {
  const shooter = getRoundStartShooter(battle)
  if (shooter) {
    return { side: shooterSide(shooter), turnStackId: null }
  }
  const active = getActiveStack(battle)
  return { side: active?.side, turnStackId: active?.id ?? null }
}

const castBy = (battle) => {
  const { side, turnStackId } = castTurnOf(battle)
  return { sidesCastThisRound: [...battle.sidesCastThisRound, side], turnStackId }
}

export const hasCastThisRound = (battle, side) => battle.sidesCastThisRound.includes(side)

export const isAlive = (stack) => stack.count > 0

const livingStacks = (battle) => battle.stacks.filter(isAlive)

// A war machine that neither shoots nor heals has no turn of its own.
const stacksTakingTurns = (battle) =>
  livingStacks(battle).filter((stack) => !stack.warMachine || stack.shooter || stack.healing > 0)

// A blind stack loses its turns; once it can see again it takes its place by its speed.
const actingStacks = (battle) => stacksTakingTurns(battle).filter((stack) => !isBlind(stack))

const wakeUp = (stack) => ({
  ...stack,
  spells: (stack.spells ?? []).filter(({ effects }) => effects.blind === undefined)
})

const shooterSide = (shooter) => (shooter === CATAPULT ? 'attacker' : 'defender')

// The side whose hero casts on this turn: a tower's or the catapult's, or the active stack's.
export function getTurnSide(battle) {
  const shooter = getRoundStartShooter(battle)
  if (shooter) {
    return shooterSide(shooter)
  }
  const active = getActiveStack(battle)
  return active ? fightsFor(active) : null
}

export function spellTargetIds(battle, targeting) {
  const casterSide = getTurnSide(battle)
  return casterSide
    ? livingStacks(battle)
        .filter((target) => isSpellTarget(targeting, target, casterSide))
        .map(({ id }) => id)
    : []
}

// A stack immune to the spell is left out, even when it stands in the area.
export function areaTargetIds(battle, targeting, hex) {
  const areaHexes = getAreaHexes(hex, targeting.area)
  return livingStacks(battle)
    .filter(
      (stack) =>
        !isImmuneTo(targeting, stack) &&
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
// either side's and not immune to the spell; a tie between hexes as near is rolled.
export function chainTargetIds(battle, { targeting, targetId, hex, strikes, random }) {
  const hitIds = [targetId]
  let from = hex
  while (hitIds.length < strikes) {
    const left = livingStacks(battle).filter(
      (stack) => !hitIds.includes(stack.id) && !isImmuneTo(targeting, stack)
    )
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

// A clone or a war machine doesn't keep its side in the battle.
export const hasLivingStacks = (battle, side) =>
  livingStacks(battle).some((stack) => stack.side === side && !stack.cloneOf && !stack.warMachine)

// Stable sort: on a speed tie the attacker's stacks, already first in slot order, keep going first.
export function getTurnOrder(battle) {
  return stacksTakingTurns(battle).sort((a, b) => getStackSpeed(b) - getStackSpeed(a))
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

// Once a round, as its turn starts: not when a stack that waited gets its turn back.
const isHitByTheMoatNow = (battle, stack) =>
  Boolean(stack?.inMoat && moatOf(battle.walls).hitsAsTurnStarts) &&
  !stack.warMachine &&
  !hasWaited(battle, stack.id)

// A stack the moat kills as its turn starts has no turn.
function hitAsTurnStarts(battle) {
  const starting = getActiveStack(battle)
  if (!isHitByTheMoatNow(battle, starting)) {
    return battle
  }
  const hit = hitByTheMoat(battle, starting.id)
  return isAlive(hit.stacks.find(({ id }) => id === starting.id)) ? hit : endTurn(hit, starting.id)
}

// As a round starts the towers and the catapult shoot before the first stack's turn, and so before the
// moat.
function startNextTurn(battle) {
  const started = startTurnOf(battle, getActiveStack(battle))
  return getRoundStartShooter(started) ? started : hitAsTurnStarts(started)
}

// A defending stack keeps its Defense bonus until its next turn starts.
function startTurnOf(battle, active) {
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
export function endTurn(ended, stackId) {
  const battle = settleStacks(ended)
  const actedStackIds = [...battle.actedStackIds, stackId]
  const goesOn = { ...battle, actedStackIds, turnStackId: null }
  if (
    actingStacks(battle).some(({ id }) => !actedStackIds.includes(id)) ||
    waitedShooterOf(goesOn)
  ) {
    return startNextTurn(goesOn)
  }

  return startNextTurn({
    ...battle,
    actedStackIds: [],
    sidesCastThisRound: [],
    waitedStackIds: [],
    moraleStackIds: [],
    turnStackId: null,
    roundStartShooters: roundStartShootersOf(battle),
    catapultAims: [],
    stacks: withoutGoneClones(
      battle.stacks.map((stack) => ({
        ...countDownSpells(stack),
        retaliationsUsed: 0
      }))
    )
  })
}

export function waitStack(battle, stackId) {
  const shooter = shooterOfStackId(battle, stackId)
  if (shooter) {
    return afterRoundStartShot({
      ...battle,
      waitedStackIds: [...battle.waitedStackIds, stackId],
      roundStartShooters: withoutShooter(battle, shooter)
    })
  }
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
    ...settleStacks(battle),
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
// Defend passes the catapult's turn, with no bonus.
export function defendStack(battle, stackId) {
  const shooter = shooterOfStackId(battle, stackId)
  if (shooter) {
    return endShootersTurn(battle, shooter)
  }
  const defended = {
    ...battle,
    stacks: battle.stacks.map((stack) => {
      if (stack.id !== stackId) {
        return stack
      }

      return stack.warMachine
        ? stack
        : { ...stack, defenseBonus: Math.max(1, Math.floor(getStackDefense(stack) / 5)) }
    })
  }
  return endTurn(defended, stackId)
}

const isInTheMoat = (battle, stack, hex) =>
  isAffectedByTheMoat(battle.walls, stack) &&
  getStackHexes(stack, hex).some((part) => isMoatHex(battle.walls, part))

function placeOn(battle, stack, hex) {
  const inMoat = isInTheMoat(battle, stack, hex)
  const moatDefensePenalty = inMoat ? moatOf(battle.walls).defensePenalty : 0
  return { ...stack, hex, inMoat, moatDefensePenalty }
}

// Stepping from one hex of the moat to another is going into it again.
const entersTheMoat = (battle, stack, hex) =>
  isAffectedByTheMoat(battle.walls, stack) &&
  getStackHexes(stack, hex).some((part) => isMoatHex(battle.walls, part) && !coversHex(stack, part))

const isHitOnEntering = (battle, stack, hex) =>
  Boolean(stack) && moatOf(battle.walls)?.hitsOnEntering && entersTheMoat(battle, stack, hex)

const isStoppedByTheMoat = (battle, stack) =>
  !stack.flying && Boolean(moatOf(battle.walls)?.stopsWalkers)

function hitByTheMoat(battle, stackId) {
  const { name, damage } = moatOf(battle.walls)
  const { damaged, ...losses } = damageStack(battle, stackId, damage)
  return settleStacks({
    ...battle,
    stacks: battle.stacks.map((stack) => (stack.id === stackId ? damaged : stack)),
    effects: [...battle.effects, { stackId, kind: 'spellHit', spellName: name }],
    messages: [...battle.messages, ...describeDamage(`The ${name} does ${damage} damage.`, losses)]
  })
}

export function moveStack(battle, stackId, hex) {
  const mover = battle.stacks.find(({ id }) => id === stackId)
  const moved = {
    ...battle,
    stacks: battle.stacks.map((stack) =>
      stack.id === stackId ? placeOn(battle, stack, hex) : stack
    )
  }
  return isHitOnEntering(battle, mover, hex) ? hitByTheMoat(moved, stackId) : settleStacks(moved)
}

// A walking stack stops on the first hex of the moat it steps into.
const moatStopFor = (battle, stack) =>
  isStoppedByTheMoat(battle, stack) ? (hex) => entersTheMoat(battle, stack, hex) : undefined

export function getWayThisTurn(battle, stack, way) {
  const thisTurn = way.slice(0, getMovementRange(stack))
  const stopsAt = moatStopFor(battle, stack)
  const stop = stopsAt ? thisTurn.findIndex(stopsAt) : -1
  return stop === -1 ? thisTurn : thisTurn.slice(0, stop + 1)
}

export function getStackHexes(stack, hex = stack.hex) {
  return getOccupiedHexes({ hex, doubleWide: stack.doubleWide, side: stack.side })
}

const coversHex = (stack, hex) => getStackHexes(stack).some((own) => isSameHex(own, hex))

// Corpses lie on the ground: other stacks walk over them and stand on them.
function canStandFor(battle, stack) {
  const others = livingStacks(battle).filter(({ id }) => id !== stack.id)
  const side = fightsFor(stack)
  const blockedByWalls = (hex) =>
    battle.walls && blocksStanding({ walls: battle.walls, stacks: battle.stacks, side, hex })
  return (hex) =>
    isOnBattlefield(hex) &&
    getStackHexes(stack, hex).every(
      (part) =>
        isOnBattlefieldOrEdge(part) &&
        !blockedByWalls(part) &&
        !others.some((other) => coversHex(other, part))
    )
}

export const canStackStandOn = (battle, stack, hex) => canStandFor(battle, stack)(hex)

export const canTeleportTo = (battle, stack, hex, { teleportsAcrossWalls, teleportsAcrossMoat }) =>
  canStackStandOn(battle, stack, hex) &&
  (!battle.walls ||
    canTeleportBetween(battle.walls, stack.hex, hex, {
      acrossWalls: teleportsAcrossWalls,
      acrossMoat: teleportsAcrossMoat
    }))

const turnMove = (battle, stack) => ({
  range: getMovementRange(stack),
  stopsAt: moatStopFor(battle, stack),
  isFront: () => true
})

function frontHexReach(battle, stack, { range, stopsAt, isFront }) {
  return getReachableHexes({
    from: stack.hex,
    speed: range,
    flying: stack.flying,
    isFree: canStandFor(battle, stack),
    stopsAt
  }).filter(isFront)
}

export const getFrontHexReach = (battle, stack) =>
  frontHexReach(battle, stack, turnMove(battle, stack))

// A double-wide creature's back halves included, as the game shades them.
function reachOf(stack, fronts) {
  const reach = new Map()
  for (const front of fronts) {
    for (const hex of getStackHexes(stack, front)) {
      if (isOnBattlefield(hex) && !coversHex(stack, hex)) {
        reach.set(hexKey(hex), hex)
      }
    }
  }
  return [...reach.values()]
}

export const getStackReach = (battle, stack) => reachOf(stack, getFrontHexReach(battle, stack))

function planPathToFront(battle, stack, front, { range, stopsAt, isFront }) {
  if (isSameHex(stack.hex, front)) {
    return []
  }

  const isFree = canStandFor(battle, stack)
  if (!isFree(front) || !isFront(front)) {
    return null
  }

  if (stack.flying) {
    return getHexDistance(stack.hex, front) <= range ? [front] : null
  }

  return findHexPath({ from: stack.hex, to: front, isFree, maxSteps: range, stopsAt })
}

// The path of the stack's front half, or null. A double-wide creature that cannot stand on `hex`
// puts its back half there instead.
function planMove(battle, stack, hex, move) {
  if (coversHex(stack, hex)) {
    return null
  }

  const path = planPathToFront(battle, stack, hex, move)
  if (path || !stack.doubleWide) {
    return path
  }

  return planPathToFront(battle, stack, getFrontHexFor({ hex, side: stack.side }), move)
}

export const planStackMove = (battle, stack, hex) =>
  planMove(battle, stack, hex, turnMove(battle, stack))

// In the tactics phase a stack goes anywhere in its side's band it has a way to, however slow.
const TACTICS = 'TACTICS'
const ANY_DISTANCE = BATTLEFIELD_COLUMNS * BATTLEFIELD_ROWS

const isInTacticsBand = ({ side, columns }, { column }) =>
  side === 'attacker' ? column < columns : column >= BATTLEFIELD_COLUMNS - columns

const tacticsMove = (battle) => ({
  range: ANY_DISTANCE,
  stopsAt: undefined,
  isFront: (hex) => isInTacticsBand(battle.tactics, hex)
})

// Each level of the enemy hero's Tactics cancels one of the hero's; what is left of Basic,
// Advanced or Expert places the army in the side's first 3, 5 or 7 columns.
function tacticsOf(sides) {
  const lead = skillLevelOf(sides.attacker, TACTICS) - skillLevelOf(sides.defender, TACTICS)
  if (lead === 0) {
    return null
  }
  return { side: lead > 0 ? 'attacker' : 'defender', columns: 1 + 2 * Math.abs(lead) }
}

const isPlaceable = (stack) => isAlive(stack) && !stack.warMachine && getMovementRange(stack) > 0

export const getTacticsStacks = (battle) =>
  battle.tactics
    ? battle.stacks.filter((stack) => stack.side === battle.tactics.side && isPlaceable(stack))
    : []

const withTacticsStack = (battle, stackId) => ({
  ...battle,
  tactics: { ...battle.tactics, stackId }
})

function startTactics(battle, tactics) {
  const withTactics = { ...battle, tactics }
  const [first] = getTacticsStacks(withTactics)
  return first ? withTacticsStack(withTactics, first.id) : battle
}

export const isTacticsPhase = (battle) => Boolean(battle.tactics)

export const getTacticsSide = (battle) => battle.tactics?.side ?? null

export const getTacticsStack = (battle) =>
  getTacticsStacks(battle).find(({ id }) => id === battle.tactics.stackId) ?? null

export const getTacticsReach = (battle, stack) =>
  reachOf(stack, frontHexReach(battle, stack, tacticsMove(battle)))

export const planTacticsMove = (battle, stack, hex) =>
  planMove(battle, stack, hex, tacticsMove(battle))

export const selectTacticsStack = (battle, stackId) =>
  getTacticsStacks(battle).some(({ id }) => id === stackId)
    ? withTacticsStack(battle, stackId)
    : battle

export function selectNextTacticsStack(battle) {
  const stacks = getTacticsStacks(battle)
  const index = stacks.findIndex(({ id }) => id === battle.tactics.stackId)
  return withTacticsStack(battle, stacks[(index + 1) % stacks.length].id)
}

export const placeStack = (battle, stackId, hex) =>
  selectNextTacticsStack(withTacticsStack(moveStack(battle, stackId, hex), stackId))

export const endTactics = (battle) => ({ ...battle, tactics: null })

// Stays when already on `fromHex`, else the front half goes there, else the back half.
function planAttackPosition(battle, stack, fromHex) {
  if (coversHex(stack, fromHex)) {
    return []
  }

  const fronts = stack.doubleWide
    ? [fromHex, getFrontHexFor({ hex: fromHex, side: stack.side })]
    : [fromHex]
  for (const front of fronts) {
    const path = planPathToFront(battle, stack, front, turnMove(battle, stack))
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

// A shooter with a stack that blocks it next to it can only fight hand to hand; a war machine
// shoots all the same.
export function canShoot(battle, stack) {
  if (stack.shots === 0 || getShotDamagePercent(stack) === 0) {
    return false
  }
  if (stack.warMachine) {
    return true
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

// Either penalty halves the shot, and both together halve it only once.
const hasShotPenalty = (battle, stack, target) =>
  hasDistancePenalty(stack, target) ||
  (battle.walls && !stack.noWallPenalty && isShotThroughTheWalls(battle.walls, stack, target))

export function getShotTargets(battle, stack) {
  if (!canShoot(battle, stack)) {
    return []
  }

  return attackableBy(battle, stack).map((target) => {
    const penalty = hasShotPenalty(battle, stack, target)
    return {
      stackId: target.id,
      penalty,
      damage: getDamageRange({ attacker: stack, defender: target, halved: penalty })
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
export function planStackAttack(
  battle,
  stack,
  {
    targetId,
    fromHex,
    random,
    luckRandom,
    abilityRandom = Math.random,
    resistanceRandom = Math.random
  }
) {
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

  // The moat on the way hits first: the ones left strike, and none if it killed them all.
  const arrived = path.length > 0 ? moveStack(battle, stack.id, path.at(-1)) : battle
  const attacker = arrived.stacks.find(({ id }) => id === stack.id)
  return {
    path,
    strikes: isAlive(attacker)
      ? strikeSequence({
          attacker,
          defender: target,
          random,
          luckRandom,
          castAfterHit: castAfterHit(arrived, { abilityRandom, resistanceRandom }),
          breathTargetOf: breathTargetFinder(arrived.stacks, { attackerId: stack.id, fromHex })
        })
      : []
  }
}

const spellAfterAttackOf = (battle, striker) => {
  const ability = striker.spellAfterAttack
  const spell = battle.definitions?.spells?.[ability?.spell]
  return spell?.lasting ? { ability, spell } : null
}

const castAfterAttack = ({ ability, spell }) => ({
  spellId: ability.spell,
  effects: Object.fromEntries(
    Object.entries(spell.lasting.effects).map(([key, values]) => [key, values[ability.skill]])
  ),
  rounds: ability.rounds,
  helpful: false,
  removable: !spell.lasting.cannotBeRemoved
})

// Nothing is rolled for a stack the spell can't go on; one that resists it is left as it was.
const castAfterHit =
  (battle, { abilityRandom, resistanceRandom }) =>
  (striker, struck) => {
    const cast = spellAfterAttackOf(battle, striker)
    if (!cast || isImmuneTo(spellTargeting(cast.spell, cast.ability.skill), struck)) {
      return null
    }
    if (abilityRandom() * 100 >= cast.ability.chance) {
      return null
    }
    const stacks = battle.stacks.map((stack) => (stack.id === struck.id ? struck : stack))
    if (rollResisted(stacks, [struck.id], resistanceRandom).length > 0) {
      return null
    }
    return putSpellOn(struck, castAfterAttack(cast))
  }

const CLONE_SPELL = 'CLONE'

// A clone is gone once it is hit, its original dies or its rounds are over.
const isCloneGone = (clone, stacks) =>
  !isAlive(clone) ||
  !stacks.some((stack) => stack.id === clone.cloneOf && isAlive(stack)) ||
  !(clone.spells ?? []).some(({ spellId }) => spellId === CLONE_SPELL)

function withoutGoneClones(stacks) {
  const goneIds = stacks
    .filter((stack) => stack.cloneOf && isCloneGone(stack, stacks))
    .map(({ id }) => id)
  if (goneIds.length === 0) {
    return stacks
  }
  return stacks
    .filter(({ id }) => !goneIds.includes(id))
    .map((stack) => (goneIds.includes(stack.cloneId) ? { ...stack, cloneId: null } : stack))
}

// After anything that moves or kills a stack: clones whose time is over go, and so do bindings whose
// binders are gone.
const settleStacks = (battle) => ({
  ...battle,
  stacks: withoutBrokenBindings(withoutGoneClones(battle.stacks))
})

function describeLosses(killed, nameFor) {
  return killed === 1 ? `One ${nameFor(1)} perishes.` : `${killed} ${nameFor(killed)} perish.`
}

// "The Angels do 175 damage. 17 Pikemen perish."
function describeDamage(dealt, { killed, nameFor, clone, warMachine }) {
  if (clone) {
    return [dealt, `The ${clone.name} perish.`]
  }
  if (killed > 0 && warMachine) {
    return [dealt, `The ${nameFor(1)} is destroyed.`]
  }
  return [killed === 0 ? dealt : `${dealt} ${describeLosses(killed, nameFor)}`]
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
  return {
    damaged,
    killed,
    nameFor,
    clone: stack.cloneOf && damage > 0 ? stack : null,
    warMachine: stack.warMachine
  }
}

function describeDealt(attacker, damage, fireShield) {
  if (fireShield) {
    return `The Fire Shield does ${damage} damage.`
  }
  return attacker.count === 1
    ? `The ${attacker.name} does ${damage} damage.`
    : `The ${attacker.name} do ${damage} damage.`
}

// A Fire Shield's burst shows over the stack it shields as it burns the striker.
function strikeEffects({ attackerId, lucky, fireShield }) {
  if (fireShield) {
    return [{ stackId: attackerId, kind: 'spellHit', spellName: 'Fire Shield' }]
  }
  return lucky ? [{ stackId: attackerId, kind: 'goodLuck' }] : []
}

function hitStack(damaged, { binds, cast, attackerId }) {
  const woken = wakeUp(damaged)
  const enchanted = cast ? putSpellOn(woken, castAfterAttack(cast)) : woken
  return binds ? bindStack(enchanted, attackerId) : enchanted
}

const describeCastAfterHit = (cast, stack) =>
  cast?.spell.lasting.castMessage ? [cast.spell.lasting.castMessage.replace('%s', stack.name)] : []

function applyStrike(
  battle,
  { attackerId, defenderId, damage, lucky, fireShield, castsSpell, breath },
  retaliatorId
) {
  const attacker = battle.stacks.find(({ id }) => id === attackerId)
  const hit = damageStack(battle, defenderId, damage)
  const { damaged } = hit
  const burnt = breath ? damageStack(battle, breath.defenderId, breath.damage) : null
  const dealt = describeDealt(attacker, damage + (breath?.damage ?? 0), fireShield)
  const losses = burnt ? describeLossesOfAll([hit, burnt]) : hit

  const binds = attacker.binds && !fireShield && isAlive(damaged)
  const cast = castsSpell ? spellAfterAttackOf(battle, attacker) : null
  return {
    ...battle,
    stacks: battle.stacks.map((stack) => {
      if (stack.id === defenderId) {
        return hitStack(damaged, { binds, cast, attackerId })
      }

      if (stack.id === burnt?.damaged.id) {
        return wakeUp(burnt.damaged)
      }

      if (stack.id === attackerId && attackerId === retaliatorId && !fireShield) {
        return { ...stack, retaliationsUsed: stack.retaliationsUsed + 1 }
      }

      return stack
    }),
    effects: [
      ...battle.effects,
      ...strikeEffects({ attackerId, lucky, fireShield }),
      ...(cast ? [{ stackId: defenderId, kind: 'spellHit', spellName: cast.spell.name }] : [])
    ],
    messages: [
      ...battle.messages,
      ...(lucky ? [`Good luck shines on the ${attacker.name}.`] : []),
      ...describeDamage(dealt, losses),
      ...(binds ? [describeBinding(damaged)] : []),
      ...describeCastAfterHit(cast, damaged)
    ]
  }
}

// Several stacks hit: the log counts creatures rather than naming any one stack's.
function describeLossesOfAll(damaged) {
  if (damaged.length === 1) {
    return damaged[0]
  }
  const killed = damaged.reduce((sum, hit) => sum + hit.killed, 0)
  const nameFor =
    damaged.length === 1 ? damaged[0].nameFor : (count) => (count === 1 ? 'creature' : 'creatures')
  return { killed, nameFor }
}

// Each stack hit takes its own damage: a Protection lessens it on the stack it is on.
export const castDamageSpell = (battle, cast) => settleStacks(damageBySpell(battle, cast))

function damageBySpell(battle, { heroName, spellName, hits: aimed, chained, resistedIds = [] }) {
  const targetIds = aimed.map(({ stackId }) => stackId)
  const cast = castOnStacks(
    battle,
    { heroName, spellName, targetIds, chained, resistedIds },
    (stack) => stack
  )
  const hits = aimed.filter(({ stackId }) => !resistedIds.includes(stackId))
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
      ...describeDamage(`The ${spellName} does ${total} damage.`, describeLossesOfAll(damaged))
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
// A spell that ends others (Berserk and Hypnotize end each other) takes them off the stack, and
// one that removes the harmful spells (Anti-Magic) takes off all of them but Disrupting Ray.
const isEndedBy = (spell, { spellId, endsSpellIds = [], removesHarmful }) =>
  spell.spellId === spellId ||
  endsSpellIds.includes(spell.spellId) ||
  Boolean(removesHarmful && !spell.helpful && spell.removable !== false)

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
    ...ending
  }
) {
  const earlier = (stack.spells ?? []).find((spell) => spell.spellId === spellId)
  const roundsLeft = longerOf(rounds, earlier?.roundsLeft)
  const effects = addsUp ? addEffects(earlier?.effects, cast) : cast
  const kept = (stack.spells ?? []).filter((spell) => !isEndedBy(spell, { spellId, ...ending }))
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

const healthLostOnTop = (stack) => stack.health - stack.topHealth

export function getHealTargets(battle, healer) {
  if (!healer?.healing) {
    return []
  }
  return livingStacks(battle).filter(
    (stack) => stack.side === healer.side && !stack.warMachine && healthLostOnTop(stack) > 0
  )
}

// Aiming itself, the healer takes the stack whose top creature lost the most, the earlier on a tie.
export const chooseHealTarget = (battle, healer) =>
  getHealTargets(battle, healer).reduce(
    (best, stack) => (!best || healthLostOnTop(stack) > healthLostOnTop(best) ? stack : best),
    null
  )

// From 1 to the healer's most, never more than the top creature lost.
export function planStackHeal(battle, healer, { targetId, random }) {
  const target = getHealTargets(battle, healer).find(({ id }) => id === targetId)
  if (!target) {
    return null
  }
  const rolled = 1 + Math.floor(random() * healer.healing)
  return { targetId, healing: Math.min(rolled, healthLostOnTop(target)) }
}

export function healStack(battle, { stackId, targetId, healing }) {
  const healed = {
    ...battle,
    stacks: battle.stacks.map((stack) =>
      stack.id === targetId ? healTopCreature(stack, healing) : stack
    ),
    messages: [
      ...battle.messages,
      `The ${nameOf(battle, stackId)} heals the ${nameOf(battle, targetId)} removing ${healing} points of damage.`
    ],
    effects: [...battle.effects, { stackId: targetId, kind: 'firstAid' }]
  }
  return endTurn(healed, stackId)
}

const describeStackCast = ({ name, count }, spellName) =>
  `The ${name} ${count === 1 ? 'casts' : 'cast'} ${spellName}`

// A stack's own spell: a lasting one or a healing one, on one stack of its side.
export function castByStack(
  battle,
  { stackId, targetId, spellName, castMessage, healing, lasting }
) {
  const caster = battle.stacks.find(({ id }) => id === stackId)
  const target = battle.stacks.find(({ id }) => id === targetId)
  const change = (stack) =>
    lasting ? putSpellOn(stack, lasting) : healTopCreature(stack, healing ?? 0)
  const cast = {
    ...battle,
    stacks: battle.stacks.map((stack) => {
      if (stack.id === targetId) {
        return change(stack)
      }
      return stack.id === stackId ? { ...stack, castsLeft: stack.castsLeft - 1 } : stack
    }),
    effects: [...battle.effects, { stackId: targetId, kind: 'spellHit', spellName }],
    messages: [
      ...battle.messages,
      describeStackCast(caster, spellName),
      ...(castMessage ? [castMessage.replace('%s', target.name)] : [])
    ]
  }
  return endTurn(cast, stackId)
}

function describeCast(battle, { heroName, spellName, targetIds }) {
  if (targetIds.length !== 1) {
    return `${heroName} casts '${spellName}'.`
  }
  const target = battle.stacks.find(({ id }) => id === targetIds[0])
  return `${heroName} casts '${spellName}' on the ${target.name}.`
}

// A chain spell's hits come one after another, each from the stack hit before it.
function spellHitEffects({ spellName, targetIds, chained, resistedIds }) {
  return targetIds.map((stackId, place) => {
    const hit = { stackId, kind: 'spellHit', spellName }
    const shown = resistedIds.includes(stackId) ? { ...hit, resisted: true } : hit
    return chained && place > 0 ? { ...shown, place, from: targetIds[place - 1] } : shown
  })
}

const describeResisted = ({ name, count }, spellName) =>
  `The ${name} ${count === 1 ? 'resists' : 'resist'} the ${spellName}.`

// The spell changes its targets but those that resisted it; the stack whose turn it is keeps it.
function castOnStacks(
  battle,
  { heroName, spellName, targetIds, chained, castMessage, resistedIds = [] },
  change
) {
  const stackById = (id) => battle.stacks.find((stack) => stack.id === id)
  const affectedIds = targetIds.filter((id) => !resistedIds.includes(id))
  const named = castMessage
    ? affectedIds.map((id) => castMessage.replace('%s', stackById(id).name))
    : []
  return {
    ...battle,
    ...castBy(battle),
    stacks: withoutBrokenBindings(
      battle.stacks.map((stack) => (affectedIds.includes(stack.id) ? change(stack) : stack))
    ),
    effects: [
      ...battle.effects,
      ...spellHitEffects({ spellName, targetIds, chained, resistedIds })
    ],
    messages: [
      ...battle.messages,
      describeCast(battle, { heroName, spellName, targetIds }),
      ...resistedIds.map((id) => describeResisted(stackById(id), spellName)),
      ...named
    ]
  }
}

export const castLastingSpell = (
  battle,
  { heroName, spellName, targetIds, castMessage, resistedIds, ...spell }
) =>
  castOnStacks(battle, { heroName, spellName, targetIds, castMessage, resistedIds }, (stack) =>
    putSpellOn(stack, spell)
  )

// Taken into the moat, it isn't hit by it.
export function teleportStack(battle, { destination, ...cast }) {
  const teleported = castOnStacks(battle, cast, (stack) => placeOn(battle, stack, destination))
  const effects = [...teleported.effects]
  effects[effects.length - 1] = { ...effects.at(-1), teleported: true }
  return { ...teleported, effects }
}

const cloneIdOf = (original) => `${original.id}-clone`

// The clone is a new stack of the creatures on the hero's side, free of the original's spells.
function cloneOf(original, { destination, rounds }) {
  return {
    ...original,
    id: cloneIdOf(original),
    side: 'attacker',
    initialCount: original.count,
    hex: destination,
    retaliationsUsed: 0,
    defenseBonus: 0,
    cloneOf: original.id,
    cloneId: null,
    spells: [
      {
        spellId: CLONE_SPELL,
        effects: {},
        roundsLeft: rounds,
        helpful: true,
        removable: false
      }
    ]
  }
}

export function cloneStack(battle, { destination, rounds, ...cast }) {
  const original = battle.stacks.find(({ id }) => id === cast.targetIds[0])
  const cloned = castOnStacks(battle, cast, (stack) => ({ ...stack, cloneId: cloneIdOf(stack) }))
  return {
    ...cloned,
    stacks: [
      ...cloned.stacks,
      placeOn(battle, cloneOf(original, { destination, rounds }), destination)
    ]
  }
}

// The nearest hex to the original the clone fits on; on a tie the one further toward the enemy,
// then the one nearest the original's row.
export function findCloneHex(battle, original) {
  const canStand = canStandFor(battle, { ...original, id: null, side: 'attacker' })
  const hexes = []
  for (let row = 0; row < BATTLEFIELD_ROWS; row += 1) {
    for (let column = 0; column < BATTLEFIELD_COLUMNS; column += 1) {
      if (canStand({ row, column })) {
        hexes.push({ row, column })
      }
    }
  }
  const rank = (hex) => [
    getHexDistance(original.hex, hex),
    -hex.column,
    Math.abs(hex.row - original.hex.row)
  ]
  const compare = (a, b) => {
    const [first, second] = [rank(a), rank(b)]
    return first[0] - second[0] || first[1] - second[1] || first[2] - second[2]
  }
  return hexes.sort(compare)[0] ?? null
}

// The health heals the top creature, then brings back whole creatures, never more than the stack
// started the battle with. A stack brought back from the dead comes back free of spells.
function raiseStack(stack, healing, definitions) {
  const left = stack.count > 0 ? (stack.count - 1) * stack.health + stack.topHealth : 0
  const total = Math.min(stack.initialCount * stack.health, left + healing)
  const count = Math.ceil(total / stack.health)
  return {
    ...stack,
    count,
    topHealth: total - (count - 1) * stack.health,
    name: describeStack({ creature: stack.creature, count }, definitions).name,
    spells: stack.count > 0 ? stack.spells : []
  }
}

function describeRisen(risen, stack, definitions) {
  const name = describeStack({ creature: stack.creature, count: risen }, definitions).name
  return risen === 1 ? `1 ${name} rises from the dead!` : `${risen} ${name} rise from the dead!`
}

// The sacrificed stack leaves no corpse.
export function sacrificeStack(battle, { sacrificedId, healing, ...cast }) {
  const before = battle.stacks.find(({ id }) => id === cast.targetIds[0])
  const raised = castOnStacks(battle, cast, (stack) =>
    raiseStack(stack, healing, battle.definitions)
  )
  const risen = raised.stacks.find(({ id }) => id === before.id).count - before.count
  return settleStacks({
    ...raised,
    stacks: raised.stacks.map((stack) =>
      stack.id === sacrificedId ? { ...stack, count: 0, sacrificed: true } : stack
    ),
    messages:
      risen > 0
        ? [...raised.messages, describeRisen(risen, before, battle.definitions)]
        : raised.messages
  })
}

export const castRemovingSpell = (battle, cast) => castOnStacks(battle, cast, removeSpellsFrom)

export const castHealingSpell = (battle, { healing, ...cast }) =>
  castOnStacks(battle, cast, (stack) => healTopCreature(stack, healing))

// The attack itself, before the attacker's turn ends.
export function resolveAttack(battle, { stackId, targetId, path, strikes }) {
  const moved = path.length > 0 ? moveStack(battle, stackId, path.at(-1)) : battle
  const attacker = moved.stacks.find(({ id }) => id === stackId)
  if (attacker && !isAlive(attacker)) {
    return settleStacks(moved)
  }
  const attacked = strikes.reduce(
    (current, strike) => applyStrike(current, strike, targetId),
    moved
  )
  return settleStacks(endOwnAttackSpells(attacked, stackId))
}

export const attackStack = (battle, attack) => finishAction(resolveAttack(battle, attack), attack)

// Every shot with its rolled damage, or null when the stack cannot shoot the target.
export function planStackShot(battle, stack, { targetId, random, luckRandom, abilityRandom }) {
  const target = attackableBy(battle, stack).find(({ id }) => id === targetId)
  if (!target || !canShoot(battle, stack)) {
    return null
  }

  return {
    strikes: shotSequence({
      attacker: hasShotsSupplied(battle, stack)
        ? { ...stack, shots: Number.POSITIVE_INFINITY }
        : stack,
      defender: target,
      random,
      luckRandom,
      abilityRandom,
      halved: hasShotPenalty(battle, stack, target)
    })
  }
}

// A stack that changed sides is supplied by the side it started on.
const hasShotsSupplied = (battle, shooter) =>
  battle.stacks.some(
    (stack) => stack.suppliesShots && stack.side === shooter.side && isAlive(stack)
  )

const shotsUsed = (battle, shooter, strikes) =>
  hasShotsSupplied(battle, shooter) ? 0 : strikes.length

// The shot itself, before the shooter's turn ends.
export function resolveShot(battle, { stackId, strikes }) {
  const shooter = battle.stacks.find(({ id }) => id === stackId)
  const used = shotsUsed(battle, shooter, strikes)
  const shot = endOwnAttackSpells(
    strikes.reduce((current, strike) => applyStrike(current, strike, null), battle),
    stackId
  )
  return settleStacks({
    ...shot,
    stacks: shot.stacks.map((stack) =>
      stack.id === stackId ? { ...stack, shots: stack.shots - used } : stack
    )
  })
}

export const shootStack = (battle, shot) => finishAction(resolveShot(battle, shot), shot)

const withoutShooter = (battle, done) =>
  battle.roundStartShooters.filter((shooter) => shooter !== done)

// Once the last of them has shot, the first stack's turn starts.
const afterRoundStartShot = (battle) =>
  getRoundStartShooter(battle) ? battle : hitAsTurnStarts(battle)

// After its waited turn the round goes on as after any stack's.
const endShootersTurn = (battle, shooter, after = battle) =>
  isShootersWaitedTurn(battle, shooter)
    ? endTurn(after, shooterStackIdOf(shooter))
    : afterRoundStartShot({ ...after, roundStartShooters: withoutShooter(battle, shooter) })

export const planBattleCatapultShot = (battle, random, aimedByHero = null) =>
  planCatapultShot(battle.walls, random, {
    ...battle.catapultShooting,
    aimed: battle.catapultAims.at(-1) ?? aimedByHero
  })

// A shot saved before the catapult could fire twice names only the part it hit.
export function shootCatapult(battle, shot) {
  const catapultAims = [...battle.catapultAims, shot.aim ?? shot.part]
  const done = catapultAims.length >= battle.catapultShooting.shots
  const fired = {
    ...battle,
    walls: hitWall(battle.walls, shot),
    catapultAims,
    messages: [...battle.messages, describeCatapultShot(battle.walls, shot).message]
  }
  return done ? endShootersTurn(battle, CATAPULT, fired) : afterRoundStartShot(fired)
}

export function shootTower(battle, { tower, targetId, damage }) {
  const { damaged, ...losses } = damageStack(battle, targetId, damage)
  const shot = settleStacks({
    ...battle,
    stacks: battle.stacks.map((stack) => (stack.id === targetId ? wakeUp(damaged) : stack)),
    messages: [
      ...battle.messages,
      ...describeDamage(`The ${ARROW_TOWER_NAME} does ${damage} damage.`, losses)
    ]
  })
  return endShootersTurn(battle, tower, shot)
}

export function shakeWalls(battle, { heroName, spellName, wallHits }) {
  return {
    ...battle,
    ...castBy(battle),
    walls: wallHits.reduce(hitWall, battle.walls),
    messages: [
      ...battle.messages,
      describeCast(battle, { heroName, spellName, targetIds: [] }),
      ...wallHits.map((hit) => describeEarthquakeHit(battle.walls, hit).message)
    ]
  }
}

// The slots of the side's war machines destroyed in the battle; the catapult is never lost.
export const getDestroyedWarMachines = (battle, side) =>
  FIELD_WAR_MACHINE_SLOTS.filter((slot) =>
    battle.stacks.some(({ id, count }) => id === warMachineStackId(side, slot) && count === 0)
  )

export function getArmyAfterBattle(battle, side, army) {
  return army.map((slot, index) => {
    const stack = battle.stacks.find(({ id }) => id === `${side}-${index}`)
    return slot && stack?.count > 0 ? { creature: stack.creature, count: stack.count } : null
  })
}

// The winner earns the health of every creature of the other side killed; clones and war machines
// earn nothing.
export function getExperienceForKills(battle, winnerSide) {
  return battle.stacks
    .filter((stack) => stack.side !== winnerSide && !stack.cloneOf && !stack.warMachine)
    .reduce((sum, stack) => sum + (stack.initialCount - stack.count) * stack.health, 0)
}
