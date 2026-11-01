import { BATTLE_DEFENDER_ARTIFACT_GUARDS } from '../../game/heroes/artifacts.js'
import {
  INTERACTION_OUTCOME_KIND_ARTIFACT_PICKED_UP,
  INTERACTION_OUTCOME_KIND_BATTLE_STARTED,
  INTERACTION_OUTCOME_KIND_BONUS_OBJECT_VISITED,
  INTERACTION_OUTCOME_KIND_DWELLING_VISITED,
  INTERACTION_OUTCOME_KIND_HEROES_MET,
  INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
  INTERACTION_OUTCOME_KIND_RESOURCE_GENERATOR_VISITED,
  INTERACTION_OUTCOME_KIND_TOWN_VISITED,
  INTERACTION_OUTCOME_KIND_TREASURE_CHEST_FOUND
} from '../../game/heroes/interaction-kinds.js'
import { BATTLE_DEFENDER_DWELLING_GUARDS } from '../../game/heroes/map-dwellings.js'
import { describeMonsterGroupInText } from '../../game/heroes/monster-count.js'
import { TREASURE_CHEST_GOLD_RESOURCE } from '../../game/heroes/treasure-chest.js'
import {
  APP_COMMAND_DWELLING_RECRUIT_REQUESTED,
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_COMMAND_HEROES_SPELLS_TEACH_REQUESTED,
  APP_COMMAND_MAP_OBJECT_VISIT_REQUESTED,
  APP_FACT_ARTIFACT_PICKED_UP,
  APP_FACT_BATTLE_STARTED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_TREASURE_CHEST_OPENED,
  APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED,
  APP_UI_HERO_EXCHANGE_OPEN_REQUESTED
} from '../events.js'
import { getChestExperiencePicture, getChestGoldPicture } from './presentation/adventure-sprites.js'

// The Heroes 3 chest dialog's title and text.
const TREASURE_CHEST_TITLE = 'Chest'
const TREASURE_CHEST_MESSAGE =
  'After scouring the area, you fall upon a hidden treasure cache. You may take the gold or ' +
  'distribute it to the peasants for experience. Which do you choose?'

function findArtifactInChest(outcome, opened) {
  return {
    modal: {
      interactionKind: outcome.kind,
      entityId: outcome.entityId,
      entityType: outcome.entityType,
      title: TREASURE_CHEST_TITLE,
      message: `After scouring the area, you fall upon a hidden chest, containing the ancient artifact '${outcome.artifactName}'.`
    },
    factsOnModalClosed: [opened({ choice: 'artifact', artifact: outcome.artifact })]
  }
}

function askToFightGuards(outcome) {
  const { creature, count } = outcome.guards
  const guards = describeMonsterGroupInText(count, outcome.creaturePlural)
  return {
    modal: {
      interactionKind: outcome.kind,
      entityId: outcome.entityId,
      entityType: outcome.entityType,
      title: null,
      message: `Much to your dismay, the ${outcome.dwellingName} is guarded by ${guards}. Do you wish to fight the guards?`,
      isQuestion: true
    },
    factsOnModalClosed: [],
    eventsByChoice: {
      yes: [
        {
          type: APP_FACT_BATTLE_STARTED,
          detail: {
            ...toEntityFactDetail(outcome),
            defender: { kind: BATTLE_DEFENDER_DWELLING_GUARDS, creature, count }
          }
        }
      ]
    }
  }
}

const GUARDED_ARTIFACT_MESSAGE =
  "Through a clearing you observe an ancient artifact. Unfortunately, it's guarded. " +
  'Do you want to fight the guards for the artifact?'

function askToFightArtifactGuards(outcome) {
  return {
    modal: {
      interactionKind: outcome.kind,
      entityId: outcome.entityId,
      entityType: outcome.entityType,
      title: 'Artifact',
      message: GUARDED_ARTIFACT_MESSAGE,
      isQuestion: true
    },
    factsOnModalClosed: [],
    eventsByChoice: {
      yes: [
        {
          type: APP_FACT_BATTLE_STARTED,
          detail: {
            ...toEntityFactDetail(outcome),
            defender: { kind: BATTLE_DEFENDER_ARTIFACT_GUARDS, stacks: outcome.guards }
          }
        }
      ]
    }
  }
}

const FULL_LOAD_MESSAGE = 'You cannot pick up this artifact, you already have a full load!'

function tellBackpackIsFull(outcome) {
  return {
    modal: {
      interactionKind: outcome.kind,
      entityId: outcome.entityId,
      entityType: outcome.entityType,
      title: null,
      message: FULL_LOAD_MESSAGE
    },
    factsOnModalClosed: []
  }
}

function pickUpArtifact(outcome) {
  if (outcome.guards) {
    return askToFightArtifactGuards(outcome)
  }
  if (outcome.cannotCarry) {
    return tellBackpackIsFull(outcome)
  }
  return {
    facts: [
      {
        type: APP_FACT_ARTIFACT_PICKED_UP,
        detail: { ...toEntityFactDetail(outcome), artifact: outcome.entityType }
      }
    ]
  }
}

