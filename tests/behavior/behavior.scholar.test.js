// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  answerMessage,
  expectInteractionModalClosed,
  getInteractionModal,
  readMessage,
  readMessagePictures
} from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aSpellDefinition } from './builders.js'
import {
  closeHeroExchange,
  getHeroExchange,
  meetHeroAt,
  queryHeroExchange
} from './hero-exchange.utils.js'
import { clickHeroInHeroList } from './hero-screen.utils.js'
import {
  clickSpellBookControl,
  openSpellBookFromMap,
  readSpellBookSpellNames
} from './spell-book.utils.js'

const WALKER = 'Sir Christian'
const MET = 'Valeska'

const spell = (name, level) => aSpellDefinition().withName(name).withLevel(level).build()

const spellsOf = (names, level) =>
  Object.fromEntries(
    names.map((name) => [name.toUpperCase().replaceAll(' ', '_'), spell(name, level)])
  )

const spells = {
  ...spellsOf(['Bless', 'Cure', 'Dispel', 'Haste', 'Shield', 'Slow'], 1),
  ...spellsOf(['Blind', 'Fortune', 'Ice Bolt', 'Precision'], 2),
  ...spellsOf(['Fireball', 'Frost Ring'], 3),
  ...spellsOf(['Prayer', 'Slayer'], 4),
  ...spellsOf(['Implosion'], 5)
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  spells
}

const EXPERT_WISDOM = { skill: 'WISDOM', level: 'EXPERT' }
const scholar = (level) => ({ skill: 'SCHOLAR', level })

const aHeroWithBook = ({ skills = [EXPERT_WISDOM], known = [] } = {}) =>
  aHero().withSecondarySkills(skills).withSpellBook(true).withSpells(known)

const spellIds = (names) => names.map((name) => name.toUpperCase().replaceAll(' ', '_'))

const aWalker = (options) => aHeroWithBook(options)
const aMetHero = (options) => aHeroWithBook(options)

// Both heroes stand on the top row of a 10x3 map, five tiles apart; the first walks to the second.
const aMeetingScenario = ({ walker = aWalker(), met = aMetHero() } = {}) =>
  aScenario()
    .withSize(10, 3)
    .withEntities(walker.withName(WALKER).at(0, 0), met.withId('hero-2').withName(MET).at(5, 0))
    .withDefinitions(gameDefinitions)

const knowing = (names, skills) => ({ known: spellIds(names), skills })

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    ...options
  })
}

async function meet(scenario, options = {}) {
  const app = await setupApp(scenario, options)
  await meetHeroAt(app.user, 5, 0)
  return app
}

async function closeEveryScholarWindow(user) {
  while (getInteractionModal()) {
    await answerMessage(user, 'OK')
  }
}

// The combat spells in a hero's book, read on the adventure map after the meeting is over.
async function readSpellsOf(user, heroName) {
  await closeEveryScholarWindow(user)
  if (queryHeroExchange()) {
    await closeHeroExchange(user)
  }
  await clickHeroInHeroList(user, heroName)
  await openSpellBookFromMap(user)
  await clickSpellBookControl(user, 'Combat spells')
  const names = readSpellBookSpellNames()
  await clickSpellBookControl(user, 'Close')
  return names
}

const LEVEL_1_TO_5 = ['Bless', 'Blind', 'Fireball', 'Prayer', 'Implosion']

