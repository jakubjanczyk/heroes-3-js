// @vitest-environment jsdom
import { describe, test } from 'vitest'

import {
  confirmMove,
  expectHeroAt,
  expectResourceNotPresent,
  expectResourcePresent
} from './adventure-map.utils.js'
import { clickEndTurn } from './adventure-panels.utils.js'
import { readGameData, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { aCreatureDefinition, aHero, aResource, aScenario, aTown } from './builders.js'

// Worth 60 by its AI value.
const WEAKLING = aCreatureDefinition()
  .withName('Weakling')
  .withNamePlural('Weaklings')
  .withAiValue(60)
  .build()

// Worth more than any army in these tests.
const COLOSSUS = aCreatureDefinition()
  .withName('Colossus')
  .withNamePlural('Colossi')
  .withAiValue(100000)
  .build()

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  monsters: { ...readGameData('monsters.json'), WEAKLING, COLOSSUS },
  heroes: readGameData('heroes.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json')
}

const COMPUTER_TURN_MS = 2000

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

const weaklings = (count) => [{ creature: 'WEAKLING', count }]

const aRedHero = (x, army, y = 0) => aHero().withPrimarySkills(NO_SKILLS).withArmy(army).at(x, y)

const aBlueHero = (x, army, y = 0) =>
  aHero().withId('hero-2').ownedBy('blue').withPrimarySkills(NO_SKILLS).withArmy(army).at(x, y)

// Three gems are worth 1500 to a computer hero, more for their days than attacking a red hero.
const aPile = (id, x, y = 0) => aResource().withId(id).withType('GEMS_PILE').at(x, y)

// A hero walks 15 tiles a day, at 100 a step.
const aRowScenario = (...entities) =>
  aScenario()
    .withSize(40)
    .withEntities(...entities)
    .withDefinitions(definitions)

// Blue's town covers the two tiles either side of its gate at (20, 2) and the two rows above; the
// bottom row runs past it.
const GATE = { x: 20, y: 2 }

const aBlueTown = (garrison = []) =>
  aTown().withId('town-1').ownedBy('blue').withGarrison(garrison).at(GATE.x, GATE.y)

const aTownScenario = ({ garrison, entities }) =>
  aScenario()
    .withSize(40, 4)
    .withEntities(aBlueTown(garrison), ...entities)
    .withDefinitions(definitions)

const setupApp = (scenario) => setupMovementBehaviorApp({ loadGameOptions: scenario.build() })

async function endTurn(user) {
  await clickEndTurn(user)
  await waitMs(COMPUTER_TURN_MS)
}

async function startBlueTurn(scenario) {
  const app = await setupApp(scenario)
  await endTurn(app.user)
  return app
}

