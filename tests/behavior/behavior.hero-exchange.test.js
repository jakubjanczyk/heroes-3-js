// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { dispatchTileClick, expectHeroAt } from './adventure-map.utils.js'
import { readHeroList, readSelectedHeroInHeroList } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  pressKey,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario } from './builders.js'
import {
  clickHeroExchangeButton,
  clickHeroExchangeSlot,
  clickSlotArrow,
  closeHeroExchange,
  getHeroExchange,
  hoverHeroExchangeSlot,
  meetHeroAt,
  queryHeroExchange,
  readHeroExchangeArmy,
  readHeroExchangePortraits,
  readHeroExchangePrimarySkills,
  readHeroExchangeStatusBar,
  readHeroExchangeTitles,
  shiftClickHeroExchangeSlot
} from './hero-exchange.utils.js'
import { clickHeroInHeroList, closeHeroScreen, readHeroScreenArmy } from './hero-screen.utils.js'
import { confirmSplit, dragSplitSlider } from './split-window.utils.js'
import { GRASS, WATER } from './terrain-codes.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

const LEFT_HERO = 'Sir Christian'
const RIGHT_HERO = 'Valeska'
const EMPTY = ''

const stackOf = (creature) => (count) => ({ creature, count })
const pikemen = stackOf('PIKEMAN')
const archers = stackOf('ARCHER')
const griffins = stackOf('GRIFFIN')
const swordsmen = stackOf('SWORDSMAN')
const monks = stackOf('MONK')
const cavaliers = stackOf('CAVALIER')
const angels = stackOf('ANGEL')
const skeletons = stackOf('SKELETON')

// Both heroes stand on the top row of a 10x3 map, five tiles apart; the first walks to the second.
const aMeetingScenario = ({
  leftArmy = [pikemen(20), archers(6)],
  rightArmy = [archers(4)],
  leftHero = aHero(),
  rightHero = aHero()
} = {}) =>
  aScenario()
    .withSize(10, 3)
    .withEntities(
      leftHero.withName(LEFT_HERO).withArmy(leftArmy).at(0, 0),
      rightHero.withId('hero-2').withName(RIGHT_HERO).withArmy(rightArmy).at(5, 0)
    )
    .withDefinitions(gameDefinitions)

async function setupApp(scenario = aMeetingScenario(), options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    ...options
  })
}

async function startOnHeroExchange(scenario = aMeetingScenario(), options = {}) {
  const app = await setupApp(scenario, options)
  await meetHeroAt(app.user, 5, 0)
  getHeroExchange()
  return app
}

// A click on a hero in the hero list selects them, and a click on the selected hero opens
// their hero screen.
async function readArmyOnHeroScreen(user, heroName) {
  if (!readSelectedHeroInHeroList().includes(heroName)) {
    await clickHeroInHeroList(user, heroName)
  }
  await clickHeroInHeroList(user, heroName)
  const army = readHeroScreenArmy()
  await closeHeroScreen(user)
  return army
}

