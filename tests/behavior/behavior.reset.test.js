// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import {
  clickResetSession,
  confirmTileClickByDispatch,
  expectHeroAt,
  expectMovementPoints,
  flushMicrotasks,
  setupMovementBehaviorApp
} from './behavior.utils.js';

function createMemoryEventLog() {
  const entries = [];

  return {
    async init() {},
    async record(event) {
      entries.push({
        id: entries.length + 1,
        v: 1,
        type: event.type,
        detail: event.detail,
        at: Date.now()
      });
    },
    getAll() {
      return [...entries];
    },
    async reset() {
      entries.length = 0;
    },
    hasExistingSession() {
      return entries.length > 0;
    }
  };
}

function createWindowWithReloadSpy(baseWindow = window) {
  const reloadCalls = [];
  const envWindow = Object.create(baseWindow);
  Object.defineProperty(envWindow, 'location', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: {
      reload() {
        reloadCalls.push('reload');
      }
    }
  });

  return { envWindow, reloadCalls };
}

describe('reset session behavior', () => {
  test('given persisted progress when player clicks Reset then session is cleared and next boot starts from initial scenario', async () => {
    const eventLog = createMemoryEventLog();
    const { envWindow, reloadCalls } = createWindowWithReloadSpy();

    const sharedOptions = {
      eventLog,
      envWindow,
      loadGameOptions: {
        width: 4,
        height: 1,
        tiles: [0, 0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    };

    const firstSession = await setupMovementBehaviorApp(sharedOptions);
    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);
    expect(eventLog.hasExistingSession()).toBe(true);

    await clickResetSession(firstSession.user);
    await flushMicrotasks();

    expect(reloadCalls).toHaveLength(1);
    expect(eventLog.getAll()).toEqual([]);

    await setupMovementBehaviorApp({
      ...sharedOptions,
      envWindow: window
    });

    expectHeroAt(0, 0);
    expectMovementPoints(15);
  });
});
