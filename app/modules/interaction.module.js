import { createInteractionSystem as createInteractionSystemDefault } from '../../game/systems/interaction-system.js';
import { findHero } from '../../game/domain/entity-queries.js';
import { sameTile } from '../../engine/tile-utils.js';
import { getInteractionOutcomeHandler } from './shared/interaction-outcomes.js';
import {
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_ENTITY_FADE_OUT_REQUESTED,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_RESOURCE_COLLECTION_STARTED
} from '../events.js';
import { defineModule } from './shared/module-runtime.js';

export const registerInteractionModule = defineModule((
  { emit, config },
  {
    createInteractionSystem = createInteractionSystemDefault
  } = {}
) => {
  const sleep =
    typeof config?.interactionSleep === 'function'
      ? config.interactionSleep
      : (ms) =>
          new Promise((resolve) => {
            setTimeout(resolve, ms);
          });
  const monsterDefeatFadeOutMs = config?.monsterDefeatFadeOutMs ?? 220;
  const resourceCollectFadeOutMs = config?.resourceCollectFadeOutMs ?? 220;
  const handlerConfig = Object.freeze({
    monsterDefeatFadeOutMs,
    resourceCollectFadeOutMs
  });

  let hero = null;
  let entities = null;
  let interactions = null;
  let pendingModalOutcome = null;
  const pendingOutcomeEntityIds = new Set();

  async function requestEntityFadeOut({ entityId, entityKind, durationMs }) {
    if (durationMs <= 0) {
      return;
    }

    emit(APP_UI_ENTITY_FADE_OUT_REQUESTED, {
      entityId,
      entityKind,
      durationMs
    });
    await sleep(durationMs);
  }

  function emitEvents(events) {
    for (const event of events ?? []) {
      if (!event || typeof event.type !== 'string') {
        continue;
      }

      emit(event.type, event.detail ?? {});
    }
  }

  async function applyOutcomeEffects({ effects, outcome }) {
    if (!effects) {
      return;
    }

    emitEvents(effects.preEvents);

    if (effects.fadeOut) {
      await requestEntityFadeOut(effects.fadeOut);
    }

    let didFinalize = true;
    if (typeof effects.finalizeMethod === 'string') {
      const finalizeMethod = interactions?.[effects.finalizeMethod];
      didFinalize =
        typeof finalizeMethod === 'function'
          ? Boolean(finalizeMethod({ entityId: outcome?.entityId }))
          : false;
    }

    if (didFinalize) {
      emitEvents(effects.postEvents);
    }
  }

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          const world = event.detail;
          entities = world.scenario.entities;
          hero = findHero(entities);
          interactions = createInteractionSystem({
            entities,
            definitions: world.definitions
          });
        }
      },
      {
        type: APP_FACT_MOVE_FINISHED,
        handler: (event) => {
          if (!interactions || !hero) {
            return;
          }

          const destinationTile = event.detail.targetTile;
          if (!destinationTile) {
            return;
          }

          const interactionKind = event.detail.interaction?.kind;
          const didTriggerArrivalInteraction =
            typeof interactionKind === 'string' && interactionKind.length > 0;
          if (!didTriggerArrivalInteraction && !sameTile(hero.tile, destinationTile)) {
            return;
          }

          const outcome = interactions.resolveArrivalAtDestination({
            destinationTile,
            arrivingEntityId: hero.id
          });
          if (!outcome) {
            return;
          }

          if (typeof outcome.entityId === 'string' && pendingOutcomeEntityIds.has(outcome.entityId)) {
            return;
          }

          const handler = getInteractionOutcomeHandler(outcome.kind);
          if (!handler) {
            return;
          }

          if (typeof outcome.entityId === 'string') {
            pendingOutcomeEntityIds.add(outcome.entityId);
          }

          const effects = handler.onOutcome({
            outcome,
            config: handlerConfig
          });
          if (effects?.pendingModalOutcome) {
            pendingModalOutcome = effects.pendingModalOutcome;
          }

          void (async () => {
            try {
              await applyOutcomeEffects({ effects, outcome });
            } finally {
              if (!handler.opensModal && typeof outcome.entityId === 'string') {
                pendingOutcomeEntityIds.delete(outcome.entityId);
              }
            }
          })();
        }
      },
      {
        type: APP_UI_INTERACTION_MODAL_CLOSED,
        handler: () => {
          if (!interactions || !pendingModalOutcome) {
            return;
          }

          const outcome = pendingModalOutcome;
          pendingModalOutcome = null;

          if (typeof outcome.entityId === 'string') {
            pendingOutcomeEntityIds.delete(outcome.entityId);
          }

          const handler = getInteractionOutcomeHandler(outcome.kind);
          if (!handler?.onModalClosed) {
            return;
          }

          const effects = handler.onModalClosed({
            outcome,
            config: handlerConfig
          });

          void (async () => {
            await applyOutcomeEffects({ effects, outcome });
          })();
        }
      }
    ]
  };
}, {
  id: 'interaction',
  phase: 'domain',
  consumes: [
    APP_FACT_WORLD_READY,
    APP_FACT_MOVE_FINISHED,
    APP_UI_INTERACTION_MODAL_CLOSED
  ],
  produces: [
    APP_UI_ENTITY_FADE_OUT_REQUESTED,
    APP_UI_INTERACTION_MODAL_OPENED,
    APP_UI_RESOURCE_COLLECTION_STARTED,
    APP_FACT_MONSTER_DEFEATED,
    APP_FACT_RESOURCE_COLLECTED,
    APP_FACT_TOWN_VISITED
  ]
});
