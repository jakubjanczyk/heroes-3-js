// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'
import { readSelectedHeroInHeroList } from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, anArtifactDefinition, aScenario } from './builders.js'
import {
  clickHeroExchangeArtifactSlot,
  clickHeroExchangeBackpackArrow,
  clickHeroExchangeBackpackFrame,
  clickHeroExchangeButton,
  closeHeroExchange,
  getHeroExchange,
  holdRightButtonOnHeroExchangeArtifactSlot,
  holdRightButtonOnHeroExchangeBackpackFrame,
  hoverHeroExchangeArtifactSlot,
  hoverHeroExchangeButton,
  meetHeroAt,
  readHeroExchangeArtifacts,
  readHeroExchangeBackpack,
  readHeroExchangeHeldArtifact,
  readHeroExchangeHighlightedSlots,
  readHeroExchangePrimarySkills,
  readHeroExchangeStatusBar
} from './hero-exchange.utils.js'
import {
  clickHeroInHeroList,
  closeHeroScreen,
  readHeroScreenArtifacts,
  readHeroScreenBackpack
} from './hero-screen.utils.js'

const LEFT_HERO = 'Sir Christian'
const RIGHT_HERO = 'Valeska'

const AXE = 'AXE'
const SWORD = 'SWORD'
const SHIELD = 'SHIELD'
const RING = 'RING'
const CHARM = 'CHARM'

const weapon = (name, attack = 0) =>
  anArtifactDefinition().withName(name).withSlot('WEAPON').withPrimarySkills({ attack }).build()

const artifactDefinitions = {
  [AXE]: anArtifactDefinition()
    .withName("Centaur's Axe")
    .withSlot('WEAPON')
    .withPrimarySkills({ attack: 2 })
    .withDescription('This right handed weapon increases your Attack skill by +2.')
    .build(),
  [SWORD]: weapon('Sword of Hellfire'),
  [SHIELD]: anArtifactDefinition().withName('Shield').withSlot('SHIELD').build(),
  [RING]: anArtifactDefinition().withName('Ring').withSlot('RING').build(),
  [CHARM]: anArtifactDefinition().withName('Charm').withSlot('MISC').build(),
  A: weapon('A'),
  B: weapon('B'),
  C: weapon('C'),
  D: weapon('D'),
  E: weapon('E'),
  F: weapon('F')
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  artifacts: artifactDefinitions
}

// A worn weapon and 64 more in the backpack, which fills it.
const FULL_BACKPACK = ['A', ...Array.from({ length: 64 }, () => 'B')]

// Artifacts are put on in order, as when picked up: the first of a kind is worn, the rest wait in
// the backpack. The left hero walks to the right one, five tiles away.
const aMeetingScenario = ({ left = [], right = [] } = {}) =>
  aScenario()
    .withSize(10, 3)
    .withEntities(
      aHero().withName(LEFT_HERO).withArtifacts(left).at(0, 0),
      aHero().withId('hero-2').withName(RIGHT_HERO).withArtifacts(right).at(5, 0)
    )
    .withDefinitions(gameDefinitions)

async function setupApp(scenario, options = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    ...options
  })
}

async function startOnHeroExchange(scenario, options = {}) {
  const app = await setupApp(scenario, options)
  await meetHeroAt(app.user, 5, 0)
  getHeroExchange()
  return app
}

const readBothHeroes = () => [
  { worn: readHeroExchangeArtifacts(LEFT_HERO), backpack: readHeroExchangeBackpack(LEFT_HERO) },
  { worn: readHeroExchangeArtifacts(RIGHT_HERO), backpack: readHeroExchangeBackpack(RIGHT_HERO) }
]

// A click on a hero in the hero list selects them, and a click on the selected hero opens
// their hero screen.
async function readArtifactsOnHeroScreen(user, heroName) {
  if (!readSelectedHeroInHeroList().includes(heroName)) {
    await clickHeroInHeroList(user, heroName)
  }
  await clickHeroInHeroList(user, heroName)
  const artifacts = { worn: readHeroScreenArtifacts(), backpack: readHeroScreenBackpack() }
  await closeHeroScreen(user)
  return artifacts
}

