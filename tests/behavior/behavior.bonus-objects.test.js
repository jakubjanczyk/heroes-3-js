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
  expectStatusBarText,
  getHeroInfoBox,
  queryLevelUpPopup,
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
import {
  clickHeroInHeroList,
  readHeroScreenBox,
  readHeroScreenPrimarySkills
} from './hero-screen.utils.js'
import { releaseRightButton } from './town-screen.utils.js'

const LEARNING_STONE_GIVES =
  'A smooth stone on the face of this pillar begins to swirl as you approach. Looking into it, you are amazed to see answers to questions you have pondered for years. The stone suddenly goes still, but you realize you have learned much.'
const MERCENARY_CAMP_GIVES =
  "You've come upon a camp of mercenaries practicing their combat tactics. They welcome you and your troops and invite you to train with them."
const MERCENARY_CAMP_VISITED =
  'You\'ve come upon a camp of mercenaries practicing their combat tactics. "You\'re too advanced for us," the mercenary captain says. "We can teach you nothing more."'
const MARLETTO_TOWER_GIVES =
  'The soldiers living in the tower teach you a few new defensive tricks.'
const STAR_AXIS_GIVES =
  "You've found several of the best astrologers of the land gathered at a Star Axis. Happy to have some company, they teach you how to use the Sun, Moon, and Stars to enhance your spell casting ability."
const GARDEN_OF_REVELATION_GIVES =
  'A monk sitting in the center of a garden invites you to meditate with him. You do, and after a short time you feel enlightened.'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  bonusObjects: readGameData('bonus-objects.json')
}

// The object's entrance is at (2, 1) and the hero, a Knight with Attack 2, Defense 2, Power 1
// and Knowledge 1, stands right below it, so entering it takes one step.
function setupMapWith(type, { heroes = [aHero().at(2, 2)], eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(5, 3)
      .withEntities(...heroes, aBonusObject().withType(type).at(2, 1))
      .withDefinitions(gameDefinitions)
      .build(),
    eventLog
  })
}

const setupMercenaryCamp = (options) => setupMapWith('MERCENARY_CAMP', options)

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

