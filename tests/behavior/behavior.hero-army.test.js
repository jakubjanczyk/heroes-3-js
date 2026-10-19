// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmMove,
  createMemoryEventLog,
  flushMicrotasks,
  getHeroInfoBox,
  pointerOverTile,
  readGameData,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aHero, aScenario } from './builders.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  monsters: readGameData('monsters.json')
}

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build(),
    ...options
  })
}

async function holdRightButtonOn(user, x, y) {
  await user.pointer({ keys: '[MouseRight>]', ...pointerOverTile(x, y) })
}

const skeletons = (count) => ({ creature: 'SKELETON', count })

function readArmySlots(container) {
  const army = within(container).getByRole('list', { name: 'Army' })
  return within(army)
    .getAllByRole('listitem')
    .map((slot) => {
      const creature = within(slot).queryByRole('img')
      return creature ? `${creature.getAttribute('aria-label')} ${slot.textContent.trim()}` : ''
    })
}

describe('hero army behavior', () => {
  describe('info box', () => {
    test('given a hero with 12 Skeletons when the game loads then the first army slot shows Skeletons with the count 12', async () => {
      await setupApp(aScenario().withEntities(aHero().withArmy([skeletons(12)])))

      expect(readArmySlots(getHeroInfoBox())[0]).toBe('Skeletons 12')
    })

    test('given a hero with Skeletons in the third slot when the game loads then the Skeletons are in the third slot and the other six slots are empty', async () => {
      await setupApp(aScenario().withEntities(aHero().withArmy([null, null, skeletons(12)])))

      expect(readArmySlots(getHeroInfoBox())).toEqual(['', '', 'Skeletons 12', '', '', '', ''])
    })

    test('given a hero with three stacks of Skeletons when the game loads then each slot shows its own exact count', async () => {
      await setupApp(
        aScenario().withEntities(aHero().withArmy([skeletons(5), skeletons(1), skeletons(250)]))
      )

      expect(readArmySlots(getHeroInfoBox())).toEqual([
        'Skeletons 5',
        'Skeleton 1',
        'Skeletons 250',
        '',
        '',
        '',
        ''
      ])
    })
  })

  describe('right-click popup', () => {
    test("given a hero with 12 Skeletons when the player holds the right button on the hero then the popup's first army slot shows Skeletons with the count 12", async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(3)
          .withEntities(
            aHero()
              .withArmy([skeletons(12)])
              .at(1, 0)
          )
      )

      await holdRightButtonOn(user, 1, 0)

      expect(readArmySlots(screen.getByRole('tooltip'))[0]).toBe('Skeletons 12')
    })
  })

  describe('reload', () => {
    test('given a hero with 12 Skeletons who has moved when the page reloads then the info box still shows 12 Skeletons', async () => {
      const scenario = aScenario()
        .withSize(3)
        .withEntities(aHero().withArmy([skeletons(12)]))
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(scenario, { eventLog })
      await confirmMove(user, 2, 0)
      await flushMicrotasks()

      await setupApp(scenario, { eventLog })
      await flushMicrotasks()

      expect(readArmySlots(getHeroInfoBox())[0]).toBe('Skeletons 12')
    })
  })
})
