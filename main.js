import { loadGame } from './game/load.js';
import { renderTerrainLayer } from './engine/layers/terrain-layer.js';
import { renderEntityLayer as renderEntityLayerDefault } from './engine/layers/entity-layer.js';
import { createMap } from './engine/map.js';
import { createCamera as createCameraDefault } from './engine/camera.js';
import { attachCameraInput as attachCameraInputDefault } from './engine/input.js';
import { createOccupancyIndex as createOccupancyIndexDefault } from './engine/occupancy.js';

export async function bootApp({
  fetch = globalThis.fetch,
  document = globalThis.document,
  window = globalThis.window,
  loadGame: loadGameImpl = loadGame,
  createCamera = createCameraDefault,
  attachCameraInput = attachCameraInputDefault,
  renderEntityLayer = renderEntityLayerDefault,
  createOccupancyIndex = createOccupancyIndexDefault
} = {}) {
  const { scenario, definitions } = await loadGameImpl({ fetch });
  const map = createMap(scenario.terrain);
  const occupancy = createOccupancyIndex(scenario.entities);

  const world = { scenario, definitions, map, occupancy };
  globalThis.__WORLD__ = world;

  const terrainLayer = document?.querySelector('.terrain-layer');
  const entityLayer = document?.querySelector('.entity-layer');
  const viewport = document?.querySelector('.viewport');
  const worldElement = document?.querySelector('.world');
  if (viewport && worldElement) {
    const camera = createCamera({ viewport, world: worldElement, map });
    const hero = scenario.entities.find((entity) => entity.kind === 'HERO') ?? null;
    camera.setFollowTileGetter(() => hero?.tile ?? null);
    camera.update();
    attachCameraInput({ camera, viewport, window });
  }

  if (terrainLayer) {
    const renderTerrain = () => {
      renderTerrainLayer({
        container: terrainLayer,
        map,
        createElement: document.createElement?.bind(document)
      });
    };

    renderTerrain();

    if (window?.requestAnimationFrame) {
      window.requestAnimationFrame(renderTerrain);
    }

    if (window?.addEventListener) {
      window.addEventListener('resize', renderTerrain);
    }
  }

  if (entityLayer) {
    renderEntityLayer({
      container: entityLayer,
      map,
      entities: scenario.entities,
      createElement: document.createElement?.bind(document)
    });
  }

  const bootStatus = document?.getElementById('boot-status');
  if (bootStatus) {
    bootStatus.textContent = `Boot ok: ${scenario.meta.id}`;
  }

  console.log(`boot ok: ${scenario.meta.id} (entities: ${scenario.entities.length})`);

  return world;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  await bootApp();
}
