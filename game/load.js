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

function assertMonsterCounts(scenario) {
  for (const entity of scenario.entities ?? []) {
    if (entity.kind === 'MONSTER' && !(Number.isInteger(entity.count) && entity.count > 0)) {
      throw new Error(`Monster ${entity.id} must have a count that is a positive whole number`)
    }

    const { stacks } = entity
    if (entity.kind === 'MONSTER' && stacks !== undefined) {
      if (!(Number.isInteger(stacks) && stacks >= 1 && stacks <= 7)) {
        throw new Error(`Monster ${entity.id} must split into 1 to 7 stacks`)
      }
    }
  }
}

function assertStartingResources(scenario) {
  for (const [resourceType, amount] of Object.entries(scenario.startingResources ?? {})) {
    if (!(Number.isInteger(amount) && amount >= 0)) {
      throw new Error(`Starting resource ${resourceType} must be a whole number of at least 0`)
    }
  }
}

// primarySkills: [{ key, minimum }], the skills a scenario may set on a hero.
function assertHeroPrimarySkills(scenario, primarySkills = []) {
  for (const entity of scenario.entities ?? []) {
    if (entity.kind !== 'HERO') continue

    for (const [key, value] of Object.entries(entity.primarySkills ?? {})) {
      const skill = primarySkills.find((primarySkill) => primarySkill.key === key)
      if (!skill) {
        throw new Error(`Hero ${entity.id} has an unknown primary skill ${key}`)
      }
      if (!(Number.isInteger(value) && value >= skill.minimum)) {
        throw new Error(
          `Hero ${entity.id} must have ${key} as a whole number of at least ${skill.minimum}`
        )
      }
    }
  }
}

// A town can have the buildings every town has (buildings.json) and its town type's own
// (`buildings` of its type in towns.json).
function assertTownBuildings(scenario, definitions) {
  for (const entity of scenario.entities ?? []) {
    if (entity.kind !== 'TOWN') continue

    const ownBuildings = definitions.towns?.[entity.type]?.buildings ?? {}
    const unknownBuilding = (entity.buildings ?? []).find(
      (buildingId) => !(definitions.buildings?.[buildingId] || ownBuildings[buildingId])
    )
    if (unknownBuilding) {
      throw new Error(`Town ${entity.id} has an unknown building ${unknownBuilding}`)
    }
  }
}

// Until sieges exist (5.10) nothing can take a garrisoned town, so only the player's own towns
// may start with one.
function assertTownGarrisons(scenario) {
  for (const entity of scenario.entities ?? []) {
    if (entity.kind !== 'TOWN' || !entity.garrison) continue

    if (!entity.owner) {
      throw new Error(`Town ${entity.id} has a garrison but the player does not own it`)
    }
    if (entity.garrison.length > 7) {
      throw new Error(`Town ${entity.id} must have a garrison of at most 7 stacks`)
    }
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
  primarySkills,
  scenarioUrl = '/scenarios/scenario.json',
  dataBaseUrl = '/game/data'
}) {
  if (typeof fetch !== 'function') {
    throw new TypeError('loadGame requires a fetch function')
  }

  const normalizedScenarioUrl = normalizeStaticUrl(scenarioUrl)
  const normalizedDataBaseUrl = normalizeStaticUrl(dataBaseUrl)

  const [
    scenario,
    hero,
    heroClasses,
    monsters,
    resources,
    towns,
    buildings,
    mines,
    dwellings,
    resourceGenerators,
    bonusObjects,
    tavern,
    heroes,
    secondarySkills,
    artifacts
  ] = await Promise.all([
    fetchJson(fetch, normalizedScenarioUrl),
    fetchJson(fetch, `${normalizedDataBaseUrl}/hero.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/hero-classes.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/monsters.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/resources.json`),
    fetchJson(fetch, `${normalizedDataBaseUrl}/towns.json`),
    fetchJsonOrEmpty(fetch, `${normalizedDataBaseUrl}/buildings.json`),
    fetchJsonOrEmpty(fetch, `${normalizedDataBaseUrl}/mines.json`),
    fetchJsonOrEmpty(fetch, `${normalizedDataBaseUrl}/dwellings.json`),
    fetchJsonOrEmpty(fetch, `${normalizedDataBaseUrl}/resource-generators.json`),
    fetchJsonOrEmpty(fetch, `${normalizedDataBaseUrl}/bonus-objects.json`),
    fetchJsonOrEmpty(fetch, `${normalizedDataBaseUrl}/tavern.json`),
    fetchJsonOrEmpty(fetch, `${normalizedDataBaseUrl}/heroes.json`),
    fetchJsonOrEmpty(fetch, `${normalizedDataBaseUrl}/secondary-skills.json`),
    fetchJsonOrEmpty(fetch, `${normalizedDataBaseUrl}/artifacts.json`)
  ])

  const map = createMap(scenario.terrain, terrainTypes)
  assertKnownTerrainCodes(scenario.terrain, map)
  assertEntitiesOnPassableTiles(scenario, map)
  assertMonsterCounts(scenario)
  assertStartingResources(scenario)
  assertHeroPrimarySkills(scenario, primarySkills)
  assertTownGarrisons(scenario)

  const definitions = {
    hero,
    heroClasses,
    monsters,
    resources,
    towns,
    buildings,
    mines,
    dwellings,
    resourceGenerators,
    bonusObjects,
    tavern,
    heroes,
    secondarySkills,
    artifacts
  }
  assertTownBuildings(scenario, definitions)

  return { scenario, definitions }
}
