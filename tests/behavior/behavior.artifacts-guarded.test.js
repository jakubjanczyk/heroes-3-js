// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  confirmTileClickByDispatch,
  getArtifactEntity,
  getHeroEntity
} from './adventure-map.utils.js'
import {
  answerQuestion,
  getInteractionModalMessage,
  queryQuestion,
  readSelectedHeroInHeroList
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp,
  waitMs
} from './app.utils.js'
import {
  clickBattleHex,
  closeBattleResults,
  LOWEST_ROLLS,
  queryBattleScreen,
  readBattleStacks,
  retreat,
  winBattle
} from './battle.utils.js'
import { ARMY_THAT_WINS, aHero, anArtifact, anArtifactDefinition, aScenario } from './builders.js'
import {
  clickHeroInHeroList,
  closeHeroScreen,
  readHeroScreenArtifacts,
  readHeroScreenBox
} from './hero-screen.utils.js'

const GUARDED_QUESTION =
  "Through a clearing you observe an ancient artifact. Unfortunately, it's guarded. Do you want to fight the guards for the artifact?"

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  artifacts: {
    AXE: anArtifactDefinition().withName("Centaur's Axe").withSlot('WEAPON').build()
  }
}

const NINE_MONKS = [{ creature: 'MONK', count: 9 }]

const aHeroWithMarksmen = () => aHero().withArmy([{ creature: 'MARKSMAN', count: 20 }])

// The hero stands at (2, 2), right below the artifact at (2, 1).
async function setupGuardedArtifact({
  hero = aHero(),
  guards = NINE_MONKS,
  otherHeroes = [],
  eventLog
} = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(5, 3)
      .withEntities(
        hero.at(2, 2),
        ...otherHeroes,
        anArtifact().withType('AXE').withGuards(guards).at(2, 1)
      )
      .withDefinitions(gameDefinitions)
      .build(),
    appConfig: { random: LOWEST_ROLLS, fadeOutMsByKind: { MONSTER: 0 } },
    eventLog
  })
}

async function walkToArtifact() {
  confirmTileClickByDispatch(2, 1)
  await flushMicrotasks()
}

async function fightGuards(user) {
  await walkToArtifact()
  await answerQuestion(user, 'Artifact', 'Yes')
  await flushMicrotasks()
}

async function beatGuards(user) {
  await fightGuards(user)
  await winBattle(user)
  await flushMicrotasks()
}

// The Marksmen, faster than the Monks, shoot first: 20 of them at their lowest damage of 2 do
// 40, 39 against the Monks' better Defense, and half of it from across the battlefield, 19.
// They shoot twice, 38 in all: one Monk (30 health) dies. The hero retreats on their next turn.
const SURVIVING_MONKS = 'Monks 8'

async function killSomeGuardsAndRetreat(user) {
  await fightGuards(user)
  await clickBattleHex(user, 6, 15)
  await waitMs()
  await retreat(user)
  await closeBattleResults(user)
  await flushMicrotasks()
}

function readGuardStacks() {
  return readBattleStacks()
    .filter(({ column }) => column >= 14)
    .map(({ stack }) => stack)
}

async function readHeroScreen(user, read, heroName = 'Hero') {
  if (!readSelectedHeroInHeroList().includes(heroName)) {
    await clickHeroInHeroList(user, heroName)
  }
  await clickHeroInHeroList(user, heroName)
  const seen = read()
  await closeHeroScreen(user)
  return seen
}

