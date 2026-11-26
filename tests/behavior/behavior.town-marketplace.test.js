// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { expectResourceTotal, getTownInTownList } from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { aHero, aScenario, aTown } from './builders.js'
import {
  clickTradeMax,
  closeMarketplace,
  getTownScreen,
  getTradeButton,
  openMarketplace,
  pickResourceToGive,
  pickResourceToReceive,
  queryMarketplace,
  readAmountToGive,
  readAmountToReceive,
  readKingdomResources,
  readMerchantLine,
  readPickedResourceToGive,
  readPickedResourceToReceive,
  readTradeQuantity,
  readTradeRates,
  setTradeQuantity,
  trade
} from './town-screen.utils.js'

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  monsters: readGameData('monsters.json'),
  resources: readGameData('resources.json'),
  towns: readGameData('towns.json'),
  buildings: readGameData('buildings.json'),
  marketplace: readGameData('marketplace.json')
}

const MARKETPLACE = ['MARKETPLACE']

const RESOURCES = {
  WOOD_PILE: 23,
  MERCURY_PILE: 0,
  ORE_PILE: 5,
  SULFUR_PILE: 0,
  CRYSTAL_PILE: 0,
  GEMS_PILE: 2,
  GOLD_PILE: 1000
}

const INSPECT_OUR_WARES =
  'Please inspect our fine wares.  If you feel like offering a trade, click on the items you wish to trade with and for.'

const QUITE_A_BARGAIN =
  'You have received quite a bargain.  I expect to make no profit on the deal.  Can I interest you in any of my other wares?'

// The towns stand eight tiles apart, away from the hero; the player opens them from the town list.
const aMarketTown = (index, name) =>
  aTown()
    .withId(`town-${index + 1}`)
    .named(name)
    .ownedByPlayer()
    .withBuildings(MARKETPLACE)
    .at(4 + index * 8, 3)

const aMarketplaceScenario = ({ towns = [aMarketTown(0, 'Whitemoon')] } = {}) =>
  aScenario()
    .withSize(24, 7)
    .withEntities(aHero().withName('Sir Christian').at(0, 6), ...towns)
    .withDefinitions(gameDefinitions)
    .withStartingResources(RESOURCES)

async function setupApp(scenario = aMarketplaceScenario(), { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    eventLog
  })
}

async function openMarketplaceIn(user, townName = 'Whitemoon') {
  await user.dblClick(getTownInTownList(townName))
  await openMarketplace(user)
}

async function startInMarketplace(scenario, options) {
  const app = await setupApp(scenario, options)
  await openMarketplaceIn(app.user)
  return app
}

async function pickTrade(user, given, received) {
  await pickResourceToGive(user, given)
  await pickResourceToReceive(user, received)
}

