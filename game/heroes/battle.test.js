import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

import { createBattle, endTurn, getShotTargets, planStackShot, shootStack } from './battle.js'

const monsters = JSON.parse(readFileSync(new URL('../data/monsters.json', import.meta.url), 'utf8'))

const LOWEST_ROLLS = () => 0

const archersAgainstPikemen = () =>
  createBattle({
    heroArmy: [{ creature: 'ARCHER', count: 10 }],
    monsterArmy: [{ creature: 'PIKEMAN', count: 50 }],
    definitions: { monsters }
  })

const findStack = (battle, side) => battle.stacks.find((stack) => stack.side === side)

// The Pikemen pass their turns, so they never come next to the Archers.
function shootTimes(battle, times) {
  let current = battle
  for (let shot = 0; shot < times; shot += 1) {
    const archers = findStack(current, 'attacker')
    const pikemen = findStack(current, 'defender')
    const plan = planStackShot(current, archers, { targetId: pikemen.id, random: LOWEST_ROLLS })
    current = endTurn(
      shootStack(current, { stackId: archers.id, targetId: pikemen.id, ...plan }),
      pikemen.id
    )
  }
  return current
}

// A player would need a dozen rounds with the enemy kept away from the shooter to get here, which
// the battlefield cannot set up yet, so this is checked below the behavior tests.
describe('battle shots', () => {
  test('given a shooter has used all its shots then it can no longer shoot', () => {
    const battle = shootTimes(archersAgainstPikemen(), 12)

    expect(getShotTargets(battle, findStack(battle, 'attacker'))).toEqual([])
  })

  test('given a shooter has one shot left then it can still shoot', () => {
    const battle = shootTimes(archersAgainstPikemen(), 11)

    expect(getShotTargets(battle, findStack(battle, 'attacker'))).toHaveLength(1)
  })
})