function readPopup() {
  const popup = screen.getByRole('tooltip')
  return {
    title: popup.querySelector('h2')?.textContent,
    lines: [...popup.querySelectorAll('p')].map((line) => line.textContent)
  }
}

describe('hero exchange artifacts behavior', () => {
  describe('what it shows', () => {
    test('given each hero wears an artifact and has one in the backpack when they meet then each paper doll and backpack shows that hero’s artifacts', async () => {
      await startOnHeroExchange(aMeetingScenario({ left: [AXE, SWORD], right: [RING, 'A', 'B'] }))

      expect(readBothHeroes()).toEqual([
        { worn: { Weapon: "Centaur's Axe" }, backpack: ['Sword of Hellfire'] },
        { worn: { 'Right ring': 'Ring', Weapon: 'A' }, backpack: ['B'] }
      ])
    })
  })

  describe('moving one artifact between heroes', () => {
    test('given the left hero wears an artifact when the player clicks it and then the right hero’s empty slot of its kind then the right hero wears it and the left slot is empty', async () => {
      const { user } = await startOnHeroExchange(aMeetingScenario({ left: [AXE] }))

      await clickHeroExchangeArtifactSlot(user, LEFT_HERO, 'Weapon')
      await clickHeroExchangeArtifactSlot(user, RIGHT_HERO, 'Weapon')

      expect(readBothHeroes()).toEqual([
        { worn: {}, backpack: [] },
        { worn: { Weapon: "Centaur's Axe" }, backpack: [] }
      ])
      expect(readHeroExchangeHeldArtifact()).toBeNull()
    })

    test('given a held artifact when the player clicks the other hero’s slot of its kind holding another artifact then the held one is worn there and the other is held', async () => {
      const { user } = await startOnHeroExchange(aMeetingScenario({ left: [AXE], right: [SWORD] }))
      await clickHeroExchangeArtifactSlot(user, LEFT_HERO, 'Weapon')

      await clickHeroExchangeArtifactSlot(user, RIGHT_HERO, 'Weapon')

      expect(readHeroExchangeArtifacts(RIGHT_HERO)).toEqual({ Weapon: "Centaur's Axe" })
      expect(readHeroExchangeHeldArtifact()).toBe('Sword of Hellfire')
    })

    test('given a held artifact when the player clicks a slot of another kind on the other hero then nothing changes and it stays held', async () => {
      const { user } = await startOnHeroExchange(aMeetingScenario({ left: [AXE] }))
      await clickHeroExchangeArtifactSlot(user, LEFT_HERO, 'Weapon')

      await clickHeroExchangeArtifactSlot(user, RIGHT_HERO, 'Helmet')

      expect(readHeroExchangeArtifacts(RIGHT_HERO)).toEqual({})
      expect(readHeroExchangeHeldArtifact()).toBe("Centaur's Axe")
    })

    test('given a held artifact when the player clicks a backpack frame of the other hero then it goes in there and the others move one place right', async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({ left: [AXE], right: ['A', 'B', 'C'] })
      )
      await clickHeroExchangeArtifactSlot(user, LEFT_HERO, 'Weapon')

      await clickHeroExchangeBackpackFrame(user, RIGHT_HERO, 1)

      expect(readHeroExchangeBackpack(RIGHT_HERO)).toEqual(["Centaur's Axe", 'B', 'C'])
      expect(readHeroExchangeHeldArtifact()).toBeNull()
    })

    test('given the other hero’s backpack is full when the player clicks one of its frames with an artifact held then it stays held', async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({ left: [AXE], right: FULL_BACKPACK })
      )
      await clickHeroExchangeArtifactSlot(user, LEFT_HERO, 'Weapon')

      await clickHeroExchangeBackpackFrame(user, RIGHT_HERO, 1)

      expect(readHeroExchangeHeldArtifact()).toBe("Centaur's Axe")
      expect(readHeroExchangeBackpack(RIGHT_HERO)).toEqual(['B', 'B', 'B', 'B', 'B'])
    })

    test('given a held ring then only the empty ring slots of both heroes are highlighted', async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({ left: [RING, RING], right: [RING] })
      )

      await clickHeroExchangeArtifactSlot(user, LEFT_HERO, 'Left ring')

      expect([
        readHeroExchangeHighlightedSlots(LEFT_HERO),
        readHeroExchangeHighlightedSlots(RIGHT_HERO)
      ]).toEqual([['Left ring'], ['Left ring']])
    })

    // Both Knights start with Attack 2; the axe gives +2.
    test('given the left hero wears an artifact with +2 Attack when the player moves it to the right hero then the primary skills show it on the right hero’s side', async () => {
      const { user } = await startOnHeroExchange(aMeetingScenario({ left: [AXE] }))

      await clickHeroExchangeArtifactSlot(user, LEFT_HERO, 'Weapon')
      await clickHeroExchangeArtifactSlot(user, RIGHT_HERO, 'Weapon')

      expect(readHeroExchangePrimarySkills()[0]).toBe('2 Attack 4')
    })
  })

  describe('move all and swap', () => {
    test('given the left hero wears artifacts and has some in the backpack when the player moves all artifacts right then the right hero wears them in free slots of their kind and the left hero has none', async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({ left: [AXE, RING, SWORD], right: [SHIELD] })
      )

      await clickHeroExchangeButton(user, `Move all artifacts to ${RIGHT_HERO}`)

      expect(readBothHeroes()).toEqual([
        { worn: {}, backpack: [] },
        {
          worn: { Weapon: "Centaur's Axe", Shield: 'Shield', 'Right ring': 'Ring' },
          backpack: ['Sword of Hellfire']
        }
      ])
    })

    test('given the right hero already wears an artifact in that slot when the player moves all artifacts right then the moved one goes to the end of the right hero’s backpack', async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({ left: [AXE], right: [SWORD, 'A'] })
      )

      await clickHeroExchangeButton(user, `Move all artifacts to ${RIGHT_HERO}`)

      expect(readBothHeroes()).toEqual([
        { worn: {}, backpack: [] },
        { worn: { Weapon: 'Sword of Hellfire' }, backpack: ['A', "Centaur's Axe"] }
      ])
    })

    test('given the right hero’s backpack is full when the player moves all artifacts right then the ones that don’t fit stay with the left hero', async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({ left: [AXE, RING, SWORD], right: FULL_BACKPACK })
      )

      await clickHeroExchangeButton(user, `Move all artifacts to ${RIGHT_HERO}`)

      expect(readHeroExchangeArtifacts(RIGHT_HERO)).toEqual({ Weapon: 'A', 'Right ring': 'Ring' })
      expect(readBothHeroes()[0]).toEqual({
        worn: { Weapon: "Centaur's Axe" },
        backpack: ['Sword of Hellfire']
      })
    })

    test('given both heroes have artifacts when the player swaps artifacts then each hero has the other’s worn artifacts in the same slots and the other’s backpack', async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({ left: [RING, RING, AXE, SWORD], right: [SHIELD, 'A', 'B'] })
      )

      await clickHeroExchangeButton(user, 'Swap artifacts')

      expect(readBothHeroes()).toEqual([
        { worn: { Shield: 'Shield', Weapon: 'A' }, backpack: ['B'] },
        {
          worn: { 'Right ring': 'Ring', 'Left ring': 'Ring', Weapon: "Centaur's Axe" },
          backpack: ['Sword of Hellfire']
        }
      ])
    })
  })

  describe('backpack, popups and status bar', () => {
    test('given six artifacts in a hero’s backpack when the player clicks that hero’s right arrow then its frames show the second to the sixth', async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({ right: [AXE, 'A', 'B', 'C', 'D', 'E', 'F'] })
      )

      await clickHeroExchangeBackpackArrow(user, RIGHT_HERO, 'right')

      expect(readHeroExchangeBackpack(RIGHT_HERO)).toEqual(['B', 'C', 'D', 'E', 'F'])
    })

    const DESCRIPTION = {
      title: "Centaur's Axe",
      lines: ['This right handed weapon increases your Attack skill by +2.']
    }

    test('given a worn artifact on the right hero when the player holds the right button on it then the popup shows its name and description', async () => {
      const { user } = await startOnHeroExchange(aMeetingScenario({ right: [AXE] }))

      await holdRightButtonOnHeroExchangeArtifactSlot(user, RIGHT_HERO, 'Weapon')

      expect(readPopup()).toEqual(DESCRIPTION)
    })

    test('given an artifact in the left hero’s backpack when the player holds the right button on it then the popup shows its name and description', async () => {
      const { user } = await startOnHeroExchange(aMeetingScenario({ left: [SWORD, AXE] }))

      await holdRightButtonOnHeroExchangeBackpackFrame(user, LEFT_HERO, 1)

      expect(readPopup()).toEqual(DESCRIPTION)
    })

    test.each([
      { slot: 'Weapon', text: "View Centaur's Axe Info" },
      { slot: 'Helmet', text: 'Empty' }
    ])('given the mouse is over the $slot slot then the status bar says "$text"', async ({
      slot,
      text
    }) => {
      const { user } = await startOnHeroExchange(aMeetingScenario({ left: [AXE] }))

      await hoverHeroExchangeArtifactSlot(user, LEFT_HERO, slot)

      expect(readHeroExchangeStatusBar()).toBe(text)
    })

    test.each([
      `Move all artifacts to ${RIGHT_HERO}`,
      `Move all artifacts to ${LEFT_HERO}`,
      'Swap artifacts'
    ])('given the mouse is over the "%s" button then the status bar says what it does', async (button) => {
      const { user } = await startOnHeroExchange(aMeetingScenario())

      await hoverHeroExchangeButton(user, button)

      expect(readHeroExchangeStatusBar()).toBe(button)
    })
  })

  describe('closing and reloading', () => {
    test('given a held artifact when the player closes the exchange screen then it goes to the first free slot of its kind on the hero who picked it up', async () => {
      const { user } = await startOnHeroExchange(aMeetingScenario({ left: [AXE], right: [SWORD] }))
      await clickHeroExchangeArtifactSlot(user, LEFT_HERO, 'Weapon')
      await clickHeroExchangeArtifactSlot(user, RIGHT_HERO, 'Weapon')

      await closeHeroExchange(user)

      expect([
        await readArtifactsOnHeroScreen(user, LEFT_HERO),
        await readArtifactsOnHeroScreen(user, RIGHT_HERO)
      ]).toEqual([
        { worn: { Weapon: 'Sword of Hellfire' }, backpack: [] },
        { worn: { Weapon: "Centaur's Axe" }, backpack: [] }
      ])
    })

    test('given the player moved artifacts between heroes when the page reloads then both heroes have them where they were left', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const scenario = aMeetingScenario({ left: [AXE, SWORD] })
      const { user } = await startOnHeroExchange(scenario, session)
      await clickHeroExchangeButton(user, `Move all artifacts to ${RIGHT_HERO}`)

      const { user: userAfterReload } = await setupApp(scenario, session)

      expect([
        await readArtifactsOnHeroScreen(userAfterReload, LEFT_HERO),
        await readArtifactsOnHeroScreen(userAfterReload, RIGHT_HERO)
      ]).toEqual([
        { worn: {}, backpack: [] },
        { worn: { Weapon: "Centaur's Axe" }, backpack: ['Sword of Hellfire'] }
      ])
    })
  })
})