describe('town marketplace behavior', () => {
  describe('opening the marketplace', () => {
    test('clicking the Marketplace on the town picture opens the Marketplace window', async () => {
      const { user } = await setupApp()
      await user.dblClick(getTownInTownList('Whitemoon'))

      await openMarketplace(user)

      expect(queryMarketplace()).toBeTruthy()
    })

    test("the window shows the kingdom's resources with the amounts the player has", async () => {
      await startInMarketplace()

      expect(readKingdomResources()).toEqual([
        'Wood 23',
        'Mercury 0',
        'Ore 5',
        'Sulfur 0',
        'Crystal 0',
        'Gems 2',
        'Gold 1000'
      ])
    })

    test('before anything is picked, the merchant asks the player to pick what to trade with and for', async () => {
      await startInMarketplace()

      expect(readMerchantLine()).toBe(INSPECT_OUR_WARES)
    })

    test('Done closes the window back to the town screen', async () => {
      const { user } = await startInMarketplace()

      await closeMarketplace(user)

      expect(queryMarketplace()).toBeNull()
      expect(getTownScreen()).toBeTruthy()
    })

    test('Escape closes the window back to the town screen', async () => {
      const { user } = await startInMarketplace()

      await user.keyboard('{Escape}')

      expect(queryMarketplace()).toBeNull()
      expect(getTownScreen()).toBeTruthy()
    })
  })

  describe('picking a trade', () => {
    test("picking a resource to give shows each resource's rate for one lot of it", async () => {
      const { user } = await startInMarketplace()

      await pickResourceToGive(user, 'Wood')

      expect(readTradeRates()).toEqual([
        'Wood n/a',
        'Mercury 1/20',
        'Ore 1/10',
        'Sulfur 1/20',
        'Crystal 1/20',
        'Gems 1/20',
        'Gold 25'
      ])
    })

    test("the resource picked to give reads n/a on the right and can't be traded for itself", async () => {
      const { user } = await startInMarketplace()

      await pickTrade(user, 'Wood', 'Wood')
      await clickTradeMax(user)

      expect(readTradeRates()).toContain('Wood n/a')
      expect(getTradeButton().disabled).toBe(true)
    })

    test("picking both resources shows the merchant's offer for one lot", async () => {
      const { user } = await startInMarketplace()

      await pickTrade(user, 'Wood', 'Gold')

      expect(readMerchantLine()).toBe('I can offer you 25 units of Gold for 1 unit of Wood.')
    })

    test('Trade stays off until the slider is above zero', async () => {
      const { user } = await startInMarketplace()

      await pickTrade(user, 'Wood', 'Gold')

      expect(readTradeQuantity()).toBe(0)
      expect(getTradeButton().disabled).toBe(true)
    })
  })

  describe('trading', () => {
    test('trading four lots of Wood for gold takes 4 Wood and gives 100 gold, in the window and the resource bar', async () => {
      const { user } = await startInMarketplace()
      await pickTrade(user, 'Wood', 'Gold')
      setTradeQuantity(4)

      await trade(user)

      expect(readKingdomResources()).toContain('Wood 19')
      expect(readKingdomResources()).toContain('Gold 1100')
      expectResourceTotal('Wood', 19)
      expectResourceTotal('Gold', 1100)
    })

    test('Max sets the slider to the most lots the player can pay for, and leftover Wood that makes no whole lot stays', async () => {
      const { user } = await startInMarketplace()
      await pickTrade(user, 'Wood', 'Ore')

      await clickTradeMax(user)

      expect(readAmountToGive()).toBe('20')
      expect(readAmountToReceive()).toBe('2')
      await trade(user)
      expectResourceTotal('Wood', 3)
      expectResourceTotal('Ore', 7)
    })

    test("a resource the player has less of than one lot can't be traded", async () => {
      const { user } = await startInMarketplace()
      await pickTrade(user, 'Ore', 'Mercury')

      await clickTradeMax(user)

      expect(readTradeQuantity()).toBe(0)
      expect(getTradeButton().disabled).toBe(true)
    })

    test('after a trade the merchant says it was a bargain and both picks are cleared', async () => {
      const { user } = await startInMarketplace()
      await pickTrade(user, 'Gems', 'Gold')
      setTradeQuantity(1)

      await trade(user)

      expect(readMerchantLine()).toBe(QUITE_A_BARGAIN)
      expect(readPickedResourceToGive()).toBeUndefined()
      expect(readPickedResourceToReceive()).toBeUndefined()
    })

    test('a trade is kept after a reload', async () => {
      const scenario = aMarketplaceScenario()
      const eventLog = createMemoryEventLog()
      const { user } = await startInMarketplace(scenario, { eventLog })
      await pickTrade(user, 'Wood', 'Gold')
      setTradeQuantity(4)
      await trade(user)

      await setupApp(scenario, { eventLog })

      expectResourceTotal('Wood', 19)
      expectResourceTotal('Gold', 1100)
    })
  })

  describe('the rate', () => {
    test("three Marketplaces in the player's towns give the three-Marketplace rate", async () => {
      const { user } = await startInMarketplace(
        aMarketplaceScenario({
          towns: [
            aMarketTown(0, 'Whitemoon'),
            aMarketTown(1, 'Greywater'),
            aMarketTown(2, 'Stonebrook')
          ]
        })
      )

      await pickResourceToGive(user, 'Wood')

      expect(readTradeRates()).toContain('Gold 50')
    })

    test("another player's Marketplaces don't improve the player's rate", async () => {
      const { user } = await startInMarketplace(
        aMarketplaceScenario({
          towns: [aMarketTown(0, 'Whitemoon'), aMarketTown(1, 'Greywater').ownedBy('blue')]
        })
      )

      await pickResourceToGive(user, 'Wood')

      expect(readTradeRates()).toContain('Gold 25')
    })
  })
})
