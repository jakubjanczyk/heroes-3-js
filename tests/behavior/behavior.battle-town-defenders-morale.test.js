// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { readGameData, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { LOWEST_ROLLS, moveActiveStackTo, readCombatMessages } from './battle.utils.js'
import { aHero, aScenario, aTown } from './builders.js'

const gameDefinitions = {
  hero: { ...readGameData('hero.json'), name: 'Sir Christian' },
  heroClasses: readGameData('hero-classes.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json')
}

const stack = (creature, count) => ({ creature, count })

const just = (chanceIn24) => () => chanceIn24 / 24 - 0.001
const exactly = (chanceIn24) => () => chanceIn24 / 24

const HIGH_MORALE = (name) => `High morale enables the ${name} to attack again.`

const TAVERN = ['TAVERN']
const TAVERN_AND_BROTHERHOOD = ['TAVERN', 'BROTHERHOOD_OF_THE_SWORD']

// Centaurs and Imps are of two towns, so their army's morale is 0. The Centaurs (speed 6) act
// first, before the attacker's Pikemen and Peasants (speed 4 and 3), whose morale is 0 too.
const CENTAURS_AND_IMPS = [stack('CENTAUR', 10), stack('IMP', 10)]
const ATTACKERS = [stack('PIKEMAN', 10), stack('PEASANT', 10)]

// The town's entrance is at (4, 3); the hero starts two tiles below it.
const ENTRANCE = { x: 4, y: 3 }

const aGarrisonedTown = ({ buildings = TAVERN, garrison = CENTAURS_AND_IMPS } = {}) =>
  aTown()
    .named('Kirkwall')
    .ownedBy('blue')
    .withBuildings(buildings)
    .withGarrison(garrison)
    .at(ENTRANCE.x, ENTRANCE.y)

const aTownBattle = ({ town = aGarrisonedTown(), others = [] } = {}) =>
  aScenario()
    .withSize(9, 7)
    .withEntities(aHero().withArmy(ATTACKERS).at(4, 5), town, ...others)
    .withDefinitions(gameDefinitions)

async function attackTheTown(scenario, moraleRandom) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { random: LOWEST_ROLLS, moraleRandom, interactionModalTransitionMs: 0 }
  })
  confirmTileClickByDispatch(ENTRANCE.x, ENTRANCE.y)
  await waitMs(5000)
  return app
}

describe('the morale of a town’s defenders', () => {
  test('given a town with a Tavern when the garrison’s stack acts with the roll just under 1 in 24 then it acts again', async () => {
    await attackTheTown(aTownBattle(), just(1))

    expect(readCombatMessages()).toContain(HIGH_MORALE('Centaurs'))
  })

  test('given a town with a Tavern when the garrison’s stack acts with the roll at 1 in 24 then it does not act again', async () => {
    await attackTheTown(aTownBattle(), exactly(1))

    expect(readCombatMessages()).not.toContain(HIGH_MORALE('Centaurs'))
  })

  test('given a town with a Tavern and the Brotherhood of the Sword when the garrison’s stack acts with the roll just under 3 in 24 then it acts again', async () => {
    const town = aGarrisonedTown({ buildings: TAVERN_AND_BROTHERHOOD })

    await attackTheTown(aTownBattle({ town }), just(3))

    expect(readCombatMessages()).toContain(HIGH_MORALE('Centaurs'))
  })

  test('given a town with a Tavern and the Brotherhood of the Sword when the garrison’s stack acts with the roll at 3 in 24 then it does not act again', async () => {
    const town = aGarrisonedTown({ buildings: TAVERN_AND_BROTHERHOOD })

    await attackTheTown(aTownBattle({ town }), exactly(3))

    expect(readCombatMessages()).not.toContain(HIGH_MORALE('Centaurs'))
  })

  test('given a town with a Tavern behind its walls when the garrison’s stack acts with the roll just under 1 in 24 then it acts again', async () => {
    const town = aGarrisonedTown({ buildings: ['FORT', ...TAVERN] })

    await attackTheTown(aTownBattle({ town }), just(1))

    expect(readCombatMessages()).toContain(HIGH_MORALE('Centaurs'))
  })

  test('given a town with a Tavern defended by a hero when the hero’s stack acts with the roll just under 1 in 24 then it acts again', async () => {
    const town = aGarrisonedTown({ garrison: [] })
    const defender = aHero()
      .withId('hero-2')
      .withName('Valeska')
      .ownedBy('blue')
      .withArmy(CENTAURS_AND_IMPS)
      .at(ENTRANCE.x, ENTRANCE.y)

    await attackTheTown(aTownBattle({ town, others: [defender] }), just(1))

    expect(readCombatMessages()).toContain(HIGH_MORALE('Centaurs'))
  })

  test('given a town without a Tavern when the garrison’s stack acts with the roll just under 1 in 24 then it does not act again', async () => {
    const town = aGarrisonedTown({ buildings: [] })

    await attackTheTown(aTownBattle({ town }), just(1))

    expect(readCombatMessages()).not.toContain(HIGH_MORALE('Centaurs'))
  })

  test('the attacker’s stacks get no morale from the town’s Tavern', async () => {
    const { user } = await attackTheTown(aTownBattle(), just(1))

    await moveActiveStackTo(user, 3, 2)

    expect(readCombatMessages()).not.toContain(HIGH_MORALE('Pikemen'))
  })

  // Skeleton Warriors with Imps: two towns and undead, -1; with the Tavern and the Brotherhood,
  // +2 for the Imps.
  test('an undead stack of the garrison does not act again', async () => {
    const town = aGarrisonedTown({
      buildings: TAVERN_AND_BROTHERHOOD,
      garrison: [stack('SKELETON_WARRIOR', 10), stack('IMP', 10)]
    })

    await attackTheTown(aTownBattle({ town }), just(2))

    expect(readCombatMessages()).not.toContain(HIGH_MORALE('Skeleton Warriors'))
  })

  // Centaurs alone are of one town, +1; with the Tavern and the Brotherhood it would be +4.
  test('the defenders’ morale stays at +3 at most', async () => {
    const town = aGarrisonedTown({
      buildings: TAVERN_AND_BROTHERHOOD,
      garrison: [stack('CENTAUR', 10)]
    })

    await attackTheTown(aTownBattle({ town }), exactly(3))

    expect(readCombatMessages()).not.toContain(HIGH_MORALE('Centaurs'))
  })
})
