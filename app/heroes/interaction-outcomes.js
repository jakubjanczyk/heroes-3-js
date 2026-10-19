import {
  INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
  INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
  INTERACTION_OUTCOME_KIND_TOWN_VISITED,
  INTERACTION_OUTCOME_KIND_TREASURE_CHEST_FOUND
} from '../../game/heroes/interaction-kinds.js'
import {
  TREASURE_CHEST_GOLD_RESOURCE,
  TREASURE_CHEST_NAME
} from '../../game/heroes/treasure-chest.js'
import {
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_TREASURE_CHEST_OPENED
} from '../events.js'

const TREASURE_CHEST_MESSAGE =
  'After scouring the area, you fall upon a hidden treasure cache. You may take the gold or ' +
  'distribute the gold to the peasants for experience. Do you wish to keep the gold?'

function toModal(outcome) {
  return {
    interactionKind: outcome.kind,
    entityId: outcome.entityId,
    entityType: outcome.entityType,
    title: outcome.modal.title,
    message: outcome.modal.message
  }
}

function toEntityFactDetail(outcome) {
  return {
    entityId: outcome.entityId,
    entityType: outcome.entityType,
    tile: outcome.tile
  }
}

export const heroesOutcomeEffects = Object.freeze({
  [INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED]: (outcome) => ({
    modal: toModal(outcome),
    factsOnModalClosed: [{ type: APP_FACT_MONSTER_DEFEATED, detail: toEntityFactDetail(outcome) }]
  }),
  [INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED]: (outcome) => ({
    facts: [
      {
        type: APP_FACT_RESOURCE_COLLECTED,
        detail: { ...toEntityFactDetail(outcome), amount: outcome.amount }
      }
    ]
  }),
  [INTERACTION_OUTCOME_KIND_TOWN_VISITED]: (outcome) => ({
    facts: [{ type: APP_FACT_TOWN_VISITED, detail: toEntityFactDetail(outcome) }],
    modal: toModal(outcome)
  }),
  // The player picks the gold or the experience; nothing happens until they confirm with OK.
  [INTERACTION_OUTCOME_KIND_TREASURE_CHEST_FOUND]: (outcome) => {
    const { gold, experience } = outcome.rewards
    const opened = (detail) => ({
      type: APP_FACT_TREASURE_CHEST_OPENED,
      detail: { ...toEntityFactDetail(outcome), ...detail }
    })

    return {
      modal: {
        interactionKind: outcome.kind,
        entityId: outcome.entityId,
        entityType: outcome.entityType,
        title: TREASURE_CHEST_NAME,
        message: TREASURE_CHEST_MESSAGE,
        choices: [
          { id: 'gold', amount: gold, label: `${gold} gold` },
          { id: 'experience', amount: experience, label: `${experience} experience` }
        ]
      },
      factsOnModalClosed: [],
      eventsByChoice: {
        gold: [opened({ choice: 'gold', resources: { [TREASURE_CHEST_GOLD_RESOURCE]: gold } })],
        experience: [
          opened({ choice: 'experience' }),
          { type: APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED, detail: { amount: experience } }
        ]
      }
    }
  }
})
