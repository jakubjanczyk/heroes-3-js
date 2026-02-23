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
    const screen = map.tileToScreen(tile);
    const centerX = viewport.clientWidth / 2;
    const centerY = viewport.clientHeight / 2;
    const mapPixelWidth = (map.width + map.height) * map.halfTileWidth;
    const mapPixelHeight = (map.width + map.height) * map.halfTileHeight;
    const minXOffset = (map.height - 1) * map.halfTileWidth;
    const originX = Math.round((viewport.clientWidth - mapPixelWidth) / 2 + minXOffset);
    const originY = Math.round((viewport.clientHeight - mapPixelHeight) / 2);

    return {
      x: centerX - (originX + screen.x + map.halfTileWidth),
      y: centerY - (originY + screen.y + map.halfTileHeight)
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
    update
  };
}
