// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest'

import { getTownInTownList } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  pressKey,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import {
  aCreatureDefinition,
  aHero,
  aMine,
  anArtifactDefinition,
  aScenario,
  aTown
} from './builders.js'
import {
  enterTownAt,
  getThievesGuildExit,
  leaveTown,
  openTavern,
  openThievesGuild,
  queryTavern,
  queryThievesGuild,
  readBestHeroes,
  readBestHeroSkills,
  readBestMonsters,
  readFilledThievesGuildRows,
  readPersonalities,
  readThievesGuildPlaces,
  readThievesGuildRanking,
  readThievesGuildStatusBar
} from './town-screen.utils.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  monsters: readGameData('monsters.json'),
  mines: readGameData('mines.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const TAVERN = ['TAVERN']

const monsters = {
  ...gameDefinitions.monsters,
  STRONG: aCreatureDefinition().withName('Strong').withAiValue(50).build(),
  MIDDLING: aCreatureDefinition().withName('Middling').withAiValue(20).build(),
  WEAK: aCreatureDefinition().withName('Weak').withAiValue(3).build()
}

// The red player's towns stand in the top row, their entrances 8 tiles apart from (4, 3); the
// other players' towns in the row below, from (4, 9). The heroes stand along the bottom row.
const MAP_WIDTH = 40
const MAP_HEIGHT = 13
const HEROES_ROW = 12

const redTowns = (taverns, townsWithoutTavern) =>
  Array.from({ length: taverns + townsWithoutTavern }, (_, index) =>
    aTown()
      .withId(`red-town-${index + 1}`)
      .named(index === 0 ? 'Whitemoon' : `Red town ${index + 1}`)
      .ownedByPlayer()
      .withBuildings(index < taverns ? TAVERN : [])
      .at(4 + 8 * index, 3)
  )

const townsOf = (player, count) =>
  Array.from({ length: count }, (_, index) =>
    aTown()
      .withId(`${player}-town-${index + 1}`)
      .named(`${player} town ${index + 1}`)
      .ownedBy(player)
      .at(4 + 8 * index, 9)
  )

// Each hero a test makes stands one tile right of the one made before.
let heroCount = 0
const aHeroOf = (player, name) => {
  heroCount += 1
  return aHero()
    .withId(`hero-${heroCount}`)
    .withName(name)
    .ownedBy(player)
    .at(heroCount, HEROES_ROW)
}

const aRedHero = (name = 'Orrin') => aHeroOf('red', name)
const aBlueHero = (name = 'Valeska') => aHeroOf('blue', name)
const aTanHero = (name = 'Edric') => aHeroOf('tan', name)

const aGuildScenario = ({
  taverns = 5,
  townsWithoutTavern = 0,
  red = [aRedHero()],
  others = [aBlueHero()],
  resources = {},
  definitions = {}
} = {}) =>
  aScenario()
    .withSize(MAP_WIDTH, MAP_HEIGHT)
    .withEntities(...red, ...redTowns(taverns, townsWithoutTavern), ...others)
    .withDefinitions({ ...gameDefinitions, ...definitions })
    .withStartingResources(resources)

async function setupApp(scenario, { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0, random: () => 0 },
    eventLog
  })
}

async function openGuild(user) {
  await user.dblClick(getTownInTownList('Whitemoon'))
  await openTavern(user)
  await openThievesGuild(user)
}

async function startInGuild(scenario) {
  const app = await setupApp(scenario)
  await openGuild(app.user)
  return app
}

