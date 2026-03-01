// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import { createMap } from '../../engine/map.js';
import { getMapCenteredOrigin } from '../../engine/layers/layout.js';

import {
  confirmTileClickByDispatch,
  flushMicrotasks,
  setupMovementBehaviorApp
} from './behavior.utils.js';

describe('camera behavior', () => {
  test('given app boots when hero is visible then camera starts centered on the hero tile', async () => {
    await setupMovementBehaviorApp({
      viewportSize: { width: 1000, height: 700 }
    });

    const worldElement = document.querySelector('.world');
    expect(worldElement).toBeTruthy();

    const map = createMap({
      width: 4,
      height: 1,
      tiles: [0, 0, 0, 0]
    });
    const origin = getMapCenteredOrigin({ width: 1000, height: 700, map });
    const heroCenter = {
      x: origin.x + map.halfTileWidth,
      y: origin.y + map.halfTileHeight
    };

    expect(worldElement?.style?.transform).toBe(
      `translate(${500 - heroCenter.x}px, ${350 - heroCenter.y}px)`
    );
  });

  test('given player presses arrow keys when viewing the map then the camera pans and the world transform changes', async () => {
    await setupMovementBehaviorApp({
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
      viewportSize: { width: 1000, height: 700 }
    });

    const worldElement = document.querySelector('.world');
    expect(worldElement).toBeTruthy();
    const before = worldElement?.style?.transform;

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    const hero = world.scenario.entities.find((entity) => entity.kind === 'HERO');
    expect(hero?.tile).toEqual({ x: 2, y: 0 });

    expect(worldElement?.style?.transform).not.toBe(before);
  });
});
