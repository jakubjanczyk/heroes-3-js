import { renderTerrainLayer as renderTerrainLayerDefault } from '../../engine/layers/terrain-layer.js';
import { APP_FACT_WORLD_READY } from '../events.js';
import { defineModule } from './shared/module-runtime.js';

export const registerTerrainViewModule = defineModule((
  { on, env },
  {
    renderTerrainLayer = renderTerrainLayerDefault
  } = {}
) => {
  const terrainLayer = env.document?.querySelector('.terrain-layer');
  const createElement = env.document?.createElement?.bind(env.document);

  on(APP_FACT_WORLD_READY, (event) => {
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
    env.window?.requestAnimationFrame?.(() => {});
  });
});
