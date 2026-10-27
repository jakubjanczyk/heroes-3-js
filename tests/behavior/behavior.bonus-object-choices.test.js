// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  confirmTileClickByDispatch,
  holdRightButtonOn,
  readInfoPopupLines
} from './adventure-map.utils.js'
import {
  cancelMessage,
  closeInteractionModal,
  expectResourceTotal,
  getHeroInfoBox,
  pickInMessage,
  readMessage,
  readMessageButtons,
  readMessageChoices,
  readMessageRewards,
  readPrimarySkills
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aBonusObject, aHero, aResource, aScenario } from './builders.js'

const ARENA_GIVES =
  'You enter the arena and face a pack of vicious lions. You handily defeat them, to the wild cheers of the crowd. Impressed by your skill, the aged trainer of gladiators agrees to train you in a skill of your choice.'
const ARENA_VISITED =
  'The Arena guards prevent you from entering. "You\'ve already beaten our best. Begone from here."'
const SCHOOL_OF_WAR_GIVES =
  'The battle-scarred instructor of this school of war grunts as you walk past. For a fee of 1000 gold he can teach you your choice of new attack or defense skills.'
const SCHOOL_OF_WAR_TOO_POOR =
  'The battle-scarred instructor of this school of war grunts as you walk past. He could teach you some new combat tactics, but he charges 1000 gold, which you currently do not have.'
const SCHOOL_OF_WAR_VISITED =
  'The head instructor laughs out loud when you ask to receive more training. "You should be teaching here!" he shouts.'
const SCHOOL_OF_MAGIC_GIVES =
  'The tingle of magic fills the air of this school of mystical arts. An acolyte offers to sign you up for the next class for 1000 gold. You will have your choice of increasing your knowledge, or learning to better focus your powers.'
const SCHOOL_OF_MAGIC_TOO_POOR =
  'The tingle of magic fills the air of this school of mystical arts. An acolyte informs you that he could sign you up for the next class, but that you do not have the required tuition of 1000 gold.'
const SCHOOL_OF_MAGIC_VISITED =
  'An old wizard appears out of thin air. "Master," he says, "you have learned all that we could possibly teach you."'

const KNIGHT_SKILLS = ['Attack 2', 'Defense 2', 'Power 1', 'Knowledge 1']

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  bonusObjects: readGameData('bonus-objects.json')
}

// The object's entrance is at (2, 2), with room above it for the School of War's two rows,
// and the hero, a Knight with Attack 2, Defense 2, Power 1 and Knowledge 1, stands right below
// it, so entering it takes one step.
function setupMapWith(type, { gold = 1000, entities = [], eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(5, 4)
      .withEntities(aHero().at(2, 3), aBonusObject().withType(type).at(2, 2), ...entities)
      .withStartingResources({ GOLD_PILE: gold })
      .withDefinitions(gameDefinitions)
      .build(),
    eventLog
  })
}

