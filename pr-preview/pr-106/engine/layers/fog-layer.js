import { tileKey } from '../tile-utils.js'
import { clearLayerContainer, getLayerElementFactory } from './dom-layer-utils.js'
import { getMapCenteredOrigin, getTileTopLeft } from './layout.js'

// Covers every tile `isExplored` turns down. Returns the covers by tile key, so revealing a tile
// later only removes its own.
export function renderFogLayer({ container, map, isExplored, createElement }) {
  const makeElement = getLayerElementFactory(createElement)
  clearLayerContainer(container)
  const origin = getMapCenteredOrigin()
  const covers = new Map()

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = { x, y }
      if (isExplored(tile)) {
        continue
      }

      const coverEl = makeElement('div')
      const topLeft = getTileTopLeft({ map, tile, origin })
      coverEl.className = 'fog-tile'
      coverEl.style.transform = `translate(${topLeft.x}px, ${topLeft.y}px)`
      coverEl.dataset.x = String(x)
      coverEl.dataset.y = String(y)
      container.appendChild(coverEl)
      covers.set(tileKey(tile), coverEl)
    }
  }

  return covers
}

export function revealFogTiles(covers, tiles) {
  for (const tile of tiles) {
    const key = tileKey(tile)
    covers.get(key)?.remove()
    covers.delete(key)
  }
}
