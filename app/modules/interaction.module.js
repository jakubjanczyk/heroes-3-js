import { createInteractionSystem as createInteractionSystemDefault } from '../../game/systems/interaction-system.js';
import { findHero } from '../../game/domain/entity-queries.js';
import { sameTile } from '../../engine/tile-utils.js';
import { getInteractionOutcomeHandler } from './shared/interaction-outcomes.js';
import {
  APP_FACT_MOVE_FINISHED,
  APP_FACT_WORLD_READY,
  APP_UI_ENTITY_FADE_OUT_REQUESTED,
  APP_UI_INTERACTION_MODAL_CLOSED
} from '../events.js';
import { defineModule } from './shared/module-runtime.js';

export const registerInteractionModule = defineModule((
  { emit, bus, config },
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

          const handlerConfig = {
            monsterDefeatFadeOutMs,
            resourceCollectFadeOutMs
          };

          const handlerResult = handler.onOutcome({
            bus,
            interactions,
            outcome,
            requestEntityFadeOut,
            config: handlerConfig
          });

          const isPromiseLike =
            Boolean(handlerResult) &&
            (typeof handlerResult === 'object' || typeof handlerResult === 'function') &&
            typeof handlerResult.then === 'function';

          if (!isPromiseLike) {
            if (handlerResult?.pendingModalOutcome) {
              pendingModalOutcome = handlerResult.pendingModalOutcome;
            }
            if (!handler.opensModal && typeof outcome.entityId === 'string') {
              pendingOutcomeEntityIds.delete(outcome.entityId);
            }
            return;
          }

          void (async () => {
            try {
              const result = await handlerResult;
              if (result?.pendingModalOutcome) {
                pendingModalOutcome = result.pendingModalOutcome;
              }
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

          void (async () => {
            await handler.onModalClosed({
              bus,
              interactions,
              outcome,
              requestEntityFadeOut,
              config: {
                monsterDefeatFadeOutMs,
                resourceCollectFadeOutMs
              }
            });
          })();
        }
      }
    ]
  };
});
