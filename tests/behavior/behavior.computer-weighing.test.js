// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  expectMonsterNotPresent,
  expectResourceNotPresent,
  expectResourcePresent,
  getArtifactEntity,
  getDwellingEntity,
  getHeroEntity,
  getMineEntity,
  getTownEntity,
  readOwnerFlags
} from './adventure-map.utils.js'
import { clickEndTurn } from './adventure-panels.utils.js'
import { readGameData, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { LOWEST_ROLLS } from './battle.utils.js'
import {
  ARMY_THAT_WINS,
  aBonusObject,
  aDwelling,
  aHero,
  aMine,
  aMonster,
  anArtifact,
  anArtifactDefinition,
  aResource,
  aScenario,
  aTown
} from './builders.js'

// A pile's worth is its amount at its resource's price: 100 for the gold, 1250 for the wood and
// 2500 for the gems.
const resources = {
  GOLD_PILE: { name: 'Gold', amount: 100, price: 1 },
  WOOD_PILE: { name: 'Wood', amount: 5, price: 250 },
  GEMS_PILE: { name: 'Gems', amount: 5, price: 500 }
}

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources,
  monsters: readGameData('monsters.json'),
  mines: readGameData('mines.json'),
  dwellings: readGameData('dwellings.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  tavern: readGameData('tavern.json'),
  bonusObjects: readGameData('bonus-objects.json'),
  artifacts: {
    CROWN: anArtifactDefinition().withName('Crown').withSlot('HELMET').withCost(3000).build()
  }
}

const COMPUTER_TURN_MS = 2000

const NO_SKILLS = { attack: 0, defense: 0, power: 1, knowledge: 1 }

// A hero walks 15 tiles a day, at 100 a step and 141 a diagonal one: its targets' days are what
// the route costs over 1500.
const START = { x: 15, y: 3 }

const aBlueHero = (x = START.x, y = START.y) =>
  aHero()
    .withId('hero-2')
    .ownedBy('blue')
    .withPrimarySkills(NO_SKILLS)
    .withArmy(ARMY_THAT_WINS)
    .at(x, y)

const aPile = (id, type, x, y = START.y) => aResource().withId(id).withType(type).at(x, y)

// Mines, dwellings, objects and the town's gate stand on the row above the one blue's hero walks
// along; it steps up into them. The player's hero is walled in by rock, out of the way.
const aWeighingScenario = (...entities) =>
  aScenario()
    .withSize(40, 4)
    .withRockAround(0, 3)
    .withEntities(aHero().at(0, 3), ...entities)
    .withDefinitions(definitions)

const setupApp = (scenario) =>
  setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 } }
  })

async function startBlueTurn(scenario) {
  const app = await setupApp(scenario)
  await clickEndTurn(app.user)
  await waitMs(COMPUTER_TURN_MS)
  return app
}

const BLUE_FLAG = ['Blue player flag']

function blueHeroX() {
  return Number(getHeroEntity('hero-2').dataset.tileX)
}

