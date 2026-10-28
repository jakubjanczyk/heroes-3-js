// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { holdRightButtonOn, readInfoPopupLines } from './adventure-map.utils.js'
import {
  closeInteractionModal,
  getHeroInfoBox,
  pickLevelUpSkill,
  readMoraleAndLuck,
  takeFromTreasureChest
} from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTreasureChest } from './builders.js'
import {
  clickSlotArrow,
  closeHeroExchange,
  meetHeroAt,
  readHeroExchangeMoraleAndLuck
} from './hero-exchange.utils.js'
import {
  clickHeroInHeroList,
  closeHeroScreen,
  getHeroScreen,
  holdRightButtonOnHeroScreenBox,
  hoverOnHeroScreenBox,
  readHeroScreenStatusBar
} from './hero-screen.utils.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json')
}

const HERO = 'Christian'
const OTHER_HERO = 'Valeska'

const stack = (creature, count = 10) => ({ creature, count })
const basic = (skill) => ({ skill, level: 'BASIC' })
const advanced = (skill) => ({ skill, level: 'ADVANCED' })
const expert = (skill) => ({ skill, level: 'EXPERT' })

const aMoraleHero = ({ army = [stack('PIKEMAN')], skills = [] } = {}) =>
  aHero().withName(HERO).withArmy(army).withSecondarySkills(skills)

const aMoraleScenario = ({ hero = aMoraleHero(), others = [] } = {}) =>
  aScenario()
    .withSize(10, 3)
    .withEntities(hero.at(0, 0), ...others)
    .withDefinitions(gameDefinitions)

async function setupApp(scenario = aMoraleScenario(), { eventLog, random } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0, ...(random ? { random } : {}) },
    eventLog
  })
}

// The selected hero is already framed in the hero list, so one click opens their hero screen.
async function openHeroScreen(user, heroName = HERO) {
  await clickHeroInHeroList(user, heroName)
}

async function readHeroScreenMoraleAndLuck(user, heroName = HERO) {
  await openHeroScreen(user, heroName)
  const moraleAndLuck = readMoraleAndLuck(getHeroScreen())
  await closeHeroScreen(user)
  return moraleAndLuck
}

async function startOnHeroScreen(hero) {
  const app = await setupApp(aMoraleScenario({ hero }))
  await openHeroScreen(app.user)
  return app
}

function readPopup() {
  return [
    within(screen.getByRole('tooltip')).getByRole('heading').textContent,
    ...readInfoPopupLines()
  ]
}

