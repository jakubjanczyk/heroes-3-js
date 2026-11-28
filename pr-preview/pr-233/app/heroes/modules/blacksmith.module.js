import { isTown } from '../../../game/domain/entity-queries.js'
import { swapIntoSlot } from '../../../game/heroes/artifacts.js'
import {
  describeBlacksmith,
  ONLY_VISITING_HEROES,
  warMachineCost,
  warMachineSoldIn
} from '../../../game/heroes/blacksmith.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { resourcesOf } from '../../../game/heroes/state/kingdoms.js'
import { builtIn, townOwner, townType } from '../../../game/heroes/state/towns.js'
import { activePlayer, heroIdAt } from '../../../game/state/queries.js'
import {
  APP_COMMAND_BLACKSMITH_BUY_REQUESTED,
  APP_COMMAND_BLACKSMITH_OPEN_REQUESTED,
  APP_FACT_HERO_ARTIFACTS_CHANGED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_WORLD_READY,
  APP_UI_BLACKSMITH_UPDATED,
  APP_UI_TOWN_MESSAGE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerBlacksmithModule = defineModule(
  ({ emit, emitAll, state }) => {
    let definitions = {}
    let townsById = new Map()

    function treasuryOf(townId) {
      return resourcesOf(state.get(), townOwner(state.get(), townId))
    }

    function isPlayersTurnIn(townId) {
      return townOwner(state.get(), townId) === activePlayer(state.get())
    }

    function warMachineOf(townId) {
      if (!townsById.has(townId) || !builtIn(state.get(), townId).has('BLACKSMITH')) {
        return null
      }
      return warMachineSoldIn(definitions, townType(state.get(), townId))
    }

    function visitingHeroOf(townId) {
      return heroById(state.get(), heroIdAt(state.get(), townsById.get(townId).tile))
    }

    function offerFor(townId) {
      return describeBlacksmith({
        artifactId: warMachineOf(townId),
        hero: visitingHeroOf(townId),
        definitions,
        treasury: treasuryOf(townId)
      })
    }

    function open(townId) {
      if (!warMachineOf(townId) || !isPlayersTurnIn(townId)) {
        return
      }
      if (!visitingHeroOf(townId)) {
        emit(APP_UI_TOWN_MESSAGE_OPENED, { message: ONLY_VISITING_HEROES })
        return
      }
      emit(APP_UI_BLACKSMITH_UPDATED, { entityId: townId, offer: offerFor(townId) })
    }

    function buy(townId) {
      const artifactId = warMachineOf(townId)
      const hero = artifactId && isPlayersTurnIn(townId) && visitingHeroOf(townId)
      if (!hero || offerFor(townId).recruits[0].maxCount < 1) {
        return
      }
      const slot = definitions.artifacts[artifactId].slot
      const { artifacts } = swapIntoSlot(hero.artifacts, artifactId, slot, definitions)
      emitAll([
        {
          type: APP_FACT_RESOURCES_SPENT,
          detail: {
            player: townOwner(state.get(), townId),
            resources: { ...warMachineCost(artifactId, definitions) },
            reason: 'town.blacksmith',
            entityId: townId
          }
        },
        { type: APP_FACT_HERO_ARTIFACTS_CHANGED, detail: { heroId: hero.id, artifacts } }
      ])
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
            townsById = new Map(
              event.detail.scenario.entities.filter(isTown).map((town) => [town.id, town])
            )
          }
        },
        {
          type: APP_COMMAND_BLACKSMITH_OPEN_REQUESTED,
          handler: (event) => open(event.detail.entityId)
        },
        {
          type: APP_COMMAND_BLACKSMITH_BUY_REQUESTED,
          handler: (event) => buy(event.detail.entityId)
        }
      ]
    }
  },
  {
    id: 'blacksmith',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_COMMAND_BLACKSMITH_OPEN_REQUESTED,
      APP_COMMAND_BLACKSMITH_BUY_REQUESTED
    ],
    produces: [
      APP_UI_BLACKSMITH_UPDATED,
      APP_UI_TOWN_MESSAGE_OPENED,
      APP_FACT_RESOURCES_SPENT,
      APP_FACT_HERO_ARTIFACTS_CHANGED
    ]
  }
)
