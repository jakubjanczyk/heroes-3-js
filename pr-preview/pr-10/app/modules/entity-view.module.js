import {renderEntityLayer} from '../../engine/layers/entity-layer.js';
import {setStyleVar} from '../../engine/layers/dom-layer-utils.js';
import {getMapCenteredOrigin, getTileCenter} from '../../engine/layers/layout.js';
import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_MOVED,
  APP_FACT_WORLD_READY,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../events.js';
import {defineModule} from './shared/module-runtime.js';
import {NO_REMOVED_ENTITIES, applyEntityRemoved} from '../../game/domain/removed-entities.js';

export const registerEntityViewModule = defineModule(({ env, config }) => {
  const presentation = config?.content?.entityPresentation;
  const getEntityStyle = presentation?.getEntityStyle ?? (() => null);
  const entityLayer = env.document?.querySelector('.entity-layer');
  const createElement = env.document?.createElement?.bind(env.document);
  const configuredStepDurationMs = Number(config?.movementStepDelayMs ?? 220);
  const heroStepDurationMs = Number.isFinite(configuredStepDurationMs)
    ? Math.max(0, configuredStepDurationMs)
    : 220;
  const fadeOutTimers = new Set();

  let map = null;
  let scenarioEntities = null;
  let removedIds = NO_REMOVED_ENTITIES;
  let isRestoring = false;

  function applyHeroRestoreMotionOverride() {
    if (!entityLayer || !isRestoring) {
      return;
    }

    const heroEntities = entityLayer.querySelectorAll?.('.entity--hero') ?? [];
    heroEntities.forEach((heroEntity) => {
      heroEntity.style.transition = 'none';
    });
  }

  function updateHeroPosition({ heroId, tile }) {
    if (!entityLayer || !map || !tile) {
      return false;
    }

    const heroEntity = entityLayer.querySelector?.(`.entity--hero[data-entity-id="${heroId}"]`);
    if (!heroEntity) {
      return false;
    }

    const origin = getMapCenteredOrigin();
    const center = getTileCenter({
      map,
      tile,
      origin
    });

    heroEntity.dataset.tileX = String(tile.x);
    heroEntity.dataset.tileY = String(tile.y);
    if (isRestoring) {
      heroEntity.style.transition = 'none';
    }
    const hero = scenarioEntities?.find((entity) => entity.id === heroId) ?? null;
    const heroStyle = hero ? getEntityStyle({ entity: hero, map }) : null;
    const offsetX = Number(heroStyle?.offsetX);
    const offsetY = Number(heroStyle?.offsetY);
    const resolvedOffsetX = Number.isFinite(offsetX) ? offsetX : -12;
    const resolvedOffsetY = Number.isFinite(offsetY) ? offsetY : -12;

    heroEntity.style.transform = `translate(${center.x + resolvedOffsetX}px, ${center.y + resolvedOffsetY}px)`;
    return true;
  }

  function render() {
    if (!entityLayer || !map || !scenarioEntities) {
      return;
    }

    renderEntityLayer({
      container: entityLayer,
      map,
      entities: scenarioEntities.filter((entity) => !removedIds.has(entity.id)),
      createElement,
      getEntityStyle
    });
    applyHeroRestoreMotionOverride();
  }

  function removeEntityElement(entityId) {
    if (!entityLayer || typeof entityId !== 'string' || entityId.length === 0) {
      return;
    }

    const el = entityLayer.querySelector?.(`[data-entity-id="${entityId}"]`);
    if (!el) {
      return;
    }

    const entityKind = scenarioEntities?.find((entity) => entity.id === entityId)?.kind;
    const fadeOutSpec = presentation?.getFadeOutSpec?.({ entityKind }) ?? null;
    const durationMs = Number(config?.fadeOutMsByKind?.[entityKind] ?? fadeOutSpec?.durationMs ?? 0);
    if (isRestoring || !fadeOutSpec || durationMs <= 0) {
      el.remove();
      return;
    }

    el.classList.add(fadeOutSpec.className);
    const timer = setTimeout(() => {
      fadeOutTimers.delete(timer);
      el.remove();
    }, durationMs);
    fadeOutTimers.add(timer);
  }

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          map = event.detail.map;
          scenarioEntities = event.detail.scenario.entities;
          removedIds = NO_REMOVED_ENTITIES;
          setStyleVar(entityLayer, '--hero-step-duration', `${heroStepDurationMs}ms`);
          render();
        }
      },
      {
        type: APP_FACT_HERO_MOVED,
        handler: (event) => {
          const heroId = event.detail?.heroId;
          const toTile = event.detail?.to;
          if (updateHeroPosition({ heroId, tile: toTile })) {
            return;
          }

          render();
          updateHeroPosition({ heroId, tile: toTile });
        }
      },
      {
        type: APP_FACT_ENTITY_REMOVED,
        handler: (event) => {
          removedIds = applyEntityRemoved(removedIds, event.detail?.entityId);
          removeEntityElement(event.detail?.entityId);
        }
      },
      {
        type: APP_UI_RESTORE_STARTED,
        handler: () => {
          isRestoring = true;
          applyHeroRestoreMotionOverride();
        }
      },
      {
        type: APP_UI_RESTORE_COMPLETED,
        handler: () => {
          isRestoring = false;
          if (!entityLayer) {
            return;
          }

          const heroEntities = entityLayer.querySelectorAll?.('.entity--hero') ?? [];
          heroEntities.forEach((heroEntity) => {
            heroEntity.style.transition = '';
          });
        }
      }
    ],
    dispose: () => {
      for (const timer of fadeOutTimers) {
        clearTimeout(timer);
      }
      fadeOutTimers.clear();
    }
  };
}, {
  id: 'entity-view',
  phase: 'view',
  consumes: [
    APP_FACT_WORLD_READY,
    APP_FACT_HERO_MOVED,
    APP_FACT_ENTITY_REMOVED,
    APP_UI_RESTORE_STARTED,
    APP_UI_RESTORE_COMPLETED
  ],
  produces: []
});
