// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmTileClickByDispatch,
  expectHeroAt,
  expectResourceNotPresent,
  holdRightButtonOn
} from './adventure-map.utils.js'
import { clickEndTurn, readArmySlots } from './adventure-panels.utils.js'
import { castSpellFromMap } from './adventure-spells.utils.js'
import {
  createMemoryEventLog,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  ARMY_THAT_WINS,
  aDwelling,
  aHero,
  aMine,
  aResource,
  aScenario,
  aSpellDefinition,
  aTown
} from './builders.js'
import { readAvailable } from './recruit-window.utils.js'
import { openRecruitWindow } from './town-screen.utils.js'

const monsters = readGameData('monsters.json')
const towns = readGameData('towns.json')
const buildings = readGameData('buildings.json')

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

// Every building costs more than blue has, so blue's town builds nothing unless a test makes one
// cheaper; computer players start with 7500 gold, 10 wood, 10 ore and 4 of each rare resource.
const DEAR = { GOLD_PILE: 100000 }

function definitionsWith({ buildingCosts = {}, creatureCosts = {} } = {}) {
  const priced = (catalogue) =>
    Object.fromEntries(
      Object.entries(catalogue).map(([buildingId, building]) => [
        buildingId,
        { ...building, cost: buildingCosts[buildingId] ?? DEAR }
      ])
    )
  return {
    hero: readGameData('hero.json'),
    heroClasses: readGameData('hero-classes.json'),
    heroes: readGameData('heroes.json'),
    secondarySkills: readGameData('secondary-skills.json'),
    resources: readGameData('resources.json'),
    dwellings: readGameData('dwellings.json'),
    mines: readGameData('mines.json'),
    tavern: readGameData('tavern.json'),
    monsters: Object.fromEntries(
      Object.entries(monsters).map(([creature, monster]) => [
        creature,
        creatureCosts[creature] ? { ...monster, cost: creatureCosts[creature] } : monster
      ])
    ),
    buildings: priced(buildings),
    towns: { ...towns, CASTLE: { ...towns.CASTLE, buildings: priced(towns.CASTLE.buildings) } },
    spells: { VISIONS }
  }
}

const COMPUTER_TURN_MS = 2000
const PLAYER_WALK_MS = 1000

// Blue's town has its entrance at (15, 3) and covers the two tiles either side of it and the rows
// above. The player's hero below it sees 4 tiles with Advanced Visions: (15, 3) is 3.2 away.
const TOWN = { x: 15, y: 3 }

// Too strong for blue's hero to attack.
const aSeer = () =>
  aHero()
    .withArmy(ARMY_THAT_WINS)
    .withPrimarySkills({ power: 2, knowledge: 10 })
    .withSecondarySkills([{ skill: 'AIR_MAGIC', level: 'ADVANCED' }])
    .withSpellBook(true)
    .withSpells(['VISIONS'])

const aBlueHero = (army = [{ creature: 'SWORDSMAN', count: 2 }]) =>
  aHero().withId('hero-2').ownedBy('blue').withArmy(army)

const aBlueTown = (built = []) => aTown().ownedBy('blue').withBuildings(built).at(TOWN.x, TOWN.y)

// The seer stands walled in by rock and the town, unless he is to walk, so he is no threat blue's
// hero keeps away from.
const aTownScenario = ({
  entities,
  seer = aSeer().at(12, 4),
  seerWalks = false,
  definitions = definitionsWith()
}) => {
  const { x, y } = seer.build().tile
  const scenario = aScenario().withSize(30, 5)
  return (seerWalks ? scenario : scenario.withRockAround(x, y, [{ x: 13, y: 3 }]))
    .withEntities(seer, ...entities)
    .withDefinitions(definitions)
}

const setupApp = (scenario, options = {}) =>
  setupMovementBehaviorApp({ loadGameOptions: scenario.build(), ...options })

async function endTurn(user) {
  await clickEndTurn(user)
  await waitMs(COMPUTER_TURN_MS)
}

// On the player's next turn their hero casts Visions and reads the blue hero's army.
async function readBlueArmyAt(user, { x, y }) {
  await castSpellFromMap(user, 'Visions')
  await holdRightButtonOn(user, x, y)
  return readArmySlots(screen.getByRole('tooltip'))
}

