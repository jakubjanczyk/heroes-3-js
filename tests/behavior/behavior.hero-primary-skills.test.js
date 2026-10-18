// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  getHeroInfoBox,
  pointerOverTile,
  readGameData,
  setupMovementBehaviorApp
} from './behavior.utils.js'
import { aHero, aScenario } from './builders.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json')
}

async function setupApp(scenario) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.withDefinitions(gameDefinitions).build()
  })
}

async function holdRightButtonOn(user, x, y) {
  await user.pointer({ keys: '[MouseRight>]', ...pointerOverTile(x, y) })
}

// Each skill is an icon named for screen readers, with its value under it.
function readPrimarySkills(container) {
  const list = within(container).getByRole('list', { name: 'Primary skills' })
  return within(list)
    .getAllByRole('listitem')
    .map(
      (item) => `${within(item).getByRole('img').getAttribute('aria-label')} ${item.textContent}`
    )
}

describe('hero primary skills behavior', () => {
  describe('info box', () => {
    test('given a Knight when the game loads then the info box shows Attack 2, Defense 2, Power 1 and Knowledge 1', async () => {
      await setupApp(aScenario().withEntities(aHero()))

      expect(readPrimarySkills(getHeroInfoBox())).toEqual([
        'Attack 2',
        'Defense 2',
        'Power 1',
        'Knowledge 1'
      ])
    })

    test('given a scenario that sets all four primary skills when the game loads then the info box shows those values', async () => {
      await setupApp(
        aScenario().withEntities(
          aHero().withPrimarySkills({ attack: 5, defense: 0, power: 3, knowledge: 4 })
        )
      )

      expect(readPrimarySkills(getHeroInfoBox())).toEqual([
        'Attack 5',
        'Defense 0',
        'Power 3',
        'Knowledge 4'
      ])
    })

    test("given a scenario that sets only Attack when the game loads then the other three come from the hero's class", async () => {
      await setupApp(aScenario().withEntities(aHero().withPrimarySkills({ attack: 7 })))

      expect(readPrimarySkills(getHeroInfoBox())).toEqual([
        'Attack 7',
        'Defense 2',
        'Power 1',
        'Knowledge 1'
      ])
    })
  })

  describe('right-click popup', () => {
    test("given the hero when the player holds the right button on it then the popup shows the hero's name and primary skills", async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(3)
          .withEntities(aHero().withPrimarySkills({ attack: 3 }).at(1, 0))
      )

      await holdRightButtonOn(user, 1, 0)

      const popup = screen.getByRole('tooltip')
      expect(within(popup).getByText('Hero')).toBeTruthy()
      expect(readPrimarySkills(popup)).toEqual(['Attack 3', 'Defense 2', 'Power 1', 'Knowledge 1'])
    })
  })
})
