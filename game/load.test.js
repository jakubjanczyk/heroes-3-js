import { describe, expect, test } from 'vitest'

import { loadGame } from './load.js'

function createFakeFetch(urlToJson) {
  return async (url) => {
    if (!(url in urlToJson)) {
      return {
        ok: false,
        status: 404,
        json: async () => {
          throw new Error('not found')
        }
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => urlToJson[url]
    }
  }
}

const TERRAIN_TYPES = {
  0: { name: 'grass', passable: true },
  1: { name: 'rock', passable: false },
  9: { name: 'water', passable: false }
}

const ROAD_TYPES = {
  1: { name: 'dirt', movementCost: 75 }
}

function aFetchForTerrain(terrain) {
  return createFakeFetch({
    './scenarios/scenario.json': {
      meta: { id: 'demo' },
      terrain,
      entities: [{ id: 'hero', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
    },
    './game/data/hero.json': { id: 'HERO', name: 'Hero' },
    './game/data/monsters.json': {},
    './game/data/resources.json': {},
    './game/data/towns.json': {}
  })
}

function loadTerrain(terrain) {
  return loadGame({
    fetch: aFetchForTerrain(terrain),
    terrainTypes: TERRAIN_TYPES,
    roadTypes: ROAD_TYPES
  })
}

describe('bootstrap', () => {
  test('loadGame loads scenario and definitions', async () => {
    const scenario = {
      meta: { id: 'demo', name: 'Demo', width: 3, height: 2 },
      terrain: { width: 3, height: 2, tiles: [0, 1, 0, 0, 0, 1] },
      entities: [
        { id: 'hero', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'm1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 2, y: 0 } },
        { id: 'r1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 0, y: 1 } },
        { id: 't1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 1 } }
      ]
    }

    const definitions = {
      hero: { id: 'HERO', name: 'Hero' },
      monsters: { SKELETON: { name: 'Skeleton' } },
      resources: { GOLD_PILE: { name: 'Gold Pile', amount: 100 } },
      towns: { CASTLE: { name: 'Castle' } },
      mines: { GOLD_MINE: { name: 'Gold mine' } }
    }

    const fetch = createFakeFetch({
      './scenarios/scenario.json': scenario,
      './game/data/hero.json': definitions.hero,
      './game/data/monsters.json': definitions.monsters,
      './game/data/resources.json': definitions.resources,
      './game/data/towns.json': definitions.towns,
      './game/data/mines.json': definitions.mines
    })

    const loaded = await loadGame({ fetch })

    expect(loaded.scenario.meta.id).toBe('demo')
    expect(loaded.scenario.entities).toHaveLength(4)
    expect(loaded.definitions).toEqual(definitions)
  })

  test('loadGame rejects scenarios where entity is on blocked tile', async () => {
    const scenario = {
      meta: { id: 'demo', name: 'Demo', width: 2, height: 1 },
      terrain: { width: 2, height: 1, tiles: [0, 1] },
      entities: [{ id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } }]
    }

    const fetch = createFakeFetch({
      './scenarios/scenario.json': scenario,
      './game/data/hero.json': { id: 'HERO', name: 'Hero' },
      './game/data/monsters.json': { SKELETON: { name: 'Skeleton' } },
      './game/data/resources.json': {},
      './game/data/towns.json': {}
    })

    await expect(loadGame({ fetch })).rejects.toThrow(
      'Entity monster-1 (MONSTER) must be placed on a passable tile: (1, 0)'
    )
  })

  test('loadGame rejects scenarios with an unknown terrain code', async () => {
    const scenario = {
      meta: { id: 'demo', name: 'Demo', width: 2, height: 1 },
      terrain: { width: 2, height: 1, tiles: [0, 42] },
      entities: [{ id: 'hero', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
    }

    const fetch = createFakeFetch({
      './scenarios/scenario.json': scenario,
      './game/data/hero.json': { id: 'HERO', name: 'Hero' },
      './game/data/monsters.json': {},
      './game/data/resources.json': {},
      './game/data/towns.json': {}
    })

    await expect(loadGame({ fetch, terrainTypes: TERRAIN_TYPES })).rejects.toThrow(
      'Unknown terrain code 42 at tile (1, 0)'
    )
  })

  test('loadGame rejects scenarios where entity is on water', async () => {
    const scenario = {
      meta: { id: 'demo', name: 'Demo', width: 2, height: 1 },
      terrain: { width: 2, height: 1, tiles: [0, 9] },
      entities: [{ id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } }]
    }

    const fetch = createFakeFetch({
      './scenarios/scenario.json': scenario,
      './game/data/hero.json': { id: 'HERO', name: 'Hero' },
      './game/data/monsters.json': { SKELETON: { name: 'Skeleton' } },
      './game/data/resources.json': {},
      './game/data/towns.json': {}
    })

    await expect(loadGame({ fetch, terrainTypes: TERRAIN_TYPES })).rejects.toThrow(
      'Entity monster-1 (MONSTER) must be placed on a passable tile: (1, 0)'
    )
  })

  test('loadGame loads a scenario without roads', async () => {
    const loaded = await loadTerrain({ width: 2, height: 1, tiles: [0, 0] })

    expect(loaded.scenario.terrain.roads).toBeUndefined()
  })

  test('loadGame rejects scenarios with an unknown road code', async () => {
    await expect(
      loadTerrain({ width: 2, height: 1, tiles: [0, 0], roads: [0, 7] })
    ).rejects.toThrow('Unknown road code 7 at tile (1, 0)')
  })

  test.each([
    ['rock', 1],
    ['water', 9]
  ])('loadGame rejects scenarios with a road on %s', async (_, terrainCode) => {
    await expect(
      loadTerrain({ width: 2, height: 1, tiles: [0, terrainCode], roads: [1, 1] })
    ).rejects.toThrow('Road must be on passable terrain: (1, 0)')
  })

  test('loadGame rejects scenarios whose roads do not match the tiles', async () => {
    await expect(loadTerrain({ width: 2, height: 1, tiles: [0, 0], roads: [1] })).rejects.toThrow(
      'Terrain roads must have one entry per tile (2), got 1'
    )
  })
})
