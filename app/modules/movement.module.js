import { createMovementSystem as createMovementSystemDefault } from '../../game/systems/movement-system.js';
import { sameTile } from '../../engine/tile-utils.js';
import { buildArrivalPlan } from '../../game/domain/movement/arrival-plan.js';
import { findHero } from '../../game/domain/entity-queries.js';
import { normalizeMovementPoints } from '../../game/domain/value-objects/movement-points.js';
import {
  APP_COMMAND_TILE_CLICKED,
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_PREVIEW_UPDATED,
  APP_FACT_WORLD_READY
} from '../events.js';
import { defineModule } from './shared/module-runtime.js';

export const registerMovementModule = defineModule((
  { emit, config },
  {
    createMovementSystem = createMovementSystemDefault
  } = {}
) => {
  const stepDelayMs = config?.movementStepDelayMs ?? 220;
  const movementSleep = typeof config?.movementSleep === 'function' ? config.movementSleep : undefined;

  let movement = null;
  let occupancy = null;
  let heroId = null;
  let remainingMovementPoints = Number.POSITIVE_INFINITY;
  let isMoveCommandInProgress = false;
  const blockedResourceEntityIds = new Set();
  let previewTargetTile = null;
  let previewPath = null;
  let isInteractionModalOpen = false;

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          const { scenario, map, occupancy: worldOccupancy } = event.detail;
          const hero = findHero(scenario.entities);
          heroId = hero?.id ?? null;
          occupancy = worldOccupancy ?? null;
          blockedResourceEntityIds.clear();
          previewTargetTile = null;
          previewPath = null;
          isInteractionModalOpen = false;

          if (!hero) {
            movement = null;
            return;
          }

          movement = createMovementSystem({
            entities: scenario.entities,
            map,
            occupancy: worldOccupancy,
            ...(movementSleep ? { sleep: movementSleep } : {}),
            stepDelayMs,
            getMaxMovableSteps: () => remainingMovementPoints,
            spendMovementPoints: (amount) => {
              emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, {
                amount
              });
            },
            onMoveStart: ({ targetTile }) => {
              emit(APP_FACT_MOVE_STARTED, {
                targetTile
              });
            },
            onMoveFinish: ({ targetTile, interaction }) => {
              const detail = {
                moved: true,
                targetTile
              };
              if (interaction) {
                detail.interaction = interaction;
              }

              emit(APP_FACT_MOVE_FINISHED, detail);
            },
            onStep: ({ hero: steppedHero, from, to }) => {
              const heroId = steppedHero?.id;
              if (typeof heroId !== 'string' || heroId.length === 0) {
                return;
              }

              emit(APP_FACT_HERO_MOVED, {
                heroId,
                from,
                to
              });
            }
          });
        }
      },
      {
        type: APP_FACT_MOVEMENT_POINTS_CHANGED,
        handler: (event) => {
          remainingMovementPoints =
            normalizeMovementPoints(event.detail?.value, {
              min: 0,
              fallback: Number.POSITIVE_INFINITY
            }) ?? Number.POSITIVE_INFINITY;
        }
      },
      {
        type: APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
        handler: (event) => {
          blockedResourceEntityIds.clear();
          for (const entityId of event.detail?.entityIds ?? []) {
            if (typeof entityId === 'string' && entityId.length > 0) {
              blockedResourceEntityIds.add(entityId);
            }
          }
        }
      },
      {
        type: APP_UI_PREVIEW_UPDATED,
        handler: (event) => {
          previewTargetTile = event.detail?.targetTile ?? null;
          previewPath = event.detail?.path ?? null;
        }
      },
      {
        type: APP_UI_INTERACTION_MODAL_OPENED,
        handler: () => {
          isInteractionModalOpen = true;
        }
      },
      {
        type: APP_UI_INTERACTION_MODAL_CLOSED,
        handler: () => {
          isInteractionModalOpen = false;
        }
      },
      {
        type: APP_COMMAND_TILE_CLICKED,
        handler: (event) => {
          if (!movement || isMoveCommandInProgress || isInteractionModalOpen) {
            return;
          }

          if (!previewTargetTile || !Array.isArray(previewPath) || previewPath.length < 2) {
            return;
          }

          if (remainingMovementPoints < 1) {
            return;
          }

          const tile = event.detail?.tile;
          if (!tile || !sameTile(previewTargetTile, tile)) {
            return;
          }

          emit(APP_COMMAND_MOVE_REQUESTED, {
            targetTile: tile,
            path: previewPath
          });
        }
      },
      {
        type: APP_COMMAND_MOVE_REQUESTED,
        handler: (event) => {
          if (!movement || isMoveCommandInProgress) {
            return;
          }

          const { targetTile, path } = event.detail;
          const arrivalPlan = buildArrivalPlan({
            occupancy,
            targetTile,
            movingEntityId: heroId,
            isInteractionBlocked: (entity) =>
              Boolean(entity && blockedResourceEntityIds.has(entity.id))
          });

          isMoveCommandInProgress = true;

          void (async () => {
            try {
              await movement.moveHeroTo(targetTile, { path, arrivalPlan });
            } finally {
              isMoveCommandInProgress = false;
            }
          })();
        }
      }
    ]
  };
}, {
  id: 'movement',
  phase: 'domain',
  consumes: [
    APP_FACT_WORLD_READY,
    APP_FACT_MOVEMENT_POINTS_CHANGED,
    APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED,
    APP_UI_PREVIEW_UPDATED,
    APP_UI_INTERACTION_MODAL_OPENED,
    APP_UI_INTERACTION_MODAL_CLOSED,
    APP_COMMAND_TILE_CLICKED,
    APP_COMMAND_MOVE_REQUESTED
  ],
  produces: [
    APP_COMMAND_MOVE_REQUESTED,
    APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
    APP_FACT_MOVE_STARTED,
    APP_FACT_HERO_MOVED,
    APP_FACT_MOVE_FINISHED
  ]
});
