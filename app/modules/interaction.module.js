import { createInteractionSystem as createInteractionSystemDefault } from '../../game/systems/interaction-system.js';
import {
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED
} from '../events.js';

function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

function addEntityStateClass(entityEl, className) {
  entityEl.classList?.add?.(className);
  if (typeof entityEl.className === 'string' && !entityEl.className.includes(className)) {
    entityEl.className = `${entityEl.className} ${className}`;
  }
}

export function registerInteractionModule(
  { bus, env, config },
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

  function forceReflow(element) {
    void element?.offsetWidth;
  }

  async function waitForFadeCompletion(entityEl, durationMs) {
    if (!entityEl || durationMs <= 0) {
      return;
    }

    await new Promise((resolve) => {
      let didFinish = false;

      const finish = () => {
        if (didFinish) {
          return;
        }

        didFinish = true;
        entityEl.removeEventListener?.('transitionend', onTransitionEnd);
        entityEl.removeEventListener?.('animationend', onTransitionEnd);
        resolve();
      };

      const onTransitionEnd = (event) => {
        if (event?.target && event.target !== entityEl) {
          return;
        }

        finish();
      };

      entityEl.addEventListener?.('transitionend', onTransitionEnd);
      entityEl.addEventListener?.('animationend', onTransitionEnd);

      void (async () => {
        await sleep(durationMs);
        finish();
      })();
    });
  }

  async function fadeOutMonsterEntity(entityId) {
    if (monsterDefeatFadeOutMs <= 0) {
      return;
    }

    const monsterEl = env?.document?.querySelector?.(`.entity--monster[data-entity-id="${entityId}"]`);
    if (!monsterEl) {
      return;
    }

    forceReflow(monsterEl);
    addEntityStateClass(monsterEl, 'entity--monster-defeating');
    await waitForFadeCompletion(monsterEl, monsterDefeatFadeOutMs);
  }

  async function fadeOutResourceEntity(entityId) {
    if (resourceCollectFadeOutMs <= 0) {
      return;
    }

    const resourceEl = env?.document?.querySelector?.(
      `.entity--resource[data-entity-id="${entityId}"]`
    );
    if (!resourceEl) {
      return;
    }

    forceReflow(resourceEl);
    addEntityStateClass(resourceEl, 'entity--resource-collecting');
    await waitForFadeCompletion(resourceEl, resourceCollectFadeOutMs);
  }

  bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
    const world = event.detail;
    entities = world.scenario.entities;
    hero = entities.find((entity) => entity.kind === 'HERO') ?? null;
    interactions = createInteractionSystem({
      entities,
      occupancy: world.occupancy,
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
      interactionKind === 'MONSTER_COMBAT' || interactionKind === 'RESOURCE_COLLECT';
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
      const resourceEntity = entities?.find?.((entity) => entity.id === outcome.entityId) ?? null;
      if (resourceEntity) {
        resourceEntity.isCollecting = true;
      }

      void (async () => {
        try {
          await fadeOutResourceEntity(outcome.entityId);
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
        await fadeOutMonsterEntity(outcome.entityId);
        interactions.finalizeMonsterDefeat({ entityId: outcome.entityId });
        bus.emit(APP_FACT_MONSTER_DEFEATED, {
          entityId: outcome.entityId,
          entityType: outcome.entityType,
          tile: outcome.tile
        });
      }
    })();
  });
}
