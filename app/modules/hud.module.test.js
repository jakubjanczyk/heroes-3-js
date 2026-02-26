import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_WORLD_READY,
  APP_UI_MUSIC_STATE_CHANGED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerHudModule } from './hud.module.js';

function createFakeNode() {
  const listeners = new Map();
  const attributes = {};

  return {
    textContent: '',
    attributes,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    click() {
      listeners.get('click')?.({ stopPropagation() {} });
    },
    setAttribute(name, value) {
      attributes[name] = String(value);
    }
  };
}

describe('hud module', () => {
  test('binds buttons and projects hud state', () => {
    const bus = createFakeBus();
    const nodes = {
      '.ui-layer': createFakeNode(),
      'movement-points-status': createFakeNode(),
      'resource-totals-status': createFakeNode(),
      'end-turn-button': createFakeNode(),
      'music-toggle-button': createFakeNode(),
      'boot-status': createFakeNode()
    };
    const document = {
      querySelector(selector) {
        return nodes[selector] ?? null;
      },
      getElementById(id) {
        return nodes[id] ?? null;
      }
    };

    registerHudModule({
      bus,
      env: { document }
    });

    nodes['end-turn-button'].click();
    nodes['music-toggle-button'].click();
    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 11, max: 15 });
    bus.emit(APP_UI_MUSIC_STATE_CHANGED, { enabled: true });
    bus.emit(APP_FACT_WORLD_READY, {
      scenario: { meta: { id: 'demo' } },
      definitions: {
        resources: {
          GOLD_PILE: { name: 'Gold pile' },
          WOOD_PILE: { name: 'Wood pile' }
        }
      }
    });
    bus.emit(APP_FACT_RESOURCE_COLLECTED, {
      entityType: 'GOLD_PILE',
      amount: 100
    });
    bus.emit(APP_FACT_RESOURCE_COLLECTED, {
      entityType: 'WOOD_PILE',
      amount: 5
    });

    expect(bus.emitted).toContainEqual({
      type: APP_COMMAND_END_TURN_REQUESTED,
      detail: {}
    });
    expect(bus.emitted).toContainEqual({
      type: APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
      detail: {}
    });
    expect(nodes['movement-points-status'].textContent).toBe('MP: 11 / 15');
    expect(nodes['music-toggle-button'].textContent).toBe('Music: On');
    expect(nodes['music-toggle-button'].attributes['aria-pressed']).toBe('true');
    expect(nodes['boot-status'].textContent).toBe('Boot ok: demo');
    expect(nodes['resource-totals-status'].textContent).toBe('Resources: Gold pile: 100 | Wood pile: 5');
  });

  test('is safe when optional HUD nodes are missing', () => {
    const bus = createFakeBus();
    const document = {
      querySelector() {
        return null;
      },
      getElementById() {
        return null;
      }
    };

    registerHudModule({
      bus,
      env: { document }
    });

    bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { value: 5, max: 15 });
    bus.emit(APP_UI_MUSIC_STATE_CHANGED, { enabled: false });
    bus.emit(APP_FACT_WORLD_READY, { scenario: { meta: { id: 'demo' } } });
    bus.emit(APP_FACT_RESOURCE_COLLECTED, { entityType: 'GOLD_PILE', amount: 100 });

    expect(bus.emitted).toEqual([
      { type: APP_FACT_MOVEMENT_POINTS_CHANGED, detail: { value: 5, max: 15 } },
      { type: APP_UI_MUSIC_STATE_CHANGED, detail: { enabled: false } },
      { type: APP_FACT_WORLD_READY, detail: { scenario: { meta: { id: 'demo' } } } },
      { type: APP_FACT_RESOURCE_COLLECTED, detail: { entityType: 'GOLD_PILE', amount: 100 } }
    ]);
  });
});
