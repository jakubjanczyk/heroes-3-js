import { rollResourceGeneratorRewards } from '../../../game/heroes/resource-generators.js'
import { isResourceGeneratorVisited } from '../../../game/heroes/state/map-objects.js'
import { activePlayer, heroOwner, turnNumber } from '../../../game/state/queries.js'
import {
  APP_COMMAND_RESOURCE_GENERATOR_VISIT_REQUESTED,
  APP_FACT_RESOURCE_GENERATOR_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_NOTICE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { getResourceSpriteStyle } from '../presentation/resource-sprites.js'

const MILL_KEEPER = 'The keeper of the mill announces: '
const LEPRECHAUN_GARDEN = 'The sound of music brings you to a small garden, where you'
const LEPRECHAUN_DANCING = 'a leprechaun who is happily dancing about in the clearing.'

const MESSAGES_BY_TYPE = Object.freeze({
  WINDMILL: {
    gives: `${MILL_KEEPER}"Milord, I have been working very hard to provide you with these resources, come back next week for more."`,
    empty: `${MILL_KEEPER}"Milord, I am sorry, there are no resources currently available. Please try again next week."`
  },
  WATER_WHEEL: {
    gives: `${MILL_KEEPER}"Milord, I have been working very hard to provide you with this gold, come back next week for more."`,
    empty: `${MILL_KEEPER}"Milord, I am sorry, there is no gold currently available. Please try again next week."`
  },
  MYSTICAL_GARDEN: {
    gives: `${LEPRECHAUN_GARDEN} are able to sneak up on ${LEPRECHAUN_DANCING} You capture him, and in exchange for his freedom he guides you to a small pot filled with precious things.`,
    empty: `${LEPRECHAUN_GARDEN} attempt to sneak up on ${LEPRECHAUN_DANCING} You try to capture him, but his nimbleness allows him to elude you.`
  }
})

export const registerResourceGeneratorsModule = defineModule(
  ({ emit, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let definitions = {}

    function describeRewards(resources) {
      return Object.entries(resources).map(([resourceType, amount]) => ({
        label: `${amount} ${definitions.resources?.[resourceType]?.name ?? resourceType}`,
        amount,
        picture: getResourceSpriteStyle(resourceType).backgroundImage
      }))
    }

    function visit({ heroId, entityId }) {
      const current = state.get()
      const generator = current.resourceGenerators[entityId]
      if (!generator || heroOwner(current, heroId) !== activePlayer(current)) {
        return
      }

      const messages = MESSAGES_BY_TYPE[generator.type]
      if (isResourceGeneratorVisited(current, entityId)) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: messages.empty })
        return
      }

      const resources = rollResourceGeneratorRewards(generator.type, {
        turnNumber: turnNumber(current),
        random
      })
      emit(APP_FACT_RESOURCE_GENERATOR_VISITED, {
        heroId,
        entityId,
        entityType: generator.type,
        resources
      })
      emit(APP_UI_NOTICE_OPENED, {
        title: null,
        message: messages.gives,
        rewards: describeRewards(resources)
      })
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
          type: APP_COMMAND_RESOURCE_GENERATOR_VISIT_REQUESTED,
          handler: (event) => visit(event.detail)
        }
      ]
    }
  },
  {
    id: 'resource-generators',
    phase: 'domain',
    consumes: [APP_FACT_WORLD_READY, APP_COMMAND_RESOURCE_GENERATOR_VISIT_REQUESTED],
    produces: [APP_FACT_RESOURCE_GENERATOR_VISITED, APP_UI_NOTICE_OPENED]
  }
)
