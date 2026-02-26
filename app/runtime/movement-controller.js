import { APP_COMMAND_MOVE_REQUESTED } from '../events.js';

export function registerMovementController({ bus, movement }) {
  let isMoving = false;

  bus.addEventListener(APP_COMMAND_MOVE_REQUESTED, (event) => {
    if (!movement || isMoving) {
      return;
    }

    const { targetTile, path } = event.detail;
    isMoving = true;

    void (async () => {
      try {
        await movement.moveHeroTo(targetTile, { path });
      } finally {
        isMoving = false;
      }
    })();
  });
}