async function walkTo(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

const enterEntrance = () => walkTo(2, 2)
const stepOff = () => walkTo(2, 3)

async function pickAndStepOff(user, choice) {
  await enterEntrance()
  await pickInMessage(user, choice)
  await stepOff()
}

describe('Arena, School of War and School of Magic', () => {
  describe('Arena', () => {
    test('entering shows its message offering +2 Attack or +2 Defense', async () => {
      await setupMapWith('ARENA')

      await enterEntrance()

      expect(readMessage()).toBe(ARENA_GIVES)
      expect(readMessageChoices()).toEqual(['+2 Attack', '+2 Defense'])
    })

    test('the hero has to pick one: there is no cancel button', async () => {
      await setupMapWith('ARENA')

      await enterEntrance()

      expect(readMessageButtons()).toEqual(['+2 Attack', '+2 Defense', 'OK'])
    })

    test('picking Defense gives +2 Defense', async () => {
      const { user } = await setupMapWith('ARENA')
      await enterEntrance()

      await pickInMessage(user, '+2 Defense')

      expect(readPrimarySkills(getHeroInfoBox())).toEqual([
        'Attack 2',
        'Defense 4',
        'Power 1',
        'Knowledge 1'
      ])
    })
  })

  describe('School of War and School of Magic', () => {
    test.each([
      {
        name: 'School of War',
        type: 'SCHOOL_OF_WAR',
        message: SCHOOL_OF_WAR_GIVES,
        choices: ['+1 Attack', '+1 Defense']
      },
      {
        name: 'School of Magic',
        type: 'SCHOOL_OF_MAGIC',
        message: SCHOOL_OF_MAGIC_GIVES,
        choices: ['+1 Power', '+1 Knowledge']
      }
    ])('with 1000 gold, entering the $name offers $choices', async ({ type, message, choices }) => {
      await setupMapWith(type)

      await enterEntrance()

      expect(readMessage()).toBe(message)
      expect(readMessageChoices()).toEqual(choices)
    })

    test.each([
      {
        name: 'School of War',
        type: 'SCHOOL_OF_WAR',
        choice: '+1 Attack',
        skills: ['Attack 3', 'Defense 2', 'Power 1', 'Knowledge 1']
      },
      {
        name: 'School of Magic',
        type: 'SCHOOL_OF_MAGIC',
        choice: '+1 Knowledge',
        skills: ['Attack 2', 'Defense 2', 'Power 1', 'Knowledge 2']
      }
    ])('picking $choice at the $name gives it', async ({ type, choice, skills }) => {
      const { user } = await setupMapWith(type)
      await enterEntrance()

      await pickInMessage(user, choice)

      expect(readPrimarySkills(getHeroInfoBox())).toEqual(skills)
    })

    test('picking a skill takes 1000 gold', async () => {
      const { user } = await setupMapWith('SCHOOL_OF_WAR', { gold: 1500 })
      await enterEntrance()

      await pickInMessage(user, '+1 Defense')

      expectResourceTotal('Gold', 500)
    })

    test('cancelling keeps the gold and the skills', async () => {
      const { user } = await setupMapWith('SCHOOL_OF_WAR')
      await enterEntrance()

      await cancelMessage(user)

      expectResourceTotal('Gold', 1000)
      expect(readPrimarySkills(getHeroInfoBox())).toEqual(KNIGHT_SKILLS)
    })

    test('after cancelling, entering again offers the choice again', async () => {
      const { user } = await setupMapWith('SCHOOL_OF_WAR')
      await enterEntrance()
      await cancelMessage(user)
      await stepOff()

      await enterEntrance()

      expect(readMessage()).toBe(SCHOOL_OF_WAR_GIVES)
      expect(readMessageChoices()).toEqual(['+1 Attack', '+1 Defense'])
    })

    test.each([
      { name: 'School of War', type: 'SCHOOL_OF_WAR', message: SCHOOL_OF_WAR_TOO_POOR },
      { name: 'School of Magic', type: 'SCHOOL_OF_MAGIC', message: SCHOOL_OF_MAGIC_TOO_POOR }
    ])('with less than 1000 gold, the $name turns the hero away with only OK', async ({
      type,
      message
    }) => {
      const { user } = await setupMapWith(type, { gold: 999 })

      await enterEntrance()

      expect(readMessage()).toBe(message)
      expect(readMessageButtons()).toEqual(['OK'])
      await closeInteractionModal(user)
      expectResourceTotal('Gold', 999)
      expect(readPrimarySkills(getHeroInfoBox())).toEqual(KNIGHT_SKILLS)
    })

    // The gold pile next to the school gives the 100 gold missing.
    test('after being turned away, entering with 1000 gold offers the choice', async () => {
      const { user } = await setupMapWith('SCHOOL_OF_WAR', {
        gold: 900,
        entities: [aResource().withType('GOLD_PILE').at(3, 3)]
      })
      await enterEntrance()
      await closeInteractionModal(user)
      await walkTo(3, 3)
      await stepOff()

      await enterEntrance()

      expect(readMessage()).toBe(SCHOOL_OF_WAR_GIVES)
    })
  })

  test.each([
    {
      name: 'Arena',
      type: 'ARENA',
      choice: '+2 Attack',
      message: ARENA_VISITED,
      skills: ['Attack 4', 'Defense 2', 'Power 1', 'Knowledge 1']
    },
    {
      name: 'School of War',
      type: 'SCHOOL_OF_WAR',
      choice: '+1 Attack',
      message: SCHOOL_OF_WAR_VISITED,
      skills: ['Attack 3', 'Defense 2', 'Power 1', 'Knowledge 1']
    },
    {
      name: 'School of Magic',
      type: 'SCHOOL_OF_MAGIC',
      choice: '+1 Power',
      message: SCHOOL_OF_MAGIC_VISITED,
      skills: ['Attack 2', 'Defense 2', 'Power 2', 'Knowledge 1']
    }
  ])('visiting the $name again shows its second message and gives nothing', async ({
    type,
    choice,
    message,
    skills
  }) => {
    const { user } = await setupMapWith(type, { gold: 2000 })
    await pickAndStepOff(user, choice)

    await enterEntrance()

    expect(readMessage()).toBe(message)
    expect(readMessageChoices()).toEqual([])
    expect(readMessageRewards()).toEqual([])
    expect(readPrimarySkills(getHeroInfoBox())).toEqual(skills)
  })

  test.each([
    { name: 'Arena', type: 'ARENA', lines: ['Arena', '(Not visited)'] },
    {
      name: 'School of War',
      type: 'SCHOOL_OF_WAR',
      lines: ['School of War', '+1 Attack or +1 Defense for 1000 gold', '(Not visited)']
    },
    {
      name: 'School of Magic',
      type: 'SCHOOL_OF_MAGIC',
      lines: ['School of Magic', '+1 Power or +1 Knowledge for 1000 gold', '(Not visited)']
    }
  ])('the right-click popup on the $name reads $lines', async ({ type, lines }) => {
    const { user } = await setupMapWith(type)

    await holdRightButtonOn(user, 2, 2)

    expect(readInfoPopupLines()).toEqual(lines)
  })

  test('after a reload, the skill picked at a school and the gold paid for it are kept', async () => {
    const session = { eventLog: createMemoryEventLog() }
    const { user } = await setupMapWith('SCHOOL_OF_MAGIC', { gold: 1500, ...session })
    await pickAndStepOff(user, '+1 Power')

    await setupMapWith('SCHOOL_OF_MAGIC', { gold: 1500, ...session })

    expect(readPrimarySkills(getHeroInfoBox())).toEqual([
      'Attack 2',
      'Defense 2',
      'Power 2',
      'Knowledge 1'
    ])
    expectResourceTotal('Gold', 500)
  })
})
