import { clearLayerContainer, getLayerElementFactory, setStyleVar } from './dom-layer-utils.js'
import { getMapCenteredOrigin, getTileTopLeft } from './layout.js'

// Each way a road can leave its tile, with the angle its arm is drawn at.
const ROAD_DIRECTIONS = [
  { x: 1, y: 0, angle: 0 },
  { x: 1, y: 1, angle: 45 },
  { x: 0, y: 1, angle: 90 },
  { x: -1, y: 1, angle: 135 },
  { x: -1, y: 0, angle: 180 },
  { x: -1, y: -1, angle: 225 },
  { x: 0, y: -1, angle: 270 },
  { x: 1, y: -1, angle: 315 }
]

function isDiagonal(direction) {
  return direction.x !== 0 && direction.y !== 0
}

// A diagonal neighbour already joined through a straight neighbour gets no arm of its own,
// so a road turning a corner doesn't draw a triangle.
function hasRoadArm({ map, tile, direction }) {
  const hasRoadAt = (dx, dy) => map.getRoadType({ x: tile.x + dx, y: tile.y + dy }) !== null
  if (!hasRoadAt(direction.x, direction.y)) {
    return false
  }
  return !isDiagonal(direction) || (!hasRoadAt(direction.x, 0) && !hasRoadAt(0, direction.y))
}

function isStraightThrough(arms) {
  return arms.length === 2 && arms[0].x === -arms[1].x && arms[0].y === -arms[1].y
}

// A road is drawn from the middle of its tile: an arm to the tile edge towards each road it
// joins, meeting the neighbour's arm end to end, and a round hub where the road ends or turns.
// Roads go above all terrain tiles, since diagonal arms cross the corners of other tiles.
function createRoadElement({ map, tile, topLeft, makeElement }) {
  const roadEl = makeElement('div')
  const arms = ROAD_DIRECTIONS.filter((direction) => hasRoadArm({ map, tile, direction }))
  const hubClass = isStraightThrough(arms) ? '' : ' road--hub'
  roadEl.className = `road road--${map.getRoadType(tile).name}${hubClass}`
  roadEl.style.transform = `translate(${topLeft.x + map.halfTileWidth}px, ${topLeft.y + map.halfTileHeight}px)`
  roadEl.dataset.x = String(tile.x)
  roadEl.dataset.y = String(tile.y)

  for (const direction of arms) {
    const armEl = makeElement('span')
    armEl.className = isDiagonal(direction) ? 'road__arm road__arm--diagonal' : 'road__arm'
    setStyleVar(armEl, '--road-arm-angle', `${direction.angle}deg`)
    roadEl.appendChild(armEl)
  }

  return roadEl
}

export function renderTerrainLayer({ container, map, createElement }) {
  const makeElement = getLayerElementFactory(createElement)
  clearLayerContainer(container)
  const origin = getMapCenteredOrigin({
    width: container.clientWidth ?? 0,
    height: container.clientHeight ?? 0,
    map
  })
  const roadElements = []

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = { x, y }
      const tileEl = makeElement('div')
      const topLeft = getTileTopLeft({ map, tile, origin })
      const terrainName = map.getTerrainType(tile)?.name

      tileEl.className = terrainName ? `terrain-tile terrain-tile--${terrainName}` : 'terrain-tile'
      tileEl.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`
      tileEl.dataset.x = String(x)
      tileEl.dataset.y = String(y)
      if (map.getRoadType(tile)) {
        roadElements.push(createRoadElement({ map, tile, topLeft, makeElement }))
      }

      container.appendChild(tileEl)
    }
  }

  for (const roadEl of roadElements) {
    container.appendChild(roadEl)
  }
}
