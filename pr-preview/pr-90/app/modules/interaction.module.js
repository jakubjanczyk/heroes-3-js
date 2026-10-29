import { createEntityBehaviors } from '../../game/domain/entity-behaviors.js'
import { firstHeroIdOf, heroEntity, viewingPlayer } from '../../game/state/queries.js'
import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_INTERACTION_REACHED,
  APP_FACT_INTERACTIONS_QUEUED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_NOTICE_OPENED,
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
  ({ emit, config, state }) => {
    const entityBehaviors = createEntityBehaviors(config?.content?.entityBehaviors)
    let entitiesById = new Map()
    let definitions = {}
    let factsOnModalClosed = []
    // For a modal that asks the player to choose: what to emit for each choice, before
    // factsOnModalClosed.
    let eventsByChoice = {}
    let queuedInteractions = []
    let interactingHeroId = null
    let isNextInteractionDue = false
    let openModalCount = 0
    let isRestoring = false

    function emitFacts(facts) {
      for (const fact of facts ?? []) {
        emit(fact.type, fact.detail)
      }
    }

    function resolve(interaction, fallbackTile) {
      const entity =
        entitiesById.get(interaction?.entityId) ?? heroEntity(state.get(), interaction?.entityId)
      if (!entity) {
        return
      }

      const outcome = {
        ...entityBehaviors.resolveArrivalOutcome({
          entity,
          definitions,
          tile: interaction.targetTile ?? fallbackTile,
          state: state.get(),
          heroId: interactingHeroId
        }),
        heroId: interactingHeroId
      }
      const effects = getInteractionEffects(outcome, config?.content?.outcomeEffects)
      emitFacts(effects?.facts)

      if (effects?.modal) {
        factsOnModalClosed = effects.factsOnModalClosed ?? []
        eventsByChoice = effects.eventsByChoice ?? {}
        emit(APP_UI_INTERACTION_MODAL_OPENED, effects.modal)
      }
      emit(APP_FACT_INTERACTION_REACHED, {
        kind: interaction.kind,
        entityId: entity.id,
        heroId: interactingHeroId
      })
    }

    // The next queued interaction waits for every popup to close, e.g. a level-up won in the
    // battle before it. The queue left after it is saved first, so a restore knows it happened.
    function resolveNextWhenFree() {
      if (!isNextInteractionDue || openModalCount > 0 || isRestoring) {
        return
      }

      isNextInteractionDue = false
      const [next, ...rest] = queuedInteractions
      emit(APP_FACT_INTERACTIONS_QUEUED, { heroId: interactingHeroId, interactions: rest })
      resolve(next)
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
            // Queued interactions saved before they named their hero were the only hero's.
            interactingHeroId = firstHeroIdOf(state.get(), viewingPlayer(state.get()))
            isNextInteractionDue = false
            openModalCount = 0
          }
        },
        { type: APP_UI_RESTORE_STARTED, handler: () => (isRestoring = true) },
        {
          type: APP_UI_RESTORE_COMPLETED,
          handler: () => {
            isRestoring = false
            resolveNextWhenFree()
          }
        },
        {
          type: APP_FACT_MOVE_FINISHED,
          handler: (event) => {
            const {
              heroId,
              interaction,
              queuedInteractions: queued = [],
              targetTile
            } = event.detail
            queuedInteractions = []
            interactingHeroId = heroId
            if (queued.length > 0) {
              emit(APP_FACT_INTERACTIONS_QUEUED, { heroId, interactions: queued })
            }
            resolve(interaction, targetTile)
          }
        },
        {
          type: APP_FACT_INTERACTIONS_QUEUED,
          handler: (event) => {
            queuedInteractions = [...event.detail.interactions]
            interactingHeroId = event.detail.heroId ?? interactingHeroId
            isNextInteractionDue = false
          }
        },
        // What the resume event sets off (a level-up, ...) runs first.
        ...resumeEventTypes(config).map((type) => ({
          type,
          handler: () => {
            isNextInteractionDue = queuedInteractions.length > 0
            queueMicrotask(resolveNextWhenFree)
          }
        })),
        { type: APP_UI_INTERACTION_MODAL_OPENED, handler: () => (openModalCount += 1) },
        { type: APP_UI_NOTICE_OPENED, handler: () => (openModalCount += 1) },
        {
          type: APP_UI_INTERACTION_MODAL_CLOSED,
          handler: (event) => {
            openModalCount = Math.max(0, openModalCount - 1)
            const facts = [...(eventsByChoice[event.detail?.choice] ?? []), ...factsOnModalClosed]
            factsOnModalClosed = []
            eventsByChoice = {}
            emitFacts(facts)
            resolveNextWhenFree()
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
      APP_UI_INTERACTION_MODAL_OPENED,
      APP_UI_NOTICE_OPENED,
      APP_UI_INTERACTION_MODAL_CLOSED
    ],
    produces: (config) => [
      APP_UI_INTERACTION_MODAL_OPENED,
      APP_FACT_ENTITY_REMOVED,
      APP_FACT_INTERACTIONS_QUEUED,
      APP_FACT_INTERACTION_REACHED,
      ...(config?.content?.outcomeEvents ?? [])
    ]
  }
)
