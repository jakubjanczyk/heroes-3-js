import { clearLayerContainer, getLayerElementFactory } from './dom-layer-utils.js'
import { getMapCenteredOrigin, getTileTopLeft } from './layout.js'

const ROAD_DIRECTIONS = [
  { name: 'n', x: 0, y: -1 },
  { name: 'ne', x: 1, y: -1 },
  { name: 'e', x: 1, y: 0 },
  { name: 'se', x: 1, y: 1 },
  { name: 's', x: 0, y: 1 },
  { name: 'sw', x: -1, y: 1 },
  { name: 'w', x: -1, y: 0 },
  { name: 'nw', x: -1, y: -1 }
]

// A road is drawn as a hub in the middle of its tile with an arm towards each neighbouring road.
function createRoadElement({ map, tile, makeElement }) {
  const roadEl = makeElement('div')
  roadEl.className = `road road--${map.getRoadType(tile).name}`

  for (const direction of ROAD_DIRECTIONS) {
    if (!map.getRoadType({ x: tile.x + direction.x, y: tile.y + direction.y })) {
      continue
    }
    const armEl = makeElement('span')
    armEl.className = `road__arm road__arm--${direction.name}`
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
        tileEl.appendChild(createRoadElement({ map, tile, makeElement }))
      }

      container.appendChild(tileEl)
    }
  }
}
