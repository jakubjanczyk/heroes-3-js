import { towerWithStructures } from '../../game/heroes/arrow-towers.js'
import { giveAllArtifacts } from '../../game/heroes/artifact-exchange.js'
import {
  BATTLE_DEFENDER_ARTIFACT_GUARDS,
  hasFullBackpack,
  withoutWarMachines
} from '../../game/heroes/artifacts.js'
import { getArmyAfterBattle, heroBattleSide } from '../../game/heroes/battle.js'
import { BATTLE_OUTCOME_LOST } from '../../game/heroes/battle-results.js'
import {
  BATTLE_DEFENDER_ENEMY_HERO,
  DEFEATED_HERO_EXPERIENCE,
  defendingHeroExperience
} from '../../game/heroes/enemy-hero-battle.js'
import { describeStack } from '../../game/heroes/hero-army.js'
import { BATTLE_DEFENDER_DWELLING_GUARDS } from '../../game/heroes/map-dwellings.js'
import { splitMonster } from '../../game/heroes/monster-stacks.js'
import { createSiegeWalls } from '../../game/heroes/siege-walls.js'
import { heroById } from '../../game/heroes/state/hero-details.js'
import {
  builtIn,
  townGarrison as garrisonOf,
  townOwner,
  townType
} from '../../game/heroes/state/towns.js'
import {
  FORT_CHAIN,
  fortLevelOf,
  structuresIn,
  townBuildingsCatalogue
} from '../../game/heroes/town-buildings.js'
import {
  BATTLE_DEFENDER_TOWN_GARRISON,
  hasWalls,
  joinGarrison,
  splitGarrison,
  townCaptureExperience
} from '../../game/heroes/town-garrison.js'
import { NO_DEFENDER_BONUSES, townDefenderBonuses } from '../../game/heroes/town-visit-bonuses.js'
import { heroOwner } from '../../game/state/queries.js'
import {
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_FACT_ARTIFACT_GUARDS_CHANGED,
  APP_FACT_ARTIFACT_PICKED_UP,
  APP_FACT_DWELLING_FLAGGED,
  APP_FACT_DWELLING_GUARDS_CHANGED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_ARTIFACTS_CAPTURED,
  APP_FACT_MONSTER_COUNT_CHANGED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TOWN_GARRISON_CHANGED,
  APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED
} from '../events.js'

const sumOf = (stacks) => stacks.reduce((sum, stack) => sum + stack.count, 0)

const NEUTRAL_SURRENDER_REFUSAL = 'Neutral creatures do not accept surrender'

// A battle started before battles named their defender was against a monster on the map.
const monster = {
  named: (started) => started.defender ?? { creature: started.entityType, count: started.count },
  side: ({ started, heroArmy, definitions }) => ({
    army: splitMonster({
      monster: { ...monster.named(started), stacks: started.stacks },
      heroArmy,
      tile: started.tile,
      definitions
    })
  }),
  surrenderRefusal: NEUTRAL_SURRENDER_REFUSAL,
  win({ emit, started: { entityId, entityType, tile } }) {
    emit(APP_FACT_MONSTER_DEFEATED, { entityId, entityType, tile })
    emit(APP_FACT_ENTITY_REMOVED, { entityId })
  },
  // A monster a spell killed with the hero's last stack leaves the map too.
  lose({ emit, started: { entityId }, survivors }) {
    emit(APP_FACT_MONSTER_COUNT_CHANGED, { entityId, count: sumOf(survivors) })
    if (survivors.length === 0) {
      emit(APP_FACT_ENTITY_REMOVED, { entityId })
    }
  }
}

// Beaten guards leave the dwelling to the hero's player, who may recruit there straight away.
const dwellingGuards = {
  named: (started) => started.defender,
  side: ({ started: { defender } }) => ({
    army: [{ creature: defender.creature, count: defender.count }]
  }),
  surrenderRefusal: NEUTRAL_SURRENDER_REFUSAL,
  win({ emit, state, heroId, started: { entityId, entityType } }) {
    emit(APP_FACT_DWELLING_GUARDS_CHANGED, { entityId, count: 0 })
    emit(APP_FACT_DWELLING_FLAGGED, { entityId, entityType, owner: heroOwner(state.get(), heroId) })
  },
  afterWin({ emit, heroId, started: { entityId } }) {
    emit(APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED, { heroId, entityId })
  },
  lose({ emit, started: { entityId }, survivors }) {
    emit(APP_FACT_DWELLING_GUARDS_CHANGED, { entityId, count: sumOf(survivors) })
  }
}