describe('morale and luck behavior', () => {
  describe('morale from the army', () => {
    test.each([
      ['Castle', [stack('PIKEMAN'), stack('ARCHER')]],
      ['Rampart', [stack('CENTAUR')]],
      ['Inferno', [stack('IMP')]]
    ])('given an army all from %s when the hero screen opens then morale is +1', async (_, army) => {
      await startOnHeroScreen(aMoraleHero({ army }))

      expect(readMoraleAndLuck(getHeroScreen())).toEqual(['Morale +1', 'Luck 0'])
    })

    test.each([
      ['two towns', '0', [stack('PIKEMAN'), stack('CENTAUR')]],
      ['three towns', '-1', [stack('PIKEMAN'), stack('CENTAUR'), stack('IMP')]],
      [
        'three towns and neutral creatures',
        '-2',
        [stack('PIKEMAN'), stack('CENTAUR'), stack('IMP'), stack('PEASANT')]
      ]
    ])('given an army from %s when the hero screen opens then morale is %s', async (_, morale, army) => {
      await startOnHeroScreen(aMoraleHero({ army }))

      expect(readMoraleAndLuck(getHeroScreen())).toEqual([`Morale ${morale}`, 'Luck 0'])
    })

    test('given undead in an army of two towns when the hero screen opens then morale is -1', async () => {
      await startOnHeroScreen(aMoraleHero({ army: [stack('PIKEMAN'), stack('SKELETON')] }))

      expect(readMoraleAndLuck(getHeroScreen())).toEqual(['Morale -1', 'Luck 0'])
    })

    // +1 for one town, -1 for the undead.
    test('given an army of Skeletons only when the hero screen opens then morale is 0', async () => {
      await startOnHeroScreen(aMoraleHero({ army: [stack('SKELETON'), stack('SKELETON_WARRIOR')] }))

      expect(readMoraleAndLuck(getHeroScreen())).toEqual(['Morale 0', 'Luck 0'])
    })

    // 0 for two towns, +1 for the Angels however many stacks of them there are.
    test.each([
      ['Angels', [stack('PIKEMAN'), stack('CENTAUR'), stack('ANGEL', 1)]],
      [
        'Angels and Archangels',
        [stack('PIKEMAN'), stack('CENTAUR'), stack('ANGEL', 1), stack('ARCHANGEL', 1)]
      ]
    ])('given %s in an army of two towns when the hero screen opens then morale is +1', async (_, army) => {
      await startOnHeroScreen(aMoraleHero({ army }))

      expect(readMoraleAndLuck(getHeroScreen())).toEqual(['Morale +1', 'Luck 0'])
    })
  })

  describe('morale and luck from skills', () => {
    test('given a hero with Basic Leadership and an army of one town when the hero screen opens then morale is +2', async () => {
      await startOnHeroScreen(aMoraleHero({ skills: [basic('LEADERSHIP')] }))

      expect(readMoraleAndLuck(getHeroScreen())).toEqual(['Morale +2', 'Luck 0'])
    })

    // +3 for Expert Leadership, +1 for one town, +1 for the Angels: 5, held at 3.
    test('given modifiers adding up to more than +3 when the hero screen opens then morale is +3', async () => {
      await startOnHeroScreen(
        aMoraleHero({
          army: [stack('PIKEMAN'), stack('ANGEL', 1)],
          skills: [expert('LEADERSHIP')]
        })
      )

      expect(readMoraleAndLuck(getHeroScreen())).toEqual(['Morale +3', 'Luck 0'])
    })

    test('given a hero with Advanced Luck when the hero screen opens then luck is +2', async () => {
      await startOnHeroScreen(aMoraleHero({ skills: [advanced('LUCK')] }))

      expect(readMoraleAndLuck(getHeroScreen())).toEqual(['Morale +1', 'Luck +2'])
    })
  })

  describe('right click and status bar on the hero screen', () => {
    test('given good morale when the player holds the right button on it then the popup names it and says what it does', async () => {
      const { user } = await startOnHeroScreen(aMoraleHero({ skills: [basic('LEADERSHIP')] }))

      await holdRightButtonOnHeroScreenBox(user, 'Morale')

      expect(readPopup()).toEqual([
        'Good Morale',
        'Good morale may give your troops an extra attack in combat.'
      ])
    })

    test('given bad morale when the player holds the right button on it then the popup names it and says what it does', async () => {
      const { user } = await startOnHeroScreen(
        aMoraleHero({ army: [stack('PIKEMAN'), stack('CENTAUR'), stack('IMP'), stack('SKELETON')] })
      )

      await holdRightButtonOnHeroScreenBox(user, 'Morale')

      expect(readPopup()).toEqual([
        'Bad Morale',
        'Bad morale may make your troops freeze in combat.'
      ])
    })

    test('given neutral luck when the player holds the right button on it then the popup names it and says what it does', async () => {
      const { user } = await startOnHeroScreen(aMoraleHero())

      await holdRightButtonOnHeroScreenBox(user, 'Luck')

      expect(readPopup()).toEqual([
        'Neutral Luck',
        'Neutral luck means your troops will never strike a lucky blow.'
      ])
    })

    test('given good morale when the player hovers over it then the status bar names it', async () => {
      const { user } = await startOnHeroScreen(aMoraleHero())

      await hoverOnHeroScreenBox(user, 'Morale')

      expect(readHeroScreenStatusBar()).toBe('Good Morale')
    })
  })

  describe('other screens', () => {
    test("given a selected hero when the game loads then the info box shows the hero's morale and luck", async () => {
      await setupApp(aMoraleScenario({ hero: aMoraleHero({ skills: [basic('LUCK')] }) }))

      expect(readMoraleAndLuck(getHeroInfoBox())).toEqual(['Morale +1', 'Luck +1'])
    })

    test("given the hero on the map when the player holds the right button on them then the popup shows the hero's morale and luck", async () => {
      const { user } = await setupApp(
        aMoraleScenario({ hero: aMoraleHero({ skills: [basic('LUCK')] }) })
      )

      await holdRightButtonOn(user, 0, 0)

      expect(readMoraleAndLuck(screen.getByRole('tooltip'))).toEqual(['Morale +1', 'Luck +1'])
    })

    test("given two heroes meet when the exchange screen opens then it shows each hero's morale and luck", async () => {
      const { user } = await setupApp(aMeetingScenario())

      await meetHeroAt(user, 5, 0)

      expect([
        readHeroExchangeMoraleAndLuck(HERO),
        readHeroExchangeMoraleAndLuck(OTHER_HERO)
      ]).toEqual([
        ['Morale -1', 'Luck 0'],
        ['Morale +1', 'Luck +1']
      ])
    })
  })

  describe('changes', () => {
    test("given an exchange when the Skeletons move to the other hero then both heroes' morale changes", async () => {
      const { user } = await setupApp(aMeetingScenario())
      await meetHeroAt(user, 5, 0)

      await clickSlotArrow(user, HERO, 2, OTHER_HERO)

      expect([
        readHeroExchangeMoraleAndLuck(HERO),
        readHeroExchangeMoraleAndLuck(OTHER_HERO)
      ]).toEqual([
        ['Morale +1', 'Luck 0'],
        ['Morale -1', 'Luck +1']
      ])
    })

    test('given the Skeletons moved to the other hero when the page reloads then the hero screen shows the changed morale', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(aMeetingScenario(), { eventLog })
      await meetHeroAt(user, 5, 0)
      await clickSlotArrow(user, HERO, 2, OTHER_HERO)
      await closeHeroExchange(user)

      const reloaded = await setupApp(aMeetingScenario(), { eventLog })

      expect(await readHeroScreenMoraleAndLuck(reloaded.user)).toEqual(['Morale +1', 'Luck 0'])
    })

    // Every roll the lowest: the level-up offers an upgrade of the hero's only skill first.
    test('given a hero with Basic Luck when they learn Advanced Luck on a level-up then the hero screen shows luck +2', async () => {
      const { user } = await setupApp(
        aMoraleScenario({
          hero: aMoraleHero({ skills: [basic('LUCK')] }),
          others: [aTreasureChest().withTier(2).at(1, 0)]
        }),
        { random: () => 0 }
      )
      await takeFromTreasureChest(user, { x: 1, y: 0 }, 'experience')

      await pickLevelUpSkill(user, HERO, 'Advanced Luck')
      await closeInteractionModal(user)

      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale +1', 'Luck +2'])
    })
  })
})

// Christian has Pikemen and Skeletons: two towns and undead. Valeska has Pikemen and Basic Luck.
function aMeetingScenario() {
  return aMoraleScenario({
    hero: aMoraleHero({ army: [stack('PIKEMAN'), stack('SKELETON')] }),
    others: [
      aMoraleHero({ army: [stack('PIKEMAN')], skills: [basic('LUCK')] })
        .withId('hero-2')
        .withName(OTHER_HERO)
        .at(5, 0)
    ]
  })
}
