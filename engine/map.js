import { deepFreeze } from './deep-freeze.js'

// Tile code -> terrain type. Without one, tiles are plain open (0) or blocked (1) ground.
const DEFAULT_TERRAIN_TYPES = deepFreeze({
  0: { name: 'open', passable: true },
  1: { name: 'blocked', passable: false }
})

// `terrain.roads` (optional) holds a road code per tile, on top of the terrain; 0 is no road.
export function createMap(terrain, terrainTypes = DEFAULT_TERRAIN_TYPES, roadTypes = {}) {
  const { width, height, tiles, roads = null } = terrain
  const tileWidth = 32
  const tileHeight = 32
  const halfTileWidth = tileWidth / 2
  const halfTileHeight = tileHeight / 2

  function inBounds(tile) {
    return tile.x >= 0 && tile.y >= 0 && tile.x < width && tile.y < height
  }

  function getTerrainType(tile) {
    if (!inBounds(tile)) {
      return null
    }

    const code = tiles[tile.y * width + tile.x]
    return Object.hasOwn(terrainTypes, code) ? terrainTypes[code] : null
  }

  function getRoadType(tile) {
    if (!inBounds(tile) || roads === null) {
      return null
    }

    const code = roads[tile.y * width + tile.x]
    return Object.hasOwn(roadTypes, code) ? roadTypes[code] : null
  }

  function isPassable(tile) {
    return getTerrainType(tile)?.passable === true
  }

  function tileToScreen(tile) {
    return {
      x: tile.x * tileWidth,
      y: tile.y * tileHeight
    }
  }

  function screenToTile(screenPoint) {
    const x = Math.floor(screenPoint.x / tileWidth)
    const y = Math.floor(screenPoint.y / tileHeight)

    return { x, y }
  }

  return {
    width,
    height,
    tiles,
    tileWidth,
    tileHeight,
    halfTileWidth,
    halfTileHeight,
    inBounds,
    getTerrainType,
    getRoadType,
    isPassable,
    tileToScreen,
    screenToTile
  }
}