// The results window names an artifact's guards by their first stack. Beaten guards leave the
// artifact to the hero, or on the map when the hero's backpack is full.
const artifactGuards = {
  named: (started) => started.defender.stacks[0],
  side: ({ started }) => ({
    army: started.defender.stacks.map(({ creature, count }) => ({ creature, count }))
  }),
  surrenderRefusal: NEUTRAL_SURRENDER_REFUSAL,
  win({ emit, state, heroId, started: { entityId, entityType, tile } }) {
    if (hasFullBackpack(heroById(state.get(), heroId)?.artifacts)) {
      emit(APP_FACT_ARTIFACT_GUARDS_CHANGED, { entityId, stacks: [] })
      return
    }
    emit(APP_FACT_ARTIFACT_PICKED_UP, { heroId, entityId, entityType, tile, artifact: entityType })
    emit(APP_FACT_ENTITY_REMOVED, { entityId })
  },
  lose({ emit, started: { entityId }, survivors }) {
    const stacks = survivors.map(({ creature, count }) => ({ creature, count }))
    emit(APP_FACT_ARTIFACT_GUARDS_CHANGED, { entityId, stacks })
  }
}

// The results window names a garrison by its strongest creature. Beating it takes the town; the
// hero stays on the tile next to its gate.
const townGarrison = {
  named: ({ defender: { stacks } }, definitions) =>
    stacks
      .filter(Boolean)
      .reduce((strongest, stack) =>
        aiValueOf(stack, definitions) > aiValueOf(strongest, definitions) ? stack : strongest
      ),
  side: ({ started }) => ({ army: started.defender.stacks }),
  surrenderRefusal: 'There is no hero to surrender to',
  owner: ({ started, state }) => townOwner(state.get(), started.entityId),
  townId: ({ started }) => started.entityId,
  bonusExperience: ({ state, started }) =>
    townCaptureExperience(builtIn(state.get(), started.entityId)),
  win({ emit, state, heroId, started: { entityId } }) {
    emit(APP_FACT_TOWN_GARRISON_CHANGED, { entityId, garrison: [] })
    emit(APP_FACT_TOWN_CAPTURED, { entityId, owner: heroOwner(state.get(), heroId) })
  },
  lose({ emit, battle, started: { entityId, defender } }) {
    const garrison = getArmyAfterBattle(battle, 'defender', defender.stacks)
    emit(APP_FACT_TOWN_GARRISON_CHANGED, { entityId, garrison })
  }
}

// The winner takes every artifact of the beaten hero that finds room; the rest are lost.
function captureArtifacts({ emit, state, heroId, definitions, beatenHeroId }) {
  const beaten = heroById(state.get(), beatenHeroId)?.artifacts
  const winner = heroById(state.get(), heroId)?.artifacts
  if (!beaten || !winner) {
    return
  }
  const { given } = giveAllArtifacts(withoutWarMachines(beaten, definitions), winner, definitions)
  if (given.length > 0) {
    emit(APP_FACT_HERO_ARTIFACTS_CAPTURED, { heroId, fromHeroId: beatenHeroId, artifacts: given })
  }
}

// Only a beaten hero, not one who retreated, gives the enemy hero its artifacts. With no stacks
// left the enemy hero earns nothing.
function rewardEnemyHero({
  emit,
  state,
  heroId,
  battle,
  definitions,
  outcome,
  defender,
  survivors
}) {
  if (survivors.length === 0) {
    return
  }
  const experience = defendingHeroExperience(battle, outcome)
  if (outcome === BATTLE_OUTCOME_LOST) {
    captureArtifacts({ emit, state, heroId: defender.heroId, definitions, beatenHeroId: heroId })
  }
  if (experience > 0) {
    emit(APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED, {
      heroId: defender.heroId,
      amount: experience
    })
  }
}

// The town an enemy hero defends, if any, lends its garrison to the hero's army for the battle.
function enemyHeroArmy(state, { heroId, townId }) {
  const heroArmy = heroById(state.get(), heroId)?.army ?? []
  const garrison = townId ? garrisonOf(state.get(), townId) : []
  return { heroArmy, garrison, ...joinGarrison(heroArmy, garrison) }
}

function captureDefendedTown({ emit, state, heroId, started: { defender } }) {
  if (!defender.townId) {
    return
  }
  emit(APP_FACT_TOWN_GARRISON_CHANGED, { entityId: defender.townId, garrison: [] })
  emit(APP_FACT_TOWN_CAPTURED, { entityId: defender.townId, owner: heroOwner(state.get(), heroId) })
}

