import {
  APP_COMMAND_CAMERA_PAN_BY,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED
} from '../events.js';

export function registerCameraController({ bus, camera, getHero }) {
  let isMoving = false;

  bus.addEventListener(APP_COMMAND_CAMERA_PAN_BY, (event) => {
    const { dx = 0, dy = 0 } = event.detail;
    camera?.moveBy?.(dx, dy);
  });

  bus.addEventListener(APP_FACT_MOVE_STARTED, () => {
    isMoving = true;
    const hero = getHero();
    camera?.clearPan?.();
    camera?.lockFollow?.();
    if (hero?.tile) {
      camera?.centerOnTile?.(hero.tile);
    }
  });

  bus.addEventListener(APP_FACT_HERO_MOVED, (event) => {
    const { to } = event.detail;
    if (isMoving) {
      camera?.centerOnTile?.(to);
      return;
    }

    camera?.update?.();
  });

  bus.addEventListener(APP_FACT_MOVE_FINISHED, () => {
    isMoving = false;
    camera?.unlockFollow?.();
    camera?.update?.();
  });
}
