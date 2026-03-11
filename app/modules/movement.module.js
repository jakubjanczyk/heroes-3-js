import { createMovementSystem as createMovementSystemDefault } from '../../game/systems/movement-system.js';
import { sameTile } from '../../engine/tile-utils.js';
import { findHero } from '../../game/domain/entity-queries.js';
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
  { on, emit, config },
  {
    createMovementSystem = createMovementSystemDefault
  } = {}
) => {
  const stepDelayMs = config?.movementStepDelayMs ?? 220;
  const movementSleep = typeof config?.movementSleep === 'function' ? config.movementSleep : undefined;

  let movement = null;
  let remainingMovementPoints = Number.POSITIVE_INFINITY;
  let isMoveCommandInProgress = false;
  const blockedResourceEntityIds = new Set();
  let previewTargetTile = null;
  let previewPath = null;
  let isInteractionModalOpen = false;

  on(APP_FACT_WORLD_READY, (event) => {
    const { scenario, map, occupancy } = event.detail;
    const hero = findHero(scenario.entities);
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
      occupancy,
      ...(movementSleep ? { sleep: movementSleep } : {}),
      stepDelayMs,
      getMaxMovableSteps: () => remainingMovementPoints,
      isInteractionBlocked: (entity) =>
        Boolean(entity && blockedResourceEntityIds.has(entity.id)),
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
  });

  on(APP_FACT_MOVEMENT_POINTS_CHANGED, (event) => {
    const value = Number(event.detail.value);
    remainingMovementPoints = Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  });

  on(APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED, (event) => {
    blockedResourceEntityIds.clear();
    for (const entityId of event.detail?.entityIds ?? []) {
      if (typeof entityId === 'string' && entityId.length > 0) {
        blockedResourceEntityIds.add(entityId);
      }
    }
  });

  on(APP_UI_PREVIEW_UPDATED, (event) => {
    previewTargetTile = event.detail?.targetTile ?? null;
    previewPath = event.detail?.path ?? null;
  });

  on(APP_UI_INTERACTION_MODAL_OPENED, () => {
    isInteractionModalOpen = true;
  });

  on(APP_UI_INTERACTION_MODAL_CLOSED, () => {
    isInteractionModalOpen = false;
  });

  on(APP_COMMAND_TILE_CLICKED, (event) => {
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
  });

  on(APP_COMMAND_MOVE_REQUESTED, (event) => {
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
});
