// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { pressKey, readGameData, waitMs } from './app.utils.js'
import { clickBattleButton, getBattleButton, readActiveStack, startBattle } from './battle.utils.js'
import { aHero, aMonster, aScenario, aSpellDefinition } from './builders.js'
import {
  clickSpell,
  clickSpellBookControl,
  holdRightButtonOnSpell,
  openSpellBookFromMap,
  querySpellBook,
  querySpellBookControl,
  readSelectedSpellBookTabs,
  readSpellBookMessage,
  readSpellBookSpellNames,
  readSpellBookSpellPoints,
  readSpellPopup
} from './spell-book.utils.js'

const spell = ({ name, schools = ['AIR'], kind = 'combat', costs = [5, 4, 4, 4], damage }) => {
  const definition = aSpellDefinition()
    .withName(name)
    .withSchools(schools)
    .withKind(kind)
    .withCosts(costs)
    .describedAs(`${name} description.`)
  return (damage ? definition.withDamage(damage) : definition).build()
}

const spellDefinitions = {
  HASTE: spell({ name: 'Haste' }),
  SLOW: spell({ name: 'Slow', schools: ['EARTH'] }),
  IMPLOSION: spell({ name: 'Implosion', schools: ['EARTH'], costs: [30, 25, 25, 25] }),
  MAGIC_ARROW: spell({
    name: 'Magic Arrow',
    schools: ['AIR', 'EARTH', 'FIRE', 'WATER'],
    damage: { base: [10, 10, 20, 30], perPower: 10 }
  }),
  VIEW_AIR: spell({ name: 'View Air', kind: 'adventure', costs: [2, 1, 1, 1] }),
  VIEW_EARTH: spell({ name: 'View Earth', schools: ['EARTH'], kind: 'adventure' })
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  spells: spellDefinitions
}

const stack = (creature, count) => ({ creature, count })

const stackAt = (name, row, column) => ({ stack: name, row, column })

// A Knight with Knowledge 1, so 10 spell points. His 10 Swordsmen (speed 5) act before the 10
// Pikemen (speed 4).
const aHeroWithSpells = (spells = ['HASTE', 'SLOW', 'VIEW_AIR']) =>
  aHero()
    .withSpellBook(true)
    .withSpells(spells)
    .withArmy([stack('SWORDSMAN', 10)])

const aFight = (hero = aHeroWithSpells()) =>
  aScenario()
    .withSize(3)
    .withEntities(hero, aMonster().withType('PIKEMAN').withCount(10).withStacks(1).at(1, 0))
    .withDefinitions(gameDefinitions)

async function openBattleSpellBook(user) {
  await clickBattleButton(user, 'Cast spell')
}

describe('battle spell book behavior', () => {
  test('given a hero without a spell book then Cast spell is disabled', async () => {
    await startBattle(aFight(aHero().withArmy([stack('SWORDSMAN', 10)])))

    expect(getBattleButton('Cast spell').disabled).toBe(true)
  })

  test("given the monster's stack is acting then Cast spell is disabled", async () => {
    // The Pikemen (speed 4) are faster than the hero's Peasant (speed 3) and open the battle
    // walking toward it.
    await startBattle(aFight(aHeroWithSpells().withArmy([stack('PEASANT', 1)])), {
      appConfig: { battleStepDelayMs: 30 }
    })

    expect(getBattleButton('Cast spell').disabled).toBe(true)
  })

  test("given the hero's stack is to act when the player clicks Cast spell then the book opens on the combat spells", async () => {
    const { user } = await startBattle(aFight())

    await openBattleSpellBook(user)

    expect([readSelectedSpellBookTabs(), readSpellBookSpellNames()]).toEqual([
      ['All', 'Combat spells'],
      ['Haste', 'Slow']
    ])
  })

  test('given the battle when the player presses C then the spell book opens', async () => {
    const { user } = await startBattle(aFight())

    await pressKey(user, 'c')

    expect(querySpellBook()).toBeTruthy()
  })

  test('given the spell book in battle then the adventure spells cannot be turned to', async () => {
    const { user } = await startBattle(aFight())

    await openBattleSpellBook(user)

    expect(querySpellBookControl('Adventure spells').disabled).toBe(true)
  })

  test("given the spell book in battle then it shows the hero's spell points", async () => {
    const { user } = await startBattle(aFight())

    await openBattleSpellBook(user)

    expect(readSpellBookSpellPoints()).toBe('10')
  })

  test('given the spell book in battle when the player clicks a spell then the book shows its description', async () => {
    const { user } = await startBattle(aFight())
    await openBattleSpellBook(user)

    await clickSpell(user, 'Haste')

    expect(readSpellBookMessage()).toEqual(['Haste', 'Haste description.'])
  })

  // 10 + 10 × Power 2.
  test('given the spell book in battle when the player holds the right button on Magic Arrow then the popup says how much damage it does', async () => {
    const hero = aHeroWithSpells(['MAGIC_ARROW']).withPrimarySkills({ power: 2, knowledge: 1 })
    const { user } = await startBattle(aFight(hero))
    await openBattleSpellBook(user)

    await holdRightButtonOnSpell(user, 'Magic Arrow')

    expect(readSpellPopup()[1]).toBe('Magic Arrow description. Does 30 points of damage.')
  })

  test('given a hero with 10 spell points when the player clicks a spell costing 30 in battle then the book says they cannot cast it', async () => {
    const { user } = await startBattle(aFight(aHeroWithSpells(['IMPLOSION'])))
    await openBattleSpellBook(user)

    await clickSpell(user, 'Implosion')

    expect(readSpellBookMessage()).toEqual([
      '',
      "That spell costs 30 spell points.  Your hero only has 10 spell points, and therefore can't cast the spell."
    ])
  })

  test('given the spell book in battle when the player closes it then the same stack is still to act', async () => {
    const { user } = await startBattle(aFight())
    await openBattleSpellBook(user)

    await clickSpellBookControl(user, 'Close')
    await waitMs()

    expect([querySpellBook(), readActiveStack()]).toEqual([null, stackAt('Swordsmen 10', 6, 1)])
  })

  test('given the player left the battle book on the Earth bookmark when they open it again then it is on the Earth bookmark', async () => {
    const { user } = await startBattle(aFight())
    await openBattleSpellBook(user)
    await clickSpellBookControl(user, 'Earth')
    await clickSpellBookControl(user, 'Close')

    await openBattleSpellBook(user)

    expect([readSelectedSpellBookTabs(), readSpellBookSpellNames()]).toEqual([
      ['Earth', 'Combat spells'],
      ['Slow']
    ])
  })

  test("given the player left the map's book on the Earth bookmark when the book opens in battle then it opens on its own place", async () => {
    const { user } = await startBattle(aFight(aHeroWithSpells(['HASTE', 'SLOW', 'VIEW_EARTH'])), {
      beforeAttack: async ({ user: player }) => {
        await openSpellBookFromMap(player)
        await clickSpellBookControl(player, 'Earth')
        await clickSpellBookControl(player, 'Close')
      }
    })

    await openBattleSpellBook(user)

    expect([readSelectedSpellBookTabs(), readSpellBookSpellNames()]).toEqual([
      ['All', 'Combat spells'],
      ['Haste', 'Slow']
    ])
  })
})
