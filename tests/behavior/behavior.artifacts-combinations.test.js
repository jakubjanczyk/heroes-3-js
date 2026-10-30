// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import { confirmTileClickByDispatch, readInfoPopupLines } from './adventure-map.utils.js'
import {
  answerMessage,
  expectInteractionModalClosed,
  readMessage,
  readMessageButtons,
  readMessageDetails
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, anArtifact, anArtifactDefinition, aScenario } from './builders.js'
import {
  clickHeroInHeroList,
  clickHeroScreenArtifactSlot,
  clickHeroScreenBackpackFrame,
  closeHeroScreen,
  holdRightButtonOnHeroScreenArtifactSlot,
  holdRightButtonOnHeroScreenBackpackFrame,
  holdRightButtonOnHeroScreenBox,
  hoverHeroScreenArtifactSlot,
  readHeroScreenArtifacts,
  readHeroScreenBackpack,
  readHeroScreenHeldArtifact,
  readHeroScreenHighlightedSlots,
  readHeroScreenPrimarySkills,
  readHeroScreenStatusBar
} from './hero-screen.utils.js'

const HERO = 'Hero'

const HELM = 'HELM'
const ARMOR = 'ARMOR'
const BLADE = 'BLADE'
const QUIET_EYE = 'QUIET_EYE'
const STILL_EYE = 'STILL_EYE'
const DRAGON_FATHER = 'DRAGON_FATHER'
const OTHER_HELM = 'OTHER_HELM'
const OTHER_RING = 'OTHER_RING'
const ALLIANCE = 'ALLIANCE'

const DRAGON_FATHER_DESCRIPTION =
  '+6 to all primary skills, all troops are immune to 1-4th level spells.'
const ASSEMBLE_QUESTION =
  'You possess all of the components needed to assemble the Power of the Dragon Father.  Do you wish to assemble this artifact?'
const DISASSEMBLE_QUESTION = 'Do you wish to disassemble this artifact?'

const PARTS = [HELM, ARMOR, BLADE, QUIET_EYE, STILL_EYE]

const artifactDefinitions = {
  [HELM]: anArtifactDefinition()
    .withName('Crown of Dragontooth')
    .withSlot('HELMET')
    .withPrimarySkills({ knowledge: 1 })
    .build(),
  [ARMOR]: anArtifactDefinition()
    .withName('Dragon Scale Armor')
    .withSlot('TORSO')
    .withPrimarySkills({ defense: 2 })
    .build(),
  [BLADE]: anArtifactDefinition()
    .withName('Red Dragon Flame Tongue')
    .withSlot('WEAPON')
    .withPrimarySkills({ attack: 2 })
    .build(),
  [QUIET_EYE]: anArtifactDefinition()
    .withName('Quiet Eye of the Dragon')
    .withSlot('RING')
    .withPrimarySkills({ attack: 1 })
    .build(),
  [STILL_EYE]: anArtifactDefinition()
    .withName('Still Eye of the Dragon')
    .withSlot('RING')
    .withMorale(1)
    .build(),
  [DRAGON_FATHER]: anArtifactDefinition()
    .withName('Power of the Dragon Father')
    .withSlot('TORSO')
    .withClass('RELIC')
    .withParts(PARTS)
    .withPrimarySkills({ attack: 6, defense: 6, power: 6, knowledge: 6 })
    .withDescription(DRAGON_FATHER_DESCRIPTION)
    .build(),
  [OTHER_HELM]: anArtifactDefinition().withName('Skull Helmet').withSlot('HELMET').build(),
  [OTHER_RING]: anArtifactDefinition().withName('Ring of Vitality').withSlot('RING').build(),
  [ALLIANCE]: anArtifactDefinition()
    .withName('Angelic Alliance')
    .withSlot('WEAPON')
    .withClass('RELIC')
    .withParts([HELM, BLADE])
    .withTownsCountAsOne(['CASTLE', 'RAMPART'])
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

const ASSEMBLED = {
  Torso: 'Power of the Dragon Father',
  Helmet: 'Locked',
  Weapon: 'Locked',
  'Right ring': 'Locked',
  'Left ring': 'Locked'
}

const WEARING_PARTS = {
  Helmet: 'Crown of Dragontooth',
  Torso: 'Dragon Scale Armor',
  Weapon: 'Red Dragon Flame Tongue',
  'Right ring': 'Quiet Eye of the Dragon',
  'Left ring': 'Still Eye of the Dragon'
}

const stack = (creature, count = 10) => ({ creature, count })

// Artifacts are put on in order, as when picked up: the first of a kind is worn, the rest wait in
// the backpack.
const aScenarioWith = ({ hero = aHero(), others = [] } = {}) =>
  aScenario()
    .withSize(4)
    .withEntities(hero.at(0, 0), ...others)
    .withDefinitions(gameDefinitions)

const aHeroWearing = (artifacts) => aScenarioWith({ hero: aHero().withArtifacts(artifacts) })

async function setupApp(scenario, { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    eventLog
  })
}

