// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  closeInteractionModal,
  getInteractionModalOkButton,
  getTownInTownList,
  pickLevelUpSkill,
  readLevelUpSkillOffers,
  readPickedLevelUpSkills,
  takeFromTreasureChest
} from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTown, aTreasureChest } from './builders.js'
import {
  clickHeroInHeroList,
  closeHeroScreen,
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

async function setupApp(scenario = aSkillsScenario(), { eventLog, random = LOWEST_ROLLS } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0, random },
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

  describe('on level-up', () => {
    // Every roll 0.5. The upgrade is the middle one (rounded up) of the hero's Basic and Advanced
    // skills. The new skill lands halfway through the Knight's weights of the skills the hero
    // hasn't got, in the game's order: for Christian, 48.5 of 97 falls in Estates (48 to 54).
    const HALFWAY_ROLLS = () => 0.5

    const chest = { x: 1, y: 6 }

    const expert = (skill) => ({ skill, level: 'EXPERT' })
    const basic = (skill) => ({ skill, level: 'BASIC' })

    // A tier 2 chest's 1000 experience takes a new hero to level 2; with 1900 experience, a tier
    // 3 chest's 1500 takes them to level 4.
    const aLevelUpScenario = ({
      hero = aHero().withName('Christian'),
      experience = 0,
      chestTier = 2
    } = {}) =>
      aScenario()
        .withSize(16, 7)
        .withEntities(
          hero.withExperience(experience).at(0, 6),
          aTreasureChest().withTier(chestTier).at(1, 6)
        )
        .withDefinitions(gameDefinitions)

    async function setupLevelUpApp(scenario = aLevelUpScenario(), { eventLog } = {}) {
      return setupApp(scenario, { eventLog, random: HALFWAY_ROLLS })
    }

    async function levelUp(user) {
      await takeFromTreasureChest(user, chest, 'experience')
    }

    async function learnSkill(user, levelAndSkill) {
      await pickLevelUpSkill(user, 'Christian', levelAndSkill)
      await closeInteractionModal(user)
    }

    async function readChristiansSkills(user) {
      await openHeroScreen(user, 'Christian')
      const skills = readHeroScreenSecondarySkills()
      await closeHeroScreen(user)
      return skills
    }

    test('given Christian goes up a level when the popup opens then it offers an upgrade of one of his skills and a new skill', async () => {
      const { user } = await setupLevelUpApp()

      await levelUp(user)

      expect(readLevelUpSkillOffers('Christian')).toEqual(['Advanced Artillery', 'Basic Estates'])
    })

    test('given the level-up popup offers two skills then neither is picked and OK is disabled', async () => {
      const { user } = await setupLevelUpApp()

      await levelUp(user)

      expect(readPickedLevelUpSkills('Christian')).toEqual([])
      expect(getInteractionModalOkButton().disabled).toBe(true)
    })

    test('given the level-up popup offers two skills when the player picks one then OK is enabled', async () => {
      const { user } = await setupLevelUpApp()
      await levelUp(user)

      await pickLevelUpSkill(user, 'Christian', 'Basic Estates')

      expect(getInteractionModalOkButton().disabled).toBe(false)
    })

    test('given the player picks the new skill when they press OK then the hero screen shows it in the next empty slot', async () => {
      const { user } = await setupLevelUpApp()
      await levelUp(user)

      await learnSkill(user, 'Basic Estates')

      expect((await readChristiansSkills(user)).slice(0, 4)).toEqual([
        'Basic Leadership',
        'Basic Artillery',
        'Basic Estates',
        EMPTY
      ])
    })

    test('given the player picks the upgrade when they press OK then the hero screen shows that skill one level higher in its own slot', async () => {
      const { user } = await setupLevelUpApp()
      await levelUp(user)

      await learnSkill(user, 'Advanced Artillery')

      expect((await readChristiansSkills(user)).slice(0, 3)).toEqual([
        'Basic Leadership',
        'Advanced Artillery',
        EMPTY
      ])
    })

    test('given the player picked one skill when they pick the other and press OK then the hero learns the second one', async () => {
      const { user } = await setupLevelUpApp()
      await levelUp(user)
      await pickLevelUpSkill(user, 'Christian', 'Basic Estates')

      await learnSkill(user, 'Advanced Artillery')

      expect((await readChristiansSkills(user)).slice(0, 3)).toEqual([
        'Basic Leadership',
        'Advanced Artillery',
        EMPTY
      ])
    })

    test('given a hero with no skills when they level up then the popup offers two new skills', async () => {
      const { user } = await setupLevelUpApp(
        aLevelUpScenario({ hero: aHero().withName('Christian').withSecondarySkills([]) })
      )

      await levelUp(user)

      // 56 of all 112 falls in Eagle Eye (56 to 58); then, without Eagle Eye, 55 of 110 in
      // Ballistics (48 to 56).
      expect(readLevelUpSkillOffers('Christian')).toEqual(['Basic Eagle Eye', 'Basic Ballistics'])
    })

    test('given a hero whose skills are all at Expert when they level up then both offers are new skills', async () => {
      const { user } = await setupLevelUpApp(
        aLevelUpScenario({
          hero: aHero()
            .withName('Christian')
            .withSecondarySkills([expert('LEADERSHIP'), expert('ARTILLERY')])
        })
      )

      await levelUp(user)

      // 48.5 of 97 falls in Estates (48 to 54); then, without Estates, 45.5 of 91 in Ballistics
      // (38 to 46).
      expect(readLevelUpSkillOffers('Christian')).toEqual(['Basic Estates', 'Basic Ballistics'])
    })

    test('given a hero with 8 skills when they level up then both offers are upgrades', async () => {
      const { user } = await setupLevelUpApp(
        aLevelUpScenario({
          hero: aHero()
            .withName('Christian')
            .withSecondarySkills(
              [
                'LEADERSHIP',
                'ARTILLERY',
                'ARCHERY',
                'LOGISTICS',
                'DIPLOMACY',
                'SCOUTING',
                'NAVIGATION',
                'WISDOM'
              ].map(basic)
            )
        })
      )

      await levelUp(user)

      // The 5th of 8 is Diplomacy; then the 4th of the 7 left is Logistics.
      expect(readLevelUpSkillOffers('Christian')).toEqual([
        'Advanced Diplomacy',
        'Advanced Logistics'
      ])
    })

    describe('with 8 skills, all but one at Expert', () => {
      const scenario = () =>
        aLevelUpScenario({
          hero: aHero()
            .withName('Christian')
            .withSecondarySkills([
              ...[
                'LEADERSHIP',
                'ARTILLERY',
                'ARCHERY',
                'LOGISTICS',
                'DIPLOMACY',
                'SCOUTING',
                'NAVIGATION'
              ].map(expert),
              basic('WISDOM')
            ])
        })

      test('given the hero levels up then the popup offers that skill alone, already picked', async () => {
        const { user } = await setupLevelUpApp(scenario())

        await levelUp(user)

        expect(readLevelUpSkillOffers('Christian')).toEqual(['Advanced Wisdom'])
        expect(readPickedLevelUpSkills('Christian')).toEqual(['Advanced Wisdom'])
      })

      test('given the popup offers one skill then OK is enabled', async () => {
        const { user } = await setupLevelUpApp(scenario())

        await levelUp(user)

        expect(getInteractionModalOkButton().disabled).toBe(false)
      })
    })

    test('given a hero with 8 skills, all at Expert, when they level up then the popup offers no skill and OK is enabled', async () => {
      const { user } = await setupLevelUpApp(
        aLevelUpScenario({
          hero: aHero()
            .withName('Christian')
            .withSecondarySkills(
              [
                'LEADERSHIP',
                'ARTILLERY',
                'ARCHERY',
                'LOGISTICS',
                'DIPLOMACY',
                'SCOUTING',
                'NAVIGATION',
                'WISDOM'
              ].map(expert)
            )
        })
      )

      await levelUp(user)

      expect(readLevelUpSkillOffers('Christian')).toEqual([])
      expect(getInteractionModalOkButton().disabled).toBe(false)
    })

    test('given a hero with only Basic Leadership gains two levels at once when they pick Advanced Leadership on the first popup then the second popup offers Expert Leadership', async () => {
      const { user } = await setupLevelUpApp(
        aLevelUpScenario({
          hero: aHero()
            .withName('Christian')
            .withSecondarySkills([basic('LEADERSHIP')]),
          experience: 1900,
          chestTier: 3
        })
      )
      await levelUp(user)

      await learnSkill(user, 'Advanced Leadership')

      // Without Leadership, 51 of 102 falls in Estates (48 to 54).
      expect(readLevelUpSkillOffers('Christian')).toEqual(['Expert Leadership', 'Basic Estates'])
    })

    describe('reload', () => {
      test('given the hero learned a skill on a level-up when the page reloads then the hero screen still shows it', async () => {
        const eventLog = createMemoryEventLog()
        const { user } = await setupLevelUpApp(aLevelUpScenario(), { eventLog })
        await levelUp(user)
        await learnSkill(user, 'Basic Estates')

        const reloaded = await setupLevelUpApp(aLevelUpScenario(), { eventLog })

        expect((await readChristiansSkills(reloaded.user)).slice(0, 4)).toEqual([
          'Basic Leadership',
          'Basic Artillery',
          'Basic Estates',
          EMPTY
        ])
      })

      test('given a level-up popup is open when the page reloads then it opens again with the same two skills', async () => {
        const eventLog = createMemoryEventLog()
        const { user } = await setupLevelUpApp(aLevelUpScenario(), { eventLog })
        await levelUp(user)

        await setupApp(aLevelUpScenario(), { eventLog, random: LOWEST_ROLLS })

        expect(readLevelUpSkillOffers('Christian')).toEqual(['Advanced Artillery', 'Basic Estates'])
      })
    })
  })
})
