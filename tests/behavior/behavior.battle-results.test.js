// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  attackBattleHexFrom,
  attackMonsterAt,
  createMemoryEventLog,
  flushMicrotasks,
  getHeroInfoBox,
  moveActiveStackTo,
  readArmySlots,
  readBattleStacks,
  readGameData,
  setupMovementBehaviorApp,
  winBattle
} from './behavior.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  monsters: readGameData('monsters.json')
}

const stack = (creature, count) => ({ creature, count })

// Every damage roll lands on the lowest damage.
const LOWEST_ROLLS = () => 0

// The hero stands on (0, 0), the 2 Swordsmen on (1, 0) and another monster on (0, 1).
const aFight = () =>
  aScenario()
    .withSize(3, 2)
    .withEntities(
      aHero().withArmy([stack('ANGEL', 2), stack('SKELETON', 10), stack('SKELETON', 1)]),
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
}

describe('battle results behavior', () => {
  test('given the hero won a battle after losing creatures then the army shows the count each stack ended the battle with', async () => {
    const { user } = await startBattle(aFight())

    await winLosingSkeletons(user)

    expect(readArmySlots(getHeroInfoBox()).slice(0, 2)).toEqual(['Angels 2', 'Skeletons 8'])
  })

  test('given a stack lost all its creatures in a won battle then its army slot is empty', async () => {
    const { user } = await startBattle(aFight())

    await winLosingSkeletons(user)

    expect(readArmySlots(getHeroInfoBox())[2]).toBe('')
  })

  test('given the hero won a battle after losing creatures when the page reloads then the army still shows the losses', async () => {
    const eventLog = createMemoryEventLog()
    const { user } = await startBattle(aFight(), { eventLog })
    await winLosingSkeletons(user)

    await setupMovementBehaviorApp({ loadGameOptions: aFight().build(), eventLog })
    await flushMicrotasks()

    expect(readArmySlots(getHeroInfoBox()).slice(0, 3)).toEqual(['Angels 2', 'Skeletons 8', ''])
  })

  test('given the hero won a battle after losing creatures when they attack another monster then the army fights with what is left', async () => {
    const { user } = await startBattle(aFight())
    await winLosingSkeletons(user)

    await attackMonsterAt(0, 1)

    const heroStacks = readBattleStacks().filter(({ column }) => column === 1)
    expect(heroStacks.map(({ stack }) => stack)).toEqual(['Angels 2', 'Skeletons 8'])
  })

  test('given Auto combat wins the battle then the army keeps all its creatures', async () => {
    const { user } = await startBattle(aFight())

    await winBattle(user)

    expect(readArmySlots(getHeroInfoBox()).slice(0, 3)).toEqual([
      'Angels 2',
      'Skeletons 10',
      'Skeleton 1'
    ])
  })
})
