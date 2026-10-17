import { calendarDateOfTurn, formatCalendarDate } from '../../../game/heroes/calendar.js'
import {
  APP_COMMAND_END_TURN_REQUESTED,
  APP_COMMAND_MOVE_CONTINUE_REQUESTED,
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_COMMAND_RESET_SESSION_REQUESTED,
  APP_FACT_INCOME_COLLECTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_MUSIC_STATE_CHANGED,
  APP_UI_PREVIEW_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerHudModule = defineModule(
  ({ emit, env }) => {
    const uiLayer = env.document?.querySelector('.ui-layer')
    const calendarStatus = env.document?.getElementById('calendar-status')
    const movementPointsStatus = env.document?.getElementById('movement-points-status')
    const resourceTotalsStatus = env.document?.getElementById('resource-totals-status')
    const moveHeroButton = env.document?.getElementById('move-hero-button')
    const endTurnButton = env.document?.getElementById('end-turn-button')
    const resetSessionButton = env.document?.getElementById('reset-session-button')
    const musicToggleButton = env.document?.getElementById('music-toggle-button')
    const bootStatus = env.document?.getElementById('boot-status')
    let resourceTypeOrder = []
    let resourceNamesByType = {}
    let resourceTotalsByType = {}

    function renderCalendarDate(turnNumber) {
      if (!calendarStatus) {
        return
      }

      calendarStatus.textContent = formatCalendarDate(calendarDateOfTurn(turnNumber))
    }

    function renderResourceTotals() {
      if (!resourceTotalsStatus) {
        return
      }

      if (resourceTypeOrder.length === 0) {
        resourceTotalsStatus.textContent = 'Resources: none'
        return
      }

      const parts = resourceTypeOrder.map(
        (resourceType) =>
          `${resourceNamesByType[resourceType] ?? resourceType}: ${resourceTotalsByType[resourceType] ?? 0}`
      )
      resourceTotalsStatus.textContent = `Resources: ${parts.join(' | ')}`
    }

    function addToResourceTotal(resourceType, amount) {
      if (!resourceTypeOrder.includes(resourceType)) {
        resourceTypeOrder.push(resourceType)
      }

      if (!(resourceType in resourceNamesByType)) {
        resourceNamesByType[resourceType] = resourceType
      }

      const parsedAmount = Number(amount)
      resourceTotalsByType[resourceType] =
        (resourceTotalsByType[resourceType] ?? 0) +
        (Number.isFinite(parsedAmount) ? parsedAmount : 0)
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
          target: musicToggleButton,
          type: 'click',
          handler: (event) => {
            event?.stopPropagation?.()
            emit(APP_COMMAND_MUSIC_TOGGLE_REQUESTED, {})
          }
        },
        {
          target: resetSessionButton,
          type: 'click',
          handler: (event) => {
            event?.stopPropagation?.()
            emit(APP_COMMAND_RESET_SESSION_REQUESTED, {})
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
          type: APP_FACT_MOVEMENT_POINTS_CHANGED,
          handler: (event) => {
            if (!movementPointsStatus) {
              return
            }

            const { value, max } = event.detail
            movementPointsStatus.textContent = `MP: ${value} / ${max}`
          }
        },
        {
          type: APP_UI_MUSIC_STATE_CHANGED,
          handler: (event) => {
            if (!musicToggleButton) {
              return
            }

            const enabled = Boolean(event.detail.enabled)
            musicToggleButton.textContent = enabled ? 'Music: On' : 'Music: Off'
            musicToggleButton.setAttribute?.('aria-pressed', enabled ? 'true' : 'false')
          }
        },
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const definitions = event.detail.definitions?.resources ?? {}
            resourceTypeOrder = Object.keys(definitions)
            resourceNamesByType = {}
            resourceTotalsByType = {}

            for (const resourceType of resourceTypeOrder) {
              resourceNamesByType[resourceType] = definitions[resourceType]?.name ?? resourceType
              resourceTotalsByType[resourceType] = 0
            }

            renderResourceTotals()
            renderCalendarDate(1)

            if (!bootStatus) {
              return
            }

            bootStatus.textContent = `Boot ok: ${event.detail.scenario.meta.id}`
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

            addToResourceTotal(resourceType, event.detail.amount)
            renderResourceTotals()
          }
        },
        {
          type: APP_FACT_INCOME_COLLECTED,
          handler: (event) => {
            for (const [resourceType, amount] of Object.entries(event.detail.income ?? {})) {
              addToResourceTotal(resourceType, amount)
            }
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
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_UI_MUSIC_STATE_CHANGED,
      APP_FACT_WORLD_READY,
      APP_FACT_TURN_ENDED,
      APP_FACT_RESOURCE_COLLECTED,
      APP_FACT_INCOME_COLLECTED
    ],
    produces: [
      APP_COMMAND_MOVE_CONTINUE_REQUESTED,
      APP_COMMAND_END_TURN_REQUESTED,
      APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
      APP_COMMAND_RESET_SESSION_REQUESTED
    ]
  }
)
