import { calendarDateOfTurn, formatCalendarDate } from '../../../game/heroes/calendar.js'
import { startingResourcesOf } from '../../../game/heroes/starting-resources.js'
import { createTreasury } from '../../../game/heroes/treasury.js'
import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_MOVE_CONTINUE_REQUESTED,
  APP_FACT_INCOME_COLLECTED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_TREASURE_CHEST_OPENED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_PREVIEW_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerHudModule = defineModule(
  ({ emit, env }) => {
    const uiLayer = env.document?.querySelector('.ui-layer')
    const calendarStatus = env.document?.getElementById('calendar-status')
    const resourceBarList = env.document?.getElementById('resource-bar-list')
    const moveHeroButton = env.document?.getElementById('move-hero-button')
    const endTurnButton = env.document?.getElementById('end-turn-button')
    let resourceTypeOrder = []
    let resourceNamesByType = {}
    const treasury = createTreasury()

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

      resourceBarList.replaceChildren(
        ...resourceTypeOrder.map((resourceType) => {
          const name = resourceNamesByType[resourceType] ?? resourceType
          const item = env.document.createElement('li')
          item.className = 'resource-bar__item'
          item.dataset.resource = resourceType
          item.title = name

          const icon = env.document.createElement('span')
          icon.className = 'resource-bar__icon'
          icon.setAttribute('aria-hidden', 'true')

          const label = env.document.createElement('span')
          label.className = 'visually-hidden'
          label.textContent = `${name} `

          const amount = env.document.createElement('span')
          amount.className = 'resource-bar__amount'
          amount.textContent = String(treasury.totals()[resourceType] ?? 0)

          item.append(icon, label, amount)
          return item
        })
      )
    }

    function addToResourceTotals(resources = {}) {
      for (const resourceType of Object.keys(resources)) {
        if (!resourceTypeOrder.includes(resourceType)) {
          resourceTypeOrder.push(resourceType)
        }

        if (!(resourceType in resourceNamesByType)) {
          resourceNamesByType[resourceType] = resourceType
        }
      }

      treasury.add(resources)
      renderResourceTotals()
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
            const startingResources = startingResourcesOf(event.detail.scenario)
            resourceTypeOrder = Object.keys(definitions)
            resourceNamesByType = {}
            treasury.onWorldReady(startingResources)

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
          }
        },
        {
          type: APP_FACT_RESOURCE_COLLECTED,
          handler: (event) => {
            const resourceType = event.detail.entityType
            if (!resourceType) {
              return
            }

            addToResourceTotals({ [resourceType]: event.detail.amount })
          }
        },
        {
          type: APP_FACT_INCOME_COLLECTED,
          handler: (event) => addToResourceTotals(event.detail.income)
        },
        {
          type: APP_FACT_TREASURE_CHEST_OPENED,
          handler: (event) => addToResourceTotals(event.detail.resources)
        },
        {
          type: APP_FACT_RESOURCES_SPENT,
          handler: (event) => {
            treasury.spend(event.detail.resources)
            renderResourceTotals()
          }
        }
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
      APP_FACT_INCOME_COLLECTED,
      APP_FACT_TREASURE_CHEST_OPENED,
      APP_FACT_RESOURCES_SPENT
    ],
    produces: [APP_COMMAND_MOVE_CONTINUE_REQUESTED, APP_COMMAND_END_TURN_REQUESTED]
  }
)
