// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  confirmMove,
  holdRightButtonOn,
  hoverTile,
  readInfoPopupLines
} from './adventure-map.utils.js'
import { clickEndTurn, expectStatusBarText, getHeroInHeroList } from './adventure-panels.utils.js'
import { castSpellFromMap } from './adventure-spells.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aMonster, anArtifactDefinition, aScenario, aSpellDefinition } from './builders.js'

const spells = {
  VISIONS: aSpellDefinition()
    .withName('Visions')
    .withLevel(2)
    .withSchools(['AIR', 'EARTH', 'FIRE', 'WATER'])
    .withKind('adventure')
    .withCosts([4, 2, 2, 2])
    .describedAs('Visions description.')
    .withVisions({ rangePerPower: [1, 1, 2, 3], minimumRange: 3 })
    .build()
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  artifacts: {
    ORB: anArtifactDefinition()
      .withName('Orb')
      .withSlot('MISC')
      .withPrimarySkills({ power: 4 })
      .build()
  },
  spells
}

const aSeer = ({ power = 1, air, id = 'hero-1', name = 'Seer', x = 0, y = 0 } = {}) =>
  aHero()
    .withId(id)
    .withName(name)
    .withPrimarySkills({ power, knowledge: 10 })
    .withSecondarySkills(air ? [{ skill: 'AIR_MAGIC', level: air }] : [])
    .withSpellBook(true)
    .withSpells(['VISIONS'])
    .at(x, y)

const skeletons = (count, x, y, id = `monster-${x}-${y}`) =>
  aMonster().withId(id).withType('SKELETON').withCount(count).at(x, y)

const aVisionsScenario = ({ hero = aSeer(), others = [] } = {}) =>
  aScenario()
    .withSize(9, 9)
    .withEntities(hero, ...others)
    .withDefinitions(gameDefinitions)

const setupApp = (scenario = aVisionsScenario(), { eventLog } = {}) =>
  setupMovementBehaviorApp({ loadGameOptions: scenario.build(), eventLog })

async function setupSeeingApp(scenario, options) {
  const app = await setupApp(scenario, options)
  await castSpellFromMap(app.user, 'Visions')
  return app
}

async function expectStatusBarOver(user, x, y, text) {
  await hoverTile(user, x, y)
  expectStatusBarText(text)
}

