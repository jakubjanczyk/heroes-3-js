import { createMovementSystem as createMovementSystemDefault } from '../../game/systems/movement-system.js';
import {
  APP_COMMAND_MOVE_REQUESTED,
  APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_WORLD_READY
} from '../events.js';

export function registerMovementModule(
  { bus, config },
  {
    createMovementSystem = createMovementSystemDefault
  } = {}
) {
  const stepDelayMs = config?.movementStepDelayMs ?? 220;
  const movementSleep = typeof config?.movementSleep === 'function' ? config.movementSleep : undefined;

  let movement = null;
  let remainingMovementPoints = Number.POSITIVE_INFINITY;
  let isMoveCommandInProgress = false;

  bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
    const { scenario, map, occupancy } = event.detail;
    const hero = scenario.entities.find((entity) => entity.kind === 'HERO') ?? null;

    if (!hero) {
      movement = null;
      return;
    }

    movement = createMovementSystem({
      entities: scenario.entities,
      map,
      occupancy,
      ...(movementSleep ? { sleep: movementSleep } : {}),
      stepDelayMs,
      getMaxMovableSteps: () => remainingMovementPoints,
      spendMovementPoints: (amount) => {
        bus.emit(APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED, {
          amount
        });
      },
      onMoveStart: ({ targetTile }) => {
        bus.emit(APP_FACT_MOVE_STARTED, {
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

        bus.emit(APP_FACT_MOVE_FINISHED, detail);
      },
      onStep: ({ hero: steppedHero, from, to }) => {
        const heroId = steppedHero?.id;
        if (typeof heroId !== 'string' || heroId.length === 0) {
          return;
        }

        bus.emit(APP_FACT_HERO_MOVED, {
          heroId,
          from,
          to
        });
      }
    });
  });

  bus.addEventListener(APP_FACT_MOVEMENT_POINTS_CHANGED, (event) => {
    const value = Number(event.detail.value);
    remainingMovementPoints = Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  });

  bus.addEventListener(APP_COMMAND_MOVE_REQUESTED, (event) => {
    if (!movement || isMoveCommandInProgress) {
      return;
    }

    const { targetTile, path } = event.detail;
    isMoveCommandInProgress = true;

    void (async () => {
      try {
        await movement.moveHeroTo(targetTile, { path });
      } finally {
        isMoveCommandInProgress = false;
      }
    })();
  });
}
