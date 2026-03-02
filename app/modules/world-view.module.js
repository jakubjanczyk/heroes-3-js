import { APP_UI_CAMERA_UPDATED, APP_UI_WORLD_MOTION_UPDATED } from '../events.js';

export function registerWorldViewModule({ bus, env }) {
  const worldElement = env.document?.querySelector?.('.world');

  bus.addEventListener(APP_UI_WORLD_MOTION_UPDATED, (event) => {
    if (!worldElement) {
      return;
    }

    const followHero = event.detail?.followHero;
    if (typeof followHero === 'boolean') {
      if (followHero) {
        worldElement.classList?.add?.('world--following-hero');
      } else {
        worldElement.classList?.remove?.('world--following-hero');
      }
    }

    const cameraStepDurationMs = Number(event.detail?.cameraStepDurationMs);
    if (Number.isFinite(cameraStepDurationMs)) {
      const clampedDurationMs = Math.max(0, cameraStepDurationMs);
      worldElement.style?.setProperty?.('--camera-step-duration', `${clampedDurationMs}ms`);
    }
  });

  bus.addEventListener(APP_UI_CAMERA_UPDATED, (event) => {
    if (!worldElement) {
      return;
    }

    const x = Number(event.detail?.offset?.x);
    const y = Number(event.detail?.offset?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    worldElement.style.transform = `translate(${x}px, ${y}px)`;
  });
}
