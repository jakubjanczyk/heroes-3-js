import { renderPathPreviewLayer as renderPathPreviewLayerDefault } from '../../engine/layers/path-preview-layer.js';
import { APP_FACT_WORLD_READY, APP_UI_PREVIEW_UPDATED } from '../events.js';
import { defineModule } from './shared/module-runtime.js';

export const registerPreviewViewModule = defineModule((
  { on, env },
  {
    renderPathPreviewLayer = renderPathPreviewLayerDefault
  } = {}
) => {
  const effectsLayer = env.document?.querySelector('.effects-layer');
  const createElement = env.document?.createElement?.bind(env.document);

  let map = null;

  on(APP_FACT_WORLD_READY, (event) => {
    map = event.detail.map;
  });

  on(APP_UI_PREVIEW_UPDATED, (event) => {
    if (!effectsLayer || !map) {
      return;
    }

    const { path, targetTile, maxAffordableSteps } = event.detail;
    renderPathPreviewLayer({
      container: effectsLayer,
      map,
      path,
      targetTile,
      maxAffordableSteps,
      createElement
    });
  });
});
