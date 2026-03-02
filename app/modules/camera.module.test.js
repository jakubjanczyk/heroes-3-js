import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_COMMAND_CAMERA_PAN_BY,
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_WORLD_READY,
  APP_UI_CAMERA_UPDATED,
  APP_UI_WORLD_MOTION_UPDATED
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
    const viewport = { id: 'viewport', clientWidth: 1000, clientHeight: 700 };
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
            centerOnTile() {},
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
    expect(bus.emitted).toContainEqual({
      type: APP_UI_CAMERA_UPDATED,
      detail: {
        offset: { x: 0, y: 0 },
        viewportSize: { width: 1000, height: 700 }
      }
    });
  });

  test('applies movement lifecycle camera behavior', () => {
    const bus = createFakeBus();
    const calls = [];
    const worldMotionEvents = [];

    registerCameraModule(
      {
        bus,
        env: {
          document: createFakeDocument({
            '.viewport': {},
            '.world': {}
          }),
          window: {}
        },
        config: {
          movementStepDelayMs: 240
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

    for (const emitted of bus.emitted) {
      if (emitted.type === APP_UI_WORLD_MOTION_UPDATED) {
        worldMotionEvents.push(emitted.detail);
      }
    }

    expect(worldMotionEvents).toEqual([
      { followHero: false, cameraStepDurationMs: 240 },
      { followHero: true },
      { followHero: false }
    ]);

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

  test('centers camera on minimap command and emits camera update', () => {
    const bus = createFakeBus();
    const centeredOnTiles = [];

    registerCameraModule(
      {
        bus,
        env: {
          document: createFakeDocument({
            '.viewport': { clientWidth: 900, clientHeight: 600 },
            '.world': {}
          }),
          window: {}
        }
      },
      {
        createCamera: () => ({
          setFollowTileGetter() {},
          update() {},
          moveBy() {},
          centerOnTile(tile) {
            centeredOnTiles.push(tile);
          },
          clearPan() {},
          lockFollow() {},
          unlockFollow() {},
          getOffset() {
            return { x: -120, y: -80 };
          }
        }),
        attachCameraInput() {}
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: {
        entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
      },
      map: { id: 'map' }
    });

    bus.emit(APP_COMMAND_CAMERA_CENTER_ON_TILE, {
      tile: { x: 12, y: 9 }
    });

    expect(centeredOnTiles).toEqual([{ x: 12, y: 9 }]);
    expect(bus.emitted).toContainEqual({
      type: APP_UI_CAMERA_UPDATED,
      detail: {
        offset: { x: -120, y: -80 },
        viewportSize: { width: 900, height: 600 }
      }
    });
  });
});