describe('hero exchange behavior', () => {
  describe('meeting', () => {
    test('given the selected hero walks to another of the player’s heroes when they get there then they stop next to them and the exchange screen opens', async () => {
      await startOnHeroExchange()

      expectHeroAt(4, 0, 'hero-1')
      expectHeroAt(5, 0, 'hero-2')
    })

    // Four steps of 100 to the tile next to Valeska, and the step onto her tile, as for any visit.
    test('given the selected hero walks to another of the player’s heroes when they meet then the walk and the step onto the other hero are paid for', async () => {
      await startOnHeroExchange()

      expect(readHeroList()).toEqual([`${LEFT_HERO} 1000`, `${RIGHT_HERO} 1500`])
    })

    test('given there is no path to another of the player’s heroes when the player clicks them on the map then that hero is selected', async () => {
      await setupApp(
        aMeetingScenario().withTiles(
          [0, 1, 2].flatMap(() => [
            GRASS,
            GRASS,
            GRASS,
            WATER,
            GRASS,
            GRASS,
            GRASS,
            GRASS,
            GRASS,
            GRASS
          ])
        )
      )

      dispatchTileClick(5, 0)

      expect(readSelectedHeroInHeroList()).toEqual([RIGHT_HERO])
    })
  })

  describe('what it shows', () => {
    test('given two heroes meet then each banner shows the hero’s name, level and class, the visiting hero on the left', async () => {
      await startOnHeroExchange(aMeetingScenario({ rightHero: aHero().withExperience(2000) }))

      expect(readHeroExchangeTitles()).toEqual([
        `${LEFT_HERO}, Level 1 Knight`,
        `${RIGHT_HERO}, Level 3 Knight`
      ])
    })

    test('given two heroes meet then it shows both heroes’ portraits', async () => {
      await startOnHeroExchange()

      expect(readHeroExchangePortraits()).toEqual([
        `${LEFT_HERO} portrait`,
        `${RIGHT_HERO} portrait`
      ])
    })

    test('given two heroes meet then it shows their Attack, Defense, Power and Knowledge side by side', async () => {
      await startOnHeroExchange(
        aMeetingScenario({
          leftHero: aHero().withPrimarySkills({ attack: 5, defense: 0, power: 3, knowledge: 4 })
        })
      )

      expect(readHeroExchangePrimarySkills()).toEqual([
        '5 Attack 2',
        '0 Defense 2',
        '3 Power 1',
        '4 Knowledge 1'
      ])
    })

    test('given two heroes meet then it shows both armies in their seven slots', async () => {
      await startOnHeroExchange(aMeetingScenario({ leftArmy: [pikemen(20), null, archers(6)] }))

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        ['Pikemen 20', EMPTY, 'Archers 6', EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archers 4', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })
  })

  describe('moving stacks', () => {
    test('given a stack is framed when the player clicks an empty slot of the other hero then the stack moves there', async () => {
      const { user } = await startOnHeroExchange()

      await clickHeroExchangeSlot(user, LEFT_HERO, 1)
      await clickHeroExchangeSlot(user, RIGHT_HERO, 3)

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        [EMPTY, 'Archers 6', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archers 4', EMPTY, 'Pikemen 20', EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })

    test('given a stack is framed when the player clicks the same creature in the other hero’s army then the two merge', async () => {
      const { user } = await startOnHeroExchange()

      await clickHeroExchangeSlot(user, LEFT_HERO, 2)
      await clickHeroExchangeSlot(user, RIGHT_HERO, 1)

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        ['Pikemen 20', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archers 10', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })

    test('given a stack is framed when the player clicks another creature in the other hero’s army then the two swap', async () => {
      const { user } = await startOnHeroExchange()

      await clickHeroExchangeSlot(user, LEFT_HERO, 1)
      await clickHeroExchangeSlot(user, RIGHT_HERO, 1)

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        ['Archers 4', 'Archers 6', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Pikemen 20', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })

    test('given a stack is framed when the player clicks an empty slot of the same hero then the stack moves there', async () => {
      const { user } = await startOnHeroExchange()

      await clickHeroExchangeSlot(user, LEFT_HERO, 1)
      await clickHeroExchangeSlot(user, LEFT_HERO, 4)

      expect(readHeroExchangeArmy(LEFT_HERO)).toEqual([
        EMPTY,
        'Archers 6',
        EMPTY,
        'Pikemen 20',
        EMPTY,
        EMPTY,
        EMPTY
      ])
    })

    test('given a hero’s last stack is framed when the player clicks an empty slot of the other hero then one creature stays behind', async () => {
      const { user } = await startOnHeroExchange()

      await clickHeroExchangeSlot(user, RIGHT_HERO, 1)
      await clickHeroExchangeSlot(user, LEFT_HERO, 3)

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        ['Pikemen 20', 'Archers 6', 'Archers 3', EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archer 1', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })

    test('given a stack is framed when the player Shift+clicks an empty slot of the other hero and splits off 5 then those 5 go to the other hero', async () => {
      const { user } = await startOnHeroExchange()
      await clickHeroExchangeSlot(user, LEFT_HERO, 1)
      await shiftClickHeroExchangeSlot(user, RIGHT_HERO, 2)

      dragSplitSlider(5)
      await confirmSplit(user)

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        ['Pikemen 15', 'Archers 6', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archers 4', 'Pikemen 5', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })
  })

  describe('slot arrows', () => {
    test('given a stack when the player clicks the arrow under it then it goes to the other hero’s first empty slot', async () => {
      const { user } = await startOnHeroExchange()

      await clickSlotArrow(user, LEFT_HERO, 1, RIGHT_HERO)

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        [EMPTY, 'Archers 6', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archers 4', 'Pikemen 20', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })

    test('given the other hero has the same creature when the player clicks the arrow under a stack then the two merge', async () => {
      const { user } = await startOnHeroExchange()

      await clickSlotArrow(user, LEFT_HERO, 2, RIGHT_HERO)

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        ['Pikemen 20', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archers 10', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })

    test('given a hero’s last stack when the player clicks the arrow under it then one creature stays behind', async () => {
      const { user } = await startOnHeroExchange()

      await clickSlotArrow(user, RIGHT_HERO, 1, LEFT_HERO)

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        ['Pikemen 20', 'Archers 9', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archer 1', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })

    test('given the other hero has no room for the creature when the player clicks the arrow under a stack then nothing moves', async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({
          rightArmy: [
            archers(1),
            griffins(1),
            swordsmen(1),
            monks(1),
            cavaliers(1),
            angels(1),
            skeletons(1)
          ]
        })
      )

      await clickSlotArrow(user, LEFT_HERO, 1, RIGHT_HERO)

      expect(readHeroExchangeArmy(LEFT_HERO)).toEqual([
        'Pikemen 20',
        'Archers 6',
        EMPTY,
        EMPTY,
        EMPTY,
        EMPTY,
        EMPTY
      ])
    })
  })

  describe('move all and swap', () => {
    // The Pikemen go to the first empty slot and the Archers join Valeska's Archers.
    test('given two armies when the player moves all to the right hero then every stack goes across and one creature stays in the left hero’s first stack', async () => {
      const { user } = await startOnHeroExchange()

      await clickHeroExchangeButton(user, `Move all to ${RIGHT_HERO}`)

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        ['Pikeman 1', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archers 10', 'Pikemen 19', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })

    test('given two armies when the player moves all to the left hero then every stack goes across and one creature stays in the right hero’s first stack', async () => {
      const { user } = await startOnHeroExchange()

      await clickHeroExchangeButton(user, `Move all to ${LEFT_HERO}`)

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        ['Pikemen 20', 'Archers 9', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archer 1', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })

    test('given the other hero has no room for one of the creatures when the player moves all across then that stack stays', async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({
          leftArmy: [pikemen(20), griffins(3)],
          rightArmy: [archers(1), swordsmen(1), monks(1), cavaliers(1), angels(1), skeletons(1)]
        })
      )

      await clickHeroExchangeButton(user, `Move all to ${RIGHT_HERO}`)

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        ['Pikeman 1', 'Griffins 3', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archer 1', 'Swordsman 1', 'Monk 1', 'Cavalier 1', 'Angel 1', 'Skeleton 1', 'Pikemen 19']
      ])
    })

    test('given two armies when the player swaps them then each hero has the other’s army slot for slot', async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({ leftArmy: [pikemen(20), null, archers(6)] })
      )

      await clickHeroExchangeButton(user, 'Swap armies')

      expect([readHeroExchangeArmy(LEFT_HERO), readHeroExchangeArmy(RIGHT_HERO)]).toEqual([
        ['Archers 4', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Pikemen 20', EMPTY, 'Archers 6', EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })
  })

  describe('the status bar', () => {
    test.each([
      { framed: null, hovered: [RIGHT_HERO, 1], text: 'Select Archer' },
      { framed: [LEFT_HERO, 1], hovered: [RIGHT_HERO, 1], text: 'Exchange Pikeman with Archer' },
      { framed: [LEFT_HERO, 2], hovered: [RIGHT_HERO, 1], text: 'Combine Archer armies' },
      { framed: [LEFT_HERO, 1], hovered: [RIGHT_HERO, 2], text: 'Move Pikeman' }
    ])('given $framed is framed when the mouse is over $hovered then it says "$text"', async ({
      framed,
      hovered,
      text
    }) => {
      const { user } = await startOnHeroExchange()
      if (framed) {
        await clickHeroExchangeSlot(user, ...framed)
      }

      await hoverHeroExchangeSlot(user, ...hovered)

      expect(readHeroExchangeStatusBar()).toBe(text)
    })
  })

  describe('closing and saving', () => {
    test('given the exchange screen is open when the player presses the ✓ then it closes', async () => {
      const { user } = await startOnHeroExchange()

      await closeHeroExchange(user)

      expect(queryHeroExchange()).toBeNull()
    })

    test('given the exchange screen is open when the player presses Escape then it closes', async () => {
      const { user } = await startOnHeroExchange()

      await pressKey(user, '{Escape}')

      expect(queryHeroExchange()).toBeNull()
    })

    test('given the heroes exchanged stacks when the player opens each hero screen then it shows the new armies', async () => {
      const { user } = await startOnHeroExchange()
      await clickSlotArrow(user, LEFT_HERO, 1, RIGHT_HERO)
      await closeHeroExchange(user)

      expect([
        await readArmyOnHeroScreen(user, LEFT_HERO),
        await readArmyOnHeroScreen(user, RIGHT_HERO)
      ]).toEqual([
        [EMPTY, 'Archers 6', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archers 4', 'Pikemen 20', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })

    test('given the heroes exchanged stacks when the game reloads then both heroes have their new armies', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const { user } = await startOnHeroExchange(aMeetingScenario(), session)
      await clickSlotArrow(user, LEFT_HERO, 1, RIGHT_HERO)

      const { user: userAfterReload } = await setupApp(aMeetingScenario(), session)

      expect([
        await readArmyOnHeroScreen(userAfterReload, LEFT_HERO),
        await readArmyOnHeroScreen(userAfterReload, RIGHT_HERO)
      ]).toEqual([
        [EMPTY, 'Archers 6', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        ['Archers 4', 'Pikemen 20', EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]
      ])
    })
  })
})
