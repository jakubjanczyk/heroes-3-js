// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import {
  closeInteractionModal,
  endTurns,
  expectInteractionModalClosed,
  getHeroInfoBox,
  readMessage,
  readPrimarySkills
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aScenario, aTown, aTownDefinition } from './builders.js'
import { clickHeroInHeroList, readHeroScreenBox } from './hero-screen.utils.js'
import { buildInTown, enterTownAt, leaveTown } from './town-screen.utils.js'

const SCHOLARS = 'SCHOLARS'

const STUDY_THE_WALL = 'You study the glyphs on the wall and gain insight (+1 Knowledge).'
const TRAIN_AT_THE_ACADEMY =
  'A visit to the academy teaches you many new skills (+1000 Experience).'
const DRINK_FROM_THE_WELL = 'You drink from the well and feel wiser (+1 Knowledge).'

const wallOfKnowledge = {
  name: 'Wall of Glyphs',
  cost: { GOLD_PILE: 1000 },
  visit: {
    visits: 'oncePerHero',
    rewards: [{ type: 'primarySkills', knowledge: 1 }],
    messages: { gives: STUDY_THE_WALL }
  }
}

const academy = {
  name: 'Academy',
  cost: { GOLD_PILE: 1000 },
  visit: {
    visits: 'oncePerHero',
    rewards: [{ type: 'experience', amount: 1000 }],
    messages: { gives: TRAIN_AT_THE_ACADEMY }
  }
}

const wishingWell = {
  name: 'Wishing Well',
  cost: { GOLD_PILE: 1000 },
  visit: {
    visits: 'oncePerWeek',
    rewards: [{ type: 'primarySkills', knowledge: 1 }],
    messages: { gives: DRINK_FROM_THE_WELL }
  }
}

const gameDefinitions = {
  hero: { ...readGameData('hero.json'), name: 'Hero' },
  heroClasses: readGameData('hero-classes.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  buildings: readGameData('buildings.json'),
  towns: {
    ...readGameData('towns.json'),
    [SCHOLARS]: aTownDefinition()
      .withName('Scholars')
      .withBuildings({ WALL: wallOfKnowledge, ACADEMY: academy, WELL: wishingWell })
      .withHall([[['VILLAGE_HALL'], ['WALL'], ['ACADEMY'], ['WELL']]])
      .build()
  }
}

// A Knight: Attack 2, Defense 2, Power 1, Knowledge 1.
const KNOWLEDGE_2 = ['Attack 2', 'Defense 2', 'Power 1', 'Knowledge 2']
const KNOWLEDGE_3 = ['Attack 2', 'Defense 2', 'Power 1', 'Knowledge 3']

// The towns' entrances are at (4, 3) and (8, 3); the heroes start below them.
const FIRST_TOWN = { x: 4, y: 3 }
const SECOND_TOWN = { x: 8, y: 3 }

const aScholarsTown = ({
  id = 'town-1',
  name = 'Athenaeum',
  buildings = ['WALL'],
  at = FIRST_TOWN
}) =>
  aTown()
    .withId(id)
    .withType(SCHOLARS)
    .named(name)
    .ownedByPlayer()
    .withBuildings(buildings)
    .at(at.x, at.y)

const aScholarsScenario = ({
  heroes = [aHero().withName('Hero').at(4, 5)],
  towns = [aScholarsTown({})]
} = {}) =>
  aScenario()
    .withSize(11, 7)
    .withEntities(...heroes, ...towns)
    .withDefinitions(gameDefinitions)
    .withStartingResources({ GOLD_PILE: 20000 })

async function setupApp(scenario = aScholarsScenario(), { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    eventLog
  })
}

async function walkTo({ x, y }) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

async function enterAndLeave(user, town = FIRST_TOWN) {
  await enterTownAt(town.x, town.y)
  await closeInteractionModal(user)
  await leaveTown(user)
}

async function stepOutAndBackIn() {
  await walkTo({ x: 4, y: 4 })
  await enterTownAt(FIRST_TOWN.x, FIRST_TOWN.y)
}

