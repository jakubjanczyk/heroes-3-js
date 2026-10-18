import { createMap } from '../engine/map.js'

async function fetchJson(fetch, url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load ${url} (status ${res.status})`)
  }
  return res.json()
}

async function fetchJsonOrEmpty(fetch, url) {
  const res = await fetch(url)
  if (!res.ok) {
    return {}
  }
  return res.json()
}

function assertKnownTerrainCodes(terrain, map) {
  for (let y = 0; y < terrain.height; y += 1) {
    for (let x = 0; x < terrain.width; x += 1) {
      if (map.getTerrainType({ x, y }) === null) {
        const code = terrain.tiles[y * terrain.width + x]
        throw new Error(`Unknown terrain code ${code} at tile (${x}, ${y})`)
      }
    }
  }
}

function assertEntitiesOnPassableTiles(scenario, map) {
  const entities = scenario.entities ?? []

  for (const entity of entities) {
    const tile = entity.tile ?? {}
    if (map.isPassable(tile)) {
      continue
    }

    throw new Error(
      `Entity ${entity.id} (${entity.kind}) must be placed on a passable tile: (${tile.x}, ${tile.y})`
    )
  }
}

function normalizeStaticUrl(url) {
  if (typeof url !== 'string') return url
  if (url.startsWith('//')) return url
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return url
  if (url.startsWith('/')) return `.${url}`
  return url
}

export async function loadGame({
  fetch,
  terrainTypes,
  scenarioUrl = '/scenarios/scenario.json',
  dataBaseUrl = '/game/data'
}) {
  if (typeof fetch !== 'function') {
    throw new TypeError('loadGame requires a fetch function')
  }

  const normalizedScenarioUrl = normalizeStaticUrl(scenarioUrl)
  const normalizedDataBaseUrl = normalizeStaticUrl(dataBaseUrl)

  const [scenario, hero, monsters, resources, towns, mines] = await Promise.all([
    fetchJson(fetch, normalizedScenarioUrl),
    fetchJson(fetch, `${normalizedDataBaseUrl}/hero.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/monsters.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/resources.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/towns.json`),
    fetchJsonOrEmpty(fetch, `${normalizedDataBaseUrl}/mines.json`)
  ])

  const map = createMap(scenario.terrain, terrainTypes)
  assertKnownTerrainCodes(scenario.terrain, map)
  assertEntitiesOnPassableTiles(scenario, map)

  return {
    scenario,
    definitions: {
      hero,
      monsters,
      resources,
      towns,
      mines
    }
  }
}
