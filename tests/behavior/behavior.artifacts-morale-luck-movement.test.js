// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch, readInfoPopupLines } from './adventure-map.utils.js'
import {
  endTurns,
  expectMovementPoints,
  getHeroInfoBox,
  readMoraleAndLuck
} from './adventure-panels.utils.js'
import { flushMicrotasks, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import {
  attackBattleHexFrom,
  clickBattleButton,
  moveActiveStackTo,
  readActiveStack,
  readCombatMessages,
  startBattle
} from './battle.utils.js'
import { aHero, aMonster, anArtifact, anArtifactDefinition, aScenario } from './builders.js'
import {
  clickHeroInHeroList,
  closeHeroScreen,
  getHeroScreen,
  holdRightButtonOnHeroScreenBox
} from './hero-screen.utils.js'

const CLOVER = 'CLOVER'
const CARDS = 'CARDS'
const BADGE = 'BADGE'
const DRAGON_EYE = 'DRAGON_EYE'
const SPIRIT = 'SPIRIT'
const HOURGLASS = 'HOURGLASS'
const BOOTS = 'BOOTS'
const GLOVES = 'GLOVES'
const SANDALS = 'SANDALS'

const artifactDefinitions = {
  [CLOVER]: anArtifactDefinition()
    .withName('Clover of Fortune')
    .withSlot('MISC')
    .withLuck(1)
    .build(),
  [CARDS]: anArtifactDefinition()
    .withName('Cards of Prophecy')
    .withSlot('MISC')
    .withLuck(1)
    .build(),
  [BADGE]: anArtifactDefinition()
    .withName('Badge of Courage')
    .withSlot('RING')
    .withMorale(1)
    .build(),
  [DRAGON_EYE]: anArtifactDefinition()
    .withName('Still Eye of the Dragon')
    .withSlot('RING')
    .withMorale(1)
    .withLuck(1)
    .build(),
  [SPIRIT]: anArtifactDefinition()
    .withName('Spirit of Oppression')
    .withSlot('MISC')
    .withCancelsInBattle(['morale'])
    .build(),
  [HOURGLASS]: anArtifactDefinition()
    .withName('Hourglass of the Evil Hour')
    .withSlot('MISC')
    .withCancelsInBattle(['luck'])
    .build(),
  [BOOTS]: anArtifactDefinition()
    .withName('Boots of Speed')
    .withSlot('FEET')
    .withLandMovementPoints(600)
    .build(),
  [GLOVES]: anArtifactDefinition()
    .withName("Equestrian's Gloves")
    .withSlot('RING')
    .withLandMovementPoints(300)
    .build(),
  [SANDALS]: anArtifactDefinition().withName('Sandals of the Saint').withSlot('FEET').build()
}

const definitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  artifacts: artifactDefinitions
}

const HERO = 'Hero'

const stack = (creature, count = 10) => ({ creature, count })
const basic = (skill) => ({ skill, level: 'BASIC' })

// Pikemen only: all troops of one alignment, morale +1.
const aHeroWearing = (artifacts, { army = [stack('PIKEMAN')], skills = [] } = {}) =>
  aHero().withArmy(army).withSecondarySkills(skills).withArtifacts(artifacts)

const aMapScenario = ({ hero = aHeroWearing([]), others = [] } = {}) =>
  aScenario()
    .withSize(4)
    .withEntities(hero.at(0, 0), ...others)
    .withDefinitions(definitions)

async function setupApp(scenario) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 }
  })
}

async function readHeroScreenMoraleAndLuck(user) {
  await clickHeroInHeroList(user, HERO)
  const moraleAndLuck = readMoraleAndLuck(getHeroScreen())
  await closeHeroScreen(user)
  return moraleAndLuck
}

async function readHeroScreenMoraleAndLuckOf(hero) {
  const { user } = await setupApp(aMapScenario({ hero }))
  return readHeroScreenMoraleAndLuck(user)
}

async function readHeroScreenPopup(user, box) {
  await clickHeroInHeroList(user, HERO)
  await holdRightButtonOnHeroScreenBox(user, box)
  return [
    within(screen.getByRole('tooltip')).getByRole('heading').textContent,
    ...readInfoPopupLines()
  ]
}

// The hero stays on their tile and pays 100 for the step to the artifact next to them.
async function pickUpArtifactAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

const anArtifactAtTheHero = (type) =>
  aMapScenario({ others: [anArtifact().withType(type).at(1, 0)] })

