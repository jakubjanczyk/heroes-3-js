// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { answerMessage, readMessage } from './adventure-panels.utils.js'
import { readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, anArtifactDefinition, aScenario, aWarMachineDefinition } from './builders.js'
import {
  clickHeroExchangeBackpackFrame,
  clickHeroExchangeButton,
  clickHeroExchangeWarMachineFrame,
  meetHeroAt,
  readHeroExchangeBackpack,
  readHeroExchangeHeldArtifact,
  readHeroExchangeWarMachines
} from './hero-exchange.utils.js'
import {
  clickHeroInHeroList,
  clickHeroScreenWarMachineFrame,
  holdRightButtonOnHeroScreenWarMachineFrame,
  hoverHeroScreenWarMachineFrame,
  readHeroScreenArtifacts,
  readHeroScreenBackpack,
  readHeroScreenHeldArtifact,
  readHeroScreenPopup,
  readHeroScreenStatusBar,
  readHeroScreenWarMachines
} from './hero-screen.utils.js'

const HERO = 'Hero'
const OTHER_HERO = 'Valeska'

const BALLISTA = 'BALLISTA'
const AMMO_CART = 'AMMO_CART'
const FIRST_AID_TENT = 'FIRST_AID_TENT'
const CHARM = 'CHARM'

const BALLISTA_DESCRIPTION = "Use this war machine to target your enemy's troops in combat."

const artifactDefinitions = {
  CATAPULT: aWarMachineDefinition()
    .withName('Catapult')
    .withSlot('CATAPULT')
    .givenToEveryHero()
    .neverMoved()
    .build(),
  [BALLISTA]: aWarMachineDefinition()
    .withName('Ballista')
    .withSlot('BALLISTA')
    .withDescription(BALLISTA_DESCRIPTION)
    .build(),
  [AMMO_CART]: aWarMachineDefinition().withName('Ammo Cart').withSlot('AMMO_CART').build(),
  [FIRST_AID_TENT]: aWarMachineDefinition()
    .withName('First Aid Tent')
    .withSlot('FIRST_AID_TENT')
    .build(),
  [CHARM]: anArtifactDefinition().withName('Charm').withSlot('MISC').build()
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  artifacts: artifactDefinitions
}

const aHeroWith = (artifacts) =>
  aScenario()
    .withSize(4)
    .withEntities(aHero().withArtifacts(artifacts).at(0, 0))
    .withDefinitions(gameDefinitions)

// The left hero walks to the right one, five tiles away.
const aMeetingScenario = ({ left = [], right = [] } = {}) =>
  aScenario()
    .withSize(10, 3)
    .withEntities(
      aHero().withArtifacts(left).at(0, 0),
      aHero().withId('hero-2').withName(OTHER_HERO).withArtifacts(right).at(5, 0)
    )
    .withDefinitions(gameDefinitions)

async function setupApp(scenario) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 }
  })
}

async function startOnHeroScreen(scenario) {
  const app = await setupApp(scenario)
  await clickHeroInHeroList(app.user, HERO)
  return app
}

async function startOnHeroExchange(scenario) {
  const app = await setupApp(scenario)
  await meetHeroAt(app.user, 5, 0)
  return app
}

