import { createInteractionSystem as createInteractionSystemDefault } from '../../game/systems/interaction-system.js';
import {
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED
} from '../events.js';

function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
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

  let hero = null;
  let interactions = null;
  let pendingMonsterDefeat = null;

  async function fadeOutMonsterEntity(entityId) {
    if (monsterDefeatFadeOutMs <= 0) {
      return;
    }

    const monsterEl = env?.document?.querySelector?.(`.entity--monster[data-entity-id="${entityId}"]`);
    if (!monsterEl) {
      return;
    }

    monsterEl.classList?.add?.('entity--monster-defeating');
    if (
      typeof monsterEl.className === 'string' &&
      !monsterEl.className.includes('entity--monster-defeating')
    ) {
      monsterEl.className = `${monsterEl.className} entity--monster-defeating`;
    }

    await sleep(monsterDefeatFadeOutMs);
  }

  bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
    const world = event.detail;
    const entities = world.scenario.entities;
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

    const didTriggerMonsterCombat = event.detail.interaction?.kind === 'MONSTER_COMBAT';
    if (!didTriggerMonsterCombat && !sameTile(hero.tile, destinationTile)) {
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
