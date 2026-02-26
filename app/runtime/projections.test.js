import { describe, expect, test } from 'vitest';

import {
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_UI_MUSIC_STATE_CHANGED,
  APP_UI_PREVIEW_UPDATED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import {
  registerEntityProjection,
  registerHudProjection,
  registerMusicToggleProjection,
  registerPreviewProjection
} from './projections.js';

describe('runtime projections', () => {
  test('hud projection updates movement points text', () => {
    const bus = createFakeBus();
    const movementPointsStatus = { textContent: '' };

    registerHudProjection({ bus, movementPointsStatus });
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 11, max: 15 });

    expect(movementPointsStatus.textContent).toBe('MP: 11 / 15');
  });

  test('music toggle projection updates label and aria-pressed', () => {
    const bus = createFakeBus();
    const attributes = {};
    const musicToggleButton = {
      textContent: '',
      setAttribute(key, value) {
        attributes[key] = value;
      }
    };

    registerMusicToggleProjection({ bus, musicToggleButton });
    bus.emit(APP_UI_MUSIC_STATE_CHANGED, { enabled: true });

    expect(musicToggleButton.textContent).toBe('Music: On');
    expect(attributes['aria-pressed']).toBe('true');
  });

  test('entity projection renders immediately and on hero moved facts', () => {
    const bus = createFakeBus();
    const renderCalls = [];

    registerEntityProjection({
      bus,
      entityLayer: {},
      map: { id: 'map' },
      entities: [{ id: 'hero-1' }],
      createElement: () => ({}),
      renderEntityLayer: (args) => {
        renderCalls.push(args);
      }
    });

    bus.emit(APP_FACT_HERO_MOVED, { to: { x: 1, y: 0 } });

    expect(renderCalls).toHaveLength(2);
    expect(renderCalls[0].entities).toEqual([{ id: 'hero-1' }]);
  });

  test('preview projection forwards preview event payload to renderer', () => {
    const bus = createFakeBus();
    const previewCalls = [];

    registerPreviewProjection({
      bus,
      effectsLayer: { id: 'fx' },
      map: { id: 'map' },
      createElement: () => ({}),
      renderPathPreviewLayer: (args) => {
        previewCalls.push(args);
      }
    });

    bus.emit(APP_UI_PREVIEW_UPDATED, {
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      targetTile: { x: 1, y: 0 },
      maxAffordableSteps: 3
    });

    expect(previewCalls).toEqual([
      {
        container: { id: 'fx' },
        map: { id: 'map' },
        path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        targetTile: { x: 1, y: 0 },
        maxAffordableSteps: 3,
        createElement: expect.any(Function)
      }
    ]);
  });
});