describe('scholar behavior', () => {
  describe('teaching', () => {
    test('given the walking hero has Basic Scholar when they meet a hero then the hero met learns their level 1 and 2 spells but not level 3', async () => {
      const { user } = await meet(
        aMeetingScenario({
          walker: aWalker(knowing(LEVEL_1_TO_5, [EXPERT_WISDOM, scholar('BASIC')]))
        })
      )

      expect(await readSpellsOf(user, MET)).toEqual(['Bless', 'Blind'])
    })

    test('given the walking hero has Advanced Scholar when they meet a hero then the hero met learns their spells up to level 3', async () => {
      const { user } = await meet(
        aMeetingScenario({
          walker: aWalker(knowing(LEVEL_1_TO_5, [EXPERT_WISDOM, scholar('ADVANCED')]))
        })
      )

      expect(await readSpellsOf(user, MET)).toEqual(['Bless', 'Blind', 'Fireball'])
    })

    test('given the walking hero has Expert Scholar when they meet a hero then the hero met learns their spells up to level 4 but never level 5', async () => {
      const { user } = await meet(
        aMeetingScenario({
          walker: aWalker(knowing(LEVEL_1_TO_5, [EXPERT_WISDOM, scholar('EXPERT')]))
        })
      )

      expect(await readSpellsOf(user, MET)).toEqual(['Bless', 'Blind', 'Fireball', 'Prayer'])
    })

    test('given the walking hero has Scholar when they meet a hero then the Scholar learns the spells of the hero met too', async () => {
      const { user } = await meet(
        aMeetingScenario({
          walker: aWalker(knowing(['Bless'], [EXPERT_WISDOM, scholar('BASIC')])),
          met: aMetHero(knowing(['Cure']))
        })
      )

      expect(await readSpellsOf(user, WALKER)).toEqual(['Bless', 'Cure'])
      expect(await readSpellsOf(user, MET)).toEqual(['Bless', 'Cure'])
    })

    test('given the hero being met has Scholar when the other hero walks up then they teach each other', async () => {
      const { user } = await meet(
        aMeetingScenario({
          walker: aWalker(knowing(['Bless'])),
          met: aMetHero(knowing(['Cure'], [EXPERT_WISDOM, scholar('BASIC')]))
        })
      )

      expect(await readSpellsOf(user, WALKER)).toEqual(['Bless', 'Cure'])
      expect(await readSpellsOf(user, MET)).toEqual(['Bless', 'Cure'])
    })

    test('given both heroes have Scholar when they meet then the higher Scholar level counts', async () => {
      const { user } = await meet(
        aMeetingScenario({
          walker: aWalker(knowing(['Fireball'], [EXPERT_WISDOM, scholar('BASIC')])),
          met: aMetHero(knowing(['Prayer'], [EXPERT_WISDOM, scholar('EXPERT')]))
        })
      )

      expect(await readSpellsOf(user, WALKER)).toEqual(['Fireball', 'Prayer'])
      expect(await readSpellsOf(user, MET)).toEqual(['Fireball', 'Prayer'])
    })

    test('given the hero met has no Wisdom when they meet a hero with Expert Scholar then they learn no spell above level 2', async () => {
      const { user } = await meet(
        aMeetingScenario({
          walker: aWalker(knowing(LEVEL_1_TO_5, [EXPERT_WISDOM, scholar('EXPERT')])),
          met: aMetHero({ skills: [] })
        })
      )

      expect(await readSpellsOf(user, MET)).toEqual(['Bless', 'Blind'])
    })

    test('given the hero met has no spell book when they meet a hero with Scholar then neither learns anything', async () => {
      const { user } = await meet(
        aMeetingScenario({
          walker: aWalker(knowing(['Bless'], [EXPERT_WISDOM, scholar('EXPERT')])),
          met: aHero()
            .withSecondarySkills([])
            .withSpellBook(false)
            .withSpells(spellIds(['Cure']))
        })
      )

      expect(readMessage()).toBeNull()
      expect(await readSpellsOf(user, WALKER)).toEqual(['Bless'])
    })

    test('given the Scholar has no spell book when they meet a hero then neither learns anything', async () => {
      const { user } = await meet(
        aMeetingScenario({
          walker: aHero()
            .withSecondarySkills([scholar('EXPERT')])
            .withSpellBook(false)
            .withSpells(spellIds(['Bless'])),
          met: aMetHero(knowing(['Cure']))
        })
      )

      expect(readMessage()).toBeNull()
      expect(await readSpellsOf(user, MET)).toEqual(['Cure'])
    })

    test('given neither hero has Scholar when they meet then neither learns anything', async () => {
      const { user } = await meet(
        aMeetingScenario({
          walker: aWalker(knowing(['Bless'])),
          met: aMetHero(knowing(['Cure']))
        })
      )

      expect(readMessage()).toBeNull()
      expect(await readSpellsOf(user, MET)).toEqual(['Cure'])
    })
  })

  describe('the message', () => {
    test('given the heroes teach each other when the exchange screen opens then a message over it names the spells learned and taught', async () => {
      await meet(
        aMeetingScenario({
          walker: aWalker(knowing(['Slow'], [EXPERT_WISDOM, scholar('BASIC')])),
          met: aMetHero(knowing(['Bless', 'Cure']))
        })
      )

      getHeroExchange()
      expect(readMessage()).toBe(
        'Sir Christian, who has studied magic extensively, learns Bless and Cure from Valeska, and teaches Slow to Valeska.'
      )
    })

    test('given the Scholar learns spells of several levels when the message opens then they are listed from the highest level, then by name, the last two joined by "and"', async () => {
      await meet(
        aMeetingScenario({
          walker: aWalker({ skills: [EXPERT_WISDOM, scholar('EXPERT')] }),
          met: aMetHero(knowing(['Cure', 'Bless', 'Prayer', 'Blind']))
        })
      )

      expect(readMessage()).toBe(
        'Sir Christian, who has studied magic extensively, learns Prayer, Blind, Bless and Cure from Valeska.'
      )
    })

    test('given the Scholar only teaches when the message opens then it says only what they teach', async () => {
      await meet(
        aMeetingScenario({
          walker: aWalker(knowing(['Haste'], [EXPERT_WISDOM, scholar('BASIC')])),
          met: aMetHero()
        })
      )

      expect(readMessage()).toBe(
        'Sir Christian, who has studied magic extensively, teaches Haste to Valeska.'
      )
    })

    test('given the hero met has the higher Scholar when the message opens then it is about them', async () => {
      await meet(
        aMeetingScenario({
          walker: aWalker(knowing(['Haste'], [EXPERT_WISDOM, scholar('BASIC')])),
          met: aMetHero(knowing(['Bless'], [EXPERT_WISDOM, scholar('ADVANCED')]))
        })
      )

      expect(readMessage()).toBe(
        'Valeska, who has studied magic extensively, learns Haste from Sir Christian, and teaches Bless to Sir Christian.'
      )
    })

    test('given both heroes have the same Scholar when the message opens then it is about the hero who walked up', async () => {
      await meet(
        aMeetingScenario({
          walker: aWalker(knowing(['Haste'], [EXPERT_WISDOM, scholar('BASIC')])),
          met: aMetHero(knowing(['Bless'], [EXPERT_WISDOM, scholar('BASIC')]))
        })
      )

      expect(readMessage()).toBe(
        'Sir Christian, who has studied magic extensively, learns Bless from Valeska, and teaches Haste to Valeska.'
      )
    })

    test('given the heroes teach each other when the message opens then it shows the higher Scholar, then the spells learned, then those taught', async () => {
      await meet(
        aMeetingScenario({
          walker: aWalker(knowing(['Slow'], [EXPERT_WISDOM, scholar('BASIC')])),
          met: aMetHero(knowing(['Cure', 'Bless'], [EXPERT_WISDOM, scholar('ADVANCED')]))
        })
      )

      expect(readMessagePictures()).toEqual(['Advanced Scholar', 'Slow', 'Bless', 'Cure'])
    })

    test('given more spells than one message holds when the player clicks OK then the next ones show without the text, until all are shown, over the exchange screen', async () => {
      const { user } = await meet(
        aMeetingScenario({
          walker: aWalker({ skills: [EXPERT_WISDOM, scholar('EXPERT')] }),
          met: aMetHero(
            knowing([
              'Bless',
              'Cure',
              'Dispel',
              'Haste',
              'Shield',
              'Slow',
              'Blind',
              'Fortune',
              'Ice Bolt',
              'Precision'
            ])
          )
        })
      )

      const first = { message: readMessage(), pictures: readMessagePictures() }
      await answerMessage(user, 'OK')
      const second = { message: readMessage(), pictures: readMessagePictures() }
      await answerMessage(user, 'OK')

      expect(first).toEqual({
        message:
          'Sir Christian, who has studied magic extensively, learns Blind, Fortune, Ice Bolt, Precision, Bless, Cure, Dispel, Haste, Shield and Slow from Valeska.',
        pictures: [
          'Expert Scholar',
          'Blind',
          'Fortune',
          'Ice Bolt',
          'Precision',
          'Bless',
          'Cure',
          'Dispel'
        ]
      })
      expect(second).toEqual({ message: '', pictures: ['Haste', 'Shield', 'Slow'] })
      expectInteractionModalClosed()
      getHeroExchange()
    })

    test('given the heroes already know each other’s spells when they meet then no message opens', async () => {
      await meet(
        aMeetingScenario({
          walker: aWalker(knowing(['Bless'], [EXPERT_WISDOM, scholar('EXPERT')])),
          met: aMetHero(knowing(['Bless']))
        })
      )

      getHeroExchange()
      expect(readMessage()).toBeNull()
    })
  })

  describe('saving', () => {
    test('given the heroes taught each other when the game is reloaded then both keep the spells and the message does not come back', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const scenario = aMeetingScenario({
        walker: aWalker(knowing(['Bless'], [EXPERT_WISDOM, scholar('BASIC')])),
        met: aMetHero(knowing(['Cure']))
      })
      await meet(scenario, session)

      const { user } = await setupApp(scenario, session)

      expect(readMessage()).toBeNull()
      expect(await readSpellsOf(user, WALKER)).toEqual(['Bless', 'Cure'])
      expect(await readSpellsOf(user, MET)).toEqual(['Bless', 'Cure'])
    })
  })
})
