// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import {
  confirmTileClickByDispatch,
  expectHeroAt,
  flushMicrotasks,
  setupMovementBehaviorApp
} from './behavior.utils.js';
import { findHero } from '../../game/domain/entity-queries.js';

function createPanScenario({
  width = 60,
  height = 40,
  heroTile = { x: 20, y: 15 }
} = {}) {
  return {
    width,
    height,
    tiles: new Array(width * height).fill(0),
    entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: heroTile }]
  };
}

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

describe('camera behavior', () => {
  test('given app boots near map edge then camera starts at top-left map boundary', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: createPanScenario({ heroTile: { x: 1, y: 1 } }),
      viewportSize: { width: 1000, height: 700 }
    });

    const worldElement = document.querySelector('.world');
    expect(worldElement).toBeTruthy();

    expect(worldElement?.style?.transform).toBe('translate(0px, 0px)');
  });

  test('given player presses arrow keys when viewing the map then the camera pans and the world transform changes', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: createPanScenario(),
      viewportSize: { width: 1000, height: 700 }
    });

    const worldElement = document.querySelector('.world');
    expect(worldElement).toBeTruthy();
    const before = worldElement?.style?.transform;

    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(worldElement?.style?.transform).not.toBe(before);
  });

  test('given cursor touches viewport edge briefly when player moves away quickly then camera does not pan', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: createPanScenario(),
      viewportSize: { width: 1000, height: 700 }
    });

    const worldElement = document.querySelector('.world');
    const viewport = document.querySelector('.viewport');
    expect(worldElement).toBeTruthy();
    expect(viewport).toBeTruthy();
    const before = worldElement?.style?.transform;

    viewport?.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
    window.dispatchEvent(new window.MouseEvent('mousemove', {
      clientX: 10,
      clientY: 10
    }));

    expect(worldElement?.style?.transform).toBe(before);
  });

  test('given cursor stays near viewport edge past delay when player keeps moving there then edge scroll pans the camera', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: createPanScenario(),
      viewportSize: { width: 1000, height: 700 }
    });

    const worldElement = document.querySelector('.world');
    const viewport = document.querySelector('.viewport');
    expect(worldElement).toBeTruthy();
    expect(viewport).toBeTruthy();
    const before = worldElement?.style?.transform;

    viewport?.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
    window.dispatchEvent(new window.MouseEvent('mousemove', {
      clientX: 10,
      clientY: 10
    }));
    await new Promise((resolve) => {
      setTimeout(resolve, 360);
    });
    window.dispatchEvent(new window.MouseEvent('mousemove', {
      clientX: 10,
      clientY: 10
    }));

    expect(worldElement?.style?.transform).not.toBe(before);
  });

  test('given cursor is not over viewport when player moves mouse near viewport edges then edge scroll does not pan the camera', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: createPanScenario(),
      viewportSize: { width: 1000, height: 700 }
    });

    const worldElement = document.querySelector('.world');
    expect(worldElement).toBeTruthy();
    const before = worldElement?.style?.transform;

    window.dispatchEvent(new window.MouseEvent('mousemove', {
      clientX: 10,
      clientY: 10
    }));

    expect(worldElement?.style?.transform).toBe(before);
  });

  test('given hero moves when movement completes then camera remains centered on latest hero tile', async () => {
    const { world } = await setupMovementBehaviorApp({
      loadGameOptions: createPanScenario(),
      viewportSize: { width: 1000, height: 700 }
    });

    const worldElement = document.querySelector('.world');
    expect(worldElement).toBeTruthy();
    const before = worldElement?.style?.transform;

    confirmTileClickByDispatch(22, 15);
    await flushMicrotasks();

    const hero = findHero(world.scenario.entities);
    expect(hero?.tile).toEqual({ x: 22, y: 15 });

    expect(worldElement?.style?.transform).not.toBe(before);
  });

  test('given session is restored on refresh when hero has moved then camera centers on restored hero tile', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: createPanScenario(),
      viewportSize: { width: 1000, height: 700 }
    };

    await setupMovementBehaviorApp(sharedAppOptions);
    confirmTileClickByDispatch(22, 15);
    await flushMicrotasks();
    expectHeroAt(22, 15);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    const worldElement = document.querySelector('.world');
    expect(worldElement).toBeTruthy();
    expectHeroAt(22, 15);
    expect(worldElement?.style?.transform).toBe('translate(-220px, -146px)');
  });
});
