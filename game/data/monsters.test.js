import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

// Validates the real creature data against the game's: a wrong number would otherwise only show up
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
    ['CENTAUR_CAPTAIN', 'Centaur Captain', 'Centaur Captains'],
    ['DWARF', 'Dwarf', 'Dwarves'],
    ['BATTLE_DWARF', 'Battle Dwarf', 'Battle Dwarves'],
    ['WOOD_ELF', 'Wood Elf', 'Wood Elves'],
    ['GRAND_ELF', 'Grand Elf', 'Grand Elves'],
    ['PEGASUS', 'Pegasus', 'Pegasi'],
    ['SILVER_PEGASUS', 'Silver Pegasus', 'Silver Pegasi'],
    ['DENDROID_GUARD', 'Dendroid Guard', 'Dendroid Guards'],
    ['DENDROID_SOLDIER', 'Dendroid Soldier', 'Dendroid Soldiers'],
    ['UNICORN', 'Unicorn', 'Unicorns'],
    ['WAR_UNICORN', 'War Unicorn', 'War Unicorns'],
    ['GREEN_DRAGON', 'Green Dragon', 'Green Dragons'],
    ['GOLD_DRAGON', 'Gold Dragon', 'Gold Dragons'],
    ['IMP', 'Imp', 'Imps'],
    ['PEASANT', 'Peasant', 'Peasants'],
    ['BALLISTA', 'Ballista', 'Ballistas'],
    ['AMMO_CART', 'Ammo Cart', 'Ammo Carts'],
    ['FIRST_AID_TENT', 'First Aid Tent', 'First Aid Tents'],
    ['CATAPULT', 'Catapult', 'Catapults']
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
    ['CENTAUR_CAPTAIN', 6, 3, 2, 3, 10, 8, 14, { GOLD_PILE: 90 }, 138],
    ['DWARF', 6, 7, 2, 4, 20, 3, 8, { GOLD_PILE: 120 }, 138],
    ['BATTLE_DWARF', 7, 7, 2, 4, 20, 5, 8, { GOLD_PILE: 150 }, 209],
    ['WOOD_ELF', 9, 5, 3, 5, 15, 6, 7, { GOLD_PILE: 200 }, 234],
    ['GRAND_ELF', 9, 5, 3, 5, 15, 7, 7, { GOLD_PILE: 225 }, 331],
    ['PEGASUS', 9, 8, 5, 9, 30, 8, 5, { GOLD_PILE: 250 }, 518],
    ['SILVER_PEGASUS', 9, 10, 5, 9, 30, 12, 5, { GOLD_PILE: 275 }, 532],
    ['DENDROID_GUARD', 9, 12, 10, 14, 55, 3, 3, { GOLD_PILE: 350 }, 517],
    ['DENDROID_SOLDIER', 9, 12, 10, 14, 65, 4, 3, { GOLD_PILE: 425 }, 803],
    ['UNICORN', 15, 14, 18, 22, 90, 7, 2, { GOLD_PILE: 850 }, 1806],
    ['WAR_UNICORN', 15, 14, 18, 22, 110, 9, 2, { GOLD_PILE: 950 }, 2030],
    ['GREEN_DRAGON', 18, 18, 40, 50, 180, 10, 1, { GOLD_PILE: 2400, CRYSTAL_PILE: 1 }, 4872],
    ['GOLD_DRAGON', 27, 27, 40, 50, 250, 16, 1, { GOLD_PILE: 4000, CRYSTAL_PILE: 2 }, 8613],
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
    ['CENTAUR_CAPTAIN', 'RAMPART', 1, ['doubleWide'], undefined],
    ['DWARF', 'RAMPART', 2, [], undefined],
    ['BATTLE_DWARF', 'RAMPART', 2, [], undefined],
    ['WOOD_ELF', 'RAMPART', 3, ['ranged'], 24],
    ['GRAND_ELF', 'RAMPART', 3, ['ranged', 'shootsTwice'], 24],
    ['PEGASUS', 'RAMPART', 4, ['flying', 'doubleWide'], undefined],
    ['SILVER_PEGASUS', 'RAMPART', 4, ['flying', 'doubleWide'], undefined],
    ['DENDROID_GUARD', 'RAMPART', 5, [], undefined],
    ['DENDROID_SOLDIER', 'RAMPART', 5, [], undefined],
    ['UNICORN', 'RAMPART', 6, ['doubleWide'], undefined],
    ['WAR_UNICORN', 'RAMPART', 6, ['doubleWide'], undefined],
    ['GREEN_DRAGON', 'RAMPART', 7, ['flying', 'doubleWide'], undefined],
    ['GOLD_DRAGON', 'RAMPART', 7, ['flying', 'doubleWide'], undefined],
    ['IMP', 'INFERNO', 1, [], undefined],
    ['PEASANT', 'NEUTRAL', 1, [], undefined],
    [
      'BALLISTA',
      'NEUTRAL',
      5,
      ['doubleWide', 'warMachine', 'ranged', 'unlimitedShots', 'damageTimesHeroAttack'],
      undefined
    ],
    ['AMMO_CART', 'NEUTRAL', 1, ['warMachine', 'suppliesShots'], undefined],
    ['FIRST_AID_TENT', 'NEUTRAL', 1, ['doubleWide', 'warMachine', 'heals'], undefined],
    ['CATAPULT', 'NEUTRAL', 1, ['doubleWide', 'warMachine'], undefined]
  ])('%s is a %s tier %i creature with abilities %o and %s shots', (key, faction, tier, abilities, shots) => {
    const creature = creatures[key]

    expect({
      faction: creature.faction,
      tier: creature.tier,
      abilities: creature.abilities,
      shots: creature.shots
    }).toEqual({ faction, tier, abilities, shots })
  })

  test('each basic creature upgrades to its upgrade, and upgraded creatures upgrade no further', () => {
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
      CENTAUR: 'CENTAUR_CAPTAIN',
      CENTAUR_CAPTAIN: null,
      DWARF: 'BATTLE_DWARF',
      BATTLE_DWARF: null,
      WOOD_ELF: 'GRAND_ELF',
      GRAND_ELF: null,
      PEGASUS: 'SILVER_PEGASUS',
      SILVER_PEGASUS: null,
      DENDROID_GUARD: 'DENDROID_SOLDIER',
      DENDROID_SOLDIER: null,
      UNICORN: 'WAR_UNICORN',
      WAR_UNICORN: null,
      GREEN_DRAGON: 'GOLD_DRAGON',
      GOLD_DRAGON: null,
      // Their upgrades come with their towns.
      IMP: null,
      PEASANT: null,
      BALLISTA: null,
      AMMO_CART: null,
      FIRST_AID_TENT: null,
      CATAPULT: null
    })
  })

  test.each([
    ['BALLISTA', 10, 10, { min: 2, max: 3 }, 250],
    ['AMMO_CART', 0, 5, { min: 0, max: 0 }, 100],
    ['FIRST_AID_TENT', 0, 0, { min: 0, max: 0 }, 75]
  ])('the %s has attack %i, defense %i, damage %o, health %i and speed 0', (key, attack, defense, damage, health) => {
    expect(creatures[key]).toMatchObject({ attack, defense, damage, health, speed: 0 })
  })

  test('the Catapult has attack 10, defense 10, no damage, health 1000 and speed 0', () => {
    expect(creatures.CATAPULT).toMatchObject({
      attack: 10,
      defense: 10,
      damage: { min: 0, max: 0 },
      health: 1000,
      speed: 0
    })
  })
})
