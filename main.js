import { loadGame } from './game/load.js';
import { renderTerrainLayer } from './engine/layers/terrain-layer.js';
import { createMap } from './engine/map.js';
import { createCamera as createCameraDefault } from './engine/camera.js';
import { attachCameraInput as attachCameraInputDefault } from './engine/input.js';

export async function bootApp({
  fetch = globalThis.fetch,
  document = globalThis.document,
  window = globalThis.window,
  loadGame: loadGameImpl = loadGame,
  createCamera = createCameraDefault,
  attachCameraInput = attachCameraInputDefault
} = {}) {
  const { scenario, definitions } = await loadGameImpl({ fetch });
  const map = createMap(scenario.terrain);

  const world = { scenario, definitions, map };
  globalThis.__WORLD__ = world;

  const terrainLayer = document?.querySelector('.terrain-layer');
  const viewport = document?.querySelector('.viewport');
  const worldElement = document?.querySelector('.world');
  if (viewport && worldElement) {
    const camera = createCamera({ viewport, world: worldElement, map });
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
