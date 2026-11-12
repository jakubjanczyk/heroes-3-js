// @vitest-environment jsdom
import { within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { attackMonsterAt, getHeroEntity } from './adventure-map.utils.js'
import { expectResourceTotal } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  pressKey,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  clickBattleButton,
  closeBattleResults,
  getBattleButton,
  queryBattleScreen,
  querySurrenderDialog,
  readActiveStack,
  readBattleQuestion,
  readBattleResultsMessage,
  readBattleResultsSide,
  reloadBattle,
  startBattle,
  surrender
} from './battle.utils.js'
import { aFightWithAHero, HERO, stack } from './battle-lasting-spells.fixtures.js'
import { aHero, aMonster, aScenario } from './builders.js'

const ENEMY_HERO = 'Valeska'

const aBlueHero = (army = [stack('PIKEMAN', 10)]) =>
  aHero().withId('hero-2').withName(ENEMY_HERO).ownedBy('blue').withArmy(army)

// 10 Pikemen at 60 gold and 5 Archers at 100 gold cost 1100 to recruit, so 550 to surrender.
const PIKEMEN_AND_ARCHERS = [stack('PIKEMAN', 10), stack('ARCHER', 5)]

const aSurrenderFight = ({
  army = PIKEMEN_AND_ARCHERS,
  enemyArmy,
  gold = 1000,
  skills = []
} = {}) => {
  const enemy = aBlueHero(enemyArmy)
  return aFightWithAHero({
    hero: aHero().withName(HERO).withArmy(army).withSecondarySkills(skills),
    enemy
  })
    .withStartingResources({ GOLD_PILE: gold })
    .withDefinitions({
      ...aFightWithAHero({ enemy }).build().definitions,
      resources: readGameData('resources.json')
    })
}

const offerFor = (price) =>
  `${ENEMY_HERO} states:  "I will accept your surrender and grant you and your troops safe passage for the price of ${price} gold."`

function getSurrenderDialog() {
  const dialog = querySurrenderDialog()
  expect(dialog).toBeTruthy()
  return dialog
}

describe('battle surrender behavior', () => {
  test('given the battle is against a neutral monster then Surrender is disabled, saying neutral creatures do not accept surrender', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(3)
        .withEntities(aHero(), aMonster().withStacks(1).at(1, 0))
        .withDefinitions({ monsters: readGameData('monsters.json') })
        .build()
    })

    await attackMonsterAt(1, 0)

    const surrender = getBattleButton('Surrender')
    expect(surrender.disabled).toBe(true)
    expect(surrender.title).toBe('Neutral creatures do not accept surrender')
  })

  describe('against a blue hero', () => {
    test('when the player clicks Surrender then the blue hero offers safe passage for half the gold the creatures left cost', async () => {
      const { user } = await startBattle(aSurrenderFight())

      await clickBattleButton(user, 'Surrender')

      expect(readBattleQuestion(getSurrenderDialog())).toBe(offerFor(550))
    })

    test('when the player presses S then the blue hero makes its offer', async () => {
      const { user } = await startBattle(aSurrenderFight())

      await pressKey(user, 's')

      expect(readBattleQuestion(getSurrenderDialog())).toBe(offerFor(550))
    })

    test('given some of the hero’s creatures were killed then the price counts only those left', async () => {
      const { user } = await startBattle(
        aSurrenderFight({
          army: [stack('PIKEMAN', 10)],
          enemyArmy: [stack('ROYAL_GRIFFIN', 10)]
        })
      )
      // The Royal Griffins fly up to the Pikemen, and next round strike first, killing 3.
      await waitMs(1000)
      await clickBattleButton(user, 'Defend')
      await waitMs(1000)

      await clickBattleButton(user, 'Surrender')

      // 7 Pikemen at 60 gold cost 420 to recruit.
      expect(readBattleQuestion(getSurrenderDialog())).toBe(offerFor(210))
    })

    test('given the hero’s creatures cost more than gold then the price counts only their gold', async () => {
      const { user } = await startBattle(aSurrenderFight({ army: [stack('ANGEL', 1)] }))

      await clickBattleButton(user, 'Surrender')

      // An Angel costs 3000 gold and 1 gem.
      expect(readBattleQuestion(getSurrenderDialog())).toBe(offerFor(1500))
    })

    test('given the hero has Expert Diplomacy then surrendering costs 60% less', async () => {
      const { user } = await startBattle(
        aSurrenderFight({ skills: [{ skill: 'DIPLOMACY', level: 'EXPERT' }] })
      )

      await clickBattleButton(user, 'Surrender')

      // 550 less 60%.
      expect(readBattleQuestion(getSurrenderDialog())).toBe(offerFor(220))
    })

    test('given the offer is open when the player cancels then the battle goes on with the same stack’s turn', async () => {
      const { user } = await startBattle(aSurrenderFight())

      await surrender(user, { confirm: false })

      expect(querySurrenderDialog()).toBeNull()
      expect(readActiveStack()).toEqual({ stack: 'Pikemen 10', row: 3, column: 1 })
    })

    test('given the player has too little gold when they accept the offer then they are told they don’t have enough gold', async () => {
      const { user } = await startBattle(aSurrenderFight({ gold: 549 }))

      await surrender(user)

      expect(readBattleQuestion(getSurrenderDialog())).toBe("You don't have enough gold!")
    })

    test('given the player was told they don’t have enough gold when they close the message then the battle goes on', async () => {
      const { user } = await startBattle(aSurrenderFight({ gold: 549 }))
      await surrender(user)

      await user.click(within(getSurrenderDialog()).getByRole('button', { name: 'OK' }))

      expect(querySurrenderDialog()).toBeNull()
      expect(readActiveStack()).toEqual({ stack: 'Pikemen 10', row: 3, column: 1 })
    })

    test('when the player accepts the offer then the results window says the hero surrendered and shows them Defeated', async () => {
      const { user } = await startBattle(aSurrenderFight())

      await surrender(user)

      expect(readBattleResultsSide('Attacker')).toEqual([HERO, 'Defeated'])
      expect(readBattleResultsSide('Defender')).toEqual([ENEMY_HERO, 'Victorious'])
      expect(readBattleResultsMessage()).toEqual([
        `${HERO} surrenders to the enemy, and departs in shame.`
      ])
    })

    test('given the hero surrendered then the gold is paid', async () => {
      const { user } = await startBattle(aSurrenderFight())

      await surrender(user)
      await closeBattleResults(user)

      expectResourceTotal('Gold', 450)
    })

    test('given the hero surrendered when the window is closed then the hero is gone from the map', async () => {
      const { user } = await startBattle(aSurrenderFight())
      await surrender(user)

      await closeBattleResults(user)

      expect(queryBattleScreen()).toBeNull()
      expect(getHeroEntity()).toBeNull()
    })

    test('given the hero surrendered when the page reloads then the gold stays paid and the hero stays gone', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await startBattle(aSurrenderFight(), { eventLog })
      await surrender(user)
      await closeBattleResults(user)

      await reloadBattle(aSurrenderFight(), { eventLog })

      expectResourceTotal('Gold', 450)
      expect(getHeroEntity()).toBeNull()
    })
  })
})
