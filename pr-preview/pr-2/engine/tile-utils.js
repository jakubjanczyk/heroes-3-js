export function sameTile(a, b) {
  return a?.x === b?.x && a?.y === b?.y;
}

export function tileKey(tile) {
  return `${tile.x},${tile.y}`;
}
