import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_FACT_WORLD_READY,
  APP_UI_CAMERA_UPDATED
} from '../events.js';
import { isTown } from '../../game/domain/entity-queries.js';
import { clamp } from '../../engine/math-utils.js';
import { setStyleVar } from '../../engine/layers/dom-layer-utils.js';
import { defineModule } from './shared/module-runtime.js';

function clearNode(node) {
  if (!node) {
    return;
  }

  node.replaceChildren?.();
}

export const registerMinimapViewModule = defineModule(({ emit, env }) => {
  const minimapMap = env.document?.getElementById('minimap-map');
  const minimapTerrain = env.document?.getElementById('minimap-terrain');
  const minimapTowns = env.document?.getElementById('minimap-towns');
  const minimapViewport = env.document?.getElementById('minimap-viewport');
  const createElement = env.document?.createElement?.bind(env.document);

  let map = null;
  let towns = [];
  let lastCameraUpdate = null;

  function renderTerrain() {
    if (!map || !minimapTerrain || typeof createElement !== 'function') {
      return;
    }

    clearNode(minimapTerrain);

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const tile = createElement('div');
        tile.className = map.isPassable({ x, y })
          ? 'minimap-tile minimap-tile--passable'
          : 'minimap-tile minimap-tile--blocked';
        tile.dataset.x = String(x);
        tile.dataset.y = String(y);
        minimapTerrain.appendChild(tile);
      }
    }
  }

  function renderTowns() {
    if (!map || !minimapTowns || typeof createElement !== 'function') {
      return;
    }

    clearNode(minimapTowns);

    for (const town of towns) {
      const marker = createElement('div');
      marker.className = 'minimap-town-marker';
      marker.dataset.entityId = town.id;
      marker.dataset.tileX = String(town.tile.x);
      marker.dataset.tileY = String(town.tile.y);
      setStyleVar(marker, '--minimap-marker-x', `${((town.tile.x + 0.5) / map.width) * 100}%`);
      setStyleVar(marker, '--minimap-marker-y', `${((town.tile.y + 0.5) / map.height) * 100}%`);
      minimapTowns.appendChild(marker);
    }
  }

  function updateViewportBox(cameraUpdate) {
    if (!map || !minimapViewport || !cameraUpdate) {
      return;
    }

    const viewportWidth = Number(cameraUpdate.viewportSize?.width ?? 0);
    const viewportHeight = Number(cameraUpdate.viewportSize?.height ?? 0);
    const offsetX = Number(cameraUpdate.offset?.x ?? 0);
    const offsetY = Number(cameraUpdate.offset?.y ?? 0);
    const mapPixelWidth = map.width * map.tileWidth;
    const mapPixelHeight = map.height * map.tileHeight;

    if (mapPixelWidth <= 0 || mapPixelHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) {
      setStyleVar(minimapViewport, '--minimap-viewport-width', '0%');
      setStyleVar(minimapViewport, '--minimap-viewport-height', '0%');
      return;
    }

    const maxVisibleX = Math.max(0, mapPixelWidth - viewportWidth);
    const maxVisibleY = Math.max(0, mapPixelHeight - viewportHeight);
    const visibleStartX = clamp(-offsetX, 0, maxVisibleX);
    const visibleStartY = clamp(-offsetY, 0, maxVisibleY);

    setStyleVar(minimapViewport, '--minimap-viewport-left', `${(visibleStartX / mapPixelWidth) * 100}%`);
    setStyleVar(minimapViewport, '--minimap-viewport-top', `${(visibleStartY / mapPixelHeight) * 100}%`);
    setStyleVar(minimapViewport, '--minimap-viewport-width', `${clamp((viewportWidth / mapPixelWidth) * 100, 0, 100)}%`);
    setStyleVar(minimapViewport, '--minimap-viewport-height', `${clamp((viewportHeight / mapPixelHeight) * 100, 0, 100)}%`);
  }

  return {
    domSubscriptions: [
      {
        target: minimapMap,
        type: 'click',
        handler: (event) => {
          if (!map) {
            return;
          }

          const rect = minimapMap.getBoundingClientRect?.();
          const width = Number(rect?.width ?? 0);
          const height = Number(rect?.height ?? 0);
          if (width <= 0 || height <= 0) {
            return;
          }

          const localX = clamp(Number(event.clientX) - rect.left, 0, Math.max(0, width - 1));
          const localY = clamp(Number(event.clientY) - rect.top, 0, Math.max(0, height - 1));
          const tileX = Math.min(map.width - 1, Math.floor((localX / width) * map.width));
          const tileY = Math.min(map.height - 1, Math.floor((localY / height) * map.height));
          const tile = { x: tileX, y: tileY };

          if (!map.inBounds(tile)) {
            return;
          }

          event.stopPropagation?.();
          emit(APP_COMMAND_CAMERA_CENTER_ON_TILE, { tile });
        }
      }
    ],
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          map = event.detail.map;
          towns = (event.detail.scenario?.entities ?? []).filter(isTown);

          if (minimapMap && map?.width > 0 && map?.height > 0) {
            setStyleVar(minimapMap, '--minimap-columns', String(map.width));
            setStyleVar(minimapMap, '--minimap-rows', String(map.height));
            setStyleVar(minimapMap, '--minimap-map-width', String(map.width));
            setStyleVar(minimapMap, '--minimap-map-height', String(map.height));
          }

          renderTerrain();
          renderTowns();
          updateViewportBox(lastCameraUpdate);
        }
      },
      {
        type: APP_UI_CAMERA_UPDATED,
        handler: (event) => {
          lastCameraUpdate = event.detail;
          updateViewportBox(lastCameraUpdate);
        }
      }
    ]
  };
}, {
  id: 'minimap-view',
  phase: 'view',
  consumes: [
    APP_FACT_WORLD_READY,
    APP_UI_CAMERA_UPDATED
  ],
  produces: [
    APP_COMMAND_CAMERA_CENTER_ON_TILE
  ]
});
