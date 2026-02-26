import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_CAMERA_PAN_BY,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_WORLD_READY
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerCameraModule } from './camera.module.js';

function createFakeDocument(nodes) {
  return {
    querySelector(selector) {
      return nodes[selector] ?? null;
    }
  };
}

describe('camera module', () => {
  test('creates camera on world-ready and routes input intents through bus', () => {
    const bus = createFakeBus();
    const viewport = { id: 'viewport' };
    const worldElement = { id: 'world' };
    const createCameraCalls = [];
    const moveByCalls = [];
    let attachedInput = null;

    registerCameraModule(
      {
        bus,
        env: {
          document: createFakeDocument({
            '.viewport': viewport,
            '.world': worldElement
          }),
          window: { id: 'window' }
        }
      },
      {
        createCamera: (args) => {
          createCameraCalls.push(args);
          return {
            setFollowTileGetter() {},
            update() {},
            moveBy(dx, dy) {
              moveByCalls.push([dx, dy]);
            },
            getOffset() {
              return { x: 0, y: 0 };
            }
          };
        },
        attachCameraInput: (args) => {
          attachedInput = args;
        }
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: {
        entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
      },
      map: { id: 'map' }
    });

    expect(createCameraCalls).toEqual([
      {
        viewport,
        world: worldElement,
        map: { id: 'map' }
      }
    ]);
    expect(attachedInput.viewport).toBe(viewport);
    attachedInput.onTileClick({ x: 3, y: 1 });
    attachedInput.camera.moveBy(6, -4);

    expect(bus.emitted).toContainEqual({
      type: APP_COMMAND_TILE_CLICKED,
      detail: { tile: { x: 3, y: 1 } }
    });
    expect(bus.emitted).toContainEqual({
      type: APP_COMMAND_CAMERA_PAN_BY,
      detail: { dx: 6, dy: -4 }
    });
    expect(moveByCalls).toContainEqual([6, -4]);
  });

  test('applies movement lifecycle camera behavior', () => {
    const bus = createFakeBus();
    const calls = [];

    registerCameraModule(
      {
        bus,
        env: {
          document: createFakeDocument({
            '.viewport': {},
            '.world': {}
          }),
          window: {}
        }
      },
      {
        createCamera: () => ({
          setFollowTileGetter() {},
          update() {
            calls.push('update');
          },
          clearPan() {
            calls.push('clearPan');
          },
          lockFollow() {
            calls.push('lockFollow');
          },
          centerOnTile(tile) {
            calls.push(['centerOnTile', tile]);
          },
          unlockFollow() {
            calls.push('unlockFollow');
          },
          moveBy() {},
          getOffset() {
            return { x: 0, y: 0 };
          }
        }),
        attachCameraInput() {}
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: {
        entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
      },
      map: {}
    });

    bus.emit(APP_FACT_MOVE_STARTED, {});
    bus.emit(APP_FACT_HERO_MOVED, { to: { x: 1, y: 0 } });
    bus.emit(APP_FACT_MOVE_FINISHED, {});

    expect(calls).toEqual([
      'update',
      'clearPan',
      'lockFollow',
      ['centerOnTile', { x: 0, y: 0 }],
      ['centerOnTile', { x: 1, y: 0 }],
      'unlockFollow',
      'update'
    ]);
  });
});
