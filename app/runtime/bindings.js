import {
  APP_COMMAND_CAMERA_PAN_BY,
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_COMMAND_TILE_CLICKED
} from '../events.js';

export function bindViewportInput({
  bus,
  attachCameraInput,
  camera,
  viewport,
  window,
  map
}) {
  if (!viewport) {
    return;
  }

  const inputCamera = {
    moveBy(dx, dy) {
      bus.emit(APP_COMMAND_CAMERA_PAN_BY, { dx, dy });
    },
    getOffset: camera?.getOffset?.bind(camera)
  };

  attachCameraInput({
    camera: inputCamera,
    viewport,
    window,
    edgePanDelayMs: 300,
    map,
    onTileClick: (tile) => {
      bus.emit(APP_COMMAND_TILE_CLICKED, { tile });
    }
  });
}

export function bindUiIntentButtons({ bus, endTurnButton, musicToggleButton, uiLayer }) {
  if (endTurnButton) {
    endTurnButton.addEventListener('click', (event) => {
      event?.stopPropagation?.();
      bus.emit(APP_COMMAND_END_TURN_REQUESTED, {});
    });
  }

  if (musicToggleButton) {
    musicToggleButton.addEventListener('click', (event) => {
      event?.stopPropagation?.();
      bus.emit(APP_COMMAND_MUSIC_TOGGLE_REQUESTED, {});
    });
  }

  if (uiLayer) {
    uiLayer.addEventListener('click', (event) => {
      event?.stopPropagation?.();
    });
  }
}