describe('computer heroes weighing targets behavior', () => {
  describe('worth against days', () => {
    // The wood 4 steps away: 1250 over 400/1500 days, 4688. The Gold Mine 11 steps and a
    // diagonal away: five days of 1000 gold, 5000 over 1241/1500 days, 6044. The wood is then 16
    // steps away, too far for what is left of the day.
    test("blue's hero walks past a nearby wood pile to a Gold Mine worth more for its days", async () => {
      await startBlueTurn(
        aWeighingScenario(
          aBlueHero(),
          aPile('wood', 'WOOD_PILE', 11),
          aMine().withId('mine-1').at(27, 2)
        )
      )

      expect(readOwnerFlags(getMineEntity('mine-1'))).toEqual(BLUE_FLAG)
      expectResourcePresent('wood')
    })

    // The wood 2 steps away: 1250 over 200/1500 days, 9375. The Gold Mine 29 steps and a
    // diagonal away: 5000 over 3041/1500 days, 2466.
    test("blue's hero picks up a pile next to it before a mine two days away", async () => {
      await startBlueTurn(
        aWeighingScenario(
          aBlueHero(35),
          aPile('wood', 'WOOD_PILE', 33),
          aMine().withId('mine-1').at(5, 2)
        )
      )

      expectResourceNotPresent('wood')
      expect(readOwnerFlags(getMineEntity('mine-1'))).toEqual([])
    })

    // Both 8 steps away; whichever is picked up first, the other is then 16 steps away.
    test("of two equally far piles, blue's hero takes the gems before the wood", async () => {
      await startBlueTurn(
        aWeighingScenario(
          aBlueHero(),
          aPile('wood', 'WOOD_PILE', 7),
          aPile('gems', 'GEMS_PILE', 23)
        )
      )

      expectResourceNotPresent('gems')
      expectResourcePresent('wood')
    })

    // The gold 3 steps away: 100 over 300/1500 days, 500. The Crown 11 steps away: 3000 over
    // 1100/1500 days, 4091.
    test("blue's hero goes to a farther artifact worth more than a nearer pile", async () => {
      await startBlueTurn(
        aWeighingScenario(
          aBlueHero(),
          aPile('gold', 'GOLD_PILE', 12),
          anArtifact().withType('CROWN').at(26, 3)
        )
      )

      expect(getArtifactEntity()).toBeNull()
      expectResourcePresent('gold')
    })

    // The Guardhouse 10 steps and a diagonal away: a week of 14 Pikemen at an AI value of 80 is
    // 1120, with what blue recruits there on top, over 1141/1500 days; the gold 500.
    test("blue's hero flags a farther dwelling with creatures to recruit before a nearer small pile", async () => {
      await startBlueTurn(
        aWeighingScenario(
          aBlueHero(),
          aPile('gold', 'GOLD_PILE', 12),
          aDwelling().withType('GUARDHOUSE').at(26, 2)
        )
      )

      expect(readOwnerFlags(getDwellingEntity())).toEqual(BLUE_FLAG)
      expectResourcePresent('gold')
    })

    // Twenty Swordsmen give 20 × 35 = 700 experience, over 1100/1500 days: 955; the gold 500.
    test("blue's hero attacks a farther monster worth more experience than a nearer small pile", async () => {
      await startBlueTurn(
        aWeighingScenario(
          aBlueHero(),
          aPile('gold', 'GOLD_PILE', 12),
          aMonster().withType('SWORDSMAN').withCount(20).at(26, 3)
        )
      )

      expectMonsterNotPresent()
      expectResourcePresent('gold')
    })

    // The Learning Stone's 1000 experience over 1141/1500 days is 1315; the gold 500. With what is
    // left of the day the hero heads back towards the gold, but doesn't reach it.
    test("blue's hero visits a farther Learning Stone before a nearer small pile", async () => {
      await startBlueTurn(
        aWeighingScenario(
          aBlueHero(),
          aPile('gold', 'GOLD_PILE', 12),
          aBonusObject().withType('LEARNING_STONE').at(26, 2)
        )
      )

      expectResourcePresent('gold')
      expect(blueHeroX()).toBeGreaterThan(START.x)
    })

    // The town's gate 10 steps and a diagonal away: five days of its Village Hall's 500 gold is
    // 2500, over 1141/1500 days; the gold 500.
    test("blue's hero takes an undefended red town before a nearer pile", async () => {
      await startBlueTurn(
        aWeighingScenario(
          aBlueHero(),
          aPile('gold', 'GOLD_PILE', 12),
          aTown().withId('town-1').ownedByPlayer().at(26, 2)
        )
      )

      expect(readOwnerFlags(getTownEntity())).toEqual(BLUE_FLAG)
      expectResourcePresent('gold')
    })
  })

  describe('what still comes first', () => {
    // The red hero reaches the tiles up to 15 next turn: the gems at 14 are in its reach, the gold
    // at 27 isn't.
    test("blue's hero leaves alone a richer pile a stronger red hero can reach next turn", async () => {
      await startBlueTurn(
        aScenario()
          .withSize(40)
          .withEntities(
            aHero().withPrimarySkills(NO_SKILLS).withArmy(ARMY_THAT_WINS).at(0, 0),
            aHero()
              .withId('hero-2')
              .ownedBy('blue')
              .withPrimarySkills(NO_SKILLS)
              .withArmy([{ creature: 'SKELETON', count: 10 }])
              .at(20, 0),
            aPile('gems', 'GEMS_PILE', 14, 0),
            aPile('gold', 'GOLD_PILE', 27, 0)
          )
          .withDefinitions(definitions)
      )

      expectResourcePresent('gems')
      expectResourceNotPresent('gold')
    })
  })
})
