// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { loadAppStyles } from './app-styles.js'
import {
  attackBattleHexFrom,
  attackMonsterAt,
  clickBattleButton,
  closeBattleResults,
  createMemoryEventLog,
  flushMicrotasks,
  getBattleResults,
  getHeroInfoBox,
  moveActiveStackTo,
  pressKey,
  queryBattleScreen,
  readArmySlots,
  readBattleCasualties,
  readBattleResultsMessage,
  readBattleResultsSide,
  readBattleStacks,
  readGameData,
  setupMovementBehaviorApp,
  waitForBattleResults
} from './behavior.utils.js'
import { ARMY_THAT_WINS, aHero, aMonster, aScenario } from './builders.js'

const HERO_NAME = 'Sir Christian'

const gameDefinitions = {
  hero: { ...readGameData('hero.json'), name: HERO_NAME },
  heroClasses: readGameData('hero-classes.json'),
  monsters: readGameData('monsters.json')
}

const stack = (creature, count) => ({ creature, count })

// Every damage roll lands on the lowest damage.
const LOWEST_ROLLS = () => 0

// The hero stands on (0, 0), the 2 Swordsmen on (1, 0) and another monster on (0, 1).
const aFight = ({ experience = 0 } = {}) =>
  aScenario()
    .withSize(3, 2)
    .withEntities(
      aHero()
        .withExperience(experience)
        .withArmy([stack('ANGEL', 2), stack('SKELETON', 10), stack('SKELETON', 1)]),
      aMonster().withType('SWORDSMAN').withCount(2).withStacks(1).at(1, 0),
      aMonster().withId('monster-2').withType('PIKEMAN').withCount(10).withStacks(1).at(0, 1)
    )
    .withDefinitions(gameDefinitions)

async function startBattle(scenario, { eventLog } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    eventLog,
    appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 } }
  })
  await attackMonsterAt(1, 0)
  return app
}

// The Angels stay back while the Swordsmen walk up and kill 2 of the 10 Skeletons. The lone
// Skeleton attacks them and dies to their retaliation, then the Angels kill both Swordsmen.
async function winLosingSkeletons(user) {
  await moveActiveStackTo(user, 3, 2)
  await moveActiveStackTo(user, 6, 5)
  await moveActiveStackTo(user, 9, 5)
  await moveActiveStackTo(user, 3, 3)
  await moveActiveStackTo(user, 6, 4)
  await attackBattleHexFrom(user, 6, 6, 'bottom-right')
  await attackBattleHexFrom(user, 6, 6, 'top-right')
  await waitForBattleResults()
}

async function playAutoCombat(user) {
  await clickBattleButton(user, 'Auto combat')
  await waitForBattleResults()
}

// The hero and the Swordsmen alone, with the hero's army set by the test.
const aFightWith = (army) =>
  aScenario()
    .withSize(3)
    .withEntities(
      aHero().withArmy(army),
      aMonster().withType('SWORDSMAN').withCount(2).withStacks(1).at(1, 0)
    )
    .withDefinitions(gameDefinitions)

function queryLevelUpPopup() {
  return screen.queryByRole('dialog', { name: `${HERO_NAME} has gained a level.` })
}