describe('computer heroes recruiting behavior', () => {
  describe('in its town', () => {
    test("blue's hero in its town leads the creatures blue recruited there", async () => {
      const { user } = await setupApp(
        aTownScenario({ entities: [aBlueTown(['GUARDHOUSE']), aBlueHero().at(TOWN.x, TOWN.y)] })
      )

      await endTurn(user)

      expect(await readBlueArmyAt(user, TOWN)).toEqual([
        'Swordsmen 2',
        'Pikemen 14',
        '',
        '',
        '',
        '',
        ''
      ])
    })

    // 7 Archers at 1000 leave 500 of blue's 7500, enough for 8 Pikemen at 60.
    test("blue's hero recruits the strongest creatures first when blue can't pay for all of them", async () => {
      const { user } = await setupApp(
        aTownScenario({
          entities: [aBlueTown(['GUARDHOUSE', 'ARCHERS_TOWER']), aBlueHero().at(TOWN.x, TOWN.y)],
          definitions: definitionsWith({ creatureCosts: { ARCHER: { GOLD_PILE: 1000 } } })
        })
      )

      await endTurn(user)

      expect(await readBlueArmyAt(user, TOWN)).toEqual([
        'Swordsmen 2',
        'Archers 7',
        'Pikemen 8',
        '',
        '',
        '',
        ''
      ])
    })

    test("blue's hero recruits upgraded creatures before plain ones from the same tier", async () => {
      const { user } = await setupApp(
        aTownScenario({
          entities: [aBlueTown(['GUARDHOUSE', 'UPG_GUARDHOUSE']), aBlueHero().at(TOWN.x, TOWN.y)]
        })
      )

      await endTurn(user)

      expect(await readBlueArmyAt(user, TOWN)).toEqual([
        'Swordsmen 2',
        'Halberdiers 14',
        '',
        '',
        '',
        '',
        ''
      ])
    })

    // 7500 gold pays for 7 Pikemen at 1000.
    test("blue's hero recruits only as many creatures as blue can pay for", async () => {
      const { user } = await setupApp(
        aTownScenario({
          entities: [aBlueTown(['GUARDHOUSE']), aBlueHero().at(TOWN.x, TOWN.y)],
          definitions: definitionsWith({ creatureCosts: { PIKEMAN: { GOLD_PILE: 1000 } } })
        })
      )

      await endTurn(user)

      expect((await readBlueArmyAt(user, TOWN))[1]).toBe('Pikemen 7')
    })

    test("blue's hero takes the town's garrison into its army", async () => {
      const { user } = await setupApp(
        aTownScenario({
          entities: [
            aBlueTown().withGarrison([{ creature: 'GRIFFIN', count: 3 }]),
            aBlueHero().at(TOWN.x, TOWN.y)
          ]
        })
      )

      await endTurn(user)

      expect(await readBlueArmyAt(user, TOWN)).toEqual([
        'Swordsmen 2',
        'Griffins 3',
        '',
        '',
        '',
        '',
        ''
      ])
    })

    test("blue's hero with seven stacks takes only creatures it already leads", async () => {
      const army = ['PIKEMAN', 'GRIFFIN', 'SWORDSMAN', 'MONK', 'CAVALIER', 'ANGEL', 'MARKSMAN'].map(
        (creature) => ({ creature, count: 2 })
      )
      const { user } = await setupApp(
        aTownScenario({
          entities: [aBlueTown(['GUARDHOUSE', 'ARCHERS_TOWER']), aBlueHero(army).at(TOWN.x, TOWN.y)]
        })
      )

      await endTurn(user)

      expect(await readBlueArmyAt(user, TOWN)).toEqual([
        'Pikemen 16',
        'Griffins 2',
        'Swordsmen 2',
        'Monks 2',
        'Cavaliers 2',
        'Angels 2',
        'Marksmen 2'
      ])
    })

    test("blue's hero recruits from a dwelling its town built that morning", async () => {
      const { user } = await setupApp(
        aTownScenario({
          entities: [aBlueTown(['FORT']), aBlueHero().at(TOWN.x, TOWN.y)],
          definitions: definitionsWith({ buildingCosts: { GUARDHOUSE: { GOLD_PILE: 500 } } })
        })
      )

      await endTurn(user)

      expect((await readBlueArmyAt(user, TOWN))[1]).toBe('Pikemen 14')
    })

    test("blue's hero recruits in a red town it walked into", async () => {
      const { user } = await setupApp(
        aTownScenario({
          entities: [
            aTown().ownedByPlayer().withBuildings(['GUARDHOUSE']).at(TOWN.x, TOWN.y),
            aBlueHero().at(18, 4)
          ]
        })
      )

      await endTurn(user)

      expect((await readBlueArmyAt(user, TOWN))[1]).toBe('Pikemen 14')
    })

    test("blue's hero leaves its town for a resource pile", async () => {
      const { user } = await setupApp(
        aTownScenario({
          entities: [
            aBlueTown(['GUARDHOUSE']),
            aBlueHero().at(TOWN.x, TOWN.y),
            aResource().withId('pile').at(20, 4)
          ]
        })
      )

      await endTurn(user)

      expectResourceNotPresent('pile')
    })

    test("blue's hero with nothing to go to stays in its town", async () => {
      const { user } = await setupApp(
        aTownScenario({ entities: [aBlueTown(['GUARDHOUSE']), aBlueHero().at(TOWN.x, TOWN.y)] })
      )

      await endTurn(user)

      expectHeroAt(TOWN.x, TOWN.y, 'hero-2')
    })

    test('the creatures blue recruited are gone from the town once the player takes it', async () => {
      const { user } = await setupApp(
        aTownScenario({
          seerWalks: true,
          entities: [
            aBlueTown(['GUARDHOUSE']),
            aBlueHero().at(TOWN.x, TOWN.y),
            aResource().withId('pile').at(25, 4)
          ]
        })
      )

      await endTurn(user)
      confirmTileClickByDispatch(TOWN.x, TOWN.y)
      await waitMs(PLAYER_WALK_MS)
      await openRecruitWindow(user, 'Pikemen')

      expect(readAvailable()).toBe(0)
    })

    // Blue's hero walks from the town towards the pile at (25, 4) in steps the player sees, and
    // picks it up from (24, 4); the player's hero at (22, 2) sees it there, 2.8 away.
    // Blue's hero walks from the town towards the pile at (25, 4), one step every 100 ms, and
    // picks it up from (24, 4); the player's hero at (22, 2) sees it there, 2.8 away.
    test("after a reload during blue's turn, blue's hero doesn't recruit a second time", async () => {
      const scenario = aTownScenario({
        seer: aSeer().at(22, 2),
        entities: [
          aBlueTown(['GUARDHOUSE']),
          aBlueHero().at(TOWN.x, TOWN.y),
          aResource().withId('pile').at(25, 4)
        ]
      })
      const eventLog = createMemoryEventLog()
      const options = { eventLog, movementStepDelayMs: 100 }
      const first = await setupApp(scenario, options)
      await clickEndTurn(first.user)
      await waitMs(250)
      const { user } = await setupApp(scenario, options)
      await waitMs(COMPUTER_TURN_MS)

      expect((await readBlueArmyAt(user, { x: 24, y: 4 }))[1]).toBe('Pikemen 14')
    })
  })

  // Blue's town saves for its Town Hall, 2 ore short with an Ore Pit's 2 a day, and blue keeps its
  // 7000 gold and 12 ore: 500 of blue's 7500 gold is left to recruit with.
  describe('while blue saves for a building', () => {
    const savingDefinitions = () =>
      definitionsWith({ buildingCosts: { TOWN_HALL: { GOLD_PILE: 7000, ORE_PILE: 12 } } })

    // 500 gold pays for 8 Pikemen at 60.
    test("blue's hero in its town recruits only with what blue has beyond what it keeps", async () => {
      const { user } = await setupApp(
        aTownScenario({
          entities: [
            aBlueTown(['TAVERN', 'GUARDHOUSE']),
            aBlueHero().at(TOWN.x, TOWN.y),
            aMine().withType('ORE_PIT').ownedBy('blue').at(26, 4)
          ],
          definitions: savingDefinitions()
        })
      )

      await endTurn(user)

      expect(await readBlueArmyAt(user, TOWN)).toEqual([
        'Swordsmen 2',
        'Pikemen 8',
        '',
        '',
        '',
        '',
        ''
      ])
    })

    // Blue's hero at (15, 2) walks to its Archers' Tower at (18, 1), which the player's hero at
    // (15, 0) sees; blue's town stands out of the way at (26, 2). 500 gold pays for 5 Archers.
    test("blue's hero at its dwelling recruits only with what blue has beyond what it keeps", async () => {
      const dwelling = { x: 18, y: 1 }
      const { user } = await setupApp(
        aScenario()
          .withSize(30, 3)
          .withRockAround(15, 0)
          .withEntities(
            aSeer().at(15, 0),
            aBlueHero().at(15, 2),
            aDwelling().withType('ARCHERS_TOWER').ownedBy('blue').at(dwelling.x, dwelling.y),
            aTown().ownedBy('blue').withBuildings(['TAVERN']).at(26, 2),
            aMine().withType('ORE_PIT').ownedBy('blue').at(3, 2)
          )
          .withDefinitions(savingDefinitions())
      )

      await endTurn(user)

      expect((await readBlueArmyAt(user, dwelling))[1]).toBe('Archers 5')
    })
  })

  describe('at a dwelling', () => {
    // Blue's hero at (15, 2) walks to the dwelling's entrance at (18, 1); the player's hero at
    // (15, 0) sees it there, 3.2 away.
    const DWELLING = { x: 18, y: 1 }

    const aDwellingScenario = ({ dwelling, hero = aBlueHero(), definitions = definitionsWith() }) =>
      aScenario()
        .withSize(30, 3)
        .withRockAround(15, 0)
        .withEntities(aSeer().at(15, 0), hero.at(15, 2), dwelling.at(DWELLING.x, DWELLING.y))
        .withDefinitions(definitions)

    const anArchersTower = () => aDwelling().withType('ARCHERS_TOWER')

    test("blue's hero recruits at a dwelling it flags", async () => {
      const { user } = await setupApp(aDwellingScenario({ dwelling: anArchersTower() }))

      await endTurn(user)

      expect(await readBlueArmyAt(user, DWELLING)).toEqual([
        'Swordsmen 2',
        'Archers 9',
        '',
        '',
        '',
        '',
        ''
      ])
    })

    // 7500 gold pays for 7 Archers at 1000.
    test("blue's hero recruits only as many creatures as blue can pay for at a dwelling", async () => {
      const { user } = await setupApp(
        aDwellingScenario({
          dwelling: anArchersTower(),
          definitions: definitionsWith({ creatureCosts: { ARCHER: { GOLD_PILE: 1000 } } })
        })
      )

      await endTurn(user)

      expect((await readBlueArmyAt(user, DWELLING))[1]).toBe('Archers 7')
    })

    test("a first-tier dwelling's creatures join blue's hero for free, with no message on the player's screen", async () => {
      const { user } = await setupApp(
        aDwellingScenario({ dwelling: aDwelling().withType('GUARDHOUSE') })
      )

      await endTurn(user)

      expect(screen.queryAllByRole('dialog')).toEqual([])
      expect((await readBlueArmyAt(user, DWELLING))[1]).toBe('Pikemen 14')
    })

    test("blue's hero goes to its own dwelling that has creatures it can pay for", async () => {
      const { user } = await setupApp(
        aDwellingScenario({ dwelling: anArchersTower().ownedBy('blue') })
      )

      await endTurn(user)

      expect((await readBlueArmyAt(user, DWELLING))[1]).toBe('Archers 9')
    })

    test("blue's hero doesn't go to its own dwelling when blue can't pay for any of its creatures", async () => {
      const { user } = await setupApp(
        aDwellingScenario({
          dwelling: anArchersTower().ownedBy('blue'),
          definitions: definitionsWith({ creatureCosts: { ARCHER: { GOLD_PILE: 10000 } } })
        })
      )

      await endTurn(user)

      expectHeroAt(15, 2, 'hero-2')
    })

    test("blue's hero with no room in its army doesn't go to its own dwelling", async () => {
      const army = ['PIKEMAN', 'GRIFFIN', 'SWORDSMAN', 'MONK', 'CAVALIER', 'ANGEL', 'MARKSMAN'].map(
        (creature) => ({ creature, count: 2 })
      )
      const { user } = await setupApp(
        aDwellingScenario({ dwelling: anArchersTower().ownedBy('blue'), hero: aBlueHero(army) })
      )

      await endTurn(user)

      expectHeroAt(15, 2, 'hero-2')
    })
  })
})
