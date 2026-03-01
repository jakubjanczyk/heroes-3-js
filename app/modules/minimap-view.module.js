import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_FACT_WORLD_READY,
  APP_UI_CAMERA_UPDATED
} from '../events.js';

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function clearNode(node) {
  if (!node) {
    return;
  }

  node.replaceChildren?.();
}

export function registerMinimapViewModule({ bus, env }) {
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

    const tileWidthPercent = 100 / map.width;
    const tileHeightPercent = 100 / map.height;

    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        const tile = createElement('div');
        tile.className = map.isPassable({ x, y })
          ? 'minimap-tile minimap-tile--passable'
          : 'minimap-tile minimap-tile--blocked';
        tile.dataset.x = String(x);
        tile.dataset.y = String(y);
        tile.style.left = `${x * tileWidthPercent}%`;
        tile.style.top = `${y * tileHeightPercent}%`;
        tile.style.width = `calc(${tileWidthPercent}% + 0.5px)`;
        tile.style.height = `calc(${tileHeightPercent}% + 0.5px)`;
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
      marker.style.left = `${((town.tile.x + 0.5) / map.width) * 100}%`;
      marker.style.top = `${((town.tile.y + 0.5) / map.height) * 100}%`;
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
      minimapViewport.style.width = '0%';
      minimapViewport.style.height = '0%';
      return;
    }

    const maxVisibleX = Math.max(0, mapPixelWidth - viewportWidth);
    const maxVisibleY = Math.max(0, mapPixelHeight - viewportHeight);
    const visibleStartX = clamp(-offsetX, 0, maxVisibleX);
    const visibleStartY = clamp(-offsetY, 0, maxVisibleY);

    minimapViewport.style.left = `${(visibleStartX / mapPixelWidth) * 100}%`;
    minimapViewport.style.top = `${(visibleStartY / mapPixelHeight) * 100}%`;
    minimapViewport.style.width = `${clamp((viewportWidth / mapPixelWidth) * 100, 0, 100)}%`;
    minimapViewport.style.height = `${clamp((viewportHeight / mapPixelHeight) * 100, 0, 100)}%`;
  }

  if (minimapMap) {
    minimapMap.addEventListener('click', (event) => {
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
      bus.emit(APP_COMMAND_CAMERA_CENTER_ON_TILE, { tile });
    });
  }

  bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
    map = event.detail.map;
    towns = (event.detail.scenario?.entities ?? []).filter((entity) => entity.kind === 'TOWN');

    if (minimapMap && map?.width > 0 && map?.height > 0) {
      minimapMap.style.aspectRatio = `${map.width} / ${map.height}`;
    }

    renderTerrain();
    renderTowns();
    updateViewportBox(lastCameraUpdate);
  });

  bus.addEventListener(APP_UI_CAMERA_UPDATED, (event) => {
    lastCameraUpdate = event.detail;
    updateViewportBox(lastCameraUpdate);
  });
}
