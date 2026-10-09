import { renderPathPreviewLayer as renderPathPreviewLayerDefault } from '../../engine/layers/path-preview-layer.js';
import { APP_FACT_WORLD_READY, APP_UI_PREVIEW_UPDATED } from '../events.js';
import { defineModule } from './shared/module-runtime.js';

export const registerPreviewViewModule = defineModule((
  { env },
  {
    renderPathPreviewLayer = renderPathPreviewLayerDefault
  } = {}
) => {
  const effectsLayer = env.document?.querySelector('.effects-layer');
  const createElement = env.document?.createElement?.bind(env.document);

  let map = null;

  return {
    subscriptions: [
      {
        type: APP_FACT_WORLD_READY,
        handler: (event) => {
          map = event.detail.map;
        }
      },
      {
        type: APP_UI_PREVIEW_UPDATED,
        handler: (event) => {
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
        }
      }
    ]
  };
}, {
  id: 'preview-view',
  phase: 'view',
  consumes: [
    APP_FACT_WORLD_READY,
    APP_UI_PREVIEW_UPDATED
  ],
  produces: []
});