describe('guarded artifacts', () => {
  test('walking to a guarded artifact asks whether to fight its guards', async () => {
    await setupGuardedArtifact()

    await walkToArtifact()

    expect(queryQuestion('Artifact')).toBeTruthy()
    expect(getInteractionModalMessage().textContent).toBe(GUARDED_QUESTION)
  })

  test('No closes the question, leaving the artifact on the map and the hero without it', async () => {
    const { user } = await setupGuardedArtifact()
    await walkToArtifact()

    await answerQuestion(user, 'Artifact', 'No')
    await flushMicrotasks()

    expect(queryQuestion('Artifact')).toBeNull()
    expect(queryBattleScreen()).toBeNull()
    expect(getArtifactEntity()).not.toBeNull()
    expect(await readHeroScreen(user, readHeroScreenArtifacts)).toEqual({})
  })

  test('Yes starts a battle against each of the guard stacks the scenario sets', async () => {
    const { user } = await setupGuardedArtifact({
      hero: aHeroWithMarksmen(),
      guards: [
        { creature: 'MONK', count: 9 },
        { creature: 'SWORDSMAN', count: 4 }
      ]
    })

    await fightGuards(user)

    expect(readGuardStacks().sort()).toEqual(['Monks 9', 'Swordsmen 4'])
  })

  test('closing the results of a win puts the artifact on the hero and takes it off the map', async () => {
    const { user } = await setupGuardedArtifact({ hero: aHero().withArmy(ARMY_THAT_WINS) })

    await beatGuards(user)

    expect(getArtifactEntity()).toBeNull()
    expect(await readHeroScreen(user, readHeroScreenArtifacts)).toEqual({
      Weapon: "Centaur's Axe"
    })
  })

  test('winning with a full backpack leaves the artifact on the map, and walking to it again says the hero has a full load', async () => {
    // One axe worn and 64 in the backpack.
    const hero = aHero().withArmy(ARMY_THAT_WINS).withArtifacts(new Array(65).fill('AXE'))
    const { user } = await setupGuardedArtifact({ hero })
    await beatGuards(user)

    await walkToArtifact()

    expect(getArtifactEntity()).toBeTruthy()
    expect(getInteractionModalMessage().textContent).toBe(
      'You cannot pick up this artifact, you already have a full load!'
    )
  })

  // Experience for a win is the health of the creatures killed: 9 Monks of 30 each.
  test('winning gives the hero the experience for the battle', async () => {
    const { user } = await setupGuardedArtifact({ hero: aHero().withArmy(ARMY_THAT_WINS) })

    await beatGuards(user)

    expect(await readHeroScreen(user, () => readHeroScreenBox('Experience'))).toBe('Experience 270')
  })

  test('retreating takes the hero off the map and leaves the guarded artifact where it was', async () => {
    const { user } = await setupGuardedArtifact({ hero: aHeroWithMarksmen() })

    await killSomeGuardsAndRetreat(user)

    expect(getHeroEntity()).toBeNull()
    expect(getArtifactEntity()).not.toBeNull()
  })

  test('after a retreat, another hero is asked about and fights only the guards that survived', async () => {
    const { user } = await setupGuardedArtifact({
      hero: aHeroWithMarksmen(),
      otherHeroes: [aHero().withId('hero-2').at(3, 2)]
    })
    await killSomeGuardsAndRetreat(user)

    await fightGuards(user)

    expect(readGuardStacks()).toEqual([SURVIVING_MONKS])
  })

  test('the guards that survived are still there after a reload', async () => {
    const session = {
      hero: aHeroWithMarksmen(),
      otherHeroes: [aHero().withId('hero-2').at(3, 2)],
      eventLog: createMemoryEventLog()
    }
    const { user } = await setupGuardedArtifact(session)
    await killSomeGuardsAndRetreat(user)

    const reloaded = await setupGuardedArtifact(session)
    await fightGuards(reloaded.user)

    expect(readGuardStacks()).toEqual([SURVIVING_MONKS])
  })

  test('after a win, a reload shows the artifact worn and gone from the map', async () => {
    const session = { hero: aHero().withArmy(ARMY_THAT_WINS), eventLog: createMemoryEventLog() }
    const { user } = await setupGuardedArtifact(session)
    await beatGuards(user)

    const reloaded = await setupGuardedArtifact(session)

    expect(getArtifactEntity()).toBeNull()
    expect(await readHeroScreen(reloaded.user, readHeroScreenArtifacts)).toEqual({
      Weapon: "Centaur's Axe"
    })
  })
})
