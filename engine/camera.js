import { getMapCenteredOrigin, getTileCenter, getViewportCenter } from './layers/layout.js';

function clamp(value, min, max) {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export function createCamera({ viewport, world, map }) {
  let x = 0;
  let y = 0;
  let panX = 0;
  let panY = 0;
  let followTileGetter = null;
  let followLocked = false;

  function applyTransform() {
    world.style.transform = `translate(${x}px, ${y}px)`;
  }

  function getAxisBounds(viewportSize, mapSize, originOffset) {
    const anchor = -originOffset;
    if (mapSize <= viewportSize) {
      return { min: anchor, max: anchor };
    }

    return {
      min: viewportSize - originOffset - mapSize,
      max: anchor
    };
  }

  function getClampedTranslation(nextX, nextY) {
    const viewportWidth = viewport.clientWidth ?? 0;
    const viewportHeight = viewport.clientHeight ?? 0;
    const origin = getMapCenteredOrigin({
      width: viewportWidth,
      height: viewportHeight,
      map
    });
    const mapPixelWidth = map.width * map.tileWidth;
    const mapPixelHeight = map.height * map.tileHeight;
    const xBounds = getAxisBounds(viewportWidth, mapPixelWidth, origin.x);
    const yBounds = getAxisBounds(viewportHeight, mapPixelHeight, origin.y);

    return {
      x: clamp(nextX, xBounds.min, xBounds.max),
      y: clamp(nextY, yBounds.min, yBounds.max)
    };
  }

  function moveTo(nextX, nextY) {
    const clamped = getClampedTranslation(nextX, nextY);
    x = clamped.x;
    y = clamped.y;
    applyTransform();
    return { x, y };
  }

  function moveBy(dx, dy) {
    if (followLocked) {
      return;
    }
    const previousX = x;
    const previousY = y;
    const moved = moveTo(x + dx, y + dy);
    panX += moved.x - previousX;
    panY += moved.y - previousY;
  }

  function centerOnTile(tile) {
    const centered = getCenteredTranslationForTile(tile);
    moveTo(centered.x, centered.y);
  }

  function getCenteredTranslationForTile(tile) {
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const origin = getMapCenteredOrigin({
      width: viewportWidth,
      height: viewportHeight,
      map
    });
    const tileCenter = getTileCenter({ map, tile, origin });
    const viewportCenter = getViewportCenter({
      width: viewportWidth,
      height: viewportHeight
    });

    return {
      x: viewportCenter.x - tileCenter.x,
      y: viewportCenter.y - tileCenter.y
    };
  }

  function setFollowTileGetter(getter) {
    followTileGetter = getter;
  }

  function clearPan() {
    panX = 0;
    panY = 0;
  }

  function lockFollow() {
    followLocked = true;
  }

  function unlockFollow() {
    followLocked = false;
  }

  function update() {
    const followTile = followTileGetter?.() ?? null;
    if (!followTile) {
      return;
    }

    const centered = getCenteredTranslationForTile(followTile);
    const moved = moveTo(centered.x + panX, centered.y + panY);
    panX = moved.x - centered.x;
    panY = moved.y - centered.y;
  }

  return {
    moveBy,
    moveTo,
    centerOnTile,
    setFollowTileGetter,
    clearPan,
    lockFollow,
    unlockFollow,
    update,
    getOffset() {
      return { x, y };
    }
  };
}
