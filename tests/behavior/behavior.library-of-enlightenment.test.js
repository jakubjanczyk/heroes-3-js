// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  confirmTileClickByDispatch,
  expectHeroAt,
  holdRightButtonOn,
  hoverTile,
  readBonusObjectName,
  readInfoPopupLines
} from './adventure-map.utils.js'
import {
  closeInteractionModal,
  closeLevelUpPopup,
  expectStatusBarText,
  getHeroInfoBox,
  readMessage,
  readMessageRewards,
  readPrimarySkills
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aBonusObject, aHero, aScenario } from './builders.js'
import { clickHeroInHeroList, readHeroScreenPrimarySkills } from './hero-screen.utils.js'
import { releaseRightButton } from './town-screen.utils.js'

const ADMITTED =
  'The caretaker admits you into the Library of Enlightenment. You are able to learn much in the short time you spend here.'
const TURNED_AWAY =
  'The caretaker opens the door and looks you up and down. "You are neither famous nor diplomatic enough to be admitted to the Library of Enlightenment," he sniffs. "Come back when you think yourself worthy."'
const VISITED =
  'Recognizing you, the caretaker refuses to admit you. "The Library of Enlightenment," he says, "may be visited but once."'

// The experience each level starts at.
const EXPERIENCE_FOR_LEVEL = {
  3: 2000,
  4: 3200,
  5: 4600,
  6: 6200,
  7: 8000,
  8: 10000,
  9: 12200,
  10: 14700
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  bonusObjects: readGameData('bonus-objects.json')
}

const aHeroOfLevel = (level, secondarySkills = []) =>
  aHero().withExperience(EXPERIENCE_FOR_LEVEL[level]).withSecondarySkills(secondarySkills)

// The Library's entrance is at (2, 1) and the hero, a Knight with Attack 2, Defense 2, Power 1
// and Knowledge 1, stands right below it, so entering it takes one step.
function setupLibrary({ heroes = [aHeroOfLevel(10).at(2, 2)], entities = [], eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(5, 4)
      .withEntities(
        ...heroes,
        aBonusObject().withType('LIBRARY_OF_ENLIGHTENMENT').at(2, 1),
        ...entities
      )
      .withDefinitions(gameDefinitions)
      .build(),
    eventLog
  })
}

