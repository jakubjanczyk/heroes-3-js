import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_CAMERA_PAN_BY,
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_COMMAND_TILE_CLICKED
} from '../events.js';
import { bindUiIntentButtons, bindViewportInput } from './bindings.js';

function createFakeBus() {
  const emitted = [];
  return {
    emitted,
    emit(type, detail) {
      emitted.push({ type, detail });
    }
  };
}

function createFakeButton() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    click() {
      listeners.get('click')?.({ stopPropagation() {} });
    }
  };
}

describe('runtime bindings', () => {
  test('bindViewportInput emits camera pan and tile click commands', () => {
    const bus = createFakeBus();
    let attachedArgs = null;
    const camera = {
      getOffset() {
        return { x: 0, y: 0 };
      }
    };

    bindViewportInput({
      bus,
      attachCameraInput: (args) => {
        attachedArgs = args;
      },
      camera,
      viewport: { id: 'viewport' },
      window: { id: 'window' },
      map: { id: 'map' }
    });

    attachedArgs.camera.moveBy(5, -3);
    attachedArgs.onTileClick({ x: 1, y: 0 });

    expect(bus.emitted).toContainEqual({
      type: APP_COMMAND_CAMERA_PAN_BY,
      detail: { dx: 5, dy: -3 }
    });
    expect(bus.emitted).toContainEqual({
      type: APP_COMMAND_TILE_CLICKED,
      detail: { tile: { x: 1, y: 0 } }
    });
  });

  test('bindUiIntentButtons emits end-turn and music commands', () => {
    const bus = createFakeBus();
    const endTurnButton = createFakeButton();
    const musicToggleButton = createFakeButton();

    bindUiIntentButtons({
      bus,
      endTurnButton,
      musicToggleButton,
      uiLayer: null
    });

    endTurnButton.click();
    musicToggleButton.click();

    expect(bus.emitted).toContainEqual({
      type: APP_COMMAND_END_TURN_REQUESTED,
      detail: {}
    });
    expect(bus.emitted).toContainEqual({
      type: APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
      detail: {}
    });
  });
});
