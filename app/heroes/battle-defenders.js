import { BATTLE_DEFENDER_ARTIFACT_GUARDS, hasFullBackpack } from '../../game/heroes/artifacts.js'
import { getArmyAfterBattle } from '../../game/heroes/battle.js'
import { describeStack } from '../../game/heroes/hero-army.js'
import { BATTLE_DEFENDER_DWELLING_GUARDS } from '../../game/heroes/map-dwellings.js'
import { splitMonster } from '../../game/heroes/monster-stacks.js'
import { heroById } from '../../game/heroes/state/hero-details.js'
import { builtIn } from '../../game/heroes/state/towns.js'
import {
  BATTLE_DEFENDER_TOWN_GARRISON,
  townCaptureExperience
} from '../../game/heroes/town-garrison.js'
import { heroOwner } from '../../game/state/queries.js'
import {
  APP_FACT_ARTIFACT_GUARDS_CHANGED,
  APP_FACT_ARTIFACT_PICKED_UP,
  APP_FACT_DWELLING_FLAGGED,
  APP_FACT_DWELLING_GUARDS_CHANGED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_MONSTER_COUNT_CHANGED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TOWN_GARRISON_CHANGED,
  APP_FACT_TOWN_VISITED,
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

// The results window names a garrison by its strongest creature. Beating it takes the town, and
// the hero stays in it.
const townGarrison = {
  named: ({ defender: { stacks } }, definitions) =>
    stacks
      .filter(Boolean)
      .reduce((strongest, stack) =>
        aiValueOf(stack, definitions) > aiValueOf(strongest, definitions) ? stack : strongest
      ),
  side: ({ started }) => ({ army: started.defender.stacks }),
  surrenderRefusal: 'There is no hero to surrender to',
  bonusExperience: ({ state, started }) =>
    townCaptureExperience(builtIn(state.get(), started.entityId)),
  win({ emit, state, heroId, started: { entityId } }) {
    emit(APP_FACT_TOWN_GARRISON_CHANGED, { entityId, garrison: [] })
    emit(APP_FACT_TOWN_CAPTURED, { entityId, owner: heroOwner(state.get(), heroId) })
  },
  afterWin({ emit, heroId, started }) {
    const { entityId, entityType, tile } = started
    emit(APP_FACT_TOWN_VISITED, { heroId, entityId, entityType, tile })
  },
  lose({ emit, battle, started: { entityId, defender } }) {
    const garrison = getArmyAfterBattle(battle, 'defender', defender.stacks)
    emit(APP_FACT_TOWN_GARRISON_CHANGED, { entityId, garrison })
  }
}

const aiValueOf = ({ creature }, definitions) => definitions?.monsters?.[creature]?.aiValue ?? 0

const defenders = {
  [BATTLE_DEFENDER_DWELLING_GUARDS]: dwellingGuards,
  [BATTLE_DEFENDER_ARTIFACT_GUARDS]: artifactGuards,
  [BATTLE_DEFENDER_TOWN_GARRISON]: townGarrison
}

export const battleDefenderOf = (started) => defenders[started.defender?.kind] ?? monster

export function battleDefenderName({ started, state, definitions }) {
  const defender = battleDefenderOf(started)
  return (
    defender.name?.({ started, state }) ??
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
  APP_FACT_MONSTER_COUNT_CHANGED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TOWN_GARRISON_CHANGED,
  APP_FACT_TOWN_VISITED,
  APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED
])
