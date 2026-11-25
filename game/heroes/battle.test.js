import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

import {
  createBattle,
  endTurn,
  getShotTargets,
  planStackAttack,
  planStackShot,
  resolveAttack,
  shootStack
} from './battle.js'

const monsters = JSON.parse(readFileSync(new URL('../data/monsters.json', import.meta.url), 'utf8'))

const LOWEST_ROLLS = () => 0

const archersAgainstPikemen = () =>
  createBattle({
    attacker: { army: [{ creature: 'ARCHER', count: 10 }] },
    defender: { army: [{ creature: 'PIKEMAN', count: 50 }] },
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

const BREATHER = {
  name: 'Breather',
  namePlural: 'Breathers',
  attack: 5,
  defense: 5,
  damage: { min: 10, max: 10 },
  health: 100,
  speed: 1,
  abilities: ['doubleWide'],
  breath: true
}

const hex = (row, column) => ({ row, column })

const ABOVE_THE_MIDDLE_OF_THE_BREATHERS = hex(4, 7)
const BEYOND_FROM_THE_BREATHERS_FRONT = hex(3, 8)
const BEYOND_FROM_THE_BREATHERS_BACK = hex(3, 7)
const TEN_LESS_THE_THREE_THE_BREATH_KILLS = 7

const placed = (battle, hexes) => ({
  ...battle,
  stacks: battle.stacks.map((stack) =>
    hexes[stack.id] ? { ...stack, hex: hexes[stack.id] } : stack
  )
})

describe('battle breath', () => {
  test('given a stack touching both halves of the Breathers attacks them then their strike back breathes on from their front hex', () => {
    const battle = placed(
      createBattle({
        attacker: {
          army: [
            { creature: 'PIKEMAN', count: 50 },
            { creature: 'PIKEMAN', count: 10 },
            { creature: 'PIKEMAN', count: 10 }
          ]
        },
        defender: { army: [{ creature: 'BREATHER', count: 3 }] },
        definitions: { monsters: { ...monsters, BREATHER } }
      }),
      {
        'attacker-0': ABOVE_THE_MIDDLE_OF_THE_BREATHERS,
        'attacker-1': BEYOND_FROM_THE_BREATHERS_FRONT,
        'attacker-2': BEYOND_FROM_THE_BREATHERS_BACK,
        'defender-0': hex(5, 7)
      }
    )
    const attackers = battle.stacks.find(({ id }) => id === 'attacker-0')
    const plan = planStackAttack(battle, attackers, {
      targetId: 'defender-0',
      fromHex: ABOVE_THE_MIDDLE_OF_THE_BREATHERS,
      random: LOWEST_ROLLS
    })

    const attacked = resolveAttack(battle, {
      stackId: 'attacker-0',
      targetId: 'defender-0',
      ...plan
    })

    const countOf = (id) => attacked.stacks.find((stack) => stack.id === id).count
    expect(countOf('attacker-1')).toBe(TEN_LESS_THE_THREE_THE_BREATH_KILLS)
    expect(countOf('attacker-2')).toBe(10)
  })
})
