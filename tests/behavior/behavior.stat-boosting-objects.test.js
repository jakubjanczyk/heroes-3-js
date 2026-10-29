// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'
import {
  attackMonsterAt,
  confirmTileClickByDispatch,
  holdRightButtonOn,
  hoverTile,
  readBonusObjectName,
  readInfoPopupLines
} from './adventure-map.utils.js'
import {
  closeInteractionModal,
  endTurns,
  expectMovementPoints,
  expectStatusBarText,
  getHeroInfoBox,
  readMessage,
  readMessageRewards,
  readMoraleAndLuck
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import {
  attackBattleHexFrom,
  LOWEST_ROLLS,
  moveActiveStackTo,
  readCombatMessages,
  winBattle
} from './battle.utils.js'
import { ARMY_THAT_WINS, aBonusObject, aHero, aMonster, aScenario } from './builders.js'
import {
  clickHeroInHeroList,
  closeHeroScreen,
  getHeroScreen,
  holdRightButtonOnHeroScreenBox
} from './hero-screen.utils.js'
import { releaseRightButton } from './town-screen.utils.js'

const FAERIE_RING_GIVES = 'You enter a faerie ring, and your army gains luck for its next battle.'
const SWAN_POND = 'Childhood stories said that a scarlet swan was a portent of good fortune.'
const SWAN_POND_GIVES = `${SWAN_POND} You decide to rest here for the remainder of the day.`
const SWAN_POND_VISITED = `${SWAN_POND} However, you are still blessed with luck from your last visit here. Since there is nothing more to gain here, you move on.`
const IDOL_OF_FORTUNE_GIVES =
  "You've found an ancient and weathered stone idol. Kissing it is supposed to bring luck or happiness, so you do. The stone is very cold to the touch."
const TEMPLE_GIVES = 'A visit and a prayer at the temple raises the morale of your troops.'
const TEMPLE_VISITED = "It doesn't help to pray twice before a battle. Come back another day."

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  bonusObjects: readGameData('bonus-objects.json')
}

const HERO = 'Christian'
const OTHER_HERO = 'Wanderer'

// Creatures of two towns: no morale from the army, so morale and luck start at 0.
const TWO_TOWNS = [
  { creature: 'PIKEMAN', count: 10 },
  { creature: 'CENTAUR', count: 10 }
]

const aBoostedHero = ({ army = TWO_TOWNS, skills = [] } = {}) =>
  aHero().withName(HERO).withArmy(army).withSecondarySkills(skills).at(2, 2)

// Battles roll the lowest damage. The object's entrance is at (2, 1), right above the hero, so entering it takes one step. A
// second object, when there is one, has its entrance at (4, 1). The monster, when there is one,
// stands at (0, 2), out of the way of both.
function setupMapWith(
  type,
  { hero = aBoostedHero(), others = [], secondType, monster, eventLog, appConfig = {} } = {}
) {
  return setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(6, 3)
      .withEntities(
        hero,
        ...others,
        aBonusObject().withType(type).at(2, 1),
        ...(secondType ? [aBonusObject().withId('bonus-2').withType(secondType).at(4, 1)] : []),
        ...(monster ? [monster.at(0, 2)] : [])
      )
      .withDefinitions(gameDefinitions)
      .build(),
    appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 }, ...appConfig },
    eventLog
  })
}

const aWeakMonster = () => aMonster().withType('SKELETON').withCount(1).withStacks(1)

