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

const PRIMARY_SKILLS = [
  { key: 'attack', minimum: 0 },
  { key: 'defense', minimum: 0 },
  { key: 'power', minimum: 1 },
  { key: 'knowledge', minimum: 1 }
]

const TERRAIN_TYPES = {
  0: { name: 'grass', passable: true },
  1: { name: 'rock', passable: false },
  9: { name: 'water', passable: false }
}

describe('bootstrap', () => {
  test('loadGame loads scenario and definitions', async () => {
    const scenario = {
      meta: { id: 'demo', name: 'Demo', width: 3, height: 2 },
      terrain: { width: 3, height: 2, tiles: [0, 1, 0, 0, 0, 1] },
      entities: [
        { id: 'hero', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
        { id: 'm1', kind: 'MONSTER', type: 'SKELETON', count: 12, tile: { x: 2, y: 0 } },
        { id: 'r1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 0, y: 1 } },
        { id: 't1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 1 } }
      ]
    }

    const definitions = {
      hero: { id: 'HERO', name: 'Hero', heroClass: 'KNIGHT' },
      heroClasses: {
        KNIGHT: { name: 'Knight', primarySkills: { attack: 2, defense: 2, power: 1, knowledge: 1 } }
      },
      monsters: { SKELETON: { name: 'Skeleton' } },
      resources: { GOLD_PILE: { name: 'Gold Pile', amount: 100 } },
      towns: { CASTLE: { name: 'Castle' } },
      buildings: { TAVERN: { name: 'Tavern', cost: { GOLD_PILE: 500 } } },
      mines: { GOLD_MINE: { name: 'Gold mine' } }
    }

    const fetch = createFakeFetch({
      './scenarios/scenario.json': scenario,
      './game/data/hero.json': definitions.hero,
      './game/data/hero-classes.json': definitions.heroClasses,
      './game/data/monsters.json': definitions.monsters,
      './game/data/resources.json': definitions.resources,
      './game/data/towns.json': definitions.towns,
      './game/data/buildings.json': definitions.buildings,
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
      entities: [
        { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', count: 12, tile: { x: 1, y: 0 } }
      ]
    }

    const fetch = createFakeFetch({
      './scenarios/scenario.json': scenario,
      './game/data/hero.json': { id: 'HERO', name: 'Hero' },
      './game/data/hero-classes.json': {},
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
      './game/data/hero-classes.json': {},
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
      entities: [
        { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', count: 12, tile: { x: 1, y: 0 } }
      ]
    }

    const fetch = createFakeFetch({
      './scenarios/scenario.json': scenario,
      './game/data/hero.json': { id: 'HERO', name: 'Hero' },
      './game/data/hero-classes.json': {},
      './game/data/monsters.json': { SKELETON: { name: 'Skeleton' } },
      './game/data/resources.json': {},
      './game/data/towns.json': {}
    })

    await expect(loadGame({ fetch, terrainTypes: TERRAIN_TYPES })).rejects.toThrow(
      'Entity monster-1 (MONSTER) must be placed on a passable tile: (1, 0)'
    )
  })

  test('loadGame rejects scenarios with a monster without a count', async () => {
    const fetch = fakeFetchWithMonster({
      id: 'monster-1',
      kind: 'MONSTER',
      type: 'SKELETON',
      tile: { x: 1, y: 0 }
    })

    await expect(loadGame({ fetch, terrainTypes: TERRAIN_TYPES })).rejects.toThrow(
      'Monster monster-1 must have a count that is a positive whole number'
    )
  })

  test.each([
    0,
    -3,
    2.5,
    '12'
  ])('loadGame rejects scenarios with a monster count of %j', async (count) => {
    const fetch = fakeFetchWithMonster({
      id: 'monster-1',
      kind: 'MONSTER',
      type: 'SKELETON',
      count,
      tile: { x: 1, y: 0 }
    })

    await expect(loadGame({ fetch, terrainTypes: TERRAIN_TYPES })).rejects.toThrow(
      'Monster monster-1 must have a count that is a positive whole number'
    )
  })

  // A Heroes 3 map may set how many stacks a monster splits into: one to seven.
  test.each([
    0,
    8,
    2.5,
    '3'
  ])('loadGame rejects scenarios with a monster split into %j stacks', async (stacks) => {
    const fetch = fakeFetchWithMonster({
      id: 'monster-1',
      kind: 'MONSTER',
      type: 'SKELETON',
      count: 12,
      stacks,
      tile: { x: 1, y: 0 }
    })

    await expect(loadGame({ fetch, terrainTypes: TERRAIN_TYPES })).rejects.toThrow(
      'Monster monster-1 must split into 1 to 7 stacks'
    )
  })

  test.each([
    -5,
    2.5,
    '100'
  ])('loadGame rejects scenarios with a starting resource amount of %j', async (amount) => {
    const fetch = fakeFetchWithScenario({ startingResources: { GOLD_PILE: amount } })

    await expect(loadGame({ fetch, terrainTypes: TERRAIN_TYPES })).rejects.toThrow(
      'Starting resource GOLD_PILE must be a whole number of at least 0'
    )
  })

  test('loadGame rejects scenarios with a hero primary skill it does not know', async () => {
    const fetch = fakeFetchWithHero({ primarySkills: { atack: 3 } })

    await expect(
      loadGame({ fetch, terrainTypes: TERRAIN_TYPES, primarySkills: PRIMARY_SKILLS })
    ).rejects.toThrow('Hero hero has an unknown primary skill atack')
  })

  // The Heroes 3 minimums: Attack and Defense 0, Power and Knowledge 1.
  test.each([
    ['attack', 2.5, 0],
    ['knowledge', '3', 1],
    ['attack', -1, 0],
    ['defense', -1, 0],
    ['power', 0, 1],
    ['knowledge', 0, 1]
  ])('loadGame rejects scenarios with a hero %s of %j', async (skill, value, minimum) => {
    const fetch = fakeFetchWithHero({ primarySkills: { [skill]: value } })

    await expect(
      loadGame({ fetch, terrainTypes: TERRAIN_TYPES, primarySkills: PRIMARY_SKILLS })
    ).rejects.toThrow(`Hero hero must have ${skill} as a whole number of at least ${minimum}`)
  })

  test('loadGame rejects scenarios with a town building its town type does not have', async () => {
    const fetch = createFakeFetch({
      './scenarios/scenario.json': {
        meta: { id: 'demo', name: 'Demo', width: 2, height: 1 },
        terrain: { width: 2, height: 1, tiles: [0, 0] },
        entities: [
          { id: 'hero', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'town', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 }, buildings: ['TAVRN'] }
        ]
      },
      './game/data/hero.json': { id: 'HERO', name: 'Hero' },
      './game/data/hero-classes.json': {},
      './game/data/monsters.json': {},
      './game/data/resources.json': {},
      './game/data/towns.json': { CASTLE: { name: 'Castle', buildings: {} } },
      './game/data/buildings.json': { TAVERN: { name: 'Tavern', cost: { GOLD_PILE: 500 } } }
    })

    await expect(loadGame({ fetch, terrainTypes: TERRAIN_TYPES })).rejects.toThrow(
      'Town town has an unknown building TAVRN'
    )
  })
})

function fakeFetchWithHero(heroFields) {
  return fakeFetchWithScenario({
    entities: [{ id: 'hero', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 }, ...heroFields }]
  })
}

function fakeFetchWithScenario(scenarioFields) {
  return createFakeFetch({
    './scenarios/scenario.json': {
      meta: { id: 'demo', name: 'Demo', width: 2, height: 1 },
      terrain: { width: 2, height: 1, tiles: [0, 0] },
      entities: [{ id: 'hero', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }],
      ...scenarioFields
    },
    './game/data/hero.json': { id: 'HERO', name: 'Hero' },
    './game/data/hero-classes.json': {},
    './game/data/monsters.json': {},
    './game/data/resources.json': {},
    './game/data/towns.json': {}
  })
}

function fakeFetchWithMonster(monster) {
  return createFakeFetch({
    './scenarios/scenario.json': {
      meta: { id: 'demo', name: 'Demo', width: 2, height: 1 },
      terrain: { width: 2, height: 1, tiles: [0, 0] },
      entities: [{ id: 'hero', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }, monster]
    },
    './game/data/hero.json': { id: 'HERO', name: 'Hero' },
    './game/data/hero-classes.json': {},
    './game/data/monsters.json': { SKELETON: { name: 'Skeleton' } },
    './game/data/resources.json': {},
    './game/data/towns.json': {}
  })
}