async function walkTo(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

const enterEntrance = () => walkTo(2, 1)

async function closeMessageAndStepOff(user) {
  await closeInteractionModal(user)
  await walkTo(2, 2)
}

async function readPopupOn(user, x, y) {
  await holdRightButtonOn(user, x, y)
  const lines = readInfoPopupLines()
  await releaseRightButton(user)
  return lines
}

describe('Library of Enlightenment', () => {
  test('shows the Library of Enlightenment on the map', async () => {
    await setupLibrary()

    expect(readBonusObjectName()).toBe('Library of Enlightenment')
  })

  test('the hero walks onto its entrance', async () => {
    await setupLibrary()

    await enterEntrance()

    expectHeroAt(2, 1)
  })

  describe('admitted', () => {
    test('a level 10 hero gets its message with +2 to each primary skill', async () => {
      await setupLibrary()

      await enterEntrance()

      expect(readMessage()).toBe(ADMITTED)
      expect(readMessageRewards()).toEqual(['+2 Attack', '+2 Defense', '+2 Power', '+2 Knowledge'])
    })

    test("the hero's four primary skills are each 2 higher", async () => {
      await setupLibrary()

      await enterEntrance()

      expect(readPrimarySkills(getHeroInfoBox())).toEqual([
        'Attack 4',
        'Defense 4',
        'Power 3',
        'Knowledge 3'
      ])
    })

    test('the raised skills show on the hero screen', async () => {
      const { user } = await setupLibrary()
      await enterEntrance()
      await closeInteractionModal(user)

      await clickHeroInHeroList(user, 'Hero')

      expect(readHeroScreenPrimarySkills()).toEqual([
        'Attack 4',
        'Defense 4',
        'Power 3',
        'Knowledge 3'
      ])
    })

    test.each([
      { diplomacy: 'BASIC', level: 8 },
      { diplomacy: 'ADVANCED', level: 6 },
      { diplomacy: 'EXPERT', level: 4 }
    ])('a level $level hero with $diplomacy Diplomacy is admitted', async ({
      diplomacy,
      level
    }) => {
      await setupLibrary({
        heroes: [aHeroOfLevel(level, [{ skill: 'DIPLOMACY', level: diplomacy }]).at(2, 2)]
      })

      await enterEntrance()

      expect(readMessage()).toBe(ADMITTED)
    })
  })

  describe('turned away', () => {
    test('a level 9 hero without Diplomacy gets the turned away message and nothing', async () => {
      await setupLibrary({ heroes: [aHeroOfLevel(9).at(2, 2)] })

      await enterEntrance()

      expect(readMessage()).toBe(TURNED_AWAY)
      expect(readMessageRewards()).toEqual([])
      expect(readPrimarySkills(getHeroInfoBox())).toEqual([
        'Attack 2',
        'Defense 2',
        'Power 1',
        'Knowledge 1'
      ])
    })

    test.each([
      { diplomacy: 'BASIC', level: 7 },
      { diplomacy: 'ADVANCED', level: 5 },
      { diplomacy: 'EXPERT', level: 3 }
    ])('a level $level hero with $diplomacy Diplomacy is turned away', async ({
      diplomacy,
      level
    }) => {
      await setupLibrary({
        heroes: [aHeroOfLevel(level, [{ skill: 'DIPLOMACY', level: diplomacy }]).at(2, 2)]
      })

      await enterEntrance()

      expect(readMessage()).toBe(TURNED_AWAY)
    })

    test('the popup still says the hero has not visited it', async () => {
      const { user } = await setupLibrary({ heroes: [aHeroOfLevel(9).at(2, 2)] })
      await enterEntrance()
      await closeMessageAndStepOff(user)

      expect((await readPopupOn(user, 2, 1)).at(-1)).toBe('(Not visited)')
    })

    test('the status bar still says the hero has not visited it', async () => {
      const { user } = await setupLibrary({ heroes: [aHeroOfLevel(9).at(2, 2)] })
      await enterEntrance()
      await closeMessageAndStepOff(user)

      await hoverTile(user, 2, 1)

      expectStatusBarText('Library of Enlightenment (Not visited)')
    })

    // The Learning Stone's 1000 experience takes the hero from 14000 to 15000, past level 10's
    // 14700.
    test('a hero turned away who has since reached level 10 is admitted', async () => {
      const { user } = await setupLibrary({
        heroes: [aHero().withExperience(14000).withSecondarySkills([]).at(2, 2)],
        entities: [aBonusObject().withId('stone-1').withType('LEARNING_STONE').at(2, 3)]
      })
      await enterEntrance()
      await closeInteractionModal(user)
      await walkTo(2, 3)
      await closeInteractionModal(user)
      await closeLevelUpPopup(user)

      await enterEntrance()

      expect(readMessage()).toBe(ADMITTED)
    })
  })

  describe('visiting again', () => {
    test('the hero gets the second message and nothing', async () => {
      const { user } = await setupLibrary()
      await enterEntrance()

      await closeMessageAndStepOff(user)
      await enterEntrance()

      expect(readMessage()).toBe(VISITED)
      expect(readMessageRewards()).toEqual([])
      expect(readPrimarySkills(getHeroInfoBox())[0]).toBe('Attack 4')
    })

    test('another hero of the player still gets the bonus', async () => {
      const { user } = await setupLibrary({
        heroes: [
          aHeroOfLevel(10).withName('Sir Christian').at(2, 2),
          aHeroOfLevel(10).withId('hero-2').withName('Valeska').at(1, 2)
        ]
      })
      await enterEntrance()
      await closeInteractionModal(user)
      await walkTo(3, 2)

      await clickHeroInHeroList(user, 'Valeska')
      await enterEntrance()

      expect(readMessage()).toBe(ADMITTED)
      expect(readPrimarySkills(getHeroInfoBox())[0]).toBe('Attack 4')
    })
  })

  describe('right-click popup', () => {
    test('names the Library, what it gives and that the selected hero has not visited it', async () => {
      const { user } = await setupLibrary()

      expect(await readPopupOn(user, 2, 1)).toEqual([
        'Library of Enlightenment',
        '+2 Attack, Defense, Power and Knowledge',
        '(Not visited)'
      ])
    })

    test('says visited once the selected hero has been there', async () => {
      const { user } = await setupLibrary()
      await enterEntrance()
      await closeMessageAndStepOff(user)

      expect((await readPopupOn(user, 2, 1)).at(-1)).toBe('(Visited)')
    })
  })

  describe('status bar', () => {
    test('names the Library and that the selected hero has not visited it', async () => {
      const { user } = await setupLibrary()

      await hoverTile(user, 2, 1)

      expectStatusBarText('Library of Enlightenment (Not visited)')
    })

    test('says visited once the selected hero has been there', async () => {
      const { user } = await setupLibrary()
      await enterEntrance()
      await closeMessageAndStepOff(user)

      await hoverTile(user, 2, 1)

      expectStatusBarText('Library of Enlightenment (Visited)')
    })
  })

  test('after a reload the bonus is kept and the hero has still visited the Library', async () => {
    const session = { eventLog: createMemoryEventLog() }
    const { user } = await setupLibrary(session)
    await enterEntrance()
    await closeMessageAndStepOff(user)

    await setupLibrary(session)
    await enterEntrance()

    expect(readMessage()).toBe(VISITED)
    expect(readPrimarySkills(getHeroInfoBox())[0]).toBe('Attack 4')
  })
})