describe('computer heroes keeping away from threats behavior', () => {
  describe('keeping away from stronger heroes', () => {
    // The red hero reaches the tiles up to 15 next turn, so 16 is the nearest it can't.
    test('a blue hero a red hero stronger than it can reach next turn walks to the nearest tile out of its reach', async () => {
      await startBlueTurn(aRowScenario(aRedHero(0, weaklings(20)), aBlueHero(10, weaklings(10))))

      expectHeroAt(16, 0, 'hero-2')
    })

    // Eleven Weaklings are worth 660, no more than the red hero's ten (600) and a tenth.
    test('a blue hero no more than a tenth stronger than the red hero still keeps away', async () => {
      await startBlueTurn(aRowScenario(aRedHero(0, weaklings(10)), aBlueHero(10, weaklings(11))))

      expectHeroAt(16, 0, 'hero-2')
    })

    test('a blue hero the red hero is too far to reach next turn goes on to its pile', async () => {
      await startBlueTurn(
        aRowScenario(aRedHero(0, weaklings(20)), aBlueHero(20, weaklings(10)), aPile('pile', 18))
      )

      expectResourceNotPresent('pile')
    })

    test("a blue hero doesn't keep away from a red hero on a tile blue hasn't explored", async () => {
      await startBlueTurn(
        aRowScenario(
          aRedHero(0, weaklings(20)),
          aBlueHero(12, weaklings(10)),
          aPile('pile', 9)
        ).withFogOfWar(true)
      )

      expectResourceNotPresent('pile')
    })

    // The pile at 14 is six steps away and the one at 27 seven, but the red hero reaches 14.
    test('a blue hero leaves alone a pile the red hero can reach next turn and takes one out of its reach', async () => {
      await startBlueTurn(
        aRowScenario(
          aRedHero(0, weaklings(20)),
          aBlueHero(20, weaklings(10)),
          aPile('reachable-pile', 14),
          aPile('safe-pile', 27)
        )
      )

      expectResourcePresent('reachable-pile')
      expectResourceNotPresent('safe-pile')
    })

    test('a blue hero keeps away in its own town when its garrison with it is stronger than the red hero', async () => {
      await startBlueTurn(
        aTownScenario({
          garrison: [{ creature: 'COLOSSUS', count: 1 }],
          entities: [aRedHero(6, weaklings(20), 2), aBlueHero(16, weaklings(10), 2)]
        })
      )

      expectHeroAt(GATE.x, GATE.y, 'hero-2')
    })
  })

  describe('defending towns', () => {
    // The red hero reaches the gate round the town's corner for 1382, blue's hero for 682.
    test('a blue hero goes back into its town when a red hero stronger than the garrison can reach it next turn', async () => {
      await startBlueTurn(
        aTownScenario({
          entities: [
            aRedHero(7, weaklings(10), 2),
            aBlueHero(26, weaklings(20), 2),
            aPile('pile', 30, 2)
          ]
        })
      )

      expectHeroAt(GATE.x, GATE.y, 'hero-2')
      expectResourcePresent('pile')
    })

    test('a blue hero in its threatened town stays there instead of going to its pile', async () => {
      await startBlueTurn(
        aTownScenario({
          entities: [
            aRedHero(7, weaklings(10), 2),
            aBlueHero(GATE.x, weaklings(20), GATE.y),
            aPile('pile', 25, 2)
          ]
        })
      )

      expectHeroAt(GATE.x, GATE.y, 'hero-2')
      expectResourcePresent('pile')
    })

    test('a blue hero too far to reach its threatened town today goes on to its pile', async () => {
      await startBlueTurn(
        aTownScenario({
          entities: [
            aRedHero(7, weaklings(10), 2),
            aBlueHero(37, weaklings(20), 2),
            aPile('pile', 39, 2)
          ]
        })
      )

      expectResourceNotPresent('pile')
    })

    test("a blue hero too weak to save its town doesn't go back to it", async () => {
      await startBlueTurn(
        aTownScenario({
          entities: [
            aRedHero(7, weaklings(20), 2),
            aBlueHero(26, weaklings(10), 2),
            aPile('pile', 30, 2)
          ]
        })
      )

      expectResourceNotPresent('pile')
    })

    test('no blue hero goes back to a town whose garrison is stronger than the red hero', async () => {
      await startBlueTurn(
        aTownScenario({
          garrison: [{ creature: 'COLOSSUS', count: 1 }],
          entities: [
            aRedHero(7, weaklings(10), 2),
            aBlueHero(26, weaklings(20), 2),
            aPile('pile', 30, 2)
          ]
        })
      )

      expectResourceNotPresent('pile')
    })

    test('of two blue heroes that could save the town, only the first goes back to it', async () => {
      await startBlueTurn(
        aTownScenario({
          entities: [
            aRedHero(7, weaklings(10), 2),
            aBlueHero(26, weaklings(20), 2),
            aHero()
              .withId('hero-3')
              .ownedBy('blue')
              .withPrimarySkills(NO_SKILLS)
              .withArmy(weaklings(20))
              .at(28, 2),
            aPile('pile', 34, 2)
          ]
        })
      )

      expectHeroAt(GATE.x, GATE.y, 'hero-2')
      expectResourceNotPresent('pile')
    })

    // From (1, 2) the gate is out of the red hero's reach.
    test('a blue hero leaves its town once the red hero has walked out of reach', async () => {
      const { user } = await setupApp(
        aTownScenario({
          entities: [
            aRedHero(7, weaklings(10), 2),
            aBlueHero(GATE.x, weaklings(20), GATE.y),
            aPile('pile', 25, 2)
          ]
        })
      )
      await endTurn(user)

      await confirmMove(user, 1, 2)
      await waitMs(COMPUTER_TURN_MS)
      await endTurn(user)

      expectResourceNotPresent('pile')
    })
  })
})
