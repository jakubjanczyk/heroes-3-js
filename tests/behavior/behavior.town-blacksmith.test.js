// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { attackMonsterAt } from './adventure-map.utils.js'
import { expectResourceTotal, getTownInTownList } from './adventure-panels.utils.js'
import { createMemoryEventLog, pressKey, setupMovementBehaviorApp } from './app.utils.js'
import { readBattleStacks } from './battle.utils.js'
import {
  aCreatureDefinition,
  aHero,
  aMonster,
  aScenario,
  aTown,
  aTownDefinition,
  aWarMachineDefinition
} from './builders.js'
import { clickHeroInHeroList, readHeroScreenWarMachines } from './hero-screen.utils.js'
import {
  cancelRecruiting,
  clickRecruitMax,
  getRecruitButton,
  queryRecruitWindow,
  readAvailable,
  readCostPerTroop,
  readRecruitCount,
  readRecruitCreatures,
  recruit
} from './recruit-window.utils.js'
import {
  clickBuildingOnPicture,
  leaveTown,
  queryTownScreen,
  readTownMessage
} from './town-screen.utils.js'

const HERO = 'Sir Christian'
const FORGEHOLD = 'FORGEHOLD'
const TENTFIELD = 'TENTFIELD'
const BALLISTA_PRICE = 2500
const TENT_PRICE = 750

const aWarMachineCreature = (name, gold) =>
  aCreatureDefinition()
    .withName(name)
    .withNamePlural(`${name}s`)
    .withSpeed(0)
    .withAbilities(['warMachine'])
    .withCost({ GOLD_PILE: gold })
    .build()

const aTownTypeSelling = (name, warMachine) =>
  aTownDefinition()
    .withName(name)
    .withBlacksmith(warMachine)
    .withHall([[['VILLAGE_HALL'], ['BLACKSMITH']]])
    .withPicture({ VILLAGE_HALL: { x: 100, y: 100 }, BLACKSMITH: { x: 300, y: 100 } })
    .build()

const gameDefinitions = {
  hero: { name: HERO },
  resources: { GOLD_PILE: { name: 'Gold' } },
  buildings: {
    VILLAGE_HALL: { name: 'Village Hall', cost: {} },
    BLACKSMITH: { name: 'Blacksmith', cost: { GOLD_PILE: 1000 } }
  },
  towns: {
    [FORGEHOLD]: aTownTypeSelling('Forgehold', 'BALLISTA'),
    [TENTFIELD]: aTownTypeSelling('Tentfield', 'FIRST_AID_TENT')
  },
  monsters: {
    BALLISTA: aWarMachineCreature('Ballista', BALLISTA_PRICE),
    FIRST_AID_TENT: aWarMachineCreature('First Aid Tent', TENT_PRICE),
    SKELETON: aCreatureDefinition().withName('Skeleton').withNamePlural('Skeletons').build()
  },
  artifacts: {
    BALLISTA: aWarMachineDefinition()
      .withName('Ballista')
      .withSlot('BALLISTA')
      .withCreature('BALLISTA')
      .build(),
    FIRST_AID_TENT: aWarMachineDefinition()
      .withName('First Aid Tent')
      .withSlot('FIRST_AID_TENT')
      .withCreature('FIRST_AID_TENT')
      .build()
  }
}

const IN_THE_TOWN = { x: 4, y: 3 }
const OUTSIDE_THE_TOWN = { x: 4, y: 5 }

const aHeroAt = ({ x, y }, artifacts = []) =>
  aHero().withName(HERO).withArtifacts(artifacts).at(x, y)

const aBlacksmithScenario = ({
  type = FORGEHOLD,
  hero = aHeroAt(IN_THE_TOWN),
  gold = 5000,
  monster
} = {}) =>
  aScenario()
    .withSize(8, 7)
    .withEntities(
      hero,
      aTown()
        .withType(type)
        .named('Anvilton')
        .ownedByPlayer()
        .withBuildings(['BLACKSMITH'])
        .at(IN_THE_TOWN.x, IN_THE_TOWN.y),
      ...(monster ? [monster] : [])
    )
    .withDefinitions(gameDefinitions)
    .withStartingResources({ GOLD_PILE: gold })

async function startInTheTown(scenario = aBlacksmithScenario(), { eventLog } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    eventLog
  })
  await app.user.dblClick(getTownInTownList('Anvilton'))
  return app
}

async function startAtTheBlacksmith(scenario, options) {
  const app = await startInTheTown(scenario, options)
  await clickBuildingOnPicture(app.user, 'Blacksmith')
  return app
}

async function buyAtTheBlacksmith(scenario, options) {
  const app = await startAtTheBlacksmith(scenario, options)
  await recruit(app.user)
  return app
}

