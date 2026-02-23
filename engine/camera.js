import { getMapCenteredOrigin, getTileCenter, getViewportCenter } from './layers/layout.js';

export function createCamera({ viewport, world, map }) {
  let x = 0;
  let y = 0;
  let panX = 0;
  let panY = 0;
  let followTileGetter = null;

  function applyTransform() {
    world.style.transform = `translate(${x}px, ${y}px)`;
  }

  function moveTo(nextX, nextY) {
    x = nextX;
    y = nextY;
    applyTransform();
  }

  function moveBy(dx, dy) {
    panX += dx;
    panY += dy;
    moveTo(x + dx, y + dy);
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

  function update() {
    const followTile = followTileGetter?.() ?? null;
    if (!followTile) {
      return;
    }

    const centered = getCenteredTranslationForTile(followTile);
    moveTo(centered.x + panX, centered.y + panY);
  }

  return {
    moveBy,
    moveTo,
    centerOnTile,
    setFollowTileGetter,
    update,
    getOffset() {
      return { x, y };
    }
  };
}
