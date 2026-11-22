import { builder } from '@jjanczyk/object-builder'

import { ROCK } from './terrain-codes.js'

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
      // red, blue, tan, green, orange, purple, teal or pink; the player plays red.
      ownedBy(player) {
        hero.owner = player
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
      // The number of stacks it splits into in battle, as a map may set it.
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
    ownedBy(player) {
      town.owner = player
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

// A town type's entry in the scenario's `towns` definitions; it has the buildings every town has.
export const aTownDefinition = () =>
  builder({ name: 'Town', buildings: {} }, (town) => ({
    withMoat(moat) {
      town.moat = moat
    },
    withArrowTowers(towers) {
      town.arrowTowers = towers
    }
  }))

// One of a town type's arrow towers, the Keep unless told otherwise; the list's order is the
// order they shoot in. from: the lowest fort that has it. perStructure: the damage each of the
// town's structures adds; halfTheStructures: only half of them, rounded down, count. hex: where it is drawn, in the
// battle's own rows and columns; stands: 'above' or 'below' that hex, off the battlefield.
export const anArrowTower = () =>
  builder(
    {
      tower: 'KEEP',
      name: 'Keep',
      from: 'CITADEL',
      damage: { min: 10, max: 20 },
      perStructure: { min: 2, max: 4 },
      hex: { row: 5, column: 15 }
    },
    (tower) => ({
      upper() {
        Object.assign(tower, {
          tower: 'UPPER_TOWER',
          name: 'Upper Tower',
          from: 'CASTLE',
          damage: { min: 6, max: 12 },
          halfTheStructures: true,
          hex: { row: 0, column: 11 },
          stands: 'above'
        })
      },
      lower() {
        Object.assign(tower, {
          tower: 'LOWER_TOWER',
          name: 'Lower Tower',
          from: 'CASTLE',
          damage: { min: 6, max: 12 },
          halfTheStructures: true,
          hex: { row: 10, column: 11 },
          stands: 'below'
        })
      }
    })
  )

// from: the lowest fort that has it (FORT, CITADEL or CASTLE). hexes: in the battle's own rows
// and columns, which count from 0 where the battlefield's labels count from 1.
export const aMoat = () =>
  builder({
    name: 'Moat',
    from: 'CITADEL',
    damage: 70,
    defensePenalty: 3,
    stopsWalkers: true,
    hitsOnEntering: true,
    hitsAsTurnStarts: true,
    affects: ['attacker', 'defender'],
    hexes: [
      { row: 0, column: 10 },
      { row: 1, column: 10 },
      { row: 2, column: 9 },
      { row: 3, column: 9 },
      { row: 4, column: 8 },
      { row: 6, column: 8 },
      { row: 7, column: 9 },
      { row: 8, column: 9 },
      { row: 9, column: 10 },
      { row: 10, column: 10 }
    ]
  })

export const aMine = () =>
  builder({ id: 'mine-1', kind: 'MINE', type: 'GOLD_MINE', tile: { x: 1, y: 0 } }, (mine) => ({
    ...placeable(mine),
    ownedByPlayer() {
      mine.owner = 'red'
    },
    ownedBy(player) {
      mine.owner = player
    }
  }))

export const aDwelling = () =>
  builder(
    { id: 'dwelling-1', kind: 'DWELLING', type: 'GUARDHOUSE', tile: { x: 1, y: 0 } },
    (dwelling) => ({
      ...placeable(dwelling),
      ownedByPlayer() {
        dwelling.owner = 'red'
      },
      ownedBy(player) {
        dwelling.owner = player
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

// A creature with a Pikeman's stats, for a test that needs one the game data doesn't have.
export const aCreatureDefinition = () =>
  builder({
    name: 'Creature',
    namePlural: 'Creatures',
    attack: 4,
    defense: 5,
    damage: { min: 1, max: 3 },
    health: 10,
    speed: 4,
    abilities: []
  })

// kind: combat or adventure. schools: AIR, EARTH, FIRE or WATER, all four for Magic Arrow.
// costs and descriptions: at no skill, then Basic, Advanced and Expert in the spell's school.
export const aSpellDefinition = () =>
  builder(
    {
      name: 'Spell',
      level: 1,
      schools: ['AIR'],
      kind: 'combat',
      costs: [5, 4, 4, 4],
      descriptions: ['', 'Basic ', 'Advanced ', 'Expert '].map((level) => ({
        title: `${level}Spell`,
        text: `${level}spell description.`
      }))
    },
    (spell) => ({
      // The same text at every level, with the game's titles: "Magic Arrow", "Basic Magic Arrow", …
      describedAs(text) {
        spell.descriptions = ['', 'Basic ', 'Advanced ', 'Expert '].map((level) => ({
          title: `${level}${spell.name}`,
          text
        }))
      },
      // A spell with no chance in a town type never comes up in its Mage Guild.
      inMageGuildOf(townType, chance) {
        spell.mageGuildChances = { ...spell.mageGuildChances, [townType]: chance }
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
      fogOfWar: false,
      // On in the game; off here so beating the only enemy, or losing the only hero, doesn't end
      // the game unless the test is about that.
      standardVictoryAndLoss: false
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
      // Rock on every tile around (x, y) but `except` (one a town already covers, say): a hero
      // standing there can't move, and none can get to it.
      withRockAround(x, y, except = []) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const inBounds =
              x + dx >= 0 && x + dx < scenario.width && y + dy >= 0 && y + dy < scenario.height
            const isKept = except.some((tile) => tile.x === x + dx && tile.y === y + dy)
            if ((dx !== 0 || dy !== 0) && inBounds && !isKept) {
              scenario.tiles[(y + dy) * scenario.width + x + dx] = ROCK
            }
          }
        }
      },
      withStandardVictoryAndLoss() {
        scenario.standardVictoryAndLoss = true
      },
      withoutStartingResources() {
        delete scenario.startingResources
      },
      withEntities(...entities) {
        scenario.entities = entities.map((entity) => entity.build())
      }
    })
  )
