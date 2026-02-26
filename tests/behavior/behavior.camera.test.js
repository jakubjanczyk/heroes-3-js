// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import { createCamera as createEngineCamera } from '../../engine/camera.js';

import {
  confirmTileClickByDispatch,
  createTrackedCamera,
  flushMicrotasks,
  setupLinearMovementApp,
  setupMovementBehaviorApp
} from './behavior.utils.js';

describe('camera behavior', () => {
  test('given app boots when hero is visible then camera starts centered on the hero tile', async () => {
    await setupMovementBehaviorApp({
      viewportSize: { width: 1000, height: 700 },
      createCamera: (args) => createEngineCamera(args)
    });

    const worldElement = document.querySelector('.world');
    expect(worldElement).toBeTruthy();
    expect(worldElement?.style?.transform).toBe('translate(78px, 39px)');
  });

  test('given player presses arrow keys when viewing the map then the camera pans and the world transform changes', async () => {
    await setupMovementBehaviorApp({
      viewportSize: { width: 1000, height: 700 },
      createCamera: (args) => createEngineCamera(args)
    });

    const worldElement = document.querySelector('.world');
    expect(worldElement).toBeTruthy();
    const before = worldElement?.style?.transform;

    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(worldElement?.style?.transform).not.toBe(before);
  });

  test('given cursor touches viewport edge briefly when player moves away quickly then camera does not pan', async () => {
    await setupMovementBehaviorApp({
      viewportSize: { width: 1000, height: 700 },
      createCamera: (args) => createEngineCamera(args)
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
      viewportSize: { width: 1000, height: 700 },
      createCamera: (args) => createEngineCamera(args)
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
      viewportSize: { width: 1000, height: 700 },
      createCamera: (args) => createEngineCamera(args)
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

  test('given hero-follow is enabled when player pans camera then pan acts as an offset and hero-follow continues to work', async () => {
    const { camera, world } = await setupMovementBehaviorApp({
      viewportSize: { width: 1000, height: 700 },
      createCamera: (args) => createEngineCamera(args)
    });

    expect(world).toBeTruthy();
    const hero = world.scenario.entities.find((entity) => entity.kind === 'HERO') ?? null;
    expect(hero).toBeTruthy();

    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
    hero.tile = { x: 1, y: 0 };
    camera?.update();

    const worldElement = document.querySelector('.world');
    expect(worldElement).toBeTruthy();
    expect(worldElement?.style?.transform).toBe('translate(10px, 13px)');
  });
});

describe('camera behavior during movement', () => {
  test('given movement starts when hero begins stepping then camera recenters on hero immediately', async () => {
    const trackedCamera = createTrackedCamera();
    await setupLinearMovementApp({
      width: 4,
      createCamera: () => trackedCamera
    });

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expect(trackedCamera.centerOnTileCalls[0]).toEqual({ x: 0, y: 0 });
  });

  test('given movement is running when hero advances each step then camera follows each step', async () => {
    const trackedCamera = createTrackedCamera();
    await setupLinearMovementApp({
      width: 4,
      createCamera: () => trackedCamera
    });

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expect(trackedCamera.centerOnTileCalls).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ]);
  });

  test('given movement finishes when hero stops then camera unlocks follow mode', async () => {
    const trackedCamera = createTrackedCamera();
    await setupLinearMovementApp({
      width: 4,
      createCamera: () => trackedCamera
    });

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expect(trackedCamera.lockFollowCalls).toBe(1);
    expect(trackedCamera.unlockFollowCalls).toBe(1);
  });
});
