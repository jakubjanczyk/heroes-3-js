import { createCamera as createCameraDefault } from '../../engine/camera.js';
import { attachCameraInput as attachCameraInputDefault } from '../../engine/input.js';
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_COMMAND_CAMERA_PAN_BY,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_WORLD_READY,
  APP_UI_CAMERA_UPDATED
} from '../events.js';

export function registerCameraModule(
  { bus, env },
  {
    createCamera = createCameraDefault,
    attachCameraInput = attachCameraInputDefault
  } = {}
) {
  const viewport = env.document?.querySelector('.viewport');
  const worldElement = env.document?.querySelector('.world');
  let camera = null;
  let hero = null;
  let map = null;
  let isMoving = false;

  function emitCameraUpdated() {
    if (!camera) {
      return;
    }

    const offset = camera.getOffset?.();
    if (!offset) {
      return;
    }

    bus.emit(APP_UI_CAMERA_UPDATED, {
      offset,
      viewportSize: {
        width: viewport?.clientWidth ?? 0,
        height: viewport?.clientHeight ?? 0
      }
    });
  }

  bus.addEventListener(APP_FACT_WORLD_READY, (event) => {
    const world = event.detail;
    hero = world.scenario.entities.find((entity) => entity.kind === 'HERO') ?? null;
    map = world.map;

    if (!viewport || !worldElement || !map) {
      return;
    }

    camera = createCamera({
      viewport,
      world: worldElement,
      map
    });

    camera.setFollowTileGetter(() => hero?.tile ?? null);
    camera.update();
    emitCameraUpdated();

    const inputCamera = {
      moveBy(dx, dy) {
        bus.emit(APP_COMMAND_CAMERA_PAN_BY, { dx, dy });
      },
      getOffset: camera.getOffset?.bind(camera)
    };

    attachCameraInput({
      camera: inputCamera,
      viewport,
      window: env.window,
      edgePanDelayMs: 300,
      map,
      onTileClick: (tile) => {
        bus.emit(APP_COMMAND_TILE_CLICKED, { tile });
      }
    });
  });

  bus.addEventListener(APP_COMMAND_CAMERA_PAN_BY, (event) => {
    if (!camera) {
      return;
    }

    const { dx = 0, dy = 0 } = event.detail;
    camera.moveBy(dx, dy);
    emitCameraUpdated();
  });

  bus.addEventListener(APP_COMMAND_CAMERA_CENTER_ON_TILE, (event) => {
    if (!camera || !map) {
      return;
    }

    const tile = event.detail?.tile;
    if (!tile) {
      return;
    }

    if (typeof map.inBounds === 'function' && !map.inBounds(tile)) {
      return;
    }

    camera.centerOnTile?.(tile);
    emitCameraUpdated();
  });

  bus.addEventListener(APP_FACT_MOVE_STARTED, () => {
    if (!camera) {
      return;
    }

    isMoving = true;
    camera.clearPan?.();
    camera.lockFollow?.();
    if (hero?.tile) {
      camera.centerOnTile?.(hero.tile);
      emitCameraUpdated();
    }
  });

  bus.addEventListener(APP_FACT_HERO_MOVED, (event) => {
    if (!camera) {
      return;
    }

    const { to } = event.detail;
    if (isMoving) {
      camera.centerOnTile?.(to);
      emitCameraUpdated();
      return;
    }

    camera.update?.();
    emitCameraUpdated();
  });

  bus.addEventListener(APP_FACT_MOVE_FINISHED, () => {
    if (!camera) {
      return;
    }

    isMoving = false;
    camera.unlockFollow?.();
    camera.update?.();
    emitCameraUpdated();
  });
}
