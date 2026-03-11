import {
  APP_UI_CAMERA_UPDATED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED,
  APP_UI_WORLD_MOTION_UPDATED
} from '../events.js';
import { setStyleVar } from '../../engine/layers/dom-layer-utils.js';
import { defineModule } from './shared/module-runtime.js';

export const registerWorldViewModule = defineModule(({ env }) => {
  const worldElement = env.document?.querySelector?.('.world');

  return {
    subscriptions: [
      {
        type: APP_UI_RESTORE_STARTED,
        handler: () => {
          if (!worldElement?.style) {
            return;
          }

          worldElement.style.transition = 'none';
        }
      },
      {
        type: APP_UI_RESTORE_COMPLETED,
        handler: () => {
          if (!worldElement?.style) {
            return;
          }

          worldElement.style.transition = '';
        }
      },
      {
        type: APP_UI_WORLD_MOTION_UPDATED,
        handler: (event) => {
          if (!worldElement) {
            return;
          }

          const followHero = event.detail?.followHero;
          if (typeof followHero === 'boolean') {
            worldElement.dataset.followHero = String(followHero);
          }

          const cameraStepDurationMs = Number(event.detail?.cameraStepDurationMs);
          if (Number.isFinite(cameraStepDurationMs)) {
            const clampedDurationMs = Math.max(0, cameraStepDurationMs);
            setStyleVar(worldElement, '--camera-step-duration', `${clampedDurationMs}ms`);
          }
        }
      },
      {
        type: APP_UI_CAMERA_UPDATED,
        handler: (event) => {
          if (!worldElement) {
            return;
          }

          const x = Number(event.detail?.offset?.x);
          const y = Number(event.detail?.offset?.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return;
          }

          worldElement.style.transform = `translate(${x}px, ${y}px)`;
        }
      }
    ]
  };
}, {
  id: 'world-view',
  phase: 'view',
  consumes: [
    APP_UI_RESTORE_STARTED,
    APP_UI_RESTORE_COMPLETED,
    APP_UI_WORLD_MOTION_UPDATED,
    APP_UI_CAMERA_UPDATED
  ],
  produces: []
});
