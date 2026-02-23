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
    const screen = map.tileToScreen(tile);
    const centerX = viewport.clientWidth / 2;
    const centerY = viewport.clientHeight / 2;
    moveTo(centerX - screen.x, centerY - screen.y);
  }

  function setFollowTileGetter(getter) {
    followTileGetter = getter;
  }

  function update() {
    const followTile = followTileGetter?.() ?? null;
    if (!followTile) {
      return;
    }

    const screen = map.tileToScreen(followTile);
    const centerX = viewport.clientWidth / 2;
    const centerY = viewport.clientHeight / 2;
    moveTo(centerX - screen.x + panX, centerY - screen.y + panY);
  }

  return {
    moveBy,
    moveTo,
    centerOnTile,
    setFollowTileGetter,
    update
  };
}
