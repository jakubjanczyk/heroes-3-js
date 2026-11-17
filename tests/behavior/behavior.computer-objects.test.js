// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmMove,
  expectHeroAt,
  expectResourceNotPresent,
  getArtifactEntity,
  getHeroEntity,
  getTreasureChestEntity,
  holdRightButtonOn
} from './adventure-map.utils.js'
import {
  clickEndTurn,
  readMessage,
  readMoraleAndLuck,
  readPrimarySkills
} from './adventure-panels.utils.js'
import { castSpellFromMap } from './adventure-spells.utils.js'
import { readGameData, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { LOWEST_ROLLS } from './battle.utils.js'
import {
  aBonusObject,
  aHero,
  anArtifact,
  anArtifactDefinition,
  aResource,
  aResourceGenerator,
  aScenario,
  aSpellDefinition,
  aTown,
  aTreasureChest
} from './builders.js'

const VISIONS = aSpellDefinition()
  .withName('Visions')
  .withLevel(2)
  .withSchools(['AIR', 'EARTH', 'FIRE', 'WATER'])
  .withKind('adventure')
  .withCosts([4, 2, 2, 2])
  .describedAs('Visions description.')
  .withVisions({
    rangePerPower: [1, 1, 2, 3],
    minimumRange: 3,
    detailsFrom: { MONSTER: 0, HERO: 2, TOWN: 3 }
  })
  .build()

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: readGameData('monsters.json'),
  bonusObjects: readGameData('bonus-objects.json'),
  resourceGenerators: readGameData('resource-generators.json'),
  artifacts: {
    AXE: anArtifactDefinition()
      .withName("Centaur's Axe")
      .withSlot('WEAPON')
      .withPrimarySkills({ attack: 3 })
      .build(),
    HELM: anArtifactDefinition().withName('Helm').withSlot('HELMET').build()
  },
  spells: { VISIONS }
}

const WINDMILL_EMPTY =
  'The keeper of the mill announces: "Milord, I am sorry, there are no resources currently available. Please try again next week."'

const COMPUTER_TURN_MS = 2000

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

const ONE_ANGEL = [{ creature: 'ANGEL', count: 1 }]

// Walled in by rock at (35, 0), so neither a target nor a threat; Advanced Visions at Power 15
// reaches 30 tiles, and so every tile blue's hero walks to.
const aSeer = () =>
  aHero()
    .withArmy([{ creature: 'ANGEL', count: 10 }])
    .withPrimarySkills({ attack: 0, defense: 0, power: 15, knowledge: 10 })
    .withSecondarySkills([{ skill: 'AIR_MAGIC', level: 'ADVANCED' }])
    .withSpellBook(true)
    .withSpells(['VISIONS'])
    .at(35, 0)

const aBlueHero = ({ army = ONE_ANGEL, primarySkills = NO_SKILLS } = {}) =>
  aHero()
    .withId('hero-2')
    .ownedBy('blue')
    .withPrimarySkills(primarySkills)
    .withSecondarySkills([])
    .withArmy(army)
    .at(10, 3)

// Blue's hero starts at (10, 3); an object's entrance is at (14, 2), its other tiles to the sides
// and above it, so the hero walks along the bottom row and steps in from below. A hero walks 15
// tiles a day, at 100 a step and 141 a diagonal one.
const ENTRANCE = { x: 14, y: 2 }

const anObjectScenario = (...entities) =>
  aScenario()
    .withSize(40, 4)
    .withRockAround(35, 0)
    .withEntities(aSeer(), ...entities)
    .withDefinitions(definitions)

const anObjectOf = (type, tile = ENTRANCE) => aBonusObject().withType(type).at(tile.x, tile.y)

const setupApp = (scenario) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 } }
  })

async function endTurn(user) {
  await clickEndTurn(user)
  await waitMs(COMPUTER_TURN_MS)
}

async function startBlueTurn(scenario) {
  const app = await setupApp(scenario)
  await endTurn(app.user)
  return app
}

function blueHeroTile() {
  const { tileX, tileY } = getHeroEntity('hero-2').dataset
  return { x: Number(tileX), y: Number(tileY) }
}

