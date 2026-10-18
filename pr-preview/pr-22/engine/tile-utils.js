export function sameTile(a, b) {
  return a?.x === b?.x && a?.y === b?.y
}

export function tileKey(tile) {
  return `${tile.x},${tile.y}`
}

// The 8 tiles around `tile`, straight and diagonal.
export function getNeighborTiles(tile) {
  const neighbors = []
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue
      }
      neighbors.push({ x: tile.x + dx, y: tile.y + dy })
    }
  }
  return neighbors
}
