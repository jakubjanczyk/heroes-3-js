// @vitest-environment jsdom
import { screen } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, anArtifactDefinition, aScenario } from './builders.js'
import {
  clickHeroInHeroList,
  clickHeroScreenArtifactSlot,
  clickHeroScreenBackpackArrow,
  clickHeroScreenBackpackFrame,
  closeHeroScreen,
  holdRightButtonOnHeroScreenArtifactSlot,
  holdRightButtonOnHeroScreenBackpackFrame,
  hoverHeroScreenArtifactSlot,
  readHeroScreenArtifacts,
  readHeroScreenBackpack,
  readHeroScreenHeldArtifact,
  readHeroScreenHighlightedSlots,
  readHeroScreenPrimarySkills,
  readHeroScreenStatusBar
} from './hero-screen.utils.js'

const HERO = 'Hero'

const AXE = 'AXE'
const SWORD = 'SWORD'
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
  [SWORD]: weapon('Sword of Hellfire', 6),
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

// Artifacts are put on in order, as when picked up: the first weapon is worn, the rest of the
// weapons wait in the backpack.
const aHeroWearing = (artifacts) =>
  aScenario()
    .withSize(4)
    .withEntities(aHero().withArtifacts(artifacts).at(0, 0))
    .withDefinitions(gameDefinitions)

async function startOnHeroScreen(scenario, { eventLog } = {}) {
  const app = await setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    eventLog
  })
  await clickHeroInHeroList(app.user, HERO)
  return app
}

function readPopup() {
  const popup = screen.getByRole('tooltip')
  return {
    title: popup.querySelector('h2')?.textContent,
    lines: [...popup.querySelectorAll('p')].map((line) => line.textContent)
  }
}

