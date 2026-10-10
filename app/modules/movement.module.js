import { createMovementSystem as createMovementSystemDefault } from '../../game/systems/movement-system.js';
import { buildArrivalPlan } from '../../game/domain/movement/arrival-plan.js';
import { findHero } from '../../game/domain/entity-queries.js';
import { normalizeMovementPoints } from '../../game/domain/value-objects/movement-points.js';
import {
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
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

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          const { scenario, map, occupancy: worldOccupancy } = event.detail;
          const hero = findHero(scenario.entities);
          heroId = hero?.id ?? null;
          occupancy = worldOccupancy ?? null;

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
        type: APP_COMMAND_MOVE_REQUESTED,
        handler: (event) => {
          if (!movement || isMoveCommandInProgress) {
            return;
          }

          const { targetTile, path } = event.detail;
          const arrivalPlan = buildArrivalPlan({
            occupancy,
            targetTile,
            movingEntityId: heroId
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
    APP_COMMAND_MOVE_REQUESTED
  ],
  produces: [
    APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
    APP_FACT_MOVE_STARTED,
    APP_FACT_HERO_MOVED,
    APP_FACT_MOVE_FINISHED
  ]
});
