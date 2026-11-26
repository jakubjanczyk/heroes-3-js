// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectNoPreview,
  holdRightButtonOn,
  hoverTile,
  readInfoPopupLines
} from './adventure-map.utils.js'
import { expectResourceTotal, expectStatusBarText } from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aHero, aMarket, aScenario, aTown } from './builders.js'
import {
  closeMarketplace,
  pickResourceToGive,
  pickResourceToReceive,
  queryMarketplace,
  queryTownScreen,
  readMerchantLine,
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
  marketplace: readGameData('marketplace.json'),
  markets: {
    TRADING_POST: { name: 'Trading Post', footprint: [{ x: -1, y: 0 }], marketplaces: 5 }
  }
}

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

const ENTRANCE = { x: 2, y: 5 }
const BLOCKED_TILE = { x: 1, y: 5 }
const BELOW_THE_ENTRANCE = { x: 2, y: 6 }

const aTownWithAMarketplace = () =>
  aTown().named('Whitemoon').ownedByPlayer().withBuildings(['MARKETPLACE']).at(12, 3)

const aTradingPostScenario = ({ towns = [] } = {}) =>
  aScenario()
    .withSize(16, 7)
    .withEntities(
      aHero().withName('Sir Christian').at(BELOW_THE_ENTRANCE.x, BELOW_THE_ENTRANCE.y),
      aMarket().at(ENTRANCE.x, ENTRANCE.y),
      ...towns
    )
    .withDefinitions(gameDefinitions)
    .withStartingResources(RESOURCES)

function setupApp(scenario = aTradingPostScenario(), { eventLog } = {}) {
  return setupMovementBehaviorApp({
    loadGameOptions: scenario.build(),
    appConfig: { interactionModalTransitionMs: 0 },
    eventLog
  })
}

async function walkTo({ x, y }) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

const visitTradingPost = () => walkTo(ENTRANCE)

async function startInTradingPost(scenario, options) {
  const app = await setupApp(scenario, options)
  await visitTradingPost()
  return app
}

describe('trading post behavior', () => {
  describe('visiting', () => {
    test("stepping onto the entrance opens the Marketplace window with the merchant's greeting", async () => {
      await startInTradingPost()

      expect(queryMarketplace()).toBeTruthy()
      expect(readMerchantLine()).toBe(INSPECT_OUR_WARES)
    })

    test('the window opens over the adventure map, not a town screen', async () => {
      await startInTradingPost()

      expect(queryTownScreen()).toBeNull()
    })

    test('Done closes the window, with the hero on the entrance', async () => {
      const { user } = await startInTradingPost()

      await closeMarketplace(user)

      expect(queryMarketplace()).toBeNull()
      expectHeroAt(ENTRANCE.x, ENTRANCE.y)
    })

    test('Escape closes the window', async () => {
      const { user } = await startInTradingPost()

      await user.keyboard('{Escape}')

      expect(queryMarketplace()).toBeNull()
    })

    test('a hero who steps off and comes back gets the window again', async () => {
      const { user } = await startInTradingPost()
      await closeMarketplace(user)
      await walkTo(BELOW_THE_ENTRANCE)

      await visitTradingPost()

      expect(queryMarketplace()).toBeTruthy()
    })

    test('shows no route to the tile west of the entrance, which it blocks', async () => {
      await setupApp()

      dispatchTileClick(BLOCKED_TILE.x, BLOCKED_TILE.y)

      expectNoPreview()
    })

    test('the status bar names it, and still only names it after a visit', async () => {
      const { user } = await startInTradingPost()
      await closeMarketplace(user)
      await walkTo(BELOW_THE_ENTRANCE)

      await hoverTile(user, ENTRANCE.x, ENTRANCE.y)

      expectStatusBarText('Trading Post')
    })

    test('the right-click popup shows only its name', async () => {
      const { user } = await setupApp()

      await holdRightButtonOn(user, ENTRANCE.x, ENTRANCE.y)

      expect(readInfoPopupLines()).toEqual(['Trading Post'])
    })
  })

  describe('the rate', () => {
    test('with no Marketplace owned, Wood sells for the five-Marketplace rate of 75 gold', async () => {
      const { user } = await startInTradingPost()

      await pickResourceToGive(user, 'Wood')

      expect(readTradeRates()).toContain('Gold 75')
    })

    test('with no Marketplace owned, two Gems buy one Wood, the five-Marketplace rate', async () => {
      const { user } = await startInTradingPost()

      await pickResourceToGive(user, 'Gems')

      expect(readTradeRates()).toContain('Wood 1/2')
    })

    test("the player's own Marketplace doesn't change the Trading Post's rate", async () => {
      const { user } = await startInTradingPost(
        aTradingPostScenario({ towns: [aTownWithAMarketplace()] })
      )

      await pickResourceToGive(user, 'Wood')

      expect(readTradeRates()).toContain('Gold 75')
    })
  })

  describe('trading', () => {
    test('a trade takes the resources given and adds the ones received on the resource bar', async () => {
      const { user } = await startInTradingPost()
      await pickResourceToGive(user, 'Wood')
      await pickResourceToReceive(user, 'Gold')
      setTradeQuantity(4)

      await trade(user)

      expectResourceTotal('Wood', 19)
      expectResourceTotal('Gold', 1300)
    })

    test('after a trade the merchant says it was quite a bargain', async () => {
      const { user } = await startInTradingPost()
      await pickResourceToGive(user, 'Wood')
      await pickResourceToReceive(user, 'Gold')
      setTradeQuantity(1)

      await trade(user)

      expect(readMerchantLine()).toBe(QUITE_A_BARGAIN)
    })

    test('a trade is kept after a reload', async () => {
      const scenario = aTradingPostScenario()
      const eventLog = createMemoryEventLog()
      const { user } = await startInTradingPost(scenario, { eventLog })
      await pickResourceToGive(user, 'Wood')
      await pickResourceToReceive(user, 'Gold')
      setTradeQuantity(4)
      await trade(user)

      await setupApp(scenario, { eventLog })

      expectResourceTotal('Wood', 19)
      expectResourceTotal('Gold', 1300)
    })
  })
})
