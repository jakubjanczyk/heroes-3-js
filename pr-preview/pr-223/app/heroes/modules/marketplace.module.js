import { mostLots, tradeOf, tradeRate } from '../../../game/heroes/marketplace.js'
import { resourcesOf } from '../../../game/heroes/state/kingdoms.js'
import { builtIn, marketplaceCountOf, townOwner } from '../../../game/heroes/state/towns.js'
import { viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_MARKETPLACE_OPEN_REQUESTED,
  APP_COMMAND_MARKETPLACE_TRADE_REQUESTED,
  APP_FACT_RESOURCES_TRADED,
  APP_FACT_WORLD_READY,
  APP_UI_MARKETPLACE_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerMarketplaceModule = defineModule(
  ({ emit, state }) => {
    let definitions = {}

    function traderOf(current, townId) {
      const player = townOwner(current, townId)
      if (player !== viewingPlayer(current) || !builtIn(current, townId).has('MARKETPLACE')) {
        return null
      }
      return { player, marketplaces: marketplaceCountOf(current, player) }
    }

    function ratesOf(resourceTypes, marketplaces) {
      return Object.fromEntries(
        resourceTypes.map((given) => [
          given,
          Object.fromEntries(
            resourceTypes.map((received) => [
              received,
              tradeRate(definitions.marketplace, marketplaces, given, received)
            ])
          )
        ])
      )
    }

    function show(townId, { traded = false } = {}) {
      const current = state.get()
      const trader = traderOf(current, townId)
      if (!trader) {
        return
      }
      const held = resourcesOf(current, trader.player)
      const resourceTypes = Object.keys(definitions.resources ?? {})
      emit(APP_UI_MARKETPLACE_UPDATED, {
        townId,
        traded,
        resources: resourceTypes.map((resourceType) => ({
          resourceType,
          name: definitions.resources[resourceType].name,
          amount: held[resourceType] ?? 0
        })),
        rates: ratesOf(resourceTypes, trader.marketplaces)
      })
    }

    function trade({ townId, given, received, lots }) {
      const current = state.get()
      const trader = traderOf(current, townId)
      const rate =
        trader && tradeRate(definitions.marketplace, trader.marketplaces, given, received)
      const held = resourcesOf(current, trader?.player)[given] ?? 0
      if (!rate || !Number.isInteger(lots) || lots < 1 || lots > mostLots(rate, held)) {
        return
      }
      const amounts = tradeOf(rate, lots)
      emit(APP_FACT_RESOURCES_TRADED, {
        player: trader.player,
        given: { [given]: amounts.given },
        received: { [received]: amounts.received }
      })
      show(townId, { traded: true })
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
          }
        },
        {
          type: APP_COMMAND_MARKETPLACE_OPEN_REQUESTED,
          handler: (event) => show(event.detail.entityId)
        },
        {
          type: APP_COMMAND_MARKETPLACE_TRADE_REQUESTED,
          handler: (event) => trade(event.detail)
        }
      ]
    }
  },
  {
    id: 'marketplace',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_COMMAND_MARKETPLACE_OPEN_REQUESTED,
      APP_COMMAND_MARKETPLACE_TRADE_REQUESTED
    ],
    produces: [APP_UI_MARKETPLACE_UPDATED, APP_FACT_RESOURCES_TRADED]
  }
)
