// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmTileClickByDispatch,
  expectHeroAt,
  getArtifactEntity,
  getMapCursor,
  holdRightButtonOn,
  hoverTile,
  readArtifactName,
  readInfoPopupLines
} from './adventure-map.utils.js'
import {
  expectInteractionModalClosed,
  expectStatusBarText,
  getHeroInfoBox,
  readPrimarySkills,
  readSelectedHeroInHeroList
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { loadAppStyles } from './app-styles.js'
import {
  getBattleStatusBarText,
  moveActiveStackTo,
  pointAtBattleHexSide,
  startBattle
} from './battle.utils.js'
import { aHero, aMonster, anArtifact, anArtifactDefinition, aScenario } from './builders.js'
import {
  getHeroExchange,
  meetHeroAt,
  readHeroExchangePrimarySkills
} from './hero-exchange.utils.js'
import {
  clickHeroInHeroList,
  closeHeroScreen,
  readHeroScreenArtifacts,
  readHeroScreenBackpack,
  readHeroScreenPrimarySkills
} from './hero-screen.utils.js'

const AXE = 'AXE'
const SWORD = 'SWORD'
const RING = 'RING'

const artifactDefinitions = {
  [AXE]: anArtifactDefinition()
    .withName("Centaur's Axe")
    .withSlot('WEAPON')
    .withPrimarySkills({ attack: 2 })
    .build(),
  [SWORD]: anArtifactDefinition()
    .withName('Sword of Hellfire')
    .withSlot('WEAPON')
    .withPrimarySkills({ attack: 6 })
    .build(),
  [RING]: anArtifactDefinition()
    .withName('Ring')
    .withSlot('RING')
    .withPrimarySkills({ attack: 1, defense: 1 })
    .build()
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  artifacts: artifactDefinitions
}

const HERO = 'Hero'

function withArtifacts(scenario, artifacts) {
  return scenario.withDefinitions({ ...gameDefinitions, artifacts })
}

async function setupApp(scenario, { eventLog, styles = false } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    eventLog
  })
  if (styles) {
    await loadAppStyles()
  }
  return app
}

// The hero, a Knight, stands at (0, 0) with the artifact on the next tile.
const anArtifactScenario = ({ hero = aHero(), artifact = anArtifact().withType(AXE) } = {}) =>
  aScenario()
    .withSize(4)
    .withEntities(hero.at(0, 0), artifact.at(1, 0))
    .withDefinitions(gameDefinitions)

const aHeroWearing = (artifacts, hero = aHero()) =>
  aScenario()
    .withSize(4)
    .withEntities(hero.withArtifacts(artifacts).at(0, 0))
    .withDefinitions(gameDefinitions)

async function pickUpArtifactAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

async function readArtifactsOnHeroScreen(user, heroName = HERO) {
  if (!readSelectedHeroInHeroList().includes(heroName)) {
    await clickHeroInHeroList(user, heroName)
  }
  await clickHeroInHeroList(user, heroName)
  const seen = { worn: readHeroScreenArtifacts(), backpack: readHeroScreenBackpack() }
  await closeHeroScreen(user)
  return seen
}

