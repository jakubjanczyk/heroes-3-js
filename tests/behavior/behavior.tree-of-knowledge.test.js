// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  confirmTileClickByDispatch,
  holdRightButtonOn,
  hoverTile,
  readInfoPopupLines
} from './adventure-map.utils.js'
import {
  answerMessage,
  closeInteractionModal,
  closeLevelUpPopup,
  expectResourceTotal,
  expectStatusBarText,
  queryLevelUpPopup,
  readMessage,
  readMessageButtons,
  readMessageRewards
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aBonusObject, aHero, aResource, aScenario } from './builders.js'
import { clickHeroInHeroList, readHeroScreenBox } from './hero-screen.utils.js'
import { releaseRightButton } from './town-screen.utils.js'

const FREE_OFFER =
  'Upon your approach, the tree opens its eyes in delight. "Ahh, an adventurer! Allow me to teach you a little of what I have learned over the ages."'
const GOLD_OFFER =
  'Upon your approach, the tree opens its eyes in delight. "Ahh, an adventurer! I will be happy to teach you a little of what I have learned over the ages for a mere 2000 gold." (Just bury it around my roots.)'
const GOLD_TOO_POOR =
  'Tears brim in the eyes of the tree. "I need 2000 gold." it whispers. (sniff) "Well, come back when you can pay me."'
const GEMS_OFFER =
  'Upon your approach, the tree opens its eyes in delight. "Ahh, an adventurer! I will be happy to teach you a little of what I have learned over the ages for a mere 10 gems." (Just bury it around my roots.)'
const GEMS_TOO_POOR =
  'Tears brim in the eyes of the tree. "I need 10 gems." it whispers. (sniff) "Well, come back when you can pay me."'
const VISITED =
  'Upon your approach, the tree opens its eyes in delight. "It is good to see you, my student. I hope my teachings have helped you."'

const FREE = {}
const GOLD = { GOLD_PILE: 2000 }
const GEMS = { GEMS_PILE: 10 }

// The price is free below 34%, 2000 gold below 67% and 10 gems above.
const FREE_ROLL = () => 0
const GOLD_ROLL = () => 0.5
const GEMS_ROLL = () => 0.99

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  bonusObjects: readGameData('bonus-objects.json')
}

function aTree(price) {
  const tree = aBonusObject().withType('TREE_OF_KNOWLEDGE').at(2, 1)
  return price ? tree.withPrice(price) : tree
}

// The tree's entrance is at (2, 1) and the hero stands right below it, so entering it takes one
// step.
function setupTree(
  price,
  {
    heroes = [aHero().at(2, 2)],
    resources = { GOLD_PILE: 2000, GEMS_PILE: 10 },
    entities = [],
    random = FREE_ROLL,
    eventLog
  } = {}
) {
  return setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(5, 3)
      .withEntities(...heroes, aTree(price), ...entities)
      .withStartingResources(resources)
      .withDefinitions(gameDefinitions)
      .build(),
    appConfig: { random },
    eventLog
  })
}

