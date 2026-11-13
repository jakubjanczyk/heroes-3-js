// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch } from './adventure-map.utils.js'
import { answerMessage } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, anArtifact, anArtifactDefinition, aScenario, aSpellDefinition } from './builders.js'
import {
  clickHeroInHeroList,
  clickHeroScreenArtifactSlot,
  clickHeroScreenBackpackFrame,
  closeHeroScreen,
  holdRightButtonOnHeroScreenArtifactSlot,
  readHeroScreenSpellBook
} from './hero-screen.utils.js'
import {
  clickSpellBookControl,
  getCastSpellButton,
  holdRightButtonOnSpell,
  openSpellBookFromMap,
  readSpellBookSpells,
  readSpellPopup
} from './spell-book.utils.js'

const HERO = 'Hero'

const HELM = 'HELM'
const GLADIUS = 'GLADIUS'
const THUNDER = 'THUNDER'
const SWORD = 'SWORD'

const artifactDefinitions = {
  [HELM]: anArtifactDefinition().withName('Thunder Helmet').withSlot('HELMET').build(),
  [GLADIUS]: anArtifactDefinition().withName("Titan's Gladius").withSlot('WEAPON').build(),
  [THUNDER]: anArtifactDefinition()
    .withName("Titan's Thunder")
    .withSlot('WEAPON')
    .withClass('RELIC')
    .withParts([HELM, GLADIUS])
    .withGrantsSpellBook(true)
    .withSpells(['TITAN_BOLT'])
    .build(),
  [SWORD]: anArtifactDefinition().withName('Centaur Axe').withSlot('WEAPON').build()
}

const spellDefinitions = {
  TITAN_BOLT: aSpellDefinition()
    .withName('Titan Bolt')
    .withLevel(5)
    .withCosts([0, 0, 0, 0])
    .withDamage({ base: [600, 600, 600, 600], perPower: 0 })
    .withDamageInDescription(true)
    .withSpecial(true)
    .describedAs('Does 600 points of damage at no spell cost to the spellcaster.')
    .build()
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  artifacts: artifactDefinitions,
  spells: spellDefinitions
}

const aHeroWithoutSpellBook = () => aHero().withSpellBook(false)

const aScenarioWith = ({ hero = aHeroWithoutSpellBook(), others = [] } = {}) =>
  aScenario()
    .withSize(4)
    .withEntities(hero.at(0, 0), ...others)
    .withDefinitions(gameDefinitions)

const thunderOnTheMap = () => anArtifact().withType(THUNDER).at(1, 0)

async function setupApp(scenario, { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    eventLog
  })
}

async function startOnHeroScreen(scenario) {
  const app = await setupApp(scenario)
  await clickHeroInHeroList(app.user, HERO)
  return app
}

async function pickUpArtifactAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

async function takeOffWeapon(user) {
  await clickHeroScreenArtifactSlot(user, 'Weapon')
  await clickHeroScreenBackpackFrame(user, 1)
}

async function readCombatSpellsInBook(user) {
  await openSpellBookFromMap(user)
  await clickSpellBookControl(user, 'Combat spells')
  return readSpellBookSpells()
}

describe('artifacts giving spells behavior', () => {
  describe('spell book', () => {
    test('given a hero without a spell book when they assemble a combination that gives one then the hero screen shows the spell book', async () => {
      const { user } = await startOnHeroScreen(
        aScenarioWith({ hero: aHeroWithoutSpellBook().withArtifacts([HELM, GLADIUS]) })
      )

      await holdRightButtonOnHeroScreenArtifactSlot(user, 'Helmet')
      await answerMessage(user, 'Yes')

      expect(readHeroScreenSpellBook()).toBe('Spell Book')
    })

    test('given a hero without a spell book when they pick up an artifact that gives one and it is worn then Cast spell is enabled', async () => {
      await setupApp(aScenarioWith({ others: [thunderOnTheMap()] }))

      await pickUpArtifactAt(1, 0)

      expect(getCastSpellButton().disabled).toBe(false)
    })

    test('given an artifact that gives a spell book when it goes to the backpack then the hero gets no spell book', async () => {
      const { user } = await setupApp(
        aScenarioWith({
          hero: aHeroWithoutSpellBook().withArtifacts([SWORD]),
          others: [thunderOnTheMap()]
        })
      )

      await pickUpArtifactAt(1, 0)
      await clickHeroInHeroList(user, HERO)

      expect(readHeroScreenSpellBook()).toBeNull()
    })

    test('given a hero who got a spell book from an artifact when they take the artifact off then they keep the spell book', async () => {
      const { user } = await startOnHeroScreen(
        aScenarioWith({ hero: aHeroWithoutSpellBook().withArtifacts([THUNDER]) })
      )

      await takeOffWeapon(user)

      expect(readHeroScreenSpellBook()).toBe('Spell Book')
    })

    test('given a hero who got a spell book from an artifact when the page reloads then they still have it', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = aScenarioWith({ others: [thunderOnTheMap()] })
      const { user } = await setupApp(scenario, { eventLog })
      await pickUpArtifactAt(1, 0)
      await clickHeroInHeroList(user, HERO)
      await takeOffWeapon(user)
      await closeHeroScreen(user)

      const reloaded = await setupApp(scenario, { eventLog })
      await clickHeroInHeroList(reloaded.user, HERO)

      expect(readHeroScreenSpellBook()).toBe('Spell Book')
    })
  })

  describe('spells', () => {
    const aHeroWithBookWearing = (artifacts) =>
      aHero().withSpellBook(true).withSpells([]).withArtifacts(artifacts)

    test('given a hero wearing an artifact that gives a special spell when the spell book shows combat spells then the spell is there with its cost of 0', async () => {
      const { user } = await setupApp(aScenarioWith({ hero: aHeroWithBookWearing([THUNDER]) }))

      expect(await readCombatSpellsInBook(user)).toEqual(['Titan Bolt 5th lev Spell Points: 0'])
    })

    test('given a damage spell whose description gives its damage when the player right-clicks it then the popup shows only the description', async () => {
      const { user } = await setupApp(aScenarioWith({ hero: aHeroWithBookWearing([THUNDER]) }))
      await readCombatSpellsInBook(user)

      await holdRightButtonOnSpell(user, 'Titan Bolt')

      expect(readSpellPopup()[1]).toBe(
        'Does 600 points of damage at no spell cost to the spellcaster.'
      )
    })

    test('given a hero wearing that artifact when they take it off then the spell is no longer in the book', async () => {
      const { user } = await startOnHeroScreen(
        aScenarioWith({ hero: aHeroWithBookWearing([THUNDER]) })
      )
      await takeOffWeapon(user)
      await closeHeroScreen(user)

      expect(await readCombatSpellsInBook(user)).toEqual([])
    })
  })
})
