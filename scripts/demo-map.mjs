import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { buildWorld } from '../game/build-world.js'
import { createEntityBehaviors } from '../game/domain/entity-behaviors.js'
import { heroesContent } from '../game/heroes/content.js'
import { loadGame } from '../game/load.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCENARIO_PATH = 'scenarios/scenario.json'

const NEIGHBOUR_OFFSETS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1]
]

const ENTITY_LETTERS = {
  HERO: 'H',
  MONSTER: 'M',
  TOWN: 'T',
  ARTIFACT: 'A',
  RESOURCE: 'R',
  TREASURE_CHEST: 'C'
}

export async function readDemoScenario() {
  return JSON.parse(await readFile(path.join(repoRoot, SCENARIO_PATH), 'utf8'))
}

// Loads the scenario the way the app does, so blocked tiles come from the objects' own footprints.
export async function loadWorld(scenario) {
  const fetch = async (url) => {
    if (url.endsWith(SCENARIO_PATH)) return Response.json(scenario)
    return new Response(await readFile(path.join(repoRoot, url)))
  }
  const loaded = await loadGame({
    fetch,
    terrainTypes: heroesContent.terrainTypes,
    primarySkills: heroesContent.primarySkills
  })
  const { map, staticOccupancy } = buildWorld({
    ...loaded,
    entityBehaviors: createEntityBehaviors(heroesContent.entityBehaviors),
    terrainTypes: heroesContent.terrainTypes,
    roadTypes: heroesContent.roadTypes
  })
  const heroTiles = new Set(
    scenario.entities.filter(({ kind }) => kind === 'HERO').map(({ tile }) => `${tile.x},${tile.y}`)
  )
  const inside = ({ x, y }) =>
    x >= 0 && y >= 0 && x < scenario.terrain.width && y < scenario.terrain.height
  const isFree = (tile) =>
    inside(tile) &&
    map.isPassable(tile) &&
    !staticOccupancy.getAt(tile) &&
    !heroTiles.has(`${tile.x},${tile.y}`)
  return { scenario, map, staticOccupancy, inside, isFree }
}

export function freeTilesNextTo(world, { x, y }) {
  return NEIGHBOUR_OFFSETS.map(([dx, dy]) => ({ x: x + dx, y: y + dy })).filter(world.isFree)
}

function tileSymbol(world, tile) {
  const occupant = world.scenario.entities.find(
    (entity) => entity.tile.x === tile.x && entity.tile.y === tile.y
  )
  if (occupant) return ENTITY_LETTERS[occupant.kind] ?? 'o'
  if (!world.map.isPassable(tile)) return '#'
  if (world.staticOccupancy.getAt(tile)) return 'x'
  return '.'
}

function printArea(world, center, radius) {
  const columns = []
  for (let x = center.x - radius; x <= center.x + radius; x += 1) columns.push(x)
  const rows = []
  for (let y = center.y - radius; y <= center.y + radius; y += 1) rows.push(y)
  console.log(`     ${columns.map((x) => String(x).padStart(3)).join('')}`)
  for (const y of rows) {
    const cells = columns.map((x) => {
      const tile = { x, y }
      return world.inside(tile) ? `  ${tileSymbol(world, tile)}` : '   '
    })
    console.log(`${String(y).padStart(4)} ${cells.join('')}`)
  }
  console.log(
    '\nH hero, M monster, T town, A artifact, R resource, C chest, o other object (its entrance),'
  )
  console.log('x blocked by an object, # impassable terrain, . free\n')
  for (const entity of world.scenario.entities) {
    const { x, y } = entity.tile
    if (Math.abs(x - center.x) > radius || Math.abs(y - center.y) > radius) continue
    if (entity.kind === 'OBSTACLE') continue
    const count = entity.count ? ` ×${entity.count}` : ''
    const type = entity.type && entity.type !== entity.kind ? ` ${entity.type}` : ''
    console.log(`(${x}, ${y}) ${entity.id}: ${entity.kind}${type}${count}`)
  }
}

const isCommandLine =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCommandLine) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { radius: { type: 'string', default: '6' } }
  })
  const world = await loadWorld(await readDemoScenario())
  const hero = world.scenario.entities.find(({ id }) => id === 'hero-1')
  const center = positionals[0]
    ? Object.fromEntries(positionals[0].split(',').map((n, i) => [i ? 'y' : 'x', Number(n)]))
    : hero.tile
  printArea(world, center, Number(values.radius))
}
