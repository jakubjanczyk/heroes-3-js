import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

import { findPath } from '../../engine/pathfinding.js'
import { buildWorld } from '../build-world.js'
import { createEntityBehaviors } from '../domain/entity-behaviors.js'
import { findHero, isTown } from '../domain/entity-queries.js'
import { heroesContent } from './content.js'

// Validates the real scenario data: a broken map would otherwise only show up while playing.
describe('demo scenario towns', () => {
  test('every town footprint fits on the map and every town is reachable', () => {
    const scenario = JSON.parse(
      readFileSync(new URL('../../scenarios/scenario.json', import.meta.url), 'utf8')
    )
    const entityBehaviors = createEntityBehaviors(heroesContent.entityBehaviors)
    const { map, staticOccupancy } = buildWorld({ scenario, entityBehaviors })
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
})