async function readBlueHeroBox(user) {
  const { x, y } = blueHeroTile()
  await castSpellFromMap(user, 'Visions')
  await holdRightButtonOn(user, x, y)
  return screen.getByRole('tooltip')
}

const readBluePrimarySkills = async (user) => readPrimarySkills(await readBlueHeroBox(user))

const sumOfSkills = (skills) =>
  skills.reduce((sum, skill) => sum + Number(skill.split(' ').at(-1)), 0)

// No Attack, no Defense, Power 1 and Knowledge 1: 2 before a level.
const SKILLS_BEFORE_A_LEVEL = 2

function expectNoWindowOpen() {
  expect(screen.queryAllByRole('dialog')).toEqual([])
}

describe('computer heroes going for artifacts and map objects behavior', () => {
  describe('artifacts', () => {
    test("blue's hero walks to an unguarded artifact, picks it up and wears it", async () => {
      const { user } = await startBlueTurn(
        anObjectScenario(aBlueHero(), anArtifact().withType('AXE').at(14, 3))
      )

      expect(getArtifactEntity()).toBeNull()
      expect(await readBluePrimarySkills(user)).toContain('Attack 3')
    })

    test("blue's hero beats an artifact's guards weaker than it and takes the artifact, with no question asked", async () => {
      const { user } = await startBlueTurn(
        anObjectScenario(
          aBlueHero(),
          anArtifact()
            .withType('AXE')
            .withGuards([{ creature: 'SKELETON', count: 10 }])
            .at(14, 3)
        )
      )

      expect(getArtifactEntity()).toBeNull()
      expectNoWindowOpen()
      expect(await readBluePrimarySkills(user)).toContain('Attack 3')
    })

    test("blue's hero leaves alone an artifact guarded by more than it can beat, and goes on to its pile", async () => {
      await startBlueTurn(
        anObjectScenario(
          aBlueHero({ army: [{ creature: 'SKELETON', count: 10 }] }),
          anArtifact()
            .withType('AXE')
            .withGuards([{ creature: 'ANGEL', count: 10 }])
            .at(14, 3),
          aResource().withId('pile').at(6, 3)
        )
      )

      expect(getArtifactEntity()).toBeTruthy()
      expectResourceNotPresent('pile')
    })

    // One helm is worn, the other 64 fill the backpack.
    test("blue's hero with a full backpack leaves an artifact alone", async () => {
      await startBlueTurn(
        anObjectScenario(
          aBlueHero().withArtifacts(Array.from({ length: 65 }, () => 'HELM')),
          anArtifact().withType('AXE').at(14, 3)
        )
      )

      expect(getArtifactEntity()).toBeTruthy()
      expectHeroAt(10, 3, 'hero-2')
    })
  })

  describe('treasure chests', () => {
    // A tier 2 chest's 1000 experience takes the hero to level 2, which adds a primary skill.
    test("blue's hero opens a treasure chest and takes the experience", async () => {
      const { user } = await startBlueTurn(
        anObjectScenario(aBlueHero(), aTreasureChest().withTier(2).at(14, 3))
      )

      expect(getTreasureChestEntity()).toBeNull()
      expect(sumOfSkills(await readBluePrimarySkills(user))).toBe(SKILLS_BEFORE_A_LEVEL + 1)
    })

    test("blue's hero takes the artifact from a chest holding one", async () => {
      const { user } = await startBlueTurn(
        anObjectScenario(aBlueHero(), aTreasureChest().withTier('artifact').at(14, 3))
      )

      expect(getTreasureChestEntity()).toBeNull()
      expect(await readBluePrimarySkills(user)).toContain('Attack 3')
    })

    test("no window opens for the player when blue's hero opens a chest", async () => {
      await startBlueTurn(anObjectScenario(aBlueHero(), aTreasureChest().withTier(2).at(14, 3)))

      expectNoWindowOpen()
    })
  })

  describe('resource generators', () => {
    // Red's hero is stronger, but 16 tiles from the windmill, too far to reach it next turn, so
    // blue's hero takes it and goes back for the pile at (5, 3): 441 and 1041 of the day's 1500.
    // Red's hero gets there on the third day, in the same week.
    test("blue's hero visits a windmill, and the player's hero gets nothing from it that week", async () => {
      const { user } = await setupMovementBehaviorApp({
        loadGameOptions: aScenario()
          .withSize(40, 4)
          .withEntities(
            aHero()
              .withArmy([{ creature: 'ANGEL', count: 10 }])
              .at(30, 3),
            aBlueHero(),
            aResourceGenerator().withType('WINDMILL').at(ENTRANCE.x, ENTRANCE.y),
            aResource().withId('pile').at(5, 3)
          )
          .withDefinitions(definitions)
          .build(),
        appConfig: { random: LOWEST_ROLLS }
      })
      await endTurn(user)
      await confirmMove(user, ENTRANCE.x, ENTRANCE.y)
      await endTurn(user)

      await confirmMove(user, ENTRANCE.x, ENTRANCE.y)

      expectHeroAt(ENTRANCE.x, ENTRANCE.y)
      expect(readMessage()).toBe(WINDMILL_EMPTY)
    })

    test("no message opens for the player when blue's hero visits a windmill", async () => {
      await startBlueTurn(
        anObjectScenario(
          aBlueHero(),
          aResourceGenerator().withType('WINDMILL').at(ENTRANCE.x, ENTRANCE.y)
        )
      )

      expectHeroAt(ENTRANCE.x, ENTRANCE.y, 'hero-2')
      expectNoWindowOpen()
    })
  })

  describe('bonus objects', () => {
    test("blue's hero visits a once-per-hero object and gains its skill", async () => {
      const { user } = await startBlueTurn(
        anObjectScenario(aBlueHero(), anObjectOf('MERCENARY_CAMP'))
      )

      expectHeroAt(ENTRANCE.x, ENTRANCE.y, 'hero-2')
      expect(await readBluePrimarySkills(user)).toContain('Attack 1')
    })

    // The second ring at (11, 0) is a 241 detour from the first at (12, 2) and 241 back; with it,
    // the walk to the pile at (23, 3) comes to 1805 of the day's 1500, without it 1382.
    test("blue's hero with luck from a Faerie Ring passes another one for a pile beyond it", async () => {
      const { user } = await startBlueTurn(
        anObjectScenario(
          aBlueHero(),
          anObjectOf('FAERIE_RING', { x: 12, y: 2 }).withId('ring-1'),
          anObjectOf('FAERIE_RING', { x: 11, y: 0 }).withId('ring-2'),
          aResource().withId('pile').at(23, 3)
        )
      )

      expectResourceNotPresent('pile')
      expect(readMoraleAndLuck(await readBlueHeroBox(user))).toContain('Luck +1')
    })

    test("blue's hero pays for a Tree of Knowledge and gains a level when blue can pay", async () => {
      const { user } = await startBlueTurn(
        anObjectScenario(
          aBlueHero(),
          anObjectOf('TREE_OF_KNOWLEDGE').withPrice({ GOLD_PILE: 2000 })
        )
      )

      expectHeroAt(ENTRANCE.x, ENTRANCE.y, 'hero-2')
      expect(sumOfSkills(await readBluePrimarySkills(user))).toBe(SKILLS_BEFORE_A_LEVEL + 1)
      expectNoWindowOpen()
    })

    // Blue starts with 4 gems.
    test("blue's hero leaves alone a Tree of Knowledge blue can't pay", async () => {
      await startBlueTurn(
        anObjectScenario(aBlueHero(), anObjectOf('TREE_OF_KNOWLEDGE').withPrice({ GEMS_PILE: 10 }))
      )

      expectHeroAt(10, 3, 'hero-2')
    })

    // Blue's town saves for its Town Hall at 8000, 500 more than blue has, and keeps all its gold.
    test("blue's hero leaves alone a Tree of Knowledge it could only pay for with what blue keeps", async () => {
      const buildings = readGameData('buildings.json')
      const scenario = anObjectScenario(
        aBlueHero(),
        anObjectOf('TREE_OF_KNOWLEDGE').withPrice({ GOLD_PILE: 2000 }),
        aTown().ownedBy('blue').withBuildings(['TAVERN']).at(25, 3)
      ).withDefinitions({
        ...definitions,
        towns: readGameData('towns.json'),
        buildings: {
          ...buildings,
          TOWN_HALL: { ...buildings.TOWN_HALL, cost: { GOLD_PILE: 8000 } }
        }
      })

      await startBlueTurn(scenario)

      expectHeroAt(10, 3, 'hero-2')
    })

    test.each([
      { lower: 'Attack', skills: { attack: 0, defense: 1 }, gains: ['Attack 2', 'Defense 1'] },
      { lower: 'Defense', skills: { attack: 1, defense: 0 }, gains: ['Attack 1', 'Defense 2'] },
      { lower: 'neither', skills: { attack: 0, defense: 0 }, gains: ['Attack 2', 'Defense 0'] }
    ])("blue's hero whose lower skill is $lower takes $gains at an Arena", async ({
      skills,
      gains
    }) => {
      const { user } = await startBlueTurn(
        anObjectScenario(
          aBlueHero({ primarySkills: { ...NO_SKILLS, ...skills } }),
          anObjectOf('ARENA')
        )
      )

      expect((await readBluePrimarySkills(user)).slice(0, 2)).toEqual(gains)
      expectNoWindowOpen()
    })

    test("blue's hero pays 1000 gold at a School of War for its lower skill of Attack and Defense", async () => {
      const { user } = await startBlueTurn(
        anObjectScenario(
          aBlueHero({ primarySkills: { ...NO_SKILLS, attack: 3, defense: 1 } }),
          anObjectOf('SCHOOL_OF_WAR')
        )
      )

      expect((await readBluePrimarySkills(user)).slice(0, 2)).toEqual(['Attack 3', 'Defense 2'])
    })

    test("blue's hero leaves a School of Magic alone", async () => {
      await startBlueTurn(anObjectScenario(aBlueHero(), anObjectOf('SCHOOL_OF_MAGIC')))

      expectHeroAt(10, 3, 'hero-2')
    })

    test("blue's hero learns a Witch Hut's skill", async () => {
      const { user } = await startBlueTurn(
        anObjectScenario(aBlueHero(), anObjectOf('WITCH_HUT').withSkill('LUCK'))
      )

      expect(readMoraleAndLuck(await readBlueHeroBox(user))).toContain('Luck +1')
    })

    test("blue's hero leaves alone a Witch Hut whose skill it knows", async () => {
      await startBlueTurn(
        anObjectScenario(
          aBlueHero().withSecondarySkills([{ skill: 'LUCK', level: 'BASIC' }]),
          anObjectOf('WITCH_HUT').withSkill('LUCK')
        )
      )

      expectHeroAt(10, 3, 'hero-2')
    })

    test("blue's hero with no free skill slot leaves a Witch Hut alone", async () => {
      const eightSkills = [
        'PATHFINDING',
        'LOGISTICS',
        'SCOUTING',
        'WISDOM',
        'MYSTICISM',
        'TACTICS',
        'OFFENSE',
        'ARMORER'
      ].map((skill) => ({ skill, level: 'BASIC' }))
      await startBlueTurn(
        anObjectScenario(
          aBlueHero().withSecondarySkills(eightSkills),
          anObjectOf('WITCH_HUT').withSkill('LUCK')
        )
      )

      expectHeroAt(10, 3, 'hero-2')
    })

    test("blue's hero below the Library of Enlightenment's level leaves it alone", async () => {
      await startBlueTurn(anObjectScenario(aBlueHero(), anObjectOf('LIBRARY_OF_ENLIGHTENMENT')))

      expectHeroAt(10, 3, 'hero-2')
    })

    test("no message or choice opens for the player when blue's hero visits an object", async () => {
      await startBlueTurn(anObjectScenario(aBlueHero(), anObjectOf('MERCENARY_CAMP')))

      expectHeroAt(ENTRANCE.x, ENTRANCE.y, 'hero-2')
      expectNoWindowOpen()
    })
  })
})
