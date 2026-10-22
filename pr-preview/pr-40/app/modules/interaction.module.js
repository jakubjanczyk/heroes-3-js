import { createEntityBehaviors } from '../../game/domain/entity-behaviors.js'
import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED
} from '../events.js'
import { getInteractionEffects } from './shared/interaction-outcomes.js'
import { defineModule } from './shared/module-runtime.js'

export const registerInteractionModule = defineModule(
  ({ emit, config }) => {
    const entityBehaviors = createEntityBehaviors(config?.content?.entityBehaviors)
    let entitiesById = new Map()
    let definitions = {}
    let factsOnModalClosed = []
    // For a modal that asks the player to choose: what to emit for each choice, before
    // factsOnModalClosed.
    let eventsByChoice = {}

    function emitFacts(facts) {
      for (const fact of facts ?? []) {
        emit(fact.type, fact.detail)
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const world = event.detail
            entitiesById = new Map(world.scenario.entities.map((entity) => [entity.id, entity]))
            definitions = world.definitions ?? {}
            factsOnModalClosed = []
            eventsByChoice = {}
          }
        },
        {
          type: APP_FACT_MOVE_FINISHED,
          handler: (event) => {
            const interaction = event.detail.interaction
            const entity = entitiesById.get(interaction?.entityId)
            if (!entity) {
              return
            }

            const outcome = entityBehaviors.resolveArrivalOutcome({
              entity,
              definitions,
              tile: interaction.targetTile ?? event.detail.targetTile
            })
            const effects = getInteractionEffects(outcome, config?.content?.outcomeEffects)
            if (!effects) {
              return
            }

            emitFacts(effects.facts)

            if (effects.modal) {
              factsOnModalClosed = effects.factsOnModalClosed ?? []
              eventsByChoice = effects.eventsByChoice ?? {}
              emit(APP_UI_INTERACTION_MODAL_OPENED, effects.modal)
            }
          }
        },
        {
          type: APP_UI_INTERACTION_MODAL_CLOSED,
          handler: (event) => {
            const facts = [...(eventsByChoice[event.detail?.choice] ?? []), ...factsOnModalClosed]
            factsOnModalClosed = []
            eventsByChoice = {}
            emitFacts(facts)
          }
        }
      ]
    }
  },
  {
    id: 'interaction',
    phase: 'domain',
    consumes: [APP_FACT_WORLD_READY, APP_FACT_MOVE_FINISHED, APP_UI_INTERACTION_MODAL_CLOSED],
    produces: (config) => [
      APP_UI_INTERACTION_MODAL_OPENED,
      APP_FACT_ENTITY_REMOVED,
      ...(config?.content?.outcomeEvents ?? [])
    ]
  }
)
