import { describe, expect, test } from 'vitest';

import {
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_UI_MUSIC_STATE_CHANGED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { startRuntime } from './start-runtime.js';

describe('start runtime', () => {
  test('registers runtime wiring and emits initial movement and music states', async () => {
    const bus = createFakeBus();
    const movementPointsStatus = { textContent: '' };
    const musicToggleButton = {
      textContent: '',
      attributes: {},
      addEventListener() {},
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      }
    };
    const renderEntityCalls = [];
    const renderPreviewCalls = [];
    let attachedInputArgs = null;

    await startRuntime({
      bus,
      scenario: {
        entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
      },
      map: { id: 'map' },
      occupancy: { getAt: () => null },
      hero: { id: 'hero-1', tile: { x: 0, y: 0 } },
      maxMovementPoints: 15,
      turnSystem: {
        getRemainingMovementPoints() {
          return 12;
        },
        endTurn() {}
      },
      movement: {
        async moveHeroTo() {
          return true;
        }
      },
      musicPlayer: {
        async start() {},
        isEnabled() {
          return true;
        },
        async toggle() {}
      },
      camera: {
        getOffset() {
          return { x: 0, y: 0 };
        },
        moveBy() {},
        clearPan() {},
        lockFollow() {},
        centerOnTile() {},
        unlockFollow() {},
        update() {}
      },
      attachCameraInput: (args) => {
        attachedInputArgs = args;
      },
      renderTerrainLayer() {},
      renderEntityLayer(args) {
        renderEntityCalls.push(args);
      },
      renderPathPreviewLayer(args) {
        renderPreviewCalls.push(args);
      },
      createElement: () => ({}),
      terrainLayer: { id: 'terrain' },
      entityLayer: { id: 'entity' },
      effectsLayer: { id: 'effects' },
      uiLayer: null,
      viewport: { id: 'viewport' },
      window: {},
      movementPointsStatus,
      endTurnButton: null,
      musicToggleButton
    });

    expect(attachedInputArgs?.viewport).toEqual({ id: 'viewport' });
    expect(renderEntityCalls).toHaveLength(1);
    expect(renderPreviewCalls).toHaveLength(0);
    expect(bus.emitted).toContainEqual({
      type: APP_FACT_MOVEMENT_POINTS_CHANGED,
      detail: { value: 12, max: 15 }
    });
    expect(bus.emitted).toContainEqual({
      type: APP_UI_MUSIC_STATE_CHANGED,
      detail: { enabled: true }
    });
    expect(movementPointsStatus.textContent).toBe('MP: 12 / 15');
    expect(musicToggleButton.textContent).toBe('Music: On');
    expect(musicToggleButton.attributes['aria-pressed']).toBe('true');
  });
});