async function startOnHeroScreen(scenario, options) {
  const app = await setupApp(scenario, options)
  await clickHeroInHeroList(app.user, HERO)
  return app
}

async function pickUpArtifactAt(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

async function readArtifactsOnHeroScreen(user) {
  await clickHeroInHeroList(user, HERO)
  const seen = { worn: readHeroScreenArtifacts(), backpack: readHeroScreenBackpack() }
  await closeHeroScreen(user)
  return seen
}

const readQuestion = () => ({
  message: readMessage(),
  question: readMessageDetails(),
  buttons: readMessageButtons()
})

async function assembleOnHeroScreen(user) {
  await holdRightButtonOnHeroScreenArtifactSlot(user, 'Helmet')
  await answerMessage(user, 'Yes')
}

function readPopup() {
  const popup = screen.getByRole('tooltip')
  return [within(popup).getByRole('heading').textContent, ...readInfoPopupLines()]
}

describe('combination artifacts behavior', () => {
  describe('assembling', () => {
    test('given a hero wearing every part but one when they pick up the last part from the map then a question shows the combination’s description and asks whether to assemble it', async () => {
      await setupApp(
        aScenarioWith({
          hero: aHero().withArtifacts([HELM, ARMOR, BLADE, QUIET_EYE]),
          others: [anArtifact().withType(STILL_EYE).at(1, 0)]
        })
      )

      await pickUpArtifactAt(1, 0)

      expect(readQuestion()).toEqual({
        message: DRAGON_FATHER_DESCRIPTION,
        question: [ASSEMBLE_QUESTION],
        buttons: ['Yes', 'No']
      })
    })

    test('given one part is in the backpack when the hero picks up the last missing part then no question is asked', async () => {
      await setupApp(
        aScenarioWith({
          hero: aHero().withArtifacts([OTHER_HELM, HELM, ARMOR, BLADE, QUIET_EYE]),
          others: [anArtifact().withType(STILL_EYE).at(1, 0)]
        })
      )

      await pickUpArtifactAt(1, 0)

      expectInteractionModalClosed()
    })

    test('given every part is worn but one in the backpack when the player puts that one on its slot on the hero screen then the question is asked', async () => {
      const { user } = await startOnHeroScreen(
        aHeroWearing([HELM, ARMOR, BLADE, QUIET_EYE, OTHER_RING, STILL_EYE])
      )
      await clickHeroScreenBackpackFrame(user, 1)

      await clickHeroScreenArtifactSlot(user, 'Left ring')

      expect(readMessageDetails()).toEqual([ASSEMBLE_QUESTION])
    })

    test('given the question when the player answers Yes then the hero screen shows the combination in its slot and a lock in each of the other parts’ slots', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing(PARTS))
      await holdRightButtonOnHeroScreenArtifactSlot(user, 'Helmet')

      await answerMessage(user, 'Yes')

      expect(readHeroScreenArtifacts()).toEqual(ASSEMBLED)
    })

    test('given an assembled combination with a bonus of its own then the primary skills show the parts’ bonuses plus its own', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing(PARTS))

      await assembleOnHeroScreen(user)

      // A Knight (2, 2, 1, 1), the parts' +3 Attack, +2 Defense and +1 Knowledge, and +6 to each.
      expect(readHeroScreenPrimarySkills()).toEqual([
        'Attack 11',
        'Defense 10',
        'Power 7',
        'Knowledge 8'
      ])
    })

    test('given the question when the player answers No then the parts stay where they were', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing(PARTS))
      await holdRightButtonOnHeroScreenArtifactSlot(user, 'Helmet')

      await answerMessage(user, 'No')

      expect(readHeroScreenArtifacts()).toEqual(WEARING_PARTS)
    })

    test('given every part is worn when the player right-clicks one of them then the question is asked', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing(PARTS))

      await holdRightButtonOnHeroScreenArtifactSlot(user, 'Weapon')

      expect(readQuestion()).toEqual({
        message: DRAGON_FATHER_DESCRIPTION,
        question: [ASSEMBLE_QUESTION],
        buttons: ['Yes', 'No']
      })
    })
  })

  describe('locked slots', () => {
    test('given a locked slot when the player clicks it then nothing is taken', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([DRAGON_FATHER]))

      await clickHeroScreenArtifactSlot(user, 'Helmet')

      expect(readHeroScreenHeldArtifact()).toBeNull()
      expect(readHeroScreenArtifacts()).toEqual(ASSEMBLED)
    })

    test('given a held artifact of a locked slot’s kind then the locked slot isn’t highlighted and clicking it leaves the artifact held', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([DRAGON_FATHER, OTHER_HELM]))
      await clickHeroScreenBackpackFrame(user, 1)

      await clickHeroScreenArtifactSlot(user, 'Helmet')

      expect(readHeroScreenHighlightedSlots()).toEqual([])
      expect(readHeroScreenHeldArtifact()).toBe('Skull Helmet')
    })

    test('given the only slot of an artifact’s kind is locked when the hero picks the artifact up then it goes to the backpack', async () => {
      const { user } = await setupApp(
        aScenarioWith({
          hero: aHero().withArtifacts([DRAGON_FATHER]),
          others: [anArtifact().withType(OTHER_HELM).at(1, 0)]
        })
      )

      await pickUpArtifactAt(1, 0)

      expect(await readArtifactsOnHeroScreen(user)).toEqual({
        worn: ASSEMBLED,
        backpack: ['Skull Helmet']
      })
    })

    test('given a locked slot when the mouse is over it then the status bar says which combination locks it', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([DRAGON_FATHER]))

      await hoverHeroScreenArtifactSlot(user, 'Helmet')

      expect(readHeroScreenStatusBar()).toBe('Locked by Power of the Dragon Father')
    })
  })

  describe('moving a combination', () => {
    test('given a worn combination when the player puts it in the backpack then its locked slots are empty again', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([DRAGON_FATHER]))
      await clickHeroScreenArtifactSlot(user, 'Torso')

      await clickHeroScreenBackpackFrame(user, 1)

      expect(readHeroScreenArtifacts()).toEqual({})
      expect(readHeroScreenBackpack()).toEqual(['Power of the Dragon Father'])
    })

    test('given a combination in the backpack then it adds nothing to the primary skills', async () => {
      await startOnHeroScreen(aHeroWearing([ARMOR, DRAGON_FATHER]))

      expect(readHeroScreenPrimarySkills()).toEqual([
        'Attack 2',
        'Defense 4',
        'Power 1',
        'Knowledge 1'
      ])
    })

    test('given a held combination when every slot it locks is empty then its slot is highlighted', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([DRAGON_FATHER]))

      await clickHeroScreenArtifactSlot(user, 'Torso')

      expect(readHeroScreenHighlightedSlots()).toEqual(['Torso'])
    })

    test('given a held combination when a slot it locks is taken then its slot isn’t highlighted', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([OTHER_HELM, DRAGON_FATHER]))

      await clickHeroScreenBackpackFrame(user, 1)

      expect(readHeroScreenHighlightedSlots()).toEqual([])
    })

    test('given a held combination when the player clicks its slot while another of its slots is taken then it stays held', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([OTHER_HELM, DRAGON_FATHER]))
      await clickHeroScreenBackpackFrame(user, 1)

      await clickHeroScreenArtifactSlot(user, 'Torso')

      expect(readHeroScreenHeldArtifact()).toBe('Power of the Dragon Father')
      expect(readHeroScreenArtifacts()).toEqual({ Helmet: 'Skull Helmet' })
    })

    test('given a combination in the backpack when the player puts it on its slot then the slots are locked again and no question is asked', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([DRAGON_FATHER]))
      await clickHeroScreenArtifactSlot(user, 'Torso')
      await clickHeroScreenBackpackFrame(user, 1)
      await clickHeroScreenBackpackFrame(user, 1)

      await clickHeroScreenArtifactSlot(user, 'Torso')

      expect(readHeroScreenArtifacts()).toEqual(ASSEMBLED)
      expectInteractionModalClosed()
    })

    test('given the player closes the hero screen holding a combination when all its slots are free then it is worn again', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([DRAGON_FATHER]))
      await clickHeroScreenArtifactSlot(user, 'Torso')

      await closeHeroScreen(user)

      expect(await readArtifactsOnHeroScreen(user)).toEqual({ worn: ASSEMBLED, backpack: [] })
    })

    test('given the player closes the hero screen holding a combination when a slot it locks is taken then it goes to the backpack', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([OTHER_HELM, DRAGON_FATHER]))
      await clickHeroScreenBackpackFrame(user, 1)

      await closeHeroScreen(user)

      expect(await readArtifactsOnHeroScreen(user)).toEqual({
        worn: { Helmet: 'Skull Helmet' },
        backpack: ['Power of the Dragon Father']
      })
    })
  })

  describe('disassembling', () => {
    test('given a worn combination when the player right-clicks it then a question shows its description and asks whether to disassemble it', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([DRAGON_FATHER]))

      await holdRightButtonOnHeroScreenArtifactSlot(user, 'Torso')

      expect(readQuestion()).toEqual({
        message: DRAGON_FATHER_DESCRIPTION,
        question: [DISASSEMBLE_QUESTION],
        buttons: ['Yes', 'No']
      })
    })

    test('given that question when the player answers Yes then each part is back in the slot it was worn in, rings included', async () => {
      const { user } = await startOnHeroScreen(
        aHeroWearing([HELM, ARMOR, BLADE, STILL_EYE, QUIET_EYE])
      )
      await assembleOnHeroScreen(user)
      await holdRightButtonOnHeroScreenArtifactSlot(user, 'Torso')

      await answerMessage(user, 'Yes')

      expect(readHeroScreenArtifacts()).toEqual({
        ...WEARING_PARTS,
        'Right ring': 'Still Eye of the Dragon',
        'Left ring': 'Quiet Eye of the Dragon'
      })
    })

    test('given that question when the player answers No then the combination stays', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([DRAGON_FATHER]))
      await holdRightButtonOnHeroScreenArtifactSlot(user, 'Torso')

      await answerMessage(user, 'No')

      expect(readHeroScreenArtifacts()).toEqual(ASSEMBLED)
    })

    test('given a combination in the backpack when the player right-clicks it and answers Yes then its parts take its place in the backpack', async () => {
      const { user } = await startOnHeroScreen(aHeroWearing([ARMOR, DRAGON_FATHER, OTHER_RING]))
      await holdRightButtonOnHeroScreenBackpackFrame(user, 1)

      await answerMessage(user, 'Yes')

      expect(readHeroScreenBackpack()).toEqual([
        'Crown of Dragontooth',
        'Dragon Scale Armor',
        'Red Dragon Flame Tongue',
        'Quiet Eye of the Dragon',
        'Still Eye of the Dragon'
      ])
    })

    test('given a combination in a backpack with no room for its parts when the player right-clicks it then it shows its description', async () => {
      const fullBackpack = Array.from({ length: 63 }, () => OTHER_HELM)
      const { user } = await startOnHeroScreen(
        aHeroWearing([ARMOR, HELM, DRAGON_FATHER, ...fullBackpack])
      )

      await holdRightButtonOnHeroScreenBackpackFrame(user, 1)

      expectInteractionModalClosed()
      expect(readPopup()).toEqual(['Power of the Dragon Father', DRAGON_FATHER_DESCRIPTION])
    })
  })

  describe('scenario, map and reload', () => {
    test('given a scenario hero starting with a combination then they wear it with its slots locked', async () => {
      await startOnHeroScreen(aHeroWearing([DRAGON_FATHER]))

      expect(readHeroScreenArtifacts()).toEqual(ASSEMBLED)
    })

    test('given a combination on the map when a hero with one of its slots taken picks it up then it goes to the backpack', async () => {
      const { user } = await setupApp(
        aScenarioWith({
          hero: aHero().withArtifacts([OTHER_HELM]),
          others: [anArtifact().withType(DRAGON_FATHER).at(1, 0)]
        })
      )

      await pickUpArtifactAt(1, 0)

      expect(await readArtifactsOnHeroScreen(user)).toEqual({
        worn: { Helmet: 'Skull Helmet' },
        backpack: ['Power of the Dragon Father']
      })
    })

    test('given an assembled combination when the page reloads then it is still worn with its slots locked', async () => {
      const eventLog = createMemoryEventLog()
      const { user } = await startOnHeroScreen(aHeroWearing(PARTS), { eventLog })
      await assembleOnHeroScreen(user)

      const reloaded = await setupApp(aHeroWearing(PARTS), { eventLog })

      expect((await readArtifactsOnHeroScreen(reloaded.user)).worn).toEqual(ASSEMBLED)
    })

    test('given an assembled combination whose part has morale +1 when the player right-clicks morale then the popup lists the part', async () => {
      const { user } = await startOnHeroScreen(
        aScenarioWith({
          hero: aHero()
            .withArmy([stack('PIKEMAN')])
            .withArtifacts([DRAGON_FATHER])
        })
      )

      await holdRightButtonOnHeroScreenBox(user, 'Morale')

      expect(readPopup()).toContain('Still Eye of the Dragon +1')
    })
  })

  describe('towns counting as one', () => {
    test('given a hero wearing a combination that lets Castle and Rampart mix, with Pikemen and Centaurs, then morale counts all troops of one alignment', async () => {
      const { user } = await startOnHeroScreen(
        aScenarioWith({
          hero: aHero()
            .withArmy([stack('PIKEMAN'), stack('CENTAUR')])
            .withArtifacts([ALLIANCE])
        })
      )

      await holdRightButtonOnHeroScreenBox(user, 'Morale')

      expect(readPopup()).toContain('All troops of one alignment +1')
    })

    test('given the same hero with Imps and Peasants too then Castle and Rampart count as one of three alignments', async () => {
      const { user } = await startOnHeroScreen(
        aScenarioWith({
          hero: aHero()
            .withArmy([stack('PIKEMAN'), stack('CENTAUR'), stack('IMP'), stack('PEASANT')])
            .withArtifacts([ALLIANCE])
        })
      )

      await holdRightButtonOnHeroScreenBox(user, 'Morale')

      expect(readPopup()).toContain('Troops of 3 alignments -1')
    })
  })
})