function toEntityFactDetail(outcome) {
  return {
    heroId: outcome.heroId,
    entityId: outcome.entityId,
    entityType: outcome.entityType,
    tile: outcome.tile
  }
}

// Every event the outcomes below can emit, declared so the interaction module may emit them.
export const heroesOutcomeEvents = Object.freeze([
  APP_FACT_ARTIFACT_PICKED_UP,
  APP_COMMAND_DWELLING_RECRUIT_REQUESTED,
  APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED,
  APP_FACT_BATTLE_STARTED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_TREASURE_CHEST_OPENED,
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_COMMAND_MAP_OBJECT_VISIT_REQUESTED,
  APP_UI_HERO_EXCHANGE_OPEN_REQUESTED,
  APP_COMMAND_HEROES_SPELLS_TEACH_REQUESTED
])

export const heroesOutcomeEffects = Object.freeze({
  [INTERACTION_OUTCOME_KIND_ARTIFACT_PICKED_UP]: pickUpArtifact,
  [INTERACTION_OUTCOME_KIND_BATTLE_STARTED]: (outcome) => ({
    facts: [
      {
        type: APP_FACT_BATTLE_STARTED,
        detail: { ...toEntityFactDetail(outcome), count: outcome.count, stacks: outcome.stacks }
      }
    ]
  }),
  [INTERACTION_OUTCOME_KIND_DWELLING_VISITED]: (outcome) => {
    const dwelling = { heroId: outcome.heroId, entityId: outcome.entityId }
    if (outcome.guards) {
      return askToFightGuards(outcome)
    }

    if (!outcome.isFree) {
      return { facts: [{ type: APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED, detail: dwelling }] }
    }

    return {
      modal: {
        interactionKind: outcome.kind,
        entityId: outcome.entityId,
        entityType: outcome.entityType,
        title: outcome.dwellingName,
        message: `Would you like to recruit ${outcome.creaturePlural}?`,
        isQuestion: true
      },
      factsOnModalClosed: [],
      eventsByChoice: {
        yes: [{ type: APP_COMMAND_DWELLING_RECRUIT_REQUESTED, detail: dwelling }]
      }
    }
  },
  [INTERACTION_OUTCOME_KIND_HEROES_MET]: (outcome) => ({
    facts: [
      {
        type: APP_UI_HERO_EXCHANGE_OPEN_REQUESTED,
        detail: { heroId: outcome.heroId, otherHeroId: outcome.entityId }
      },
      {
        type: APP_COMMAND_HEROES_SPELLS_TEACH_REQUESTED,
        detail: { heroIds: { left: outcome.heroId, right: outcome.entityId } }
      }
    ]
  }),
  [INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED]: (outcome) => ({
    facts: [
      {
        type: APP_FACT_RESOURCE_COLLECTED,
        detail: { ...toEntityFactDetail(outcome), amount: outcome.amount }
      }
    ]
  }),
  [INTERACTION_OUTCOME_KIND_RESOURCE_GENERATOR_VISITED]: (outcome) => ({
    facts: [
      {
        type: APP_COMMAND_MAP_OBJECT_VISIT_REQUESTED,
        detail: { heroId: outcome.heroId, entityId: outcome.entityId }
      }
    ]
  }),
  [INTERACTION_OUTCOME_KIND_BONUS_OBJECT_VISITED]: (outcome) => ({
    facts: [
      {
        type: APP_COMMAND_MAP_OBJECT_VISIT_REQUESTED,
        detail: { heroId: outcome.heroId, entityId: outcome.entityId }
      }
    ]
  }),
  [INTERACTION_OUTCOME_KIND_TOWN_VISITED]: (outcome) => ({
    facts: [{ type: APP_FACT_TOWN_VISITED, detail: toEntityFactDetail(outcome) }]
  }),
  // The player picks the gold or the experience; nothing happens until they confirm with OK.
  [INTERACTION_OUTCOME_KIND_TREASURE_CHEST_FOUND]: (outcome) => {
    const opened = (detail) => ({
      type: APP_FACT_TREASURE_CHEST_OPENED,
      detail: { ...toEntityFactDetail(outcome), ...detail }
    })
    if (outcome.artifact) {
      return findArtifactInChest(outcome, opened)
    }
    if (!outcome.rewards) {
      return null
    }

    const { gold, experience } = outcome.rewards
    return {
      modal: {
        interactionKind: outcome.kind,
        entityId: outcome.entityId,
        entityType: outcome.entityType,
        title: TREASURE_CHEST_TITLE,
        message: TREASURE_CHEST_MESSAGE,
        choices: [
          {
            id: 'gold',
            amount: gold,
            label: `${gold} gold`,
            picture: getChestGoldPicture()
          },
          {
            id: 'experience',
            amount: experience,
            label: `${experience} experience`,
            picture: getChestExperiencePicture()
          }
        ]
      },
      factsOnModalClosed: [],
      eventsByChoice: {
        gold: [opened({ choice: 'gold', resources: { [TREASURE_CHEST_GOLD_RESOURCE]: gold } })],
        experience: [
          opened({ choice: 'experience' }),
          {
            type: APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
            detail: { heroId: outcome.heroId, amount: experience }
          }
        ]
      }
    }
  }
})