// A computer player starts with 7500 gold, 10 wood, 10 ore and 4 of each rare resource.
describe('thieves guild behavior', () => {
  beforeEach(() => {
    heroCount = 0
  })

  describe('opening', () => {
    test("the Tavern's Thieves' Guild button opens the Thieves' Guild window", async () => {
      await startInGuild(aGuildScenario())

      expect(queryThievesGuild()).toBeTruthy()
    })

    test('the window has a place column for each player in the game, from 1st', async () => {
      await startInGuild(aGuildScenario({ others: [aBlueHero(), aTanHero()] }))

      expect(readThievesGuildPlaces()).toEqual(['1st', '2nd', '3rd'])
    })

    test('Exit closes the window and goes back to the tavern', async () => {
      const { user } = await startInGuild(aGuildScenario())

      await user.click(getThievesGuildExit())

      expect(queryThievesGuild()).toBeNull()
      expect(queryTavern()).toBeTruthy()
    })

    test('Escape closes the window', async () => {
      const { user } = await startInGuild(aGuildScenario())

      await pressKey(user, '{Escape}')

      expect(queryThievesGuild()).toBeNull()
      expect(queryTavern()).toBeTruthy()
    })

    test("hovering Exit writes 'Exit' in the window's status bar", async () => {
      const { user } = await startInGuild(aGuildScenario())

      await user.hover(getThievesGuildExit())

      expect(readThievesGuildStatusBar()).toBe('Exit')
    })
  })

  describe('ranking', () => {
    test('each player stands in the column of their place for the number of towns', async () => {
      await startInGuild(
        aGuildScenario({ taverns: 1, others: [aBlueHero(), ...townsOf('blue', 2)] })
      )

      expect(readThievesGuildRanking('Number of Towns')).toEqual({
        '1st': ['blue'],
        '2nd': ['red']
      })
    })

    test('players with the same number of heroes share a place, and the next player takes the next place', async () => {
      await startInGuild(
        aGuildScenario({
          red: [aRedHero('Orrin'), aRedHero('Valeska')],
          others: [aBlueHero('Edric'), aBlueHero('Sylvia'), aTanHero('Lord Haart')]
        })
      )

      expect(readThievesGuildRanking('Number of Heroes')).toEqual({
        '1st': ['red', 'blue'],
        '2nd': ['tan']
      })
    })

    test('a player with more gold ranks above one with less', async () => {
      await startInGuild(aGuildScenario({ resources: { GOLD_PILE: 7000 } }))

      expect(readThievesGuildRanking('Gold')).toEqual({ '1st': ['blue'], '2nd': ['red'] })
    })

    // Red's 19 ore beat blue's 10, but blue's 10 wood and 10 ore make 20.
    test('wood and ore are ranked by their sum', async () => {
      await startInGuild(aGuildScenario({ resources: { ORE_PILE: 19 } }))

      expect(readThievesGuildRanking('Wood & Ore')).toEqual({ '1st': ['blue'], '2nd': ['red'] })
    })

    // Red's 15 gems beat blue's 4, but blue's 4 of each rare resource make 16.
    test('mercury, sulfur, crystal and gems are ranked by their sum', async () => {
      await startInGuild(aGuildScenario({ resources: { GEMS_PILE: 15 } }))

      expect(readThievesGuildRanking('Merc, Sulf, Cryst & Gems')).toEqual({
        '1st': ['blue'],
        '2nd': ['red']
      })
    })

    test('every player shares 1st for obelisks found', async () => {
      await startInGuild(aGuildScenario({ others: [aBlueHero(), aTanHero()] }))

      expect(readThievesGuildRanking('Obelisks Found')).toEqual({ '1st': ['red', 'blue', 'tan'] })
    })

    // Red's second sword goes to the backpack: two artifacts against blue's one.
    test('artifacts worn and in the backpack count for the artifacts row', async () => {
      const artifacts = { SWORD: anArtifactDefinition().withSlot('WEAPON').build() }
      await startInGuild(
        aGuildScenario({
          red: [aRedHero().withArtifacts(['SWORD', 'SWORD'])],
          others: [aBlueHero().withArtifacts(['SWORD'])],
          definitions: { artifacts }
        })
      )

      expect(readThievesGuildRanking('Artifacts')).toEqual({ '1st': ['red'], '2nd': ['blue'] })
    })

    // Red: 2 × 50 = 100. Blue: 6 × 20 = 120. Tan: 30 × 3 = 90. By count alone tan would lead, by
    // value alone red.
    test("army strength ranks by each stack's count times its creature's value", async () => {
      await startInGuild(
        aGuildScenario({
          red: [aRedHero().withArmy([{ creature: 'STRONG', count: 2 }])],
          others: [
            aBlueHero().withArmy([{ creature: 'MIDDLING', count: 6 }]),
            aTanHero().withArmy([{ creature: 'WEAK', count: 30 }])
          ],
          definitions: { monsters }
        })
      )

      expect(readThievesGuildRanking('Kingdom Army Strength')).toEqual({
        '1st': ['blue'],
        '2nd': ['red'],
        '3rd': ['tan']
      })
    })

    // Red: 2 × 50 + 1 × 50 = 150 over two heroes, against blue's 6 × 20 = 120 and its garrison.
    test("army strength adds up all the player's heroes and leaves out town garrisons", async () => {
      await startInGuild(
        aGuildScenario({
          red: [
            aRedHero('Orrin').withArmy([{ creature: 'STRONG', count: 2 }]),
            aRedHero('Valeska').withArmy([{ creature: 'STRONG', count: 1 }])
          ],
          others: [
            aBlueHero('Edric').withArmy([{ creature: 'MIDDLING', count: 6 }]),
            townsOf('blue', 1)[0].withGarrison([{ creature: 'STRONG', count: 100 }])
          ],
          definitions: { monsters }
        })
      )

      expect(readThievesGuildRanking('Kingdom Army Strength')).toEqual({
        '1st': ['red'],
        '2nd': ['blue']
      })
    })

    // Blue's four towns earn less than red's five, but its two gold mines add 2000 a day.
    test('income ranks by the gold the kingdom earns a day, from towns and mines', async () => {
      await startInGuild(
        aGuildScenario({
          others: [
            aBlueHero(),
            ...townsOf('blue', 4),
            aMine().withId('mine-1').withType('GOLD_MINE').ownedBy('blue').at(36, 9),
            aMine().withId('mine-2').withType('GOLD_MINE').ownedBy('blue').at(36, 6)
          ]
        })
      )

      expect(readThievesGuildRanking('Income')).toEqual({ '1st': ['blue'], '2nd': ['red'] })
    })

    test('a town the player takes counts for the number of towns after a reload', async () => {
      const scenario = aGuildScenario({
        taverns: 1,
        red: [aRedHero().at(12, 10)],
        others: [aBlueHero(), ...townsOf('blue', 2)]
      })
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(scenario, { eventLog })
      await enterTownAt(12, 9)
      await leaveTown(user)

      const reloaded = await setupApp(scenario, { eventLog })
      await openGuild(reloaded.user)

      expect(readThievesGuildRanking('Number of Towns')).toEqual({
        '1st': ['red'],
        '2nd': ['blue']
      })
    })
  })

  describe('best hero, personality and best monster', () => {
    test("each player's best hero is the one with the highest level", async () => {
      await startInGuild(
        aGuildScenario({
          red: [aRedHero('Orrin'), aRedHero('Valeska').withExperience(1000)],
          others: [aBlueHero('Edric')]
        })
      )

      expect(readBestHeroes()).toEqual({ red: 'Valeska', blue: 'Edric' })
    })

    // Both are level 2, from 1000 experience.
    test('between heroes of the same level, the one with more experience is the best hero', async () => {
      await startInGuild(
        aGuildScenario({
          red: [aRedHero('Orrin').withExperience(1100), aRedHero('Valeska').withExperience(1500)]
        })
      )

      expect(readBestHeroes().red).toBe('Valeska')
    })

    test("with two Taverns, the best hero's primary skills are shown", async () => {
      await startInGuild(
        aGuildScenario({
          taverns: 2,
          others: [aBlueHero().withPrimarySkills({ attack: 4, defense: 3, power: 2, knowledge: 5 })]
        })
      )

      expect(readBestHeroSkills().blue).toEqual({ Attack: 4, Defense: 3, Power: 2, Knowledge: 5 })
    })

    test("with one Tavern, the best hero's primary skills are not shown", async () => {
      await startInGuild(aGuildScenario({ taverns: 1 }))

      expect(readBestHeroSkills()).toEqual({ red: {}, blue: {} })
    })

    test('a player without heroes shows an empty best hero box', async () => {
      await startInGuild(aGuildScenario({ others: townsOf('blue', 1) }))

      expect(readBestHeroes()).toEqual({ red: 'Orrin', blue: null })
    })

    test("the player's personality is 'Human', and a computer player's is empty", async () => {
      await startInGuild(aGuildScenario())

      expect(readPersonalities()).toEqual({ red: 'Human', blue: '' })
    })

    test("the best monster is the creature with the highest value in the player's heroes' armies", async () => {
      await startInGuild(
        aGuildScenario({
          red: [
            aRedHero('Orrin').withArmy([{ creature: 'WEAK', count: 50 }]),
            aRedHero('Valeska').withArmy([
              { creature: 'MIDDLING', count: 1 },
              { creature: 'STRONG', count: 1 }
            ])
          ],
          others: [aBlueHero().withArmy([{ creature: 'MIDDLING', count: 1 }])],
          definitions: { monsters }
        })
      )

      expect(readBestMonsters()).toEqual({ red: 'Strong', blue: 'Middling' })
    })
  })

  describe('taverns', () => {
    test.each([
      [1, ['Number of Towns', 'Number of Heroes', 'Best Hero']],
      [2, ['Number of Towns', 'Number of Heroes', 'Gold', 'Wood & Ore', 'Best Hero']],
      [
        3,
        [
          'Number of Towns',
          'Number of Heroes',
          'Gold',
          'Wood & Ore',
          'Merc, Sulf, Cryst & Gems',
          'Obelisks Found',
          'Best Hero',
          'Personality'
        ]
      ],
      [
        4,
        [
          'Number of Towns',
          'Number of Heroes',
          'Gold',
          'Wood & Ore',
          'Merc, Sulf, Cryst & Gems',
          'Obelisks Found',
          'Artifacts',
          'Kingdom Army Strength',
          'Best Hero',
          'Personality',
          'Best Monster'
        ]
      ],
      [
        5,
        [
          'Number of Towns',
          'Number of Heroes',
          'Gold',
          'Wood & Ore',
          'Merc, Sulf, Cryst & Gems',
          'Obelisks Found',
          'Artifacts',
          'Kingdom Army Strength',
          'Income',
          'Best Hero',
          'Personality',
          'Best Monster'
        ]
      ]
    ])('with %i Taverns the guild fills in %j', async (taverns, rows) => {
      await startInGuild(aGuildScenario({ taverns }))

      expect(readFilledThievesGuildRows()).toEqual(rows)
    })

    test("towns without a Tavern don't count towards what is shown", async () => {
      await startInGuild(aGuildScenario({ taverns: 1, townsWithoutTavern: 1 }))

      expect(readFilledThievesGuildRows()).toEqual([
        'Number of Towns',
        'Number of Heroes',
        'Best Hero'
      ])
    })
  })
})