describe('Visions behavior', () => {
  describe('exact counts', () => {
    test('given a hero who cast Visions when the player hovers a nearby monster then the status bar shows its exact count', async () => {
      const { user } = await setupSeeingApp(aVisionsScenario({ others: [skeletons(12, 2, 0)] }))

      await expectStatusBarOver(user, 2, 0, '12 Skeletons')
    })

    test('given a hero who cast Visions when the player hovers a single nearby monster then the status bar names it in the singular', async () => {
      const { user } = await setupSeeingApp(aVisionsScenario({ others: [skeletons(1, 2, 0)] }))

      await expectStatusBarOver(user, 2, 0, '1 Skeleton')
    })

    test('given a hero who cast Visions when the player holds the right button on a nearby monster then the popup shows its exact count', async () => {
      const { user } = await setupSeeingApp(aVisionsScenario({ others: [skeletons(12, 2, 0)] }))

      await holdRightButtonOn(user, 2, 0)

      expect(readInfoPopupLines()).toEqual(['12 Skeletons'])
    })

    // Power 1 would reach 1 tile; the range is never under 3. A monster counts when it is closer
    // than the range in a straight line: 2 across and 2 down is 2.8 away, 3 across is 3.
    test('given a hero with Power 1 who cast Visions then monsters closer than 3 tiles show their count and one 3 tiles away its size', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({ others: [skeletons(5, 2, 2), skeletons(6, 3, 0)] })
      )

      await expectStatusBarOver(user, 2, 2, '5 Skeletons')
      await expectStatusBarOver(user, 3, 0, 'Several Skeletons')
    })

    // Power 5 at Basic reaches 5 tiles: 4 across and 2 down is 4.5 away, 5 across is 5.
    test('given Basic Air Magic and Power 5 when the hero casts Visions then the range is 5 tiles', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: aSeer({ power: 5, air: 'BASIC' }),
          others: [skeletons(5, 4, 2), skeletons(6, 5, 0)]
        })
      )

      await expectStatusBarOver(user, 4, 2, '5 Skeletons')
      await expectStatusBarOver(user, 5, 0, 'Several Skeletons')
    })

    // Power 2 at Advanced reaches 4 tiles: 3 across and 2 down is 3.6 away, 4 across is 4.
    test('given Advanced Air Magic and Power 2 when the hero casts Visions then the range is twice the Power', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: aSeer({ power: 2, air: 'ADVANCED' }),
          others: [skeletons(5, 3, 2), skeletons(6, 4, 0)]
        })
      )

      await expectStatusBarOver(user, 3, 2, '5 Skeletons')
      await expectStatusBarOver(user, 4, 0, 'Several Skeletons')
    })

    // Power 2 at Expert reaches 6 tiles: 5 across and 3 down is 5.8 away, 6 across is 6.
    test('given Expert Air Magic and Power 2 when the hero casts Visions then the range is three times the Power', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: aSeer({ power: 2, air: 'EXPERT' }),
          others: [skeletons(5, 5, 3), skeletons(6, 6, 0)]
        })
      )

      await expectStatusBarOver(user, 5, 3, '5 Skeletons')
      await expectStatusBarOver(user, 6, 0, 'Several Skeletons')
    })

    test('given no magic school and Power 5 when the hero casts Visions then the range is 5 tiles, as at Basic', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: aSeer({ power: 5 }),
          others: [skeletons(5, 4, 2), skeletons(6, 5, 0)]
        })
      )

      await expectStatusBarOver(user, 4, 2, '5 Skeletons')
      await expectStatusBarOver(user, 5, 0, 'Several Skeletons')
    })

    test('given a monster out of range when the hero walks within range of it then it shows its count', async () => {
      const { user } = await setupSeeingApp(aVisionsScenario({ others: [skeletons(12, 4, 0)] }))
      await expectStatusBarOver(user, 4, 0, 'Pack of Skeletons')

      await confirmMove(user, 2, 0)

      await expectStatusBarOver(user, 4, 0, '12 Skeletons')
    })

    test('given a hero who cast Visions when the player selects another hero who did not then nearby monsters show their size', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          others: [aSeer({ id: 'hero-2', name: 'Other', x: 8, y: 8 }), skeletons(12, 2, 0)]
        })
      )

      await user.click(getHeroInHeroList('Other'))

      await expectStatusBarOver(user, 2, 0, 'Pack of Skeletons')
    })

    // Power 1 and the Orb's 4 make 5, so 4 tiles across is within range.
    test('given a hero whose artifact adds Power when they cast Visions then the range counts it', async () => {
      const { user } = await setupSeeingApp(
        aVisionsScenario({
          hero: aSeer().withArtifacts(['ORB']),
          others: [skeletons(12, 4, 0)]
        })
      )

      await expectStatusBarOver(user, 4, 0, '12 Skeletons')
    })
  })

  describe('lasting', () => {
    test('given a hero who cast Visions when the next day starts then nearby monsters show their size again', async () => {
      const { user } = await setupSeeingApp(aVisionsScenario({ others: [skeletons(12, 2, 0)] }))

      await clickEndTurn(user)

      await expectStatusBarOver(user, 2, 0, 'Pack of Skeletons')
    })

    test('given a hero who cast Visions when the page reloads then nearby monsters still show their count', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aVisionsScenario({ others: [skeletons(12, 2, 0)] })
      await setupSeeingApp(scenario, { eventLog })

      const { user } = await setupApp(scenario, { eventLog })

      await expectStatusBarOver(user, 2, 0, '12 Skeletons')
    })
  })
})