describe('war machines behavior', () => {
  describe('on the hero screen', () => {
    test('a hero has a Catapult in its frame', async () => {
      await startOnHeroScreen(aHeroWith([]))

      expect(readHeroScreenWarMachines()).toEqual({ Catapult: 'Catapult' })
    })

    test.each([
      { warMachine: BALLISTA, frame: 'Ballista' },
      { warMachine: AMMO_CART, frame: 'Ammo Cart' },
      { warMachine: FIRST_AID_TENT, frame: 'First Aid Tent' }
    ])('a hero given the $frame has it in its own frame', async ({ warMachine, frame }) => {
      await startOnHeroScreen(aHeroWith([warMachine]))

      expect(readHeroScreenWarMachines()).toEqual({ [frame]: frame, Catapult: 'Catapult' })
      expect(readHeroScreenArtifacts()).toEqual({})
      expect(readHeroScreenBackpack()).toEqual([])
    })

    test('a second war machine of the same kind is not carried', async () => {
      await startOnHeroScreen(aHeroWith([BALLISTA, BALLISTA]))

      expect(readHeroScreenWarMachines()).toEqual({ Ballista: 'Ballista', Catapult: 'Catapult' })
      expect(readHeroScreenBackpack()).toEqual([])
    })

    test("hovering a war machine writes 'View <name> Info' in the status bar", async () => {
      const { user } = await startOnHeroScreen(aHeroWith([BALLISTA]))

      await hoverHeroScreenWarMachineFrame(user, 'Ballista')

      expect(readHeroScreenStatusBar()).toBe('View Ballista Info')
    })

    test("hovering an empty war machine frame writes 'Empty' in the status bar", async () => {
      const { user } = await startOnHeroScreen(aHeroWith([]))

      await hoverHeroScreenWarMachineFrame(user, 'Ammo Cart')

      expect(readHeroScreenStatusBar()).toBe('Empty')
    })

    test('holding the right button on a war machine shows its name and description', async () => {
      const { user } = await startOnHeroScreen(aHeroWith([BALLISTA]))

      await holdRightButtonOnHeroScreenWarMachineFrame(user, 'Ballista')

      expect(readHeroScreenPopup().title).toBe('Ballista')
      expect(readHeroScreenPopup().lines).toEqual([BALLISTA_DESCRIPTION])
    })

    test('clicking the Catapult says it must be equipped and leaves it in its frame', async () => {
      const { user } = await startOnHeroScreen(aHeroWith([]))

      await clickHeroScreenWarMachineFrame(user, 'Catapult')

      expect(readMessage()).toBe('The Catapult must be equipped.')
      await answerMessage(user, 'OK')
      expect(readHeroScreenHeldArtifact()).toBeNull()
      expect(readHeroScreenWarMachines()).toEqual({ Catapult: 'Catapult' })
    })

    test('clicking a war machine leaves it in its frame, as it has nowhere else to go', async () => {
      const { user } = await startOnHeroScreen(aHeroWith([BALLISTA]))

      await clickHeroScreenWarMachineFrame(user, 'Ballista')

      expect(readHeroScreenHeldArtifact()).toBeNull()
      expect(readHeroScreenWarMachines()).toEqual({ Ballista: 'Ballista', Catapult: 'Catapult' })
    })
  })

  describe('in the exchange window', () => {
    test("both heroes' war machines are in their frames", async () => {
      await startOnHeroExchange(aMeetingScenario({ left: [AMMO_CART], right: [BALLISTA] }))

      expect(readHeroExchangeWarMachines(HERO)).toEqual({
        'Ammo Cart': 'Ammo Cart',
        Catapult: 'Catapult'
      })
      expect(readHeroExchangeWarMachines(OTHER_HERO)).toEqual({
        Ballista: 'Ballista',
        Catapult: 'Catapult'
      })
    })

    test('a Ballista goes to the other hero when put in their Ballista frame', async () => {
      const { user } = await startOnHeroExchange(aMeetingScenario({ left: [BALLISTA] }))
      await clickHeroExchangeWarMachineFrame(user, HERO, 'Ballista')

      await clickHeroExchangeWarMachineFrame(user, OTHER_HERO, 'Ballista')

      expect(readHeroExchangeWarMachines(HERO)).toEqual({ Catapult: 'Catapult' })
      expect(readHeroExchangeWarMachines(OTHER_HERO)).toEqual({
        Ballista: 'Ballista',
        Catapult: 'Catapult'
      })
    })

    test('a war machine put on a backpack frame stays held, with a message that it is too large', async () => {
      const { user } = await startOnHeroExchange(aMeetingScenario({ left: [BALLISTA] }))
      await clickHeroExchangeWarMachineFrame(user, HERO, 'Ballista')

      await clickHeroExchangeBackpackFrame(user, OTHER_HERO, 1)

      expect(readMessage()).toBe(
        'Alas, your backpack cannot hold something as large as a Ballista.'
      )
      await answerMessage(user, 'OK')
      expect(readHeroExchangeBackpack(OTHER_HERO)).toEqual([])
      expect(readHeroExchangeHeldArtifact()).toBe('Ballista')
    })

    test('clicking a Catapult says it must be equipped', async () => {
      const { user } = await startOnHeroExchange(aMeetingScenario())

      await clickHeroExchangeWarMachineFrame(user, OTHER_HERO, 'Catapult')

      expect(readMessage()).toBe('The Catapult must be equipped.')
    })

    test("giving every artifact keeps each hero's Catapult and a war machine the other hero already has", async () => {
      const { user } = await startOnHeroExchange(
        aMeetingScenario({ left: [BALLISTA, AMMO_CART], right: [BALLISTA] })
      )

      await clickHeroExchangeButton(user, `Move all artifacts to ${OTHER_HERO}`)

      expect(readHeroExchangeWarMachines(HERO)).toEqual({
        Ballista: 'Ballista',
        Catapult: 'Catapult'
      })
      expect(readHeroExchangeWarMachines(OTHER_HERO)).toEqual({
        Ballista: 'Ballista',
        'Ammo Cart': 'Ammo Cart',
        Catapult: 'Catapult'
      })
      expect(readHeroExchangeBackpack(OTHER_HERO)).toEqual([])
    })
  })
})
