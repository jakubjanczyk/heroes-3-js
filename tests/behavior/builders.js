import { builder } from '@jjanczyk/object-builder'

const placeable = (entity) => ({
  at(x, y) {
    entity.tile = { x, y }
  }
})

export const aHero = () =>
  builder(
    {
      id: 'hero-1',
      kind: 'HERO',
      type: 'HERO',
      tile: { x: 0, y: 0 },
      army: [{ creature: 'SKELETON', count: 10 }]
    },
    (hero) => ({
      ...placeable(hero),
      withPrimarySkills(primarySkills) {
        hero.primarySkills = primarySkills
      },
      withExperience(experience) {
        hero.experience = experience
      },
      // Up to seven slots in order; null leaves a slot empty.
      withArmy(army) {
        hero.army = army
      }
    })
  )

// With the game's creature data, ten Angels beat the monsters tests fight, often in one strike.
export const ARMY_THAT_WINS = [{ creature: 'ANGEL', count: 10 }]

export const aMonster = () =>
  builder(
    { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', count: 10, tile: { x: 1, y: 0 } },
    (monster) => ({
      ...placeable(monster),
      // The number of stacks it splits into in battle, as a Heroes 3 map may set it.
      withStacks(stacks) {
        monster.stacks = stacks
      }
    })
  )

export const aResource = () =>
  builder(
    { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 1, y: 0 } },
    placeable
  )

export const aTown = () =>
  builder({ id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 } }, (town) => ({
    ...placeable(town),
    named(name) {
      town.name = name
    },
    ownedByPlayer() {
      town.owner = 'red'
    },
    // Building ids, as in the town's `buildings` in game/data; the Village Hall always stands.
    withBuildings(buildings) {
      town.buildings = buildings
    },
    // Seven slots at most, as a hero's army; null leaves a slot empty.
    withGarrison(garrison) {
      town.garrison = garrison
    }
  }))

export const aMine = () =>
  builder({ id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE', tile: { x: 1, y: 0 } }, (mine) => ({
    ...placeable(mine),
    ownedByPlayer() {
      mine.owner = 'red'
    }
  }))

export const aDwelling = () =>
  builder(
    { id: 'dwelling-1', kind: 'DWELLING', type: 'GUARDHOUSE', tile: { x: 1, y: 0 } },
    (dwelling) => ({
      ...placeable(dwelling),
      ownedByPlayer() {
        dwelling.owner = 'red'
      }
    })
  )

// WINDMILL, WATER_WHEEL or MYSTICAL_GARDEN; the tile is its entrance, the right of its two tiles.
export const aResourceGenerator = () =>
  builder(
    { id: 'generator-1', kind: 'RESOURCE_GENERATOR', type: 'WINDMILL', tile: { x: 1, y: 0 } },
    placeable
  )

// LEARNING_STONE, MERCENARY_CAMP, MARLETTO_TOWER, STAR_AXIS, GARDEN_OF_REVELATION, ARENA,
// SCHOOL_OF_WAR or SCHOOL_OF_MAGIC; the tile is its entrance.
export const aBonusObject = () =>
  builder(
    { id: 'bonus-1', kind: 'BONUS_OBJECT', type: 'MERCENARY_CAMP', tile: { x: 1, y: 0 } },
    placeable
  )

// The tile is the bottom-right corner of the obstacle's picture; its type is a key of the
// scenario's own `obstacles` definitions.
export const anObstacle = () =>
  builder({ id: 'obstacle-1', kind: 'OBSTACLE', type: 'MOUNTAIN', tile: { x: 1, y: 0 } }, placeable)

// Tier 1, 2 or 3: 1000, 1500 or 2000 gold, or 500, 1000 or 1500 experience; or 'artifact'.
export const aTreasureChest = () =>
  builder(
    {
      id: 'chest-1',
      kind: 'TREASURE_CHEST',
      type: 'TREASURE_CHEST',
      tier: 2,
      tile: { x: 1, y: 0 }
    },
    (chest) => ({
      ...placeable(chest),
      // The game rolls what the chest holds.
      withRandomContents() {
        delete chest.tier
      }
    })
  )

// The artifact's `type` names its entry in the scenario's `artifacts` definitions.
export const anArtifact = () =>
  builder({ id: 'artifact-1', kind: 'ARTIFACT', type: 'ARTIFACT', tile: { x: 1, y: 0 } }, placeable)

// slot: HELMET, CAPE, NECKLACE, WEAPON, SHIELD, TORSO, RING, FEET or MISC.
// class: TREASURE, MINOR, MAJOR or RELIC.
export const anArtifactDefinition = () =>
  builder(
    { name: 'Artifact', slot: 'WEAPON', class: 'TREASURE', primarySkills: {} },
    (artifact) => ({
      // Two worn copies both count, as with Quiet Eye of the Dragon.
      stacking() {
        artifact.stacks = true
      }
    })
  )

export const aScenario = () =>
  builder(
    {
      width: 6,
      height: 1,
      tiles: new Array(6).fill(0),
      entities: [aHero().build()],
      definitions: {},
      startingResources: {},
      // On in the game; off here so a test sees the whole map unless it is about fog of war.
      fogOfWar: false
    },
    (scenario) => ({
      withSize(width, height = 1) {
        scenario.width = width
        scenario.height = height
        scenario.tiles = new Array(width * height).fill(0)
      },
      withRoads(roads) {
        scenario.roads = roads
      },
      withoutStartingResources() {
        delete scenario.startingResources
      },
      withEntities(...entities) {
        scenario.entities = entities.map((entity) => entity.build())
      }
    })
  )