async function walkTo(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

const enterEntrance = () => walkTo(2, 1)
const stepOff = () => walkTo(2, 2)

const accept = (user) => answerMessage(user, 'Yes')
const decline = (user) => answerMessage(user, 'No')

async function readExperience(user) {
  await clickHeroInHeroList(user, 'Hero')
  return readHeroScreenBox('Experience')
}

async function readPopupOn(user, x, y) {
  await holdRightButtonOn(user, x, y)
  const lines = readInfoPopupLines()
  await releaseRightButton(user)
  return lines
}

async function learnFromFreeTree(user) {
  await enterEntrance()
  await closeInteractionModal(user)
  await closeLevelUpPopup(user)
  await stepOff()
}

describe('Tree of Knowledge', () => {
  describe('free tree', () => {
    test('entering shows its message with the experience it gives', async () => {
      await setupTree(FREE)

      await enterEntrance()

      expect(readMessage()).toBe(FREE_OFFER)
      expect(readMessageRewards()).toEqual(['1000 Experience'])
      expect(readMessageButtons()).toEqual(['OK'])
    })

    // Level 2 takes 1000 experience.
    test('a level 1 hero with no experience goes up to level 2 after the message', async () => {
      const { user } = await setupTree(FREE)
      await enterEntrance()
      expect(queryLevelUpPopup()).toBeNull()

      await closeInteractionModal(user)

      expect(queryLevelUpPopup()).toBeTruthy()
      await closeLevelUpPopup(user)
      expect(await readExperience(user)).toBe('Experience 1000')
    })

    // Level 3 takes 2000 experience, so a hero with 1500 is missing 500.
    test('a hero part way through a level gets exactly the experience missing', async () => {
      const { user } = await setupTree(FREE, { heroes: [aHero().withExperience(1500).at(2, 2)] })

      await enterEntrance()

      expect(readMessageRewards()).toEqual(['500 Experience'])
      await closeInteractionModal(user)
      await closeLevelUpPopup(user)
      expect(await readExperience(user)).toBe('Experience 2000')
    })
  })

  describe.each([
    {
      price: '2000 gold',
      cost: GOLD,
      resource: 'Gold',
      amount: 2000,
      offer: GOLD_OFFER,
      tooPoor: GOLD_TOO_POOR,
      tooLittle: { GOLD_PILE: 1999, GEMS_PILE: 10 }
    },
    {
      price: '10 gems',
      cost: GEMS,
      resource: 'Gems',
      amount: 10,
      offer: GEMS_OFFER,
      tooPoor: GEMS_TOO_POOR,
      tooLittle: { GOLD_PILE: 2000, GEMS_PILE: 9 }
    }
  ])('tree asking $price', ({ cost, resource, amount, offer, tooPoor, tooLittle }) => {
    test('entering shows its offer with the experience it gives, to accept or decline', async () => {
      await setupTree(cost)

      await enterEntrance()

      expect(readMessage()).toBe(offer)
      expect(readMessageRewards()).toEqual(['1000 Experience'])
      expect(readMessageButtons()).toEqual(['Yes', 'No'])
    })

    test('accepting takes the price and gives the level', async () => {
      const { user } = await setupTree(cost)
      await enterEntrance()

      await accept(user)

      expectResourceTotal(resource, 0)
      expect(queryLevelUpPopup()).toBeTruthy()
    })

    test('declining keeps the resources and the experience', async () => {
      const { user } = await setupTree(cost)
      await enterEntrance()

      await decline(user)

      expectResourceTotal(resource, amount)
      expect(queryLevelUpPopup()).toBeNull()
      expect(await readExperience(user)).toBe('Experience 0')
    })

    test('after declining, entering again offers the level again', async () => {
      const { user } = await setupTree(cost)
      await enterEntrance()
      await decline(user)
      await stepOff()

      await enterEntrance()

      expect(readMessage()).toBe(offer)
    })

    test('with too little, the tree turns the hero away with only OK', async () => {
      const { user } = await setupTree(cost, { resources: tooLittle })

      await enterEntrance()

      expect(readMessage()).toBe(tooPoor)
      expect(readMessageButtons()).toEqual(['OK'])
      await closeInteractionModal(user)
      expect(queryLevelUpPopup()).toBeNull()
      expect(await readExperience(user)).toBe('Experience 0')
    })
  })

  // The gold pile next to the tree gives the 100 gold missing.
  test('after being turned away, entering with 2000 gold offers the level', async () => {
    const { user } = await setupTree(GOLD, {
      resources: { GOLD_PILE: 1900 },
      entities: [aResource().withType('GOLD_PILE').at(3, 2)]
    })
    await enterEntrance()
    await closeInteractionModal(user)
    await walkTo(3, 2)
    await stepOff()

    await enterEntrance()

    expect(readMessage()).toBe(GOLD_OFFER)
  })

  describe('price', () => {
    test.each([
      { roll: 'lowest', random: FREE_ROLL, offer: FREE_OFFER },
      { roll: 'middle', random: GOLD_ROLL, offer: GOLD_OFFER },
      { roll: 'highest', random: GEMS_ROLL, offer: GEMS_OFFER }
    ])('with no price in the scenario, the $roll roll sets it', async ({ random, offer }) => {
      await setupTree(null, { random })

      await enterEntrance()

      expect(readMessage()).toBe(offer)
    })

    test('the rolled price is kept after a reload', async () => {
      const session = { eventLog: createMemoryEventLog() }
      await setupTree(null, { random: GEMS_ROLL, ...session })

      const { user } = await setupTree(null, { random: FREE_ROLL, ...session })

      expect(await readPopupOn(user, 2, 1)).toEqual([
        'Tree of Knowledge',
        '+1 level for 10 gems',
        '(Not visited)'
      ])
    })
  })

  describe('visiting again', () => {
    test('the hero gets the second message and nothing', async () => {
      const { user } = await setupTree(FREE)
      await learnFromFreeTree(user)

      await enterEntrance()

      expect(readMessage()).toBe(VISITED)
      expect(readMessageRewards()).toEqual([])
      await closeInteractionModal(user)
      expect(queryLevelUpPopup()).toBeNull()
    })

    test('another hero of the player still gets the level', async () => {
      const { user } = await setupTree(FREE, {
        heroes: [aHero().at(2, 2), aHero().withId('hero-2').withName('Valeska').at(3, 1)]
      })
      await learnFromFreeTree(user)
      await clickHeroInHeroList(user, 'Valeska')

      await enterEntrance()

      expect(readMessage()).toBe(FREE_OFFER)
    })
  })

  describe('right-click popup', () => {
    test.each([
      { price: 'free', cost: FREE, line: '+1 level' },
      { price: '2000 gold', cost: GOLD, line: '+1 level for 2000 gold' },
      { price: '10 gems', cost: GEMS, line: '+1 level for 10 gems' }
    ])('on a $price tree reads "$line"', async ({ cost, line }) => {
      const { user } = await setupTree(cost)

      expect(await readPopupOn(user, 2, 1)).toEqual(['Tree of Knowledge', line, '(Not visited)'])
    })

    test('says visited once the selected hero has been there', async () => {
      const { user } = await setupTree(FREE)
      await learnFromFreeTree(user)

      expect(await readPopupOn(user, 2, 1)).toEqual(['Tree of Knowledge', '+1 level', '(Visited)'])
    })
  })

  test('the status bar names the tree and that the selected hero has not visited it', async () => {
    const { user } = await setupTree(FREE)

    await hoverTile(user, 2, 1)

    expectStatusBarText('Tree of Knowledge (Not visited)')
  })

  test('after a reload, the level gained and the price paid are kept', async () => {
    const session = { eventLog: createMemoryEventLog() }
    const { user } = await setupTree(GOLD, session)
    await enterEntrance()
    await accept(user)
    await closeLevelUpPopup(user)

    const reloaded = await setupTree(GOLD, session)

    expectResourceTotal('Gold', 0)
    expect(await readExperience(reloaded.user)).toBe('Experience 1000')
  })
})