describe('Learning Stone, Mercenary Camp, Marletto Tower, Star Axis and Garden of Revelation', () => {
  test.each([
    { type: 'LEARNING_STONE', name: 'Learning Stone' },
    { type: 'MERCENARY_CAMP', name: 'Mercenary Camp' },
    { type: 'MARLETTO_TOWER', name: 'Marletto Tower' },
    { type: 'STAR_AXIS', name: 'Star Axis' },
    { type: 'GARDEN_OF_REVELATION', name: 'Garden of Revelation' },
    { type: 'TREE_OF_KNOWLEDGE', name: 'Tree of Knowledge' }
  ])('shows the $name on the map', async ({ type, name }) => {
    await setupMapWith(type)

    expect(readBonusObjectName()).toBe(name)
  })

  test("the hero walks onto the Mercenary Camp's entrance", async () => {
    await setupMercenaryCamp()

    await enterEntrance()

    expectHeroAt(2, 1)
  })

  test.each([
    { side: 'left', x: 1 },
    { side: 'right', x: 3 }
  ])("the hero cannot walk onto the tile $side of the Mercenary Camp's entrance", async ({ x }) => {
    await setupMercenaryCamp({ heroes: [aHero().at(x, 2)] })

    await walkTo(x, 1)

    expectHeroAt(x, 2)
  })

  describe('Learning Stone', () => {
    test('entering shows its message with the 1000 experience it gives', async () => {
      await setupMapWith('LEARNING_STONE')

      await enterEntrance()

      expect(readMessage()).toBe(LEARNING_STONE_GIVES)
      expect(readMessageRewards()).toEqual(['1000 Experience'])
    })

    test('the hero has 1000 more experience on the hero screen', async () => {
      const { user } = await setupMapWith('LEARNING_STONE', {
        heroes: [aHero().withExperience(200).at(2, 2)]
      })
      await enterEntrance()
      await closeInteractionModal(user)

      await clickHeroInHeroList(user, 'Hero')

      expect(readHeroScreenBox('Experience')).toBe('Experience 1200')
    })

    // Level 2 takes 1000 experience.
    test('the experience levels the hero up after the message', async () => {
      const { user } = await setupMapWith('LEARNING_STONE')
      await enterEntrance()
      expect(queryLevelUpPopup()).toBeNull()

      await closeInteractionModal(user)

      expect(queryLevelUpPopup()).toBeTruthy()
    })
  })

  test.each([
    {
      name: 'Mercenary Camp',
      type: 'MERCENARY_CAMP',
      message: MERCENARY_CAMP_GIVES,
      reward: '+1 Attack',
      skills: ['Attack 3', 'Defense 2', 'Power 1', 'Knowledge 1']
    },
    {
      name: 'Marletto Tower',
      type: 'MARLETTO_TOWER',
      message: MARLETTO_TOWER_GIVES,
      reward: '+1 Defense',
      skills: ['Attack 2', 'Defense 3', 'Power 1', 'Knowledge 1']
    },
    {
      name: 'Star Axis',
      type: 'STAR_AXIS',
      message: STAR_AXIS_GIVES,
      reward: '+1 Power',
      skills: ['Attack 2', 'Defense 2', 'Power 2', 'Knowledge 1']
    },
    {
      name: 'Garden of Revelation',
      type: 'GARDEN_OF_REVELATION',
      message: GARDEN_OF_REVELATION_GIVES,
      reward: '+1 Knowledge',
      skills: ['Attack 2', 'Defense 2', 'Power 1', 'Knowledge 2']
    }
  ])('the $name gives $reward with its message', async ({ type, message, reward, skills }) => {
    await setupMapWith(type)

    await enterEntrance()

    expect(readMessage()).toBe(message)
    expect(readMessageRewards()).toEqual([reward])
    expect(readPrimarySkills(getHeroInfoBox())).toEqual(skills)
  })

  test('the raised skill shows on the hero screen', async () => {
    const { user } = await setupMercenaryCamp()
    await enterEntrance()
    await closeInteractionModal(user)

    await clickHeroInHeroList(user, 'Hero')

    expect(readHeroScreenPrimarySkills()[0]).toBe('Attack 3')
  })

  describe('visiting again', () => {
    test('the hero gets the second message and nothing', async () => {
      const { user } = await setupMercenaryCamp()
      await enterEntrance()

      await closeMessageAndStepOff(user)
      await enterEntrance()

      expect(readMessage()).toBe(MERCENARY_CAMP_VISITED)
      expect(readMessageRewards()).toEqual([])
      expect(readPrimarySkills(getHeroInfoBox())[0]).toBe('Attack 3')
    })

    test('another hero of the player still gets the bonus', async () => {
      const { user } = await setupMercenaryCamp({
        heroes: [
          aHero().withName('Sir Christian').at(2, 2),
          aHero().withId('hero-2').withName('Valeska').at(1, 2)
        ]
      })
      await enterEntrance()
      await closeInteractionModal(user)
      await walkTo(3, 2)

      await clickHeroInHeroList(user, 'Valeska')
      await enterEntrance()

      expect(readMessage()).toBe(MERCENARY_CAMP_GIVES)
      expect(readPrimarySkills(getHeroInfoBox())[0]).toBe('Attack 3')
    })
  })

  describe('right-click popup', () => {
    test('names the object, what it gives and that the selected hero has not visited it', async () => {
      const { user } = await setupMercenaryCamp()

      await holdRightButtonOn(user, 2, 1)

      expect(readInfoPopupLines()).toEqual(['Mercenary Camp', '+1 Attack', '(Not visited)'])
    })

    test('says what the Learning Stone gives', async () => {
      const { user } = await setupMapWith('LEARNING_STONE')

      await holdRightButtonOn(user, 2, 1)

      expect(readInfoPopupLines()).toEqual(['Learning Stone', '+1000 Experience', '(Not visited)'])
    })

    test('says visited once the selected hero has been there', async () => {
      const { user } = await setupMercenaryCamp()
      await enterEntrance()
      await closeMessageAndStepOff(user)

      expect(await readPopupOn(user, 2, 1)).toEqual(['Mercenary Camp', '+1 Attack', '(Visited)'])
    })

    test('says not visited when the selected hero is another who has not been there', async () => {
      const { user } = await setupMercenaryCamp({
        heroes: [
          aHero().withName('Sir Christian').at(2, 2),
          aHero().withId('hero-2').withName('Valeska').at(0, 0)
        ]
      })
      await enterEntrance()
      await closeMessageAndStepOff(user)

      await clickHeroInHeroList(user, 'Valeska')

      expect(await readPopupOn(user, 2, 1)).toEqual([
        'Mercenary Camp',
        '+1 Attack',
        '(Not visited)'
      ])
    })
  })

  describe('status bar', () => {
    test.each([
      { part: 'entrance', x: 2 },
      { part: 'blocked tile', x: 1 }
    ])('over its $part names the object and that the selected hero has not visited it', async ({
      x
    }) => {
      const { user } = await setupMercenaryCamp()

      await hoverTile(user, x, 1)

      expectStatusBarText('Mercenary Camp (Not visited)')
    })

    test('says visited once the selected hero has been there', async () => {
      const { user } = await setupMercenaryCamp()
      await enterEntrance()
      await closeMessageAndStepOff(user)

      await hoverTile(user, 2, 1)

      expectStatusBarText('Mercenary Camp (Visited)')
    })
  })

  describe('reload', () => {
    test('the bonus is kept and the hero has still visited the object', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const { user } = await setupMercenaryCamp(session)
      await enterEntrance()
      await closeMessageAndStepOff(user)

      await setupMercenaryCamp(session)
      await enterEntrance()

      expect(readMessage()).toBe(MERCENARY_CAMP_VISITED)
      expect(readPrimarySkills(getHeroInfoBox())[0]).toBe('Attack 3')
    })
  })
})
