import { calendarDateOfTurn, formatCalendarDate } from '../../../game/heroes/calendar.js'
import { resourcesOf } from '../../../game/heroes/state/kingdoms.js'
import { viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_MOVE_CONTINUE_REQUESTED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_RESOURCE_GENERATOR_VISITED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_TREASURE_CHEST_OPENED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_PREVIEW_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerHudModule = defineModule(
  ({ emit, env, state }) => {
    const uiLayer = env.document?.querySelector('.ui-layer')
    const calendarStatus = env.document?.getElementById('calendar-status')
    const resourceBarList = env.document?.getElementById('resource-bar-list')
    const moveHeroButton = env.document?.getElementById('move-hero-button')
    const endTurnButton = env.document?.getElementById('end-turn-button')
    let resourceTypeOrder = []
    let resourceNamesByType = {}

    function renderCalendarDate(turnNumber) {
      if (!calendarStatus) {
        return
      }

      calendarStatus.textContent = formatCalendarDate(calendarDateOfTurn(turnNumber))
    }

    function renderResourceTotals() {
      if (!resourceBarList || !env.document) {
        return
      }

      const resources = resourcesOf(state.get(), viewingPlayer(state.get()))
      // A resource the definitions don't list shows once the player has some, after the others.
      const others = Object.keys(resources).filter(
        (resourceType) => !resourceTypeOrder.includes(resourceType) && resources[resourceType] > 0
      )
      resourceBarList.replaceChildren(
        ...[...resourceTypeOrder, ...others].map((resourceType) => {
          const name = resourceNamesByType[resourceType] ?? resourceType
          const item = env.document.createElement('li')
          item.className = 'resource-bar__item'
          item.dataset.resource = resourceType
          item.title = name

          const icon = env.document.createElement('span')
          icon.className = 'resource-icon'
          icon.setAttribute('aria-hidden', 'true')

          const label = env.document.createElement('span')
          label.className = 'visually-hidden'
          label.textContent = `${name} `

          const amount = env.document.createElement('span')
          amount.className = 'resource-bar__amount'
          amount.textContent = String(resources[resourceType] ?? 0)

          item.append(icon, label, amount)
          return item
        })
      )
    }

    return {
      domSubscriptions: [
        {
          target: moveHeroButton,
          type: 'click',
          handler: (event) => {
            event?.stopPropagation?.()
            emit(APP_COMMAND_MOVE_CONTINUE_REQUESTED, {})
          }
        },
        {
          target: endTurnButton,
          type: 'click',
          handler: (event) => {
            event?.stopPropagation?.()
            emit(APP_COMMAND_END_TURN_REQUESTED, {})
          }
        },
        {
          target: uiLayer,
          type: 'click',
          handler: (event) => {
            event?.stopPropagation?.()
          }
        }
      ],
      subscriptions: [
        {
          type: APP_UI_PREVIEW_UPDATED,
          handler: (event) => {
            if (!moveHeroButton) {
              return
            }

            moveHeroButton.disabled = !event.detail.canMove
          }
        },
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const definitions = event.detail.definitions?.resources ?? {}
            resourceTypeOrder = Object.keys(definitions)
            resourceNamesByType = {}

            for (const resourceType of resourceTypeOrder) {
              resourceNamesByType[resourceType] = definitions[resourceType]?.name ?? resourceType
            }

            renderResourceTotals()
            renderCalendarDate(1)
          }
        },
        {
          type: APP_FACT_TURN_ENDED,
          handler: (event) => {
            renderCalendarDate(event.detail.turnNumber)
            renderResourceTotals()
          }
        },
        { type: APP_FACT_RESOURCE_COLLECTED, handler: renderResourceTotals },
        { type: APP_FACT_RESOURCE_GENERATOR_VISITED, handler: renderResourceTotals },
        { type: APP_FACT_TREASURE_CHEST_OPENED, handler: renderResourceTotals },
        { type: APP_FACT_RESOURCES_SPENT, handler: renderResourceTotals }
      ]
    }
  },
  {
    id: 'hud',
    phase: 'view',
    consumes: [
      APP_UI_PREVIEW_UPDATED,
      APP_FACT_WORLD_READY,
      APP_FACT_TURN_ENDED,
      APP_FACT_RESOURCE_COLLECTED,
      APP_FACT_RESOURCE_GENERATOR_VISITED,
      APP_FACT_TREASURE_CHEST_OPENED,
      APP_FACT_RESOURCES_SPENT
    ],
    produces: [APP_COMMAND_MOVE_CONTINUE_REQUESTED, APP_COMMAND_END_TURN_REQUESTED]
  }
)
