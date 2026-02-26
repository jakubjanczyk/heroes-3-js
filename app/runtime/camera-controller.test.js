import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_CAMERA_PAN_BY,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerCameraController } from './camera-controller.js';

describe('camera controller', () => {
  test('handles pan command and movement lifecycle camera actions', () => {
    const bus = createFakeBus();
    const calls = [];
    const camera = {
      moveBy(dx, dy) {
        calls.push(['moveBy', dx, dy]);
      },
      clearPan() {
        calls.push(['clearPan']);
      },
      lockFollow() {
        calls.push(['lockFollow']);
      },
      centerOnTile(tile) {
        calls.push(['centerOnTile', tile]);
      },
      unlockFollow() {
        calls.push(['unlockFollow']);
      },
      update() {
        calls.push(['update']);
      }
    };
    const hero = { tile: { x: 0, y: 0 } };

    registerCameraController({
      bus,
      camera,
      getHero: () => hero
    });

    bus.emit(APP_COMMAND_CAMERA_PAN_BY, { dx: 12, dy: -8 });
    bus.emit(APP_FACT_MOVE_STARTED, {});
    bus.emit(APP_FACT_HERO_MOVED, { to: { x: 1, y: 0 } });
    bus.emit(APP_FACT_MOVE_FINISHED, {});
    bus.emit(APP_FACT_HERO_MOVED, { to: { x: 2, y: 0 } });

    expect(calls).toEqual([
      ['moveBy', 12, -8],
      ['clearPan'],
      ['lockFollow'],
      ['centerOnTile', { x: 0, y: 0 }],
      ['centerOnTile', { x: 1, y: 0 }],
      ['unlockFollow'],
      ['update'],
      ['update']
    ]);
  });
});