// Rolls for morale or luck, under the chance to take effect.
const ALWAYS = () => 0

// Hands out the rolls in turn, starting over at the end.
function rollsInTurn(...values) {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value
  }
}

// The monster is one stack on row 6, column 15. With two hero stacks the first starts on row 3
// and the second on row 9, both in column 1; with one, on row 6.
const aFight = ({ hero, monsterType = 'SKELETON', monsterCount = 100 }) =>
  aScenario()
    .withSize(3)
    .withEntities(
      hero,
      aMonster().withType(monsterType).withCount(monsterCount).withStacks(1).at(1, 0)
    )
    .withDefinitions(definitions)

const HIGH_MORALE = (name) => `High morale enables the ${name} to attack again.`
const LOW_MORALE = (name) => `Low morale causes the ${name} to freeze in panic.`

describe('artifacts with morale, luck and movement behavior', () => {
  describe('morale and luck', () => {
    test('given a hero with an army of one alignment wearing an artifact with morale +1 when the hero screen opens then morale is +2', async () => {
      expect(await readHeroScreenMoraleAndLuckOf(aHeroWearing([BADGE]))).toEqual([
        'Morale +2',
        'Luck 0'
      ])
    })

    test('given a hero wearing an artifact with luck +1 when the hero screen opens then luck is +1', async () => {
      expect(await readHeroScreenMoraleAndLuckOf(aHeroWearing([CLOVER]))).toEqual([
        'Morale +1',
        'Luck +1'
      ])
    })

    test('given a hero wearing an artifact with morale and luck when the player holds the right button on morale then the popup lists the artifact with its value', async () => {
      const { user } = await setupApp(aMapScenario({ hero: aHeroWearing([DRAGON_EYE]) }))

      expect(await readHeroScreenPopup(user, 'Morale')).toEqual([
        'Good Morale',
        'Good morale may give your troops an extra attack in combat.',
        'Current Morale Modifiers:',
        'Still Eye of the Dragon +1',
        'All troops of one alignment +1'
      ])
    })

    test('given a hero wearing an artifact with morale and luck when the player holds the right button on luck then the popup lists the artifact with its value', async () => {
      const { user } = await setupApp(aMapScenario({ hero: aHeroWearing([DRAGON_EYE]) }))

      expect(await readHeroScreenPopup(user, 'Luck')).toEqual([
        'Good Luck',
        'Good luck may let your troops strike a lucky blow for double damage.',
        'Current Luck Modifiers:',
        'Still Eye of the Dragon +1'
      ])
    })

    test('given a hero wearing two different luck artifacts when the hero screen opens then both count', async () => {
      expect(await readHeroScreenMoraleAndLuckOf(aHeroWearing([CLOVER, CARDS]))).toEqual([
        'Morale +1',
        'Luck +2'
      ])
    })

    test('given a hero wearing two copies of a morale ring when the hero screen opens then only one counts', async () => {
      expect(await readHeroScreenMoraleAndLuckOf(aHeroWearing([BADGE, BADGE]))).toEqual([
        'Morale +2',
        'Luck 0'
      ])
    })

    // The second Badge finds both rings taken by the Still Eyes and goes to the backpack.
    test('given a morale artifact in the backpack when the hero screen opens then it adds nothing', async () => {
      expect(
        await readHeroScreenMoraleAndLuckOf(aHeroWearing([DRAGON_EYE, DRAGON_EYE, BADGE]))
      ).toEqual(['Morale +2', 'Luck +1'])
    })

    test('given the hero picks up a luck artifact then the info box shows the higher luck', async () => {
      await setupApp(anArtifactAtTheHero(CLOVER))

      await pickUpArtifactAt(1, 0)

      expect(readMoraleAndLuck(getHeroInfoBox())).toEqual(['Morale +1', 'Luck +1'])
    })
  })

  describe('in battle', () => {
    const FIRST_PIKEMEN_ROW = 3
    const SECOND_PIKEMEN = { stack: 'Pikemen 10', row: 9, column: 1 }

    test('given a hero with good morale wearing an artifact that cancels morale when their stack moves with the morale roll always succeeding then it never acts again', async () => {
      const { user } = await startBattle(
        aFight({ hero: aHeroWearing([SPIRIT], { army: [stack('PIKEMAN'), stack('PIKEMAN')] }) }),
        { appConfig: { moraleRandom: ALWAYS } }
      )

      await moveActiveStackTo(user, FIRST_PIKEMEN_ROW, 2)

      expect(readActiveStack()).toEqual(SECOND_PIKEMEN)
      expect(readCombatMessages()).toEqual([])
    })

    // The hero's Skeletons have no morale; the monster's Pikemen, all of one alignment, +1.
    test('given a hero wearing an artifact that cancels morale when the monster stack with good morale acts with the morale roll always succeeding then it never acts again', async () => {
      const { user } = await startBattle(
        aFight({
          hero: aHeroWearing([SPIRIT], { army: [stack('SKELETON')] }),
          monsterType: 'PIKEMAN',
          monsterCount: 10
        }),
        { appConfig: { moraleRandom: ALWAYS } }
      )

      await clickBattleButton(user, 'Defend')

      expect(readCombatMessages()).not.toContain(HIGH_MORALE('Pikemen'))
    })

    // Pikemen, Centaurs and Imps are of three towns: morale -1. The Centaurs act first and
    // freeze; the Imps' roll misses.
    test("given a hero with bad morale wearing an artifact that cancels morale when their stack's turn comes then it can still freeze", async () => {
      await startBattle(
        aFight({
          hero: aHeroWearing([SPIRIT], {
            army: [stack('PIKEMAN'), stack('CENTAUR'), stack('IMP')]
          })
        }),
        { appConfig: { moraleRandom: rollsInTurn(0, 0.99) } }
      )

      expect(readActiveStack().stack).toBe('Imps 10')
      expect(readCombatMessages()).toEqual([LOW_MORALE('Centaurs')])
    })

    // 50 damage, +140% for 32 Attack (30 and the Knight's 2) against 4 Defense: 120, with no
    // lucky bonus.
    test('given a hero with good luck wearing an artifact that cancels luck when their stack strikes with the luck roll always succeeding then the strike is never lucky', async () => {
      const { user } = await startBattle(
        aFight({
          hero: aHeroWearing([HOURGLASS], {
            army: [stack('ARCHANGEL', 1)],
            skills: [basic('LUCK')]
          })
        }),
        { appConfig: { luckRandom: ALWAYS } }
      )

      await attackBattleHexFrom(user, 6, 15, 'left')

      expect(readCombatMessages()[0]).toBe('The Archangel does 120 damage. 20 Skeletons perish.')
    })

    test('given a hero wearing an artifact that cancels morale when the hero screen opens then it still shows their good morale', async () => {
      expect(await readHeroScreenMoraleAndLuckOf(aHeroWearing([SPIRIT]))).toEqual([
        'Morale +1',
        'Luck 0'
      ])
    })
  })

  describe('movement', () => {
    test('given a scenario hero who starts wearing an artifact with +600 land movement when the game loads then they have 2100 movement points', async () => {
      await setupApp(aMapScenario({ hero: aHeroWearing([BOOTS]) }))

      expectMovementPoints(2100)
    })

    // 1500, less 100 for the step to the artifact.
    test("given the hero picks up an artifact with +600 land movement then their movement points don't change that day", async () => {
      await setupApp(anArtifactAtTheHero(BOOTS))

      await pickUpArtifactAt(1, 0)

      expectMovementPoints(1400)
    })

    test('given the hero picked up an artifact with +600 land movement when the next day starts then they have 2100 movement points', async () => {
      const { user } = await setupApp(anArtifactAtTheHero(BOOTS))
      await pickUpArtifactAt(1, 0)

      await endTurns(user, 1)

      expectMovementPoints(2100)
    })

    // The Boots find the feet taken by the Sandals and go to the backpack.
    test('given the movement artifact is in the backpack when the next day starts then it adds nothing', async () => {
      const { user } = await setupApp(aMapScenario({ hero: aHeroWearing([SANDALS, BOOTS]) }))

      await endTurns(user, 1)

      expectMovementPoints(1500)
    })

    test('given a hero wearing artifacts with +600 and +300 when the next day starts then they have 2400 movement points', async () => {
      const { user } = await setupApp(aMapScenario({ hero: aHeroWearing([BOOTS, GLOVES]) }))

      await endTurns(user, 1)

      expectMovementPoints(2400)
    })

    test('given a hero wearing two copies of a +300 ring when the next day starts then they have 1800 movement points', async () => {
      const { user } = await setupApp(aMapScenario({ hero: aHeroWearing([GLOVES, GLOVES]) }))

      await endTurns(user, 1)

      expectMovementPoints(1800)
    })
  })
})
