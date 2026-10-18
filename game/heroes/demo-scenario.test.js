import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

import { createMap } from '../../engine/map.js'
import { findPath } from '../../engine/pathfinding.js'
import { buildWorld } from '../build-world.js'
import { createEntityBehaviors } from '../domain/entity-behaviors.js'
import { findHero, isTown } from '../domain/entity-queries.js'
import { heroesContent } from './content.js'

function readDemoScenario() {
  return JSON.parse(readFileSync(new URL('../../scenarios/scenario.json', import.meta.url), 'utf8'))
}

const tileKey = (tile) => `${tile.x},${tile.y}`

// Every tile reachable from `start` by walking road tiles only.
function roadNetworkFrom(map, start) {
  const reached = new Set([tileKey(start)])
  const queue = [start]
  while (queue.length > 0) {
    const tile = queue.shift()
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const next = { x: tile.x + dx, y: tile.y + dy }
        if (!reached.has(tileKey(next)) && map.getRoadType(next)) {
          reached.add(tileKey(next))
          queue.push(next)
        }
      }
    }
  }
  return reached
}

// Validates the real scenario data: a broken map would otherwise only show up while playing.
describe('demo scenario towns', () => {
  test('every town footprint fits on the map and every town is reachable', () => {
    const scenario = readDemoScenario()
    const entityBehaviors = createEntityBehaviors(heroesContent.entityBehaviors)
    const { map, staticOccupancy } = buildWorld({
      scenario,
      entityBehaviors,
      terrainTypes: heroesContent.terrainTypes
    })
    const towns = scenario.entities.filter(isTown)
    const hero = findHero(scenario.entities)

    expect(towns.length).toBeGreaterThanOrEqual(1)
    expect(hero).toBeTruthy()

    for (const town of towns) {
      for (const offset of entityBehaviors.getFootprintOffsets(town)) {
        const tile = { x: town.tile.x + offset.x, y: town.tile.y + offset.y }
        expect(map.inBounds(tile)).toBe(true)
        expect(staticOccupancy.getAt(tile)).not.toBe(null)
      }

      const path = findPath({
        fromTile: hero.tile,
        toTile: town.tile,
        map,
        isBlocked: (tile) => {
          const occupant = staticOccupancy.getAt(tile)
          return occupant !== null && occupant.id !== town.id
        }
      })

      expect(path?.length).toBeGreaterThan(1)
    }
  })

  test("a road leads from the hero's start to every town", () => {
    const scenario = readDemoScenario()
    const map = createMap(scenario.terrain, heroesContent.terrainTypes, heroesContent.roadTypes)
    const hero = findHero(scenario.entities)

    expect(map.getRoadType(hero.tile)).toBeTruthy()
    const roadNetwork = roadNetworkFrom(map, hero.tile)
    const townsOffRoad = scenario.entities
      .filter(isTown)
      .filter((town) => !roadNetwork.has(tileKey(town.tile)))
      .map((town) => town.id)

    expect(townsOffRoad).toEqual([])
  })
})