describe('hero screen artifacts behavior', () => {
  describe('taking and putting', () => {
    test('given a worn artifact when the player clicks it then its slot is empty and it is held on the pointer', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([AXE]))

      await clickHeroScreenArtifactSlot(user, 'Weapon')

      expect(readHeroScreenArtifacts()).toEqual({})
      expect(readHeroScreenHeldArtifact()).toBe("Centaur's Axe")
    })

    test('given a held artifact when the player clicks an empty slot of its kind then it is worn there and nothing is held', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([AXE]))
      await clickHeroScreenArtifactSlot(user, 'Weapon')

      await clickHeroScreenArtifactSlot(user, 'Weapon')

      expect(readHeroScreenArtifacts()).toEqual({ Weapon: "Centaur's Axe" })
      expect(readHeroScreenHeldArtifact()).toBeNull()
    })

    test.each([
      { artifact: RING, name: 'Ring', from: 'Right ring', to: 'Left ring' },
      { artifact: CHARM, name: 'Charm', from: 'Misc 1', to: 'Misc 3' }
    ])('given a held artifact from the $from slot when the player clicks the $to slot then it is worn there', async ({
      artifact,
      name,
      from,
      to
    }) => {
      const { user } = await startOnHeroScreen(aHeroWearing([artifact]))
      await clickHeroScreenArtifactSlot(user, from)

      await clickHeroScreenArtifactSlot(user, to)

      expect(readHeroScreenArtifacts()).toEqual({ [to]: name })
    })

    test('given a held artifact when the player clicks a slot of another kind then nothing changes and it stays held', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([AXE]))
      await clickHeroScreenArtifactSlot(user, 'Weapon')

      await clickHeroScreenArtifactSlot(user, 'Helmet')

      expect(readHeroScreenArtifacts()).toEqual({})
      expect(readHeroScreenHeldArtifact()).toBe("Centaur's Axe")
    })

    test('given a held artifact when the player clicks a slot of its kind holding another artifact then the held one is worn there and the other is held', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([SWORD, AXE]))
      await clickHeroScreenBackpackFrame(user, 1)

      await clickHeroScreenArtifactSlot(user, 'Weapon')

      expect(readHeroScreenArtifacts()).toEqual({ Weapon: "Centaur's Axe" })
      expect(readHeroScreenHeldArtifact()).toBe('Sword of Hellfire')
    })
  })

  describe('highlighting where it can go', () => {
    test('given a held ring then the empty ring slots are highlighted and no other slot is', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([RING, AXE]))

      await clickHeroScreenArtifactSlot(user, 'Right ring')

      expect(readHeroScreenHighlightedSlots()).toEqual(['Right ring', 'Left ring'])
    })

    test('given a held artifact whose slot holds another artifact then that slot is not highlighted', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([SWORD, AXE]))

      await clickHeroScreenBackpackFrame(user, 1)

      expect(readHeroScreenHighlightedSlots()).toEqual([])
    })

    test('given the held artifact is put down then no slot is highlighted', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([RING]))
      await clickHeroScreenArtifactSlot(user, 'Right ring')

      await clickHeroScreenArtifactSlot(user, 'Left ring')

      expect(readHeroScreenHighlightedSlots()).toEqual([])
    })
  })

  describe('the backpack', () => {
    test('given a held artifact when the player clicks a backpack frame holding an artifact then it goes in there and the others move one place right', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([AXE, 'A', 'B']))
      await clickHeroScreenArtifactSlot(user, 'Weapon')

      await clickHeroScreenBackpackFrame(user, 2)

      expect(readHeroScreenBackpack()).toEqual(['A', "Centaur's Axe", 'B'])
      expect(readHeroScreenHeldArtifact()).toBeNull()
    })

    test('given a held artifact when the player clicks an empty backpack frame past the last artifact then it goes after the last one', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([AXE, 'A']))
      await clickHeroScreenArtifactSlot(user, 'Weapon')

      await clickHeroScreenBackpackFrame(user, 4)

      expect(readHeroScreenBackpack()).toEqual(['A', "Centaur's Axe"])
    })

    test('given an artifact in the backpack when the player clicks it then it leaves the backpack, the ones after it move left, and it is held', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([AXE, 'A', 'B', 'C']))

      await clickHeroScreenBackpackFrame(user, 2)

      expect(readHeroScreenBackpack()).toEqual(['A', 'C'])
      expect(readHeroScreenHeldArtifact()).toBe('B')
    })
  })

  describe('primary skills', () => {
    test('given the hero wears an artifact with +2 Attack when the player moves it to the backpack then the hero screen shows Attack without it', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([AXE]))
      await clickHeroScreenArtifactSlot(user, 'Weapon')

      await clickHeroScreenBackpackFrame(user, 1)

      expect(readHeroScreenPrimarySkills()).toEqual([
        'Attack 2',
        'Defense 2',
        'Power 1',
        'Knowledge 1'
      ])
    })

    test('given an artifact with +2 Attack in the backpack when the player puts it on then the hero screen shows Attack with it', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing(['A', AXE]))
      await clickHeroScreenBackpackFrame(user, 1)

      await clickHeroScreenArtifactSlot(user, 'Weapon')

      // A Knight's Attack 2, +2 for the axe.
      expect(readHeroScreenPrimarySkills()).toEqual([
        'Attack 4',
        'Defense 2',
        'Power 1',
        'Knowledge 1'
      ])
    })
  })

  describe('closing and reloading', () => {
    test('given a held artifact when the player closes the hero screen then it is worn in the first free slot of its kind', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([RING]))
      await clickHeroScreenArtifactSlot(user, 'Right ring')

      await closeHeroScreen(user)
      await clickHeroInHeroList(user, HERO)

      expect(readHeroScreenArtifacts()).toEqual({ 'Right ring': 'Ring' })
      expect(readHeroScreenHeldArtifact()).toBeNull()
    })

    test('given a held artifact whose slots are all taken when the player closes the hero screen then it goes to the end of the backpack', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([SWORD, AXE, 'A']))
      await clickHeroScreenBackpackFrame(user, 1)
      await clickHeroScreenArtifactSlot(user, 'Weapon')

      await closeHeroScreen(user)
      await clickHeroInHeroList(user, HERO)

      expect(readHeroScreenArtifacts()).toEqual({ Weapon: "Centaur's Axe" })
      expect(readHeroScreenBackpack()).toEqual(['A', 'Sword of Hellfire'])
    })

    test('given the player moved an artifact when the page reloads then it is where they put it', async () => {
      const eventLog = createMemoryEventLog()
      const first = await startOnHeroScreen(aHeroWearing([AXE, 'A']), { eventLog })
      await clickHeroScreenArtifactSlot(first.user, 'Weapon')
      await clickHeroScreenBackpackFrame(first.user, 2)

      await startOnHeroScreen(aHeroWearing([AXE, 'A']), { eventLog })

      expect(readHeroScreenArtifacts()).toEqual({})
      expect(readHeroScreenBackpack()).toEqual(['A', "Centaur's Axe"])
    })
  })

  describe('the backpack arrows', () => {
    const sixInTheBackpack = () => aHeroWearing([AXE, 'A', 'B', 'C', 'D', 'E', 'F'])

    test('given six artifacts in the backpack when the player clicks the right arrow then the frames show the second to the sixth', async () => {
      const { user } = await startOnHeroScreen(sixInTheBackpack())

      await clickHeroScreenBackpackArrow(user, 'right')

      expect(readHeroScreenBackpack()).toEqual(['B', 'C', 'D', 'E', 'F'])
    })

    test('given six artifacts in the backpack when the player clicks the left arrow then the frames show the sixth and then the first four', async () => {
      const { user } = await startOnHeroScreen(sixInTheBackpack())

      await clickHeroScreenBackpackArrow(user, 'left')

      expect(readHeroScreenBackpack()).toEqual(['F', 'A', 'B', 'C', 'D'])
    })

    test.each([
      'left',
      'right'
    ])('given five artifacts in the backpack when the player clicks the %s arrow then the frames show them as before', async (direction) => {
      const { user } = await startOnHeroScreen(aHeroWearing([AXE, 'A', 'B', 'C', 'D', 'E']))

      await clickHeroScreenBackpackArrow(user, direction)

      expect(readHeroScreenBackpack()).toEqual(['A', 'B', 'C', 'D', 'E'])
    })

    test('given the player scrolled the backpack when the page reloads then the frames show the order it was left in', async () => {
      const eventLog = createMemoryEventLog()
      const first = await startOnHeroScreen(sixInTheBackpack(), { eventLog })
      await clickHeroScreenBackpackArrow(first.user, 'right')

      await startOnHeroScreen(sixInTheBackpack(), { eventLog })

      expect(readHeroScreenBackpack()).toEqual(['B', 'C', 'D', 'E', 'F'])
    })
  })

  describe('descriptions and status bar', () => {
    const DESCRIPTION = {
      title: "Centaur's Axe",
      lines: ['This right handed weapon increases your Attack skill by +2.']
    }

    test('given a worn artifact when the player holds the right button on it then the popup shows its name and description', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([AXE]))

      await holdRightButtonOnHeroScreenArtifactSlot(user, 'Weapon')

      expect(readPopup()).toEqual(DESCRIPTION)
    })

    test('given an artifact in the backpack when the player holds the right button on it then the popup shows its name and description', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([SWORD, AXE]))

      await holdRightButtonOnHeroScreenBackpackFrame(user, 1)

      expect(readPopup()).toEqual(DESCRIPTION)
    })

    test('given a worn artifact when the mouse is over it then the status bar names it', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([AXE]))

      await hoverHeroScreenArtifactSlot(user, 'Weapon')

      expect(readHeroScreenStatusBar()).toBe("View Centaur's Axe Info")
    })

    test('given an empty artifact slot when the mouse is over it then the status bar says it is empty', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([]))

      await hoverHeroScreenArtifactSlot(user, 'Helmet')

      expect(readHeroScreenStatusBar()).toBe('Empty')
    })
  })
})
