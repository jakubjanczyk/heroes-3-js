// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { getTownInTownList } from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  clickHeroInHeroList,
  holdRightButtonOnHeroScreenSkill,
  hoverOnHeroScreenSkill,
  readHeroScreenSecondarySkills,
  readHeroScreenStatusBar
} from './hero-screen.utils.js'
import { hireHero, leaveTown, openTavern, releaseRightButton } from './town-screen.utils.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const EMPTY = ''

// Every roll the lowest: the tavern offers the first heroes of its pool, Orrin and Valeska.
const LOWEST_ROLLS = () => 0

const aSkillsScenario = ({ hero = aHero().withName('Christian') } = {}) =>
  aScenario()
    .withSize(16, 7)
    .withEntities(
      hero.at(0, 6),
      aTown().named('Whitemoon').ownedByPlayer().withBuildings(['TAVERN']).at(4, 3)
    )
    .withDefinitions(gameDefinitions)
    .withStartingResources({ GOLD_PILE: 10000 })

async function setupApp(scenario = aSkillsScenario(), { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0, random: LOWEST_ROLLS },
    eventLog
  })
}

// The selected hero is already framed in the hero list, so one click opens their hero screen.
async function openHeroScreen(user, heroName) {
  await clickHeroInHeroList(user, heroName)
}

async function hireOrrin(user) {
  await user.dblClick(getTownInTownList('Whitemoon'))
  await openTavern(user)
  await hireHero(user, 'Orrin')
  await leaveTown(user)
}

describe('secondary skills behavior', () => {
  describe('on the hero screen', () => {
    test('given a hero of the game when their hero screen opens then it shows their starting skills in order, the rest of the eight slots empty', async () => {
      const { user } = await setupApp()

      await openHeroScreen(user, 'Christian')

      expect(readHeroScreenSecondarySkills()).toEqual([
        'Basic Leadership',
        'Basic Artillery',
        EMPTY,
        EMPTY,
        EMPTY,
        EMPTY,
        EMPTY,
        EMPTY
      ])
    })

    test('given the hero screen is open when the player holds the right button on a skill then a popup says what the skill does at that level', async () => {
      const { user } = await setupApp()
      await openHeroScreen(user, 'Christian')

      await holdRightButtonOnHeroScreenSkill(user, 'Basic Leadership')

      const popup = screen.getByRole('tooltip')
      expect(popup.textContent).toContain('Basic Leadership')
      expect(popup.textContent).toContain("Increases the morale of the hero's troops by 1.")
    })

    test('given a skill popup is shown when the player releases the right button then it closes', async () => {
      const { user } = await setupApp()
      await openHeroScreen(user, 'Christian')
      await holdRightButtonOnHeroScreenSkill(user, 'Basic Leadership')

      await releaseRightButton(user)

      expect(screen.queryByRole('tooltip')).toBeNull()
    })

    test('given the hero screen is open when the player hovers over a skill then the status bar names its info', async () => {
      const { user } = await setupApp()
      await openHeroScreen(user, 'Christian')

      await hoverOnHeroScreenSkill(user, 'Basic Artillery')

      expect(readHeroScreenStatusBar()).toBe('View Basic Artillery Info')
    })
  })

  describe('starting skills', () => {
    test('given the scenario lists a hero’s skills then the hero starts with those', async () => {
      const { user } = await setupApp(
        aSkillsScenario({
          hero: aHero()
            .withName('Christian')
            .withSecondarySkills([
              { skill: 'WISDOM', level: 'ADVANCED' },
              { skill: 'LOGISTICS', level: 'EXPERT' }
            ])
        })
      )

      await openHeroScreen(user, 'Christian')

      expect(readHeroScreenSecondarySkills().slice(0, 3)).toEqual([
        'Advanced Wisdom',
        'Expert Logistics',
        EMPTY
      ])
    })

    test('given a hero is hired in the tavern then they have their own starting skills', async () => {
      const { user } = await setupApp()

      await hireOrrin(user)
      await openHeroScreen(user, 'Orrin')

      expect(readHeroScreenSecondarySkills().slice(0, 3)).toEqual([
        'Basic Leadership',
        'Basic Archery',
        EMPTY
      ])
    })

    test('given a hero was hired when the page reloads then they still have their starting skills', async () => {
      const scenario = aSkillsScenario()
      const eventLog = createMemoryEventLog()
      const { user } = await setupApp(scenario, { eventLog })
      await hireOrrin(user)

      const reloaded = await setupApp(scenario, { eventLog })
      await openHeroScreen(reloaded.user, 'Orrin')

      expect(readHeroScreenSecondarySkills().slice(0, 3)).toEqual([
        'Basic Leadership',
        'Basic Archery',
        EMPTY
      ])
    })
  })
})