describe('battle results behavior', () => {
  test('given the hero wins a battle then the battle stays on screen, darkened, behind a results window', async () => {
    await loadAppStyles()
    const { user } = await startBattle(aFight())

    await winLosingSkeletons(user)

    expect(readBattleStacks().map(({ stack }) => stack)).toContain('Angels 2')
    expect(window.getComputedStyle(getBattleResults()).backgroundColor).toBe('rgba(0, 0, 0, 0.5)')
  })

  test('given the hero wins then the window shows the hero as Victorious and the monster as Defeated', async () => {
    const { user } = await startBattle(aFight())

    await winLosingSkeletons(user)

    expect(readBattleResultsSide('Attacker')).toEqual([HERO_NAME, 'Victorious'])
    expect(readBattleResultsSide('Defender')).toEqual(['Swordsmen', 'Defeated'])
  })

  test('given the hero wins then the window says it was a glorious victory and the experience the hero receives', async () => {
    const { user } = await startBattle(aFight())

    await winLosingSkeletons(user)

    // Two Swordsmen of 35 health each.
    expect(readBattleResultsMessage()).toEqual([
      'A glorious victory!',
      `For valor in combat, ${HERO_NAME} receives 70 experience`
    ])
  })

  test("given the hero won after losing creatures then the window lists each side's casualties with the counts lost", async () => {
    const { user } = await startBattle(aFight())

    await winLosingSkeletons(user)

    // 2 Skeletons of the stack of 10 and the lone one, counted together as in Heroes 3.
    expect(readBattleCasualties('Attacker')).toEqual(['Skeletons 3'])
    expect(readBattleCasualties('Defender')).toEqual(['Swordsmen 2'])
  })

  test("given the hero won without losing a creature then the attacker's casualties say None", async () => {
    const { user } = await startBattle(aFightWith(ARMY_THAT_WINS))

    await playAutoCombat(user)

    expect(readBattleCasualties('Attacker')).toEqual(['None'])
  })

  test('given the hero loses a battle then the window shows the hero as Defeated and says the hero abandons your cause', async () => {
    const { user } = await startBattle(aFightWith([stack('SKELETON', 1)]))

    await playAutoCombat(user)

    expect(readBattleResultsSide('Attacker')).toEqual([HERO_NAME, 'Defeated'])
    expect(readBattleResultsSide('Defender')).toEqual(['Swordsmen', 'Victorious'])
    expect(readBattleResultsMessage()).toEqual([
      `Your forces suffer a bitter defeat, and ${HERO_NAME} abandons your cause.`
    ])
  })

  test('given the results window is open when the player clicks OK then the adventure map is back', async () => {
    const { user } = await startBattle(aFight())
    await winLosingSkeletons(user)

    await closeBattleResults(user)

    expect(queryBattleScreen()).toBeNull()
  })

  test('given the results window is open when the player presses Enter then the adventure map is back', async () => {
    const { user } = await startBattle(aFight())
    await winLosingSkeletons(user)

    await pressKey(user, '{Enter}')

    expect(queryBattleScreen()).toBeNull()
  })

  test('given the results window is open when the page reloads then the same window is shown again', async () => {
    const eventLog = createMemoryEventLog()
    const { user } = await startBattle(aFight(), { eventLog })
    await winLosingSkeletons(user)

    await setupMovementBehaviorApp({ loadGameOptions: aFight().build(), eventLog })
    await flushMicrotasks()

    expect(readBattleResultsSide('Attacker')).toEqual([HERO_NAME, 'Victorious'])
    expect(readBattleCasualties('Attacker')).toEqual(['Skeletons 3'])
  })

  test('given the hero went up a level in the battle then the level-up popup opens after the results window closes', async () => {
    const { user } = await startBattle(aFight({ experience: 950 }))
    await winLosingSkeletons(user)
    expect(queryLevelUpPopup()).toBeNull()

    await closeBattleResults(user)

    expect(queryLevelUpPopup()).toBeTruthy()
  })

  test('given the hero won a battle after losing creatures then the army shows the count each stack ended the battle with', async () => {
    const { user } = await startBattle(aFight())

    await winLosingSkeletons(user)
    await closeBattleResults(user)

    expect(readArmySlots(getHeroInfoBox()).slice(0, 2)).toEqual(['Angels 2', 'Skeletons 8'])
  })

  test('given a stack lost all its creatures in a won battle then its army slot is empty', async () => {
    const { user } = await startBattle(aFight())

    await winLosingSkeletons(user)
    await closeBattleResults(user)

    expect(readArmySlots(getHeroInfoBox())[2]).toBe('')
  })

  test('given the hero won a battle after losing creatures when the page reloads then the army still shows the losses', async () => {
    const eventLog = createMemoryEventLog()
    const { user } = await startBattle(aFight(), { eventLog })
    await winLosingSkeletons(user)
    await closeBattleResults(user)

    await setupMovementBehaviorApp({ loadGameOptions: aFight().build(), eventLog })
    await flushMicrotasks()

    expect(readArmySlots(getHeroInfoBox()).slice(0, 3)).toEqual(['Angels 2', 'Skeletons 8', ''])
  })

  test('given the hero won a battle after losing creatures when they attack another monster then the army fights with what is left', async () => {
    const { user } = await startBattle(aFight())
    await winLosingSkeletons(user)
    await closeBattleResults(user)

    await attackMonsterAt(0, 1)

    const heroStacks = readBattleStacks().filter(({ column }) => column === 1)
    expect(heroStacks.map(({ stack }) => stack)).toEqual(['Angels 2', 'Skeletons 8'])
  })
})
