import { renderEntityLayer as renderEntityLayerDefault } from '../../engine/layers/entity-layer.js';
import { getMapCenteredOrigin, getTileCenter } from '../../engine/layers/layout.js';
import { getDefaultEntityLayerStyle as getDefaultEntityStyle } from '../presentation/entity-style.js';
import { getEntityFadeOutSpec } from '../presentation/entities/registry.js';
import {
  APP_FACT_HERO_MOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_UI_ENTITY_FADE_OUT_REQUESTED,
  APP_FACT_WORLD_READY
} from '../events.js';

const HERO_HALF_SIZE = 12;

function isFiniteTileCoordinate(value) {
  return Number.isFinite(value);
}

export function registerEntityViewModule(
  { bus, env, config },
  {
    renderEntityLayer = renderEntityLayerDefault,
    getEntityStyle = getDefaultEntityStyle
  } = {}
) {
  const entityLayer = env.document?.querySelector('.entity-layer');
  const createElement = env.document?.createElement?.bind(env.document);
  const configuredStepDurationMs = Number(config?.movementStepDelayMs ?? 220);
  const heroStepDurationMs = Number.isFinite(configuredStepDurationMs)
    ? Math.max(0, configuredStepDurationMs)
    : 220;

  let map = null;
  let entities = null;

  function updateHeroPosition({ heroId, tile }) {
    if (!entityLayer || !map || typeof heroId !== 'string' || !tile) {
      return false;
    }

    if (!isFiniteTileCoordinate(tile.x) || !isFiniteTileCoordinate(tile.y)) {
      return false;
    }

    const heroEntity = entityLayer.querySelector?.(`.entity--hero[data-entity-id="${heroId}"]`);
    if (!heroEntity) {
      return false;
    }

    const origin = getMapCenteredOrigin({
      width: entityLayer.clientWidth ?? 0,
      height: entityLayer.clientHeight ?? 0,
      map
    });
    const center = getTileCenter({
      map,
      tile,
      origin
    });

    heroEntity.dataset.tileX = String(tile.x);
    heroEntity.dataset.tileY = String(tile.y);
    heroEntity.style.transform = `translate(${center.x - HERO_HALF_SIZE}px, ${center.y - HERO_HALF_SIZE}px)`;
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

  bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
    map = event.detail.map;
    entities = event.detail.scenario.entities;
    entityLayer?.style?.setProperty?.('--hero-step-duration', `${heroStepDurationMs}ms`);
    render();
  });

  bus.addEventListener(APP_FACT_HERO_MOVED, (event) => {
    const heroId = event.detail?.heroId;
    const toTile = event.detail?.to;
    if (updateHeroPosition({ heroId, tile: toTile })) {
      return;
    }

    render();
  });

  bus.addEventListener(APP_UI_ENTITY_FADE_OUT_REQUESTED, (event) => {
    applyEntityFadeOut({
      entityId: event.detail?.entityId,
      entityKind: event.detail?.entityKind
    });
  });

  bus.addEventListener(APP_FACT_MONSTER_DEFEATED, () => {
    render();
  });

  bus.addEventListener(APP_FACT_RESOURCE_COLLECTED, () => {
    render();
  });
}
