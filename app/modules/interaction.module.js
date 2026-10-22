import { createEntityBehaviors } from '../../game/domain/entity-behaviors.js'
import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_INTERACTIONS_QUEUED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../events.js'
import { getInteractionEffects } from './shared/interaction-outcomes.js'
import { defineModule } from './shared/module-runtime.js'

function resumeEventTypes(config) {
  const type = config?.content?.queuedInteractionsResumeOn
  return type ? [type] : []
}

export const registerInteractionModule = defineModule(
  ({ emit, config }) => {
    const entityBehaviors = createEntityBehaviors(config?.content?.entityBehaviors)
    let entitiesById = new Map()
    let definitions = {}
    let factsOnModalClosed = []
    // For a modal that asks the player to choose: what to emit for each choice, before
    // factsOnModalClosed.
    let eventsByChoice = {}
    let queuedInteractions = []
    let isRestoring = false

    function emitFacts(facts) {
      for (const fact of facts ?? []) {
        emit(fact.type, fact.detail)
      }
    }

    function resolve(interaction, fallbackTile) {
      const entity = entitiesById.get(interaction?.entityId)
      if (!entity) {
        return
      }

      const outcome = entityBehaviors.resolveArrivalOutcome({
        entity,
        definitions,
        tile: interaction.targetTile ?? fallbackTile
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
            queuedInteractions = []
          }
        },
        { type: APP_UI_RESTORE_STARTED, handler: () => (isRestoring = true) },
        { type: APP_UI_RESTORE_COMPLETED, handler: () => (isRestoring = false) },
        {
          type: APP_FACT_MOVE_FINISHED,
          handler: (event) => {
            const { interaction, queuedInteractions: queued = [], targetTile } = event.detail
            queuedInteractions = []
            if (queued.length > 0) {
              emit(APP_FACT_INTERACTIONS_QUEUED, { interactions: queued })
            }
            resolve(interaction, targetTile)
          }
        },
        {
          type: APP_FACT_INTERACTIONS_QUEUED,
          handler: (event) => {
            queuedInteractions = [...event.detail.interactions]
          }
        },
        // The facts the next interaction emits are in the saved log, so a restore only skips it.
        ...resumeEventTypes(config).map((type) => ({
          type,
          handler: () => {
            const [next, ...rest] = queuedInteractions
            queuedInteractions = rest
            if (next && !isRestoring) {
              resolve(next)
            }
          }
        })),
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
    consumes: (config) => [
      APP_FACT_WORLD_READY,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED,
      APP_FACT_MOVE_FINISHED,
      APP_FACT_INTERACTIONS_QUEUED,
      ...resumeEventTypes(config),
      APP_UI_INTERACTION_MODAL_CLOSED
    ],
    produces: (config) => [
      APP_UI_INTERACTION_MODAL_OPENED,
      APP_FACT_ENTITY_REMOVED,
      APP_FACT_INTERACTIONS_QUEUED,
      ...(config?.content?.outcomeEvents ?? [])
    ]
  }
)