describe('a town building visited once per hero', () => {
  test('walking into the town shows its message', async () => {
    await setupApp()

    await enterTownAt(FIRST_TOWN.x, FIRST_TOWN.y)

    expect(readMessage()).toBe(STUDY_THE_WALL)
  })

  test("walking into the town raises the hero's Knowledge by 1", async () => {
    const { user } = await setupApp()

    await enterAndLeave(user)

    expect(readPrimarySkills(getHeroInfoBox())).toEqual(KNOWLEDGE_2)
  })

  test('walking into the town again shows no message', async () => {
    const { user } = await setupApp()
    await enterAndLeave(user)

    await stepOutAndBackIn()

    expectInteractionModalClosed()
  })

  test('walking into the town again leaves the Knowledge as it was', async () => {
    const { user } = await setupApp()
    await enterAndLeave(user)

    await stepOutAndBackIn()

    await leaveTown(user)
    expect(readPrimarySkills(getHeroInfoBox())).toEqual(KNOWLEDGE_2)
  })

  test("the same hero gets +1 Knowledge again from another town's building", async () => {
    const towns = [
      aScholarsTown({}),
      aScholarsTown({ id: 'town-2', name: 'Lyceum', at: SECOND_TOWN })
    ]
    const { user } = await setupApp(aScholarsScenario({ towns }))
    await enterAndLeave(user)

    await enterAndLeave(user, SECOND_TOWN)

    expect(readPrimarySkills(getHeroInfoBox())).toEqual(KNOWLEDGE_3)
  })

  test('a second hero gets the bonus in the town the first hero already used', async () => {
    const heroes = [
      aHero().withId('hero-1').withName('Hero').at(4, 5),
      aHero().withId('hero-2').withName('Other').at(5, 5)
    ]
    const { user } = await setupApp(aScholarsScenario({ heroes }))
    await enterAndLeave(user)
    await walkTo({ x: 4, y: 5 })
    await clickHeroInHeroList(user, 'Other')

    await enterTownAt(FIRST_TOWN.x, FIRST_TOWN.y)

    expect(readMessage()).toBe(STUDY_THE_WALL)
  })

  test('building it while a hero is in the town shows its message', async () => {
    const { user } = await setupApp(
      aScholarsScenario({ towns: [aScholarsTown({ buildings: [] })] })
    )
    await enterTownAt(FIRST_TOWN.x, FIRST_TOWN.y)

    await buildInTown(user, 'Wall of Glyphs')

    expect(readMessage()).toBe(STUDY_THE_WALL)
  })

  test("building it while a hero is in the town raises the hero's Knowledge by 1", async () => {
    const { user } = await setupApp(
      aScholarsScenario({ towns: [aScholarsTown({ buildings: [] })] })
    )
    await enterTownAt(FIRST_TOWN.x, FIRST_TOWN.y)

    await buildInTown(user, 'Wall of Glyphs')

    await closeInteractionModal(user)
    await leaveTown(user)
    expect(readPrimarySkills(getHeroInfoBox())).toEqual(KNOWLEDGE_2)
  })

  test("a building giving experience raises the hero's experience by its amount", async () => {
    const towns = [aScholarsTown({ buildings: ['ACADEMY'] })]
    const heroes = [aHero().withName('Hero').withExperience(200).at(4, 5)]
    const { user } = await setupApp(aScholarsScenario({ heroes, towns }))
    await enterAndLeave(user)

    await clickHeroInHeroList(user, 'Hero')

    expect(readHeroScreenBox('Experience')).toBe('Experience 1200')
  })

  test('after a reload the Knowledge stays raised', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aScholarsScenario()
    const { user: firstUser } = await setupApp(scenario, { eventLog })
    await enterAndLeave(firstUser)

    await setupApp(scenario, { eventLog })

    expect(readPrimarySkills(getHeroInfoBox())).toEqual(KNOWLEDGE_2)
  })

  test('after a reload walking into the town again shows no message', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aScholarsScenario()
    const { user: firstUser } = await setupApp(scenario, { eventLog })
    await enterAndLeave(firstUser)
    await setupApp(scenario, { eventLog })

    await stepOutAndBackIn()

    expectInteractionModalClosed()
  })
})

describe('a town building visited once a week', () => {
  const wellTown = () => aScholarsTown({ buildings: ['WELL'] })

  test('a second hero walking in the same week gets no message', async () => {
    const heroes = [
      aHero().withId('hero-1').withName('Hero').at(4, 5),
      aHero().withId('hero-2').withName('Other').at(5, 5)
    ]
    const { user } = await setupApp(aScholarsScenario({ heroes, towns: [wellTown()] }))
    await enterAndLeave(user)
    await walkTo({ x: 4, y: 5 })
    await clickHeroInHeroList(user, 'Other')

    await enterTownAt(FIRST_TOWN.x, FIRST_TOWN.y)

    expectInteractionModalClosed()
  })

  test('the hero walking in again in the next week gets its bonus again', async () => {
    const { user } = await setupApp(aScholarsScenario({ towns: [wellTown()] }))
    await enterAndLeave(user)
    await walkTo({ x: 4, y: 4 })
    await endTurns(user, 7)

    await enterAndLeave(user)

    expect(readPrimarySkills(getHeroInfoBox())).toEqual(KNOWLEDGE_3)
  })
})
