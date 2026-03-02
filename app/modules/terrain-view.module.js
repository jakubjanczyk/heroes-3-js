import { renderTerrainLayer as renderTerrainLayerDefault } from '../../engine/layers/terrain-layer.js';
import { APP_FACT_WORLD_READY } from '../events.js';

export function registerTerrainViewModule(
  { bus, env },
  {
    renderTerrainLayer = renderTerrainLayerDefault
  } = {}
) {
  const terrainLayer = env.document?.querySelector('.terrain-layer');
  const createElement = env.document?.createElement?.bind(env.document);
  let onResize = null;

  bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
    if (!terrainLayer) {
      return;
    }

    const { map } = event.detail;
    const renderTerrain = () => {
      renderTerrainLayer({
        container: terrainLayer,
        map,
        createElement
      });
    };

    renderTerrain();
    env.window?.requestAnimationFrame?.(renderTerrain);

    if (onResize && typeof env.window?.removeEventListener === 'function') {
      env.window.removeEventListener('resize', onResize);
    }

    onResize = renderTerrain;
    env.window?.addEventListener?.('resize', onResize);
  });
}
