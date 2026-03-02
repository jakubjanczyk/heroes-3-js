import { createInteractionSystem as createInteractionSystemDefault } from '../../game/systems/interaction-system.js';
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

function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function registerInteractionModule(
  { bus, config },
  {
    createInteractionSystem = createInteractionSystemDefault
  } = {}
) {
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
  let pendingMonsterDefeat = null;
  const pendingResourceCollectionIds = new Set();

  async function requestEntityFadeOut({ entityId, entityKind, durationMs }) {
    if (durationMs <= 0) {
      return;
    }

    bus.emit(APP_UI_ENTITY_FADE_OUT_REQUESTED, {
      entityId,
      entityKind,
      durationMs
    });
    await sleep(durationMs);
  }

  bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
    const world = event.detail;
    entities = world.scenario.entities;
    hero = entities.find((entity) => entity.kind === 'HERO') ?? null;
    interactions = createInteractionSystem({
      entities,
      definitions: world.definitions
    });
  });

  bus.addEventListener(APP_FACT_MOVE_FINISHED, (event) => {
    if (!interactions || !hero) {
      return;
    }

    const destinationTile = event.detail.targetTile;
    if (!destinationTile) {
      return;
    }

    const interactionKind = event.detail.interaction?.kind;
    const didTriggerArrivalInteraction =
      interactionKind === 'MONSTER_COMBAT' ||
      interactionKind === 'RESOURCE_COLLECT' ||
      interactionKind === 'TOWN_VISIT';
    if (!didTriggerArrivalInteraction && !sameTile(hero.tile, destinationTile)) {
      return;
    }

    const outcome = interactions.resolveArrivalAtDestination({ destinationTile });
    if (!outcome) {
      return;
    }

    if (outcome.kind === 'MONSTER_DEFEATED') {
      pendingMonsterDefeat = outcome;
      bus.emit(APP_UI_INTERACTION_MODAL_OPENED, {
        interactionKind: outcome.kind,
        entityId: outcome.entityId,
        entityType: outcome.entityType,
        title: outcome.modal.title,
        message: outcome.modal.message
      });
      return;
    }

    if (outcome.kind === 'RESOURCE_COLLECTED') {
      if (pendingResourceCollectionIds.has(outcome.entityId)) {
        return;
      }

      pendingResourceCollectionIds.add(outcome.entityId);
      bus.emit(APP_UI_RESOURCE_COLLECTION_STARTED, {
        entityId: outcome.entityId,
        entityType: outcome.entityType,
        tile: outcome.tile
      });

      void (async () => {
        try {
          await requestEntityFadeOut({
            entityId: outcome.entityId,
            entityKind: 'RESOURCE',
            durationMs: resourceCollectFadeOutMs
          });

          const didFinalize =
            interactions.finalizeResourceCollection?.({ entityId: outcome.entityId }) ?? false;
          if (!didFinalize) {
            return;
          }

          bus.emit(APP_FACT_RESOURCE_COLLECTED, {
            entityId: outcome.entityId,
            entityType: outcome.entityType,
            amount: outcome.amount,
            tile: outcome.tile
          });
        } finally {
          pendingResourceCollectionIds.delete(outcome.entityId);
        }
      })();
      return;
    }

    if (outcome.kind === 'TOWN_VISITED') {
      bus.emit(APP_UI_INTERACTION_MODAL_OPENED, {
        interactionKind: outcome.kind,
        entityId: outcome.entityId,
        entityType: outcome.entityType,
        title: outcome.modal.title,
        message: outcome.modal.message
      });
      bus.emit(APP_FACT_TOWN_VISITED, {
        entityId: outcome.entityId,
        entityType: outcome.entityType,
        tile: outcome.tile
      });
    }
  });

  bus.addEventListener(APP_UI_INTERACTION_MODAL_CLOSED, () => {
    if (!interactions || !pendingMonsterDefeat) {
      return;
    }

    const outcome = pendingMonsterDefeat;
    pendingMonsterDefeat = null;

    void (async () => {
      if (outcome.kind === 'MONSTER_DEFEATED') {
        await requestEntityFadeOut({
          entityId: outcome.entityId,
          entityKind: 'MONSTER',
          durationMs: monsterDefeatFadeOutMs
        });

        const didFinalize = interactions.finalizeMonsterDefeat({ entityId: outcome.entityId });
        if (!didFinalize) {
          return;
        }

        bus.emit(APP_FACT_MONSTER_DEFEATED, {
          entityId: outcome.entityId,
          entityType: outcome.entityType,
          tile: outcome.tile
        });
      }
    })();
  });
}
