import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

// Validates the real creature data against Heroes 3: a wrong number would otherwise only show up
// once something (combat, recruiting, the hero screen) uses it.
const creatures = JSON.parse(readFileSync(new URL('./monsters.json', import.meta.url), 'utf8'))

describe('creature data', () => {
  test.each([
    ['PIKEMAN', 'Pikeman', 'Pikemen'],
    ['HALBERDIER', 'Halberdier', 'Halberdiers'],
    ['ARCHER', 'Archer', 'Archers'],
    ['MARKSMAN', 'Marksman', 'Marksmen'],
    ['GRIFFIN', 'Griffin', 'Griffins'],
    ['ROYAL_GRIFFIN', 'Royal Griffin', 'Royal Griffins'],
    ['SWORDSMAN', 'Swordsman', 'Swordsmen'],
    ['CRUSADER', 'Crusader', 'Crusaders'],
    ['MONK', 'Monk', 'Monks'],
    ['ZEALOT', 'Zealot', 'Zealots'],
    ['CAVALIER', 'Cavalier', 'Cavaliers'],
    ['CHAMPION', 'Champion', 'Champions'],
    ['ANGEL', 'Angel', 'Angels'],
    ['ARCHANGEL', 'Archangel', 'Archangels'],
    ['SKELETON', 'Skeleton', 'Skeletons'],
    ['SKELETON_WARRIOR', 'Skeleton Warrior', 'Skeleton Warriors'],
    ['CENTAUR', 'Centaur', 'Centaurs'],
    ['IMP', 'Imp', 'Imps'],
    ['PEASANT', 'Peasant', 'Peasants']
  ])('%s is called %s, %s for several', (key, name, namePlural) => {
    expect(creatures[key]).toMatchObject({ name, namePlural })
  })

  test.each([
    // key, attack, defense, damage min-max, health, speed, growth, cost, AI value
    ['PIKEMAN', 4, 5, 1, 3, 10, 4, 14, { GOLD_PILE: 60 }, 80],
    ['HALBERDIER', 6, 5, 2, 3, 10, 5, 14, { GOLD_PILE: 75 }, 115],
    ['ARCHER', 6, 3, 2, 3, 10, 4, 9, { GOLD_PILE: 100 }, 126],
    ['MARKSMAN', 6, 3, 2, 3, 10, 6, 9, { GOLD_PILE: 150 }, 184],
    ['GRIFFIN', 8, 8, 3, 6, 25, 6, 7, { GOLD_PILE: 200 }, 351],
    ['ROYAL_GRIFFIN', 9, 9, 3, 6, 25, 9, 7, { GOLD_PILE: 240 }, 448],
    ['SWORDSMAN', 10, 12, 6, 9, 35, 5, 4, { GOLD_PILE: 300 }, 445],
    ['CRUSADER', 12, 12, 7, 10, 35, 6, 4, { GOLD_PILE: 400 }, 588],
    ['MONK', 12, 7, 10, 12, 30, 5, 3, { GOLD_PILE: 400 }, 485],
    ['ZEALOT', 12, 10, 10, 12, 30, 7, 3, { GOLD_PILE: 450 }, 750],
    ['CAVALIER', 15, 15, 15, 25, 100, 7, 2, { GOLD_PILE: 1000 }, 1946],
    ['CHAMPION', 16, 16, 20, 25, 100, 9, 2, { GOLD_PILE: 1200 }, 2100],
    ['ANGEL', 20, 20, 50, 50, 200, 12, 1, { GOLD_PILE: 3000, GEMS_PILE: 1 }, 5019],
    ['ARCHANGEL', 30, 30, 50, 50, 250, 18, 1, { GOLD_PILE: 5000, GEMS_PILE: 3 }, 8776],
    ['SKELETON', 5, 4, 1, 3, 6, 4, 12, { GOLD_PILE: 60 }, 60],
    ['SKELETON_WARRIOR', 6, 6, 1, 3, 6, 5, 12, { GOLD_PILE: 70 }, 85],
    ['CENTAUR', 5, 3, 2, 3, 8, 6, 14, { GOLD_PILE: 70 }, 100],
    ['IMP', 2, 3, 1, 2, 4, 5, 15, { GOLD_PILE: 50 }, 50],
    ['PEASANT', 1, 1, 1, 1, 1, 3, 25, { GOLD_PILE: 10 }, 15]
  ])('%s has attack %i, defense %i, damage %i-%i, health %i, speed %i, growth %i, cost %o and AI value %i', (key, attack, defense, damageMin, damageMax, health, speed, growth, cost, aiValue) => {
    expect(creatures[key]).toMatchObject({
      attack,
      defense,
      damage: { min: damageMin, max: damageMax },
      health,
      speed,
      growth,
      cost,
      aiValue
    })
  })

  test.each([
    // key, faction, tier, abilities, shots
    ['PIKEMAN', 'CASTLE', 1, ['immuneToJousting'], undefined],
    ['HALBERDIER', 'CASTLE', 1, ['immuneToJousting'], undefined],
    ['ARCHER', 'CASTLE', 2, ['ranged'], 12],
    ['MARKSMAN', 'CASTLE', 2, ['ranged', 'shootsTwice'], 24],
    ['GRIFFIN', 'CASTLE', 3, ['flying', 'doubleWide', 'twoRetaliations'], undefined],
    ['ROYAL_GRIFFIN', 'CASTLE', 3, ['flying', 'doubleWide', 'unlimitedRetaliations'], undefined],
    ['SWORDSMAN', 'CASTLE', 4, [], undefined],
    ['CRUSADER', 'CASTLE', 4, ['strikesTwice'], undefined],
    ['MONK', 'CASTLE', 5, ['ranged'], 12],
    ['ZEALOT', 'CASTLE', 5, ['ranged', 'noMeleePenalty'], 24],
    ['CAVALIER', 'CASTLE', 6, ['doubleWide', 'jousting'], undefined],
    ['CHAMPION', 'CASTLE', 6, ['doubleWide', 'jousting'], undefined],
    ['ANGEL', 'CASTLE', 7, ['flying', 'raisesMorale', 'hatesDevils'], undefined],
    [
      'ARCHANGEL',
      'CASTLE',
      7,
      ['flying', 'doubleWide', 'raisesMorale', 'hatesDevils', 'resurrects'],
      undefined
    ],
    ['SKELETON', 'NECROPOLIS', 1, ['undead'], undefined],
    ['SKELETON_WARRIOR', 'NECROPOLIS', 1, ['undead'], undefined],
    ['CENTAUR', 'RAMPART', 1, ['doubleWide'], undefined],
    ['IMP', 'INFERNO', 1, [], undefined],
    ['PEASANT', 'NEUTRAL', 1, [], undefined]
  ])('%s is a %s tier %i creature with abilities %o and %s shots', (key, faction, tier, abilities, shots) => {
    const creature = creatures[key]

    expect({
      faction: creature.faction,
      tier: creature.tier,
      abilities: creature.abilities,
      shots: creature.shots
    }).toEqual({ faction, tier, abilities, shots })
  })

  test('each basic creature upgrades to its Heroes 3 upgrade, and upgraded creatures upgrade no further', () => {
    const upgrades = Object.fromEntries(
      Object.entries(creatures).map(([key, creature]) => [key, creature.upgradesTo ?? null])
    )

    expect(upgrades).toEqual({
      PIKEMAN: 'HALBERDIER',
      HALBERDIER: null,
      ARCHER: 'MARKSMAN',
      MARKSMAN: null,
      GRIFFIN: 'ROYAL_GRIFFIN',
      ROYAL_GRIFFIN: null,
      SWORDSMAN: 'CRUSADER',
      CRUSADER: null,
      MONK: 'ZEALOT',
      ZEALOT: null,
      CAVALIER: 'CHAMPION',
      CHAMPION: null,
      ANGEL: 'ARCHANGEL',
      ARCHANGEL: null,
      SKELETON: 'SKELETON_WARRIOR',
      SKELETON_WARRIOR: null,
      // Their upgrades come with their towns.
      CENTAUR: null,
      IMP: null,
      PEASANT: null
    })
  })
})