describe('the Blacksmith', () => {
  test('clicking the Blacksmith with no hero in the town says only visiting heroes may use it', async () => {
    const { user } = await startInTheTown(aBlacksmithScenario({ hero: aHeroAt(OUTSIDE_THE_TOWN) }))

    await clickBuildingOnPicture(user, 'Blacksmith')

    expect(readTownMessage()).toBe('Only visiting heroes may use the Blacksmith.')
    expect(queryRecruitWindow()).toBeNull()
  })

  test("clicking the Blacksmith with a hero in the town opens the recruit window for the town's war machine with its cost", async () => {
    await startAtTheBlacksmith()

    expect(queryRecruitWindow('Recruit Ballista')).not.toBeNull()
    expect(readRecruitCreatures()).toEqual(['Ballista'])
    expect(readCostPerTroop()).toEqual(['2500 Gold'])
  })

  test('a town whose Blacksmith sells the First Aid Tent offers the First Aid Tent', async () => {
    await startAtTheBlacksmith(aBlacksmithScenario({ type: TENTFIELD }))

    expect(queryRecruitWindow('Recruit First Aid Tent')).not.toBeNull()
    expect(readCostPerTroop()).toEqual(['750 Gold'])
  })

  test('one war machine is available and the slider starts at 1', async () => {
    await startAtTheBlacksmith()

    expect(readAvailable()).toBe(1)
    expect(readRecruitCount()).toBe(1)
  })

  test('Max picks no more than one', async () => {
    const { user } = await startAtTheBlacksmith(aBlacksmithScenario({ gold: 50000 }))

    await clickRecruitMax(user)

    expect(readRecruitCount()).toBe(1)
  })

  test('none is available and Recruit is greyed out when the hero already has that war machine', async () => {
    await startAtTheBlacksmith(aBlacksmithScenario({ hero: aHeroAt(IN_THE_TOWN, ['BALLISTA']) }))

    expect(readAvailable()).toBe(0)
    expect(getRecruitButton().disabled).toBe(true)
  })

  test('the slider starts at 0 and Recruit is greyed out when the player has less gold than the cost', async () => {
    await startAtTheBlacksmith(aBlacksmithScenario({ gold: BALLISTA_PRICE - 1 }))

    expect(readRecruitCount()).toBe(0)
    expect(getRecruitButton().disabled).toBe(true)
  })

  test('recruiting the war machine spends its cost in gold and closes the window', async () => {
    await buyAtTheBlacksmith()

    expectResourceTotal('Gold', 5000 - BALLISTA_PRICE)
    expect(queryRecruitWindow()).toBeNull()
  })

  test('Enter recruits the war machine', async () => {
    const { user } = await startAtTheBlacksmith()

    await pressKey(user, '{Enter}')

    expectResourceTotal('Gold', 5000 - BALLISTA_PRICE)
  })

  test('a recruited war machine is in its slot on the hero screen', async () => {
    const { user } = await buyAtTheBlacksmith()
    await leaveTown(user)

    await clickHeroInHeroList(user, HERO)

    expect(readHeroScreenWarMachines()).toEqual({ Ballista: 'Ballista' })
  })

  test('a recruited war machine and the gold spent stay after a reload', async () => {
    const eventLog = createMemoryEventLog()
    const scenario = aBlacksmithScenario()
    await buyAtTheBlacksmith(scenario, { eventLog })

    const { user } = await setupMovementBehaviorApp({
      loadGameOptions: scenario.build(),
      appConfig: { interactionModalTransitionMs: 0 },
      eventLog
    })
    await clickHeroInHeroList(user, HERO)

    expectResourceTotal('Gold', 5000 - BALLISTA_PRICE)
    expect(readHeroScreenWarMachines()).toEqual({ Ballista: 'Ballista' })
  })

  test('Cancel closes the window without buying anything', async () => {
    const { user } = await startAtTheBlacksmith()

    await cancelRecruiting(user)

    expect(queryRecruitWindow()).toBeNull()
    expect(queryTownScreen()).not.toBeNull()
    expectResourceTotal('Gold', 5000)
  })

  test('Escape closes the window without buying anything', async () => {
    const { user } = await startAtTheBlacksmith()

    await pressKey(user, '{Escape}')

    expect(queryRecruitWindow()).toBeNull()
    expectResourceTotal('Gold', 5000)
  })

  test('a hero who bought a Ballista has it in their next battle', async () => {
    const { user } = await buyAtTheBlacksmith(
      aBlacksmithScenario({ monster: aMonster().withStacks(1).at(5, 3) })
    )
    await leaveTown(user)

    await attackMonsterAt(5, 3)

    expect(readBattleStacks()).toContainEqual({ stack: 'Ballista 1', row: 4, column: 1 })
  })
})
