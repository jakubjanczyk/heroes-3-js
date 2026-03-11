import {renderEntityLayer as renderEntityLayerDefault} from '../../engine/layers/entity-layer.js';
import {setStyleVar} from '../../engine/layers/dom-layer-utils.js';
import {getMapCenteredOrigin, getTileCenter} from '../../engine/layers/layout.js';
import {getDefaultEntityLayerStyle as getDefaultEntityStyle} from '../presentation/entity-style.js';
import {getEntityFadeOutSpec} from '../presentation/entities/registry.js';
import {
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_READY,
  APP_UI_ENTITY_FADE_OUT_REQUESTED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../events.js';
import {defineModule} from './shared/module-runtime.js';

export const registerEntityViewModule = defineModule((
  { env, config },
  {
    renderEntityLayer = renderEntityLayerDefault,
    getEntityStyle = getDefaultEntityStyle
  } = {}
) => {
  const entityLayer = env.document?.querySelector('.entity-layer');
  const createElement = env.document?.createElement?.bind(env.document);
  const configuredStepDurationMs = Number(config?.movementStepDelayMs ?? 220);
  const heroStepDurationMs = Number.isFinite(configuredStepDurationMs)
    ? Math.max(0, configuredStepDurationMs)
    : 220;

  let map = null;
  let entities = null;
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
    const hero = entities?.find((entity) => entity.id === heroId) ?? null;
    const heroStyle = hero ? getEntityStyle({ entity: hero, map }) : null;
    const offsetX = Number(heroStyle?.offsetX);
    const offsetY = Number(heroStyle?.offsetY);
    const resolvedOffsetX = Number.isFinite(offsetX) ? offsetX : -12;
    const resolvedOffsetY = Number.isFinite(offsetY) ? offsetY : -12;

    heroEntity.style.transform = `translate(${center.x + resolvedOffsetX}px, ${center.y + resolvedOffsetY}px)`;
    return true;
  }

  function render() {
    if (!entityLayer || !map || !entities) {
      return;
    }

    renderEntityLayer({
      container: entityLayer,
      map,
      entities,
      createElement,
      getEntityStyle
    });
    applyHeroRestoreMotionOverride();
  }

  function applyEntityFadeOut({ entityId, entityKind }) {
    if (!entityLayer || typeof entityId !== 'string' || entityId.length === 0) {
      return;
    }

    const fadeOutSpec = getEntityFadeOutSpec({ entityKind });
    if (!fadeOutSpec) {
      return;
    }

    const el = entityLayer.querySelector?.(`${fadeOutSpec.selector}[data-entity-id="${entityId}"]`);
    el?.classList?.add?.(fadeOutSpec.className);
  }

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          map = event.detail.map;
          entities = event.detail.scenario.entities;
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
        }
      },
      {
        type: APP_UI_ENTITY_FADE_OUT_REQUESTED,
        handler: (event) => {
          applyEntityFadeOut({
            entityId: event.detail?.entityId,
            entityKind: event.detail?.entityKind
          });
        }
      },
      {
        type: APP_FACT_MONSTER_DEFEATED,
        handler: () => {
          render();
        }
      },
      {
        type: APP_FACT_RESOURCE_COLLECTED,
        handler: () => {
          render();
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
    ]
  };
}, {
  id: 'entity-view',
  phase: 'view',
  consumes: [
    APP_FACT_WORLD_READY,
    APP_FACT_HERO_MOVED,
    APP_UI_ENTITY_FADE_OUT_REQUESTED,
    APP_FACT_MONSTER_DEFEATED,
    APP_FACT_RESOURCE_COLLECTED,
    APP_UI_RESTORE_STARTED,
    APP_UI_RESTORE_COMPLETED
  ],
  produces: []
});