describe('artifacts behavior', () => {
  describe('on the map', () => {
    test('given an artifact in the scenario when the game loads then it is shown on its tile with its name', async () => {
      await setupApp(anArtifactScenario())

      const artifact = getArtifactEntity()
      expect({ x: artifact?.dataset.tileX, y: artifact?.dataset.tileY }).toEqual({ x: '1', y: '0' })
      expect(readArtifactName()).toBe("Centaur's Axe")
    })

    test('given an artifact when the mouse is over it then the cursor is the visit cursor', async () => {
      const { user } = await setupApp(anArtifactScenario(), { styles: true })

      await hoverTile(user, 1, 0)

      expect(getMapCursor()).toBe('visit')
    })

    test('given an artifact when the mouse is over it then the status bar shows its name', async () => {
      const { user } = await setupApp(anArtifactScenario())

      await hoverTile(user, 1, 0)

      expectStatusBarText("Centaur's Axe")
    })

    test('given an artifact when the player holds the right button on it then the popup shows its name', async () => {
      const { user } = await setupApp(anArtifactScenario())

      await holdRightButtonOn(user, 1, 0)

      expect(readInfoPopupLines()).toEqual(["Centaur's Axe"])
    })
  })

  describe('picking up', () => {
    test('given the hero walks to an artifact when they get there then they stop next to it, no dialog opens and the artifact is gone from the map', async () => {
      await setupApp(
        aScenario()
          .withSize(4)
          .withEntities(aHero().at(0, 0), anArtifact().withType(AXE).at(2, 0))
          .withDefinitions(gameDefinitions)
      )

      await pickUpArtifactAt(2, 0)

      expectHeroAt(1, 0)
      expectInteractionModalClosed()
      expect(getArtifactEntity()).toBeNull()
    })

    test.each([
      { slot: 'HELMET', frame: 'Helmet' },
      { slot: 'CAPE', frame: 'Cape' },
      { slot: 'NECKLACE', frame: 'Necklace' },
      { slot: 'WEAPON', frame: 'Weapon' },
      { slot: 'SHIELD', frame: 'Shield' },
      { slot: 'TORSO', frame: 'Torso' },
      { slot: 'RING', frame: 'Right ring' },
      { slot: 'FEET', frame: 'Feet' }
    ])('given a hero with nothing worn when they pick up a $slot artifact then the hero screen shows it in the $frame frame', async ({
      slot,
      frame
    }) => {
      const scenario = withArtifacts(
        anArtifactScenario({ artifact: anArtifact().withType('FOUND') }),
        {
          FOUND: anArtifactDefinition().withName('Found').withSlot(slot).build()
        }
      )
      const { user } = await setupApp(scenario)

      await pickUpArtifactAt(1, 0)

      expect(await readArtifactsOnHeroScreen(user)).toEqual({
        worn: { [frame]: 'Found' },
        backpack: []
      })
    })

    test("given a hero whose slot for an artifact's kind is taken when they pick it up then it goes to the backpack and the worn one stays", async () => {
      const { user } = await setupApp(
        anArtifactScenario({
          hero: aHero().withArtifacts([SWORD]),
          artifact: anArtifact().withType(AXE)
        })
      )

      await pickUpArtifactAt(1, 0)

      expect(await readArtifactsOnHeroScreen(user)).toEqual({
        worn: { Weapon: 'Sword of Hellfire' },
        backpack: ["Centaur's Axe"]
      })
    })

    test('given a hero wearing a ring when they pick up another ring then it goes on the left ring', async () => {
      const { user } = await setupApp(
        anArtifactScenario({
          hero: aHero().withArtifacts([RING]),
          artifact: anArtifact().withType(RING)
        })
      )

      await pickUpArtifactAt(1, 0)

      expect((await readArtifactsOnHeroScreen(user)).worn).toEqual({
        'Right ring': 'Ring',
        'Left ring': 'Ring'
      })
    })

    test("given two heroes when one picks up an artifact then the other's hero screen shows nothing worn", async () => {
      const { user } = await setupApp(
        aScenario()
          .withSize(4, 3)
          .withEntities(
            aHero().at(0, 0),
            aHero().withId('hero-2').withName('Valeska').at(0, 2),
            anArtifact().withType(AXE).at(1, 0)
          )
          .withDefinitions(gameDefinitions)
      )

      await pickUpArtifactAt(1, 0)

      expect(await readArtifactsOnHeroScreen(user, 'Valeska')).toEqual({ worn: {}, backpack: [] })
    })
  })

  describe('primary skills', () => {
    test('given a Knight picks up an artifact with +2 Attack then the info box shows Attack 4', async () => {
      await setupApp(anArtifactScenario())

      await pickUpArtifactAt(1, 0)

      expect(readPrimarySkills(getHeroInfoBox())).toEqual([
        'Attack 4',
        'Defense 2',
        'Power 1',
        'Knowledge 1'
      ])
    })

    const ALL_SKILLS = 'ALL_SKILLS'
    const allSkillsArtifact = {
      [ALL_SKILLS]: anArtifactDefinition()
        .withName('Armor of Wonder')
        .withSlot('TORSO')
        .withPrimarySkills({ attack: 1, defense: 2, power: 3, knowledge: 4 })
        .build()
    }
    const KNIGHT_WITH_ALL_SKILLS_ARTIFACT = ['Attack 3', 'Defense 4', 'Power 4', 'Knowledge 5']

    test('given a Knight wearing an artifact with a bonus to each primary skill then the right-click popup shows the skills with it added', async () => {
      const { user } = await setupApp(withArtifacts(aHeroWearing([ALL_SKILLS]), allSkillsArtifact))

      await holdRightButtonOn(user, 0, 0)

      expect(readPrimarySkills(screen.getByRole('tooltip'))).toEqual(
        KNIGHT_WITH_ALL_SKILLS_ARTIFACT
      )
    })

    test('given a Knight wearing an artifact with a bonus to each primary skill then the hero screen shows the skills with it added', async () => {
      const { user } = await setupApp(withArtifacts(aHeroWearing([ALL_SKILLS]), allSkillsArtifact))

      await clickHeroInHeroList(user, HERO)

      expect(readHeroScreenPrimarySkills()).toEqual(KNIGHT_WITH_ALL_SKILLS_ARTIFACT)
    })

    test('given a Knight wearing an artifact with a bonus to each primary skill then the exchange screen shows the skills with it added', async () => {
      const scenario = withArtifacts(
        aScenario()
          .withSize(4)
          .withEntities(
            aHero().withArtifacts([ALL_SKILLS]).at(0, 0),
            aHero().withId('hero-2').withName('Valeska').at(2, 0)
          ),
        allSkillsArtifact
      )
      const { user } = await setupApp(scenario)

      await meetHeroAt(user, 2, 0)

      getHeroExchange()
      expect(readHeroExchangePrimarySkills()).toEqual([
        '3 Attack 2',
        '4 Defense 2',
        '4 Power 1',
        '5 Knowledge 1'
      ])
    })

    test('given an artifact in the backpack then it adds nothing to the primary skills', async () => {
      await setupApp(aHeroWearing([AXE, SWORD]))

      // Attack 2, +2 for the worn axe; the sword waits in the backpack.
      expect(readPrimarySkills(getHeroInfoBox())).toEqual([
        'Attack 4',
        'Defense 2',
        'Power 1',
        'Knowledge 1'
      ])
    })

    test('given a Knight wearing two copies of an artifact that adds up then both copies count', async () => {
      const scenario = withArtifacts(aHeroWearing([RING, RING]), {
        [RING]: anArtifactDefinition()
          .withName('Quiet Eye of the Dragon')
          .withSlot('RING')
          .withPrimarySkills({ attack: 1, defense: 1 })
          .stacking()
          .build()
      })
      await setupApp(scenario)

      expect(readPrimarySkills(getHeroInfoBox())).toEqual([
        'Attack 4',
        'Defense 4',
        'Power 1',
        'Knowledge 1'
      ])
    })

    test('given a Knight wearing two copies of an artifact that does not add up then only one counts', async () => {
      await setupApp(aHeroWearing([RING, RING]))

      expect(readPrimarySkills(getHeroInfoBox())).toEqual([
        'Attack 3',
        'Defense 3',
        'Power 1',
        'Knowledge 1'
      ])
    })

    test.each([
      { skill: 'attack', expected: ['Attack 0', 'Defense 2', 'Power 1', 'Knowledge 1'] },
      { skill: 'defense', expected: ['Attack 2', 'Defense 0', 'Power 1', 'Knowledge 1'] }
    ])('given a Knight wearing an artifact whose negative $skill bonus is bigger than the skill then it shows 0', async ({
      skill,
      expected
    }) => {
      const scenario = withArtifacts(aHeroWearing(['CURSED']), {
        CURSED: anArtifactDefinition()
          .withPrimarySkills({ [skill]: -3 })
          .build()
      })
      await setupApp(scenario)

      expect(readPrimarySkills(getHeroInfoBox())).toEqual(expected)
    })

    test.each([
      { skill: 'power', expected: ['Attack 2', 'Defense 2', 'Power 1', 'Knowledge 1'] },
      { skill: 'knowledge', expected: ['Attack 2', 'Defense 2', 'Power 1', 'Knowledge 1'] }
    ])('given a Knight wearing an artifact whose negative $skill bonus would take it below 1 then it shows 1', async ({
      skill,
      expected
    }) => {
      const scenario = withArtifacts(aHeroWearing(['CURSED']), {
        CURSED: anArtifactDefinition()
          .withPrimarySkills({ [skill]: -2 })
          .build()
      })
      await setupApp(scenario)

      expect(readPrimarySkills(getHeroInfoBox())).toEqual(expected)
    })

    test('given a Knight wearing an artifact with +6 Attack when the player hovers an enemy stack in battle then the damage range counts the extra Attack', async () => {
      // 5 Royal Griffins deal 3-6 each; 9 Attack, +2 for the Knight and +6 for the sword, is 17
      // against the Pikemen's 5 Defense: +60%, so 15-30 becomes 24-48.
      const { user } = await startBattle(
        aScenario()
          .withSize(3)
          .withEntities(
            aHero()
              .withArtifacts([SWORD])
              .withArmy([{ creature: 'ROYAL_GRIFFIN', count: 5 }]),
            aMonster().withType('PIKEMAN').withCount(50).withStacks(1).at(1, 0)
          )
          .withDefinitions(gameDefinitions)
      )
      await moveActiveStackTo(user, 6, 6)

      await pointAtBattleHexSide(user, 6, 11, 'left')

      expect(getBattleStatusBarText()).toBe('Attack Pikemen (damage 24-48)')
    })
  })

  describe('scenario and reload', () => {
    test('given a scenario that gives the hero artifacts when the game loads then the hero screen shows them in their slots', async () => {
      const { user } = await setupApp(aHeroWearing([AXE, RING]))

      expect(await readArtifactsOnHeroScreen(user)).toEqual({
        worn: { Weapon: "Centaur's Axe", 'Right ring': 'Ring' },
        backpack: []
      })
    })

    test('given the hero picked up an artifact when the page reloads then it is still worn and gone from the map', async () => {
      const eventLog = createMemoryEventLog()
      await setupApp(anArtifactScenario(), { eventLog })
      await pickUpArtifactAt(1, 0)

      const { user } = await setupApp(anArtifactScenario(), { eventLog })

      expect(getArtifactEntity()).toBeNull()
      expect((await readArtifactsOnHeroScreen(user)).worn).toEqual({ Weapon: "Centaur's Axe" })
    })

    test('given an artifact went to the backpack when the page reloads then it is still in the backpack', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () =>
        anArtifactScenario({
          hero: aHero().withArtifacts([SWORD]),
          artifact: anArtifact().withType(AXE)
        })
      await setupApp(scenario(), { eventLog })
      await pickUpArtifactAt(1, 0)

      const { user } = await setupApp(scenario(), { eventLog })

      expect((await readArtifactsOnHeroScreen(user)).backpack).toEqual(["Centaur's Axe"])
    })
  })
})