// The beaten hero leaves the map, and the town it defended is taken. A hero takes a surrender, so
// it has no surrender refusal.
const enemyHero = {
  side: ({ started, state, definitions }) => ({
    ...heroBattleSide(heroById(state.get(), started.defender.heroId), definitions, {
      defendingTown: Boolean(started.defender.townId)
    }),
    army: enemyHeroArmy(state, started.defender).army
  }),
  hero: ({ started: { defender }, state }) => ({
    id: defender.heroId,
    townId: defender.townId ?? null,
    name: heroById(state.get(), defender.heroId)?.name,
    owner: heroOwner(state.get(), defender.heroId)
  }),
  townId: ({ started: { defender } }) => defender.townId ?? null,
  bonusExperience: ({ state, started: { defender } }) =>
    DEFEATED_HERO_EXPERIENCE +
    (defender.townId ? townCaptureExperience(builtIn(state.get(), defender.townId)) : 0),
  win(fought) {
    const { emit, state, heroId, definitions, started } = fought
    const { defender } = started
    captureArtifacts({ emit, state, heroId, definitions, beatenHeroId: defender.heroId })
    emit(APP_FACT_ENTITY_REMOVED, { entityId: defender.heroId })
    captureDefendedTown(fought)
  },
  lose(fought) {
    const { emit, state, battle, started } = fought
    const { defender } = started
    const { army, ...armies } = enemyHeroArmy(state, defender)
    const after = splitGarrison({
      armyAfter: getArmyAfterBattle(battle, 'defender', army),
      ...armies
    })
    emit(APP_FACT_HERO_ARMY_CHANGED, { heroId: defender.heroId, army: after.heroArmy })
    if (defender.townId) {
      emit(APP_FACT_TOWN_GARRISON_CHANGED, { entityId: defender.townId, garrison: after.garrison })
    }
    rewardEnemyHero({ ...fought, defender })
  }
}

const aiValueOf = ({ creature }, definitions) => definitions?.monsters?.[creature]?.aiValue ?? 0

const defenders = {
  [BATTLE_DEFENDER_DWELLING_GUARDS]: dwellingGuards,
  [BATTLE_DEFENDER_ARTIFACT_GUARDS]: artifactGuards,
  [BATTLE_DEFENDER_TOWN_GARRISON]: townGarrison,
  [BATTLE_DEFENDER_ENEMY_HERO]: enemyHero
}

export const battleDefenderOf = (started) => defenders[started.defender?.kind] ?? monster

const hasFortFor = (built, { from }) => fortLevelOf(built) > FORT_CHAIN.indexOf(from)

const moatOfTown = (moat, built) => (moat && hasFortFor(built, moat) ? moat : null)

function towersOfTown(towers = [], built, buildings) {
  const structures = structuresIn(built, buildings)
  return towers
    .filter((tower) => hasFortFor(built, tower))
    .map((tower) => towerWithStructures(tower, structures))
}

export function siegeWallsOf({ started, state, definitions }) {
  const townId = battleDefenderOf(started).townId?.({ started })
  const built = townId ? builtIn(state.get(), townId) : null
  if (!built || !hasWalls(built)) {
    return null
  }
  const type = townType(state.get(), townId)
  const { moat, arrowTowers } = definitions?.towns?.[type] ?? {}
  const { buildings } = townBuildingsCatalogue(definitions, type)
  return createSiegeWalls({
    castle: built.has('CASTLE'),
    moat: moatOfTown(moat, built),
    towers: towersOfTown(arrowTowers, built, buildings)
  })
}

export function townDefenderBonusesOf({ started, state, definitions }) {
  const townId = battleDefenderOf(started).townId?.({ started })
  if (!townId) {
    return NO_DEFENDER_BONUSES
  }
  const { buildings } = townBuildingsCatalogue(definitions, townType(state.get(), townId))
  return townDefenderBonuses({ built: builtIn(state.get(), townId), buildings })
}

export function battleDefenderName({ started, state, definitions }) {
  const defender = battleDefenderOf(started)
  return (
    defender.hero?.({ started, state }).name ??
    describeStack(defender.named(started, definitions), definitions).name
  )
}

// Every event a defender's win or loss can emit, declared so the battle module may emit them.
export const battleDefenderEvents = Object.freeze([
  APP_FACT_ARTIFACT_GUARDS_CHANGED,
  APP_FACT_ARTIFACT_PICKED_UP,
  APP_FACT_DWELLING_FLAGGED,
  APP_FACT_DWELLING_GUARDS_CHANGED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_ARTIFACTS_CAPTURED,
  APP_FACT_MONSTER_COUNT_CHANGED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TOWN_GARRISON_CHANGED,
  APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED
])
