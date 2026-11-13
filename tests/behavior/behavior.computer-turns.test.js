// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  expectHeroAt,
  expectResourceNotPresent,
  expectResourcePresent
} from './adventure-map.utils.js'
import { clickEndTurn, expectResourceTotal, getTownInTownList } from './adventure-panels.utils.js'
import { readGameData, setupMovementBehaviorApp, waitMs } from './app.utils.js'
import { aHero, aMonster, aResource, aScenario, aTown } from './builders.js'
import { openTavern, openThievesGuild, readThievesGuildRanking } from './town-screen.utils.js'

const goldDefinitions = { resources: { GOLD_PILE: { name: 'Gold', amount: 100 } } }

// Long enough for every computer hero's walk and the piles fading out after it.
const COMPUTER_TURN_MS = 2000

const aBlueHero = (x, y = 0) => aHero().withId('hero-2').ownedBy('blue').at(x, y)

const aPile = (id, x, y = 0) => aResource().withId(id).at(x, y)

// The player's hero stands at the left end of a one-row map, out of the computer heroes' way.
const aRowScenario = (...entities) =>
  aScenario()
    .withSize(30)
    .withEntities(aHero().at(0, 0), ...entities)
    .withDefinitions(goldDefinitions)

async function setupApp(scenario) {
  return setupMovementBehaviorApp({ loadGameOptions: scenario.build() })
}

async function endTurn(user) {
  await clickEndTurn(user)
  await waitMs(COMPUTER_TURN_MS)
}

describe('computer turns behavior', () => {
  // A hero picks a pile up from the tile next to it, paying 100 for the step onto it: the pile
  // at 18 costs 300, and the one at 4 then 1400 more, over the 1500 a day.
  test('a blue hero walks to the nearest resource pile and picks it up', async () => {
    const { user } = await setupApp(
      aRowScenario(aBlueHero(15), aPile('near-pile', 18), aPile('far-pile', 4))
    )

    await endTurn(user)

    expectResourceNotPresent('near-pile')
    expectResourcePresent('far-pile')
  })

  // From 17, with 1200 left, the hero walks 12 tiles to 5, next to the far pile.
  test('a blue hero walks towards a pile too far for one day', async () => {
    const { user } = await setupApp(
      aRowScenario(aBlueHero(15), aPile('near-pile', 18), aPile('far-pile', 4))
    )

    await endTurn(user)

    expectHeroAt(5, 0, 'hero-2')
  })

  test('a blue hero picks up a pile too far for one day on the next day', async () => {
    const { user } = await setupApp(
      aRowScenario(aBlueHero(15), aPile('near-pile', 18), aPile('far-pile', 4))
    )

    await endTurn(user)
    await endTurn(user)

    expectResourceNotPresent('far-pile')
  })

  // 300 for the pile at 18, then 400 from 17 for the one at 13.
  test('a blue hero picks up several piles in one turn while its movement points last', async () => {
    const { user } = await setupApp(
      aRowScenario(aBlueHero(15), aPile('first-pile', 18), aPile('second-pile', 13))
    )

    await endTurn(user)

    expectResourceNotPresent('first-pile')
    expectResourceNotPresent('second-pile')
  })

  test("the player's resources don't change when a blue hero picks up a pile", async () => {
    const { user } = await setupApp(aRowScenario(aBlueHero(15), aPile('pile', 18)))

    await endTurn(user)

    expectResourceTotal('Gold', 0)
  })

  // The monster at 19 guards the pile's tile, so picking it up starts a battle.
  test("a blue hero doesn't walk to a pile it can only reach past a monster", async () => {
    const { user } = await setupApp(
      aRowScenario(aBlueHero(15), aPile('pile', 18), aMonster().at(19, 0))
    )

    await endTurn(user)

    expectHeroAt(15, 0, 'hero-2')
    expectResourcePresent('pile')
  })

  // The town's entrance is at (15, 3); its building covers the tiles either side and the rows
  // above, so a hero leaves it through the row below, where the pile is.
  test('a blue hero standing in its town stays there', async () => {
    const { user } = await setupApp(
      aScenario()
        .withSize(30, 5)
        .withEntities(
          aHero().at(0, 3),
          aTown().ownedBy('blue').at(15, 3),
          aBlueHero(15, 3),
          aPile('pile', 18, 4)
        )
        .withDefinitions({ ...goldDefinitions, towns: readGameData('towns.json') })
    )

    await endTurn(user)

    expectHeroAt(15, 3, 'hero-2')
    expectResourcePresent('pile')
  })

  // Both heroes are five tiles from the pile; blue plays before tan.
  test("blue's hero gets to a pile before tan's", async () => {
    const { user } = await setupApp(
      aRowScenario(
        aBlueHero(10),
        aHero().withId('hero-3').ownedBy('tan').at(20, 0),
        aPile('pile', 15)
      )
    )

    await endTurn(user)

    expectHeroAt(14, 0, 'hero-2')
    expectHeroAt(20, 0, 'hero-3')
  })

  // Computer players start with 7500 gold and the pile gives 100; the player starts with none
  // and gets only their towns' income.
  test("a blue hero picking up gold puts blue ahead of tan in the Thieves' Guild's gold row", async () => {
    const tavernTown = (id, name, x) =>
      aTown().withId(id).named(name).ownedByPlayer().withBuildings(['TAVERN']).at(x, 3)
    const { user } = await setupApp(
      aScenario()
        .withSize(30, 5)
        .withEntities(
          aHero().at(0, 4),
          tavernTown('town-1', 'Whitemoon', 4),
          tavernTown('town-2', 'Greenfield', 12),
          aBlueHero(20, 4),
          aHero().withId('hero-3').ownedBy('tan').at(29, 0),
          aPile('pile', 23, 4)
        )
        .withDefinitions({
          ...goldDefinitions,
          towns: readGameData('towns.json'),
          buildings: readGameData('buildings.json'),
          tavern: readGameData('tavern.json')
        })
    )

    await endTurn(user)
    await user.dblClick(getTownInTownList('Whitemoon'))
    await openTavern(user)
    await openThievesGuild(user)

    expect(readThievesGuildRanking('Gold')).toEqual({
      '1st': ['blue'],
      '2nd': ['tan'],
      '3rd': ['red']
    })
  })
})