async function walkTo(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

const enterEntrance = () => walkTo(2, 1)

async function enterAndClose(user) {
  await enterEntrance()
  await closeInteractionModal(user)
}

async function enterAgain() {
  await walkTo(2, 2)
  await enterEntrance()
}

async function readHeroScreenMoraleAndLuck(user, heroName = HERO) {
  await clickHeroInHeroList(user, heroName)
  const moraleAndLuck = readMoraleAndLuck(getHeroScreen())
  await closeHeroScreen(user)
  return moraleAndLuck
}

async function readHeroScreenPopup(user, box) {
  await clickHeroInHeroList(user, HERO)
  await holdRightButtonOnHeroScreenBox(user, box)
  const popup = screen.getByRole('tooltip')
  return [within(popup).getByRole('heading').textContent, ...readInfoPopupLines()]
}

async function readPopupOn(user, x, y) {
  await holdRightButtonOn(user, x, y)
  const lines = readInfoPopupLines()
  await releaseRightButton(user)
  return lines
}

async function fightAndWin(user) {
  await attackMonsterAt(0, 2)
  await winBattle(user)
}

describe('Faerie Ring, Swan Pond, Idol of Fortune and Temple', () => {
  test.each([
    { type: 'FAERIE_RING', name: 'Faerie Ring' },
    { type: 'SWAN_POND', name: 'Swan Pond' },
    { type: 'IDOL_OF_FORTUNE', name: 'Idol of Fortune' },
    { type: 'TEMPLE', name: 'Temple' }
  ])('shows the $name on the map', async ({ type, name }) => {
    await setupMapWith(type)

    expect(readBonusObjectName()).toBe(name)
  })

  describe('Faerie Ring', () => {
    test('entering shows its message with +1 under the luck picture', async () => {
      await setupMapWith('FAERIE_RING')

      await enterEntrance()

      expect(readMessage()).toBe(FAERIE_RING_GIVES)
      expect(readMessageRewards()).toEqual(['+1 Luck'])
    })

    test('the hero screen shows luck +1 afterwards', async () => {
      const { user } = await setupMapWith('FAERIE_RING')

      await enterAndClose(user)

      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale 0', 'Luck +1'])
    })

    test('the info box shows luck +1 afterwards', async () => {
      const { user } = await setupMapWith('FAERIE_RING')

      await enterAndClose(user)

      expect(readMoraleAndLuck(getHeroInfoBox())).toEqual(['Morale 0', 'Luck +1'])
    })

    test('the luck lasts into the next day', async () => {
      const { user } = await setupMapWith('FAERIE_RING')
      await enterAndClose(user)

      await endTurns(user, 1)

      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale 0', 'Luck +1'])
    })
  })

  describe('Swan Pond', () => {
    test('entering shows its message with +2 under the luck picture', async () => {
      await setupMapWith('SWAN_POND')

      await enterEntrance()

      expect(readMessage()).toBe(SWAN_POND_GIVES)
      expect(readMessageRewards()).toEqual(['+2 Luck'])
    })

    test("the hero can't move any further that day", async () => {
      const { user } = await setupMapWith('SWAN_POND')

      await enterAndClose(user)

      expectMovementPoints(0)
    })

    test('the next day the hero moves as usual', async () => {
      const { user } = await setupMapWith('SWAN_POND')
      await enterAndClose(user)

      await endTurns(user, 1)

      expectMovementPoints(1500)
    })

    // A day later the hero steps off and back on: two straight steps of 100 each.
    test('entering again while the luck lasts shows the second message and the hero can still move', async () => {
      const { user } = await setupMapWith('SWAN_POND')
      await enterAndClose(user)
      await endTurns(user, 1)

      await enterAgain()

      expect(readMessage()).toBe(SWAN_POND_VISITED)
      expectMovementPoints(1300)
    })
  })

  describe('Idol of Fortune', () => {
    test('on day 1 it gives luck +1', async () => {
      const { user } = await setupMapWith('IDOL_OF_FORTUNE')

      await enterEntrance()

      expect(readMessage()).toBe(IDOL_OF_FORTUNE_GIVES)
      expect(readMessageRewards()).toEqual(['+1 Luck'])
      await closeInteractionModal(user)
      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale 0', 'Luck +1'])
    })

    test('on day 2 it gives morale +1', async () => {
      const { user } = await setupMapWith('IDOL_OF_FORTUNE')
      await endTurns(user, 1)

      await enterEntrance()

      expect(readMessageRewards()).toEqual(['+1 Morale'])
      await closeInteractionModal(user)
      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale +1', 'Luck 0'])
    })

    test('on day 7 the message shows the morale and luck pictures with +1 under each, and the hero screen shows both', async () => {
      const { user } = await setupMapWith('IDOL_OF_FORTUNE')
      await endTurns(user, 6)

      await enterEntrance()

      expect(readMessageRewards()).toEqual(['+1 Morale', '+1 Luck'])
      await closeInteractionModal(user)
      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale +1', 'Luck +1'])
    })
  })

  describe('Temple', () => {
    test('on day 1 it gives morale +1', async () => {
      const { user } = await setupMapWith('TEMPLE')

      await enterEntrance()

      expect(readMessage()).toBe(TEMPLE_GIVES)
      expect(readMessageRewards()).toEqual(['+1 Morale'])
      await closeInteractionModal(user)
      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale +1', 'Luck 0'])
    })

    test('on day 7 it gives morale +2', async () => {
      const { user } = await setupMapWith('TEMPLE')
      await endTurns(user, 6)

      await enterEntrance()

      expect(readMessageRewards()).toEqual(['+2 Morale'])
      await closeInteractionModal(user)
      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale +2', 'Luck 0'])
    })
  })

  describe('adding up', () => {
    test("the Temple's and the Idol of Fortune's morale add up", async () => {
      const { user } = await setupMapWith('TEMPLE', { secondType: 'IDOL_OF_FORTUNE' })
      await endTurns(user, 1)
      await enterAndClose(user)

      await walkTo(4, 1)
      await closeInteractionModal(user)

      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale +2', 'Luck 0'])
    })

    // +1 for Basic Leadership, +1 for one town, +1 for the Temple and +1 for the Idol on day 2:
    // 4, held at 3.
    test('the total is still held to +3', async () => {
      const { user } = await setupMapWith('TEMPLE', {
        hero: aBoostedHero({
          army: [{ creature: 'PIKEMAN', count: 10 }],
          skills: [{ skill: 'LEADERSHIP', level: 'BASIC' }]
        }),
        secondType: 'IDOL_OF_FORTUNE'
      })
      await endTurns(user, 1)
      await enterAndClose(user)

      await walkTo(4, 1)
      await closeInteractionModal(user)

      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale +3', 'Luck 0'])
    })
  })

  describe('morale and luck popups', () => {
    test('the morale popup lists the Temple Visit', async () => {
      const { user } = await setupMapWith('TEMPLE')
      await enterAndClose(user)

      expect(await readHeroScreenPopup(user, 'Morale')).toEqual([
        'Good Morale',
        'Good morale may give your troops an extra attack in combat.',
        'Current Morale Modifiers:',
        'Temple Visit +1'
      ])
    })

    test('the luck popup lists the Swan Pond Visit', async () => {
      const { user } = await setupMapWith('SWAN_POND')
      await enterAndClose(user)

      expect(await readHeroScreenPopup(user, 'Luck')).toEqual([
        'Good Luck',
        'Good luck may let your troops strike a lucky blow for double damage.',
        'Current Luck Modifiers:',
        'Swan Pond Visit +2'
      ])
    })
  })

  describe('visiting again', () => {
    test('entering the Temple again before a battle shows the second message and gives nothing', async () => {
      const { user } = await setupMapWith('TEMPLE')
      await enterAndClose(user)

      await enterAgain()

      expect(readMessage()).toBe(TEMPLE_VISITED)
      expect(readMessageRewards()).toEqual([])
      await closeInteractionModal(user)
      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale +1', 'Luck 0'])
    })

    test("another Temple gives nothing while the first one's bonus lasts", async () => {
      const { user } = await setupMapWith('TEMPLE', { secondType: 'TEMPLE' })
      await enterAndClose(user)

      await walkTo(4, 1)

      expect(readMessage()).toBe(TEMPLE_VISITED)
      await closeInteractionModal(user)
      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale +1', 'Luck 0'])
    })

    test("another hero of the player still gets the Temple's bonus", async () => {
      const { user } = await setupMapWith('TEMPLE', {
        others: [aHero().withId('hero-2').withName(OTHER_HERO).withArmy(TWO_TOWNS).at(1, 2)]
      })
      await enterAndClose(user)
      await walkTo(3, 2)

      await clickHeroInHeroList(user, OTHER_HERO)
      await enterEntrance()

      expect(readMessage()).toBe(TEMPLE_GIVES)
      await closeInteractionModal(user)
      expect(readMoraleAndLuck(getHeroInfoBox())).toEqual(['Morale +1', 'Luck 0'])
    })
  })

  describe('battle', () => {
    // The Centaurs (speed 6) act first, from row 9.
    test("a stack of a hero with the Temple's morale gets an extra turn", async () => {
      const { user } = await setupMapWith('TEMPLE', {
        monster: aWeakMonster(),
        appConfig: { moraleRandom: () => 0 }
      })
      await enterAndClose(user)

      await attackMonsterAt(0, 2)
      await moveActiveStackTo(user, 9, 4)

      expect(readCombatMessages()).toEqual(['High morale enables the Centaurs to attack again.'])
    })

    // 1 Archangel does 50 damage, +140% for 32 Attack (30 and the Knight's 2) against 4 Defense
    // and +100% for luck: 170. Without luck, 120.
    test("a stack of a hero with the Faerie Ring's luck strikes lucky", async () => {
      const { user } = await setupMapWith('FAERIE_RING', {
        hero: aBoostedHero({ army: [{ creature: 'ARCHANGEL', count: 1 }] }),
        monster: aMonster().withType('SKELETON').withCount(100).withStacks(1),
        appConfig: { luckRandom: () => 0 }
      })
      await enterAndClose(user)

      await attackMonsterAt(0, 2)
      await attackBattleHexFrom(user, 6, 15, 'left')

      expect(readCombatMessages().slice(0, 2)).toEqual([
        'Good luck shines on the Archangel.',
        'The Archangel does 170 damage. 28 Skeletons perish.'
      ])
    })

    // Ten Angels: +1 for one town and +1 for Angels in the army, and +1 for the Temple.
    test('after a won battle the bonus is gone from the hero screen', async () => {
      const { user } = await setupMapWith('TEMPLE', {
        hero: aBoostedHero({ army: ARMY_THAT_WINS }),
        monster: aWeakMonster()
      })
      await enterAndClose(user)

      await fightAndWin(user)

      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale +2', 'Luck 0'])
    })

    test("after a battle the hero can take the Temple's bonus again the same day", async () => {
      const { user } = await setupMapWith('TEMPLE', {
        hero: aBoostedHero({ army: ARMY_THAT_WINS }),
        monster: aWeakMonster()
      })
      await enterAndClose(user)
      await fightAndWin(user)

      await walkTo(2, 2)
      await enterEntrance()

      expect(readMessage()).toBe(TEMPLE_GIVES)
      await closeInteractionModal(user)
      expect(await readHeroScreenMoraleAndLuck(user)).toEqual(['Morale +3', 'Luck 0'])
    })
  })

  describe('right-click popup', () => {
    test('names the object, what it gives and that the selected hero has not visited it', async () => {
      const { user } = await setupMapWith('TEMPLE')

      expect(await readPopupOn(user, 2, 1)).toEqual([
        'Temple',
        '+1 Morale, +2 on day 7',
        '(Not visited)'
      ])
    })

    test('says visited while the hero has the bonus', async () => {
      const { user } = await setupMapWith('TEMPLE')
      await enterAndClose(user)
      await walkTo(2, 2)

      expect(await readPopupOn(user, 2, 1)).toEqual([
        'Temple',
        '+1 Morale, +2 on day 7',
        '(Visited)'
      ])
    })

    test('says not visited again after a battle', async () => {
      const { user } = await setupMapWith('TEMPLE', {
        hero: aBoostedHero({ army: ARMY_THAT_WINS }),
        monster: aWeakMonster()
      })
      await enterAndClose(user)
      await fightAndWin(user)

      expect(await readPopupOn(user, 2, 1)).toEqual([
        'Temple',
        '+1 Morale, +2 on day 7',
        '(Not visited)'
      ])
    })
  })

  describe('status bar', () => {
    test('says visited while the hero has the bonus', async () => {
      const { user } = await setupMapWith('TEMPLE')
      await enterAndClose(user)
      await walkTo(2, 2)

      await hoverTile(user, 2, 1)

      expectStatusBarText('Temple (Visited)')
    })
  })

  describe('reload', () => {
    test('the bonus is kept after a reload', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const { user } = await setupMapWith('TEMPLE', session)
      await enterAndClose(user)

      const reloaded = await setupMapWith('TEMPLE', session)

      expect(await readHeroScreenMoraleAndLuck(reloaded.user)).toEqual(['Morale +1', 'Luck 0'])
    })

    test('a bonus lost in a battle stays gone after a reload', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const options = {
        hero: aBoostedHero({ army: ARMY_THAT_WINS }),
        monster: aWeakMonster(),
        ...session
      }
      const { user } = await setupMapWith('TEMPLE', options)
      await enterAndClose(user)
      await fightAndWin(user)

      const reloaded = await setupMapWith('TEMPLE', options)

      expect(await readHeroScreenMoraleAndLuck(reloaded.user)).toEqual(['Morale +2', 'Luck 0'])
    })
  })
})
