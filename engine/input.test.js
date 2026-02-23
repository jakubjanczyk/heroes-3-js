import { describe, expect, test } from 'vitest';

import { attachCameraInput } from './input.js';
import { createMap } from './map.js';
import { getMapCenteredOrigin } from './layers/layout.js';

function createEventTarget() {
  const listeners = new Map();

  return {
    addEventListener(type, handler) {
      if (!listeners.has(type)) {
        listeners.set(type, []);
      }
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type) ?? [];
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    },
    emit(type, event) {
      const handlers = listeners.get(type) ?? [];
      for (const handler of handlers) {
        handler(event);
      }
    }
  };
}

describe('camera input', () => {
  test('arrow keys pan camera by fixed step', () => {
    const moves = [];
    const camera = {
      moveBy(dx, dy) {
        moves.push([dx, dy]);
      }
    };
    const viewport = createEventTarget();
    const window = createEventTarget();

    attachCameraInput({ camera, viewport, window, panStep: 18, edgeSize: 32 });
    window.emit('keydown', { key: 'ArrowRight' });
    window.emit('keydown', { key: 'ArrowUp' });

    expect(moves).toEqual([
      [-18, 0],
      [0, 18]
    ]);
  });

  test('edge scroll pans only while mouse is over viewport', () => {
    const moves = [];
    const camera = {
      moveBy(dx, dy) {
        moves.push([dx, dy]);
      }
    };
    const viewport = createEventTarget();
    viewport.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 500,
      bottom: 400
    });
    const window = createEventTarget();

    attachCameraInput({ camera, viewport, window, panStep: 10, edgeSize: 40 });

    window.emit('mousemove', { clientX: 10, clientY: 10 });
    expect(moves).toEqual([]);

    viewport.emit('mouseenter', {});
    window.emit('mousemove', { clientX: 10, clientY: 10 });
    window.emit('mousemove', { clientX: 490, clientY: 390 });
    viewport.emit('mouseleave', {});
    window.emit('mousemove', { clientX: 10, clientY: 10 });

    expect(moves).toEqual([
      [10, 10],
      [-10, -10]
    ]);
  });

  test('cleanup detaches registered listeners', () => {
    const moves = [];
    const camera = {
      moveBy(dx, dy) {
        moves.push([dx, dy]);
      }
    };
    const viewport = createEventTarget();
    viewport.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 500,
      bottom: 400
    });
    const window = createEventTarget();

    const cleanup = attachCameraInput({ camera, viewport, window, panStep: 10, edgeSize: 40 });
    cleanup();

    window.emit('keydown', { key: 'ArrowRight' });
    viewport.emit('mouseenter', {});
    window.emit('mousemove', { clientX: 10, clientY: 10 });

    expect(moves).toEqual([]);
  });

  test('invokes onTileClick for in-bounds clicked tile', () => {
    const camera = {
      moveBy() {},
      getOffset() {
        return { x: 0, y: 0 };
      }
    };
    const viewport = createEventTarget();
    viewport.getBoundingClientRect = () => ({
      left: 100,
      top: 50,
      right: 600,
      bottom: 450
    });
    const window = createEventTarget();
    const clickedTiles = [];
    const map = {
      width: 1,
      height: 1,
      halfTileWidth: 52,
      halfTileHeight: 26,
      screenToTile() {
        return { x: 0, y: 0 };
      },
      inBounds(tile) {
        return tile.x === 0 && tile.y === 0;
      }
    };

    attachCameraInput({
      camera,
      viewport,
      window,
      map,
      onTileClick: (tile) => {
        clickedTiles.push(tile);
      }
    });

    viewport.emit('click', { clientX: 150, clientY: 100 });

    expect(clickedTiles).toEqual([{ x: 0, y: 0 }]);
  });

  test('does not invoke onTileClick when clicked tile is out of bounds', () => {
    const camera = {
      moveBy() {},
      getOffset() {
        return { x: 0, y: 0 };
      }
    };
    const viewport = createEventTarget();
    viewport.getBoundingClientRect = () => ({
      left: 100,
      top: 50,
      right: 600,
      bottom: 450
    });
    const window = createEventTarget();
    const clickedTiles = [];
    const map = {
      width: 1,
      height: 1,
      halfTileWidth: 52,
      halfTileHeight: 26,
      screenToTile() {
        return { x: 2, y: 2 };
      },
      inBounds() {
        return false;
      }
    };

    attachCameraInput({
      camera,
      viewport,
      window,
      map,
      onTileClick: (tile) => {
        clickedTiles.push(tile);
      }
    });

    viewport.emit('click', { clientX: 150, clientY: 100 });

    expect(clickedTiles).toEqual([]);
  });

  test('maps click at tile center to that same tile', () => {
    const map = createMap({
      width: 3,
      height: 3,
      tiles: new Array(9).fill(0)
    });
    const camera = {
      moveBy() {},
      getOffset() {
        return { x: 0, y: 0 };
      }
    };
    const viewport = createEventTarget();
    viewport.clientWidth = 900;
    viewport.clientHeight = 700;
    viewport.getBoundingClientRect = () => ({
      left: 100,
      top: 50,
      right: 1000,
      bottom: 750
    });
    const window = createEventTarget();
    const clickedTiles = [];

    attachCameraInput({
      camera,
      viewport,
      window,
      map,
      onTileClick: (tile) => {
        clickedTiles.push(tile);
      }
    });

    const targetTile = { x: 1, y: 1 };
    const origin = getMapCenteredOrigin({
      width: viewport.clientWidth,
      height: viewport.clientHeight,
      map
    });
    const screen = map.tileToScreen(targetTile);
    const clickX = 100 + origin.x + screen.x + map.halfTileWidth;
    const clickY = 50 + origin.y + screen.y + map.halfTileHeight;

    viewport.emit('click', { clientX: clickX, clientY: clickY });

    expect(clickedTiles).toEqual([targetTile]);
  });
});
