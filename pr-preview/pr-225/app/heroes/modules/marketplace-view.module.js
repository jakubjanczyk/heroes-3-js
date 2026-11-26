import { mostLots } from '../../../game/heroes/marketplace.js'
import {
  APP_COMMAND_MARKETPLACE_OPEN_REQUESTED,
  APP_COMMAND_MARKETPLACE_TRADE_REQUESTED,
  APP_FACT_TOWN_LEFT,
  APP_UI_MARKETPLACE_UPDATED,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const INSPECT_OUR_WARES =
  'Please inspect our fine wares.  If you feel like offering a trade, click on the items you wish to trade with and for.'
const QUITE_A_BARGAIN =
  'You have received quite a bargain.  I expect to make no profit on the deal.  Can I interest you in any of my other wares?'
const CLOSING_KEYS = new Set(['Escape', 'Enter'])

const unitsOf = (amount) => (amount === 1 ? 'unit' : 'units')

// What one lot gives, and what it costs when that is more than one: "25", "1/10".
function rateText(rate) {
  if (!rate) {
    return 'n/a'
  }
  return rate.give === 1 ? String(rate.receive) : `${rate.receive}/${rate.give}`
}

export const registerMarketplaceViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let townId = null
    let isOpenRequested = false
    let marketWindow = null
    let market = null
    let given = null
    let received = null
    let hasTraded = false

    function part(selector) {
      return marketWindow.querySelector(selector)
    }

    function pickedRate() {
      return given && received ? market.rates[given]?.[received] : null
    }

    function nameOf(resourceType) {
      return market.resources.find((resource) => resource.resourceType === resourceType)?.name
    }

    function amountHeld(resourceType) {
      return market.resources.find((resource) => resource.resourceType === resourceType)?.amount
    }

    function resourceButton({ resourceType, name }, side, text) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'marketplace__resource'
      button.dataset.resource = resourceType
      button.dataset.marketplaceSide = side
      button.setAttribute('aria-label', name)
      button.title = name
      const picked = side === 'give' ? given : received
      button.setAttribute('aria-pressed', String(resourceType === picked))
      const icon = document.createElement('span')
      icon.className = 'resource-icon marketplace__icon'
      icon.setAttribute('aria-hidden', 'true')
      const caption = document.createElement('span')
      caption.className = 'marketplace__caption'
      caption.textContent = text
      button.append(icon, caption)
      return button
    }

    function merchantLine() {
      const rate = pickedRate()
      if (rate) {
        return `I can offer you ${rate.receive} ${unitsOf(rate.receive)} of ${nameOf(received)} for ${rate.give} ${unitsOf(rate.give)} of ${nameOf(given)}.`
      }
      return hasTraded ? QUITE_A_BARGAIN : INSPECT_OUR_WARES
    }

    function renderShowcase(selector, resourceType, amount) {
      const showcase = part(selector)
      showcase.dataset.resource = resourceType ?? ''
      showcase.querySelector('.marketplace__showcase-amount').textContent =
        amount === null ? '' : String(amount)
    }

    function renderDeal() {
      const rate = pickedRate()
      const slider = part('.count-slider__range')
      slider.max = String(mostLots(rate, amountHeld(given)))
      slider.value = String(Math.min(Number(slider.value), Number(slider.max)))
      const lots = Number(slider.value)
      renderShowcase('[data-showcase="give"]', rate && given, rate ? rate.give * lots : null)
      renderShowcase(
        '[data-showcase="receive"]',
        rate && received,
        rate ? rate.receive * lots : null
      )
      part('[data-marketplace-action="trade"]').disabled = !rate || lots === 0
    }

    function render() {
      part('[data-marketplace-panel="give"]').replaceChildren(
        ...market.resources.map((resource) =>
          resourceButton(resource, 'give', String(resource.amount))
        )
      )
      part('[data-marketplace-panel="receive"]').replaceChildren(
        ...market.resources.map((resource) =>
          resourceButton(
            resource,
            'receive',
            given ? rateText(market.rates[given]?.[resource.resourceType]) : ''
          )
        )
      )
      part('.marketplace__merchant').textContent = merchantLine()
      renderDeal()
    }

    function setLots(lots) {
      part('.count-slider__range').value = String(lots)
      renderDeal()
    }

    function close() {
      marketWindow?.remove()
      marketWindow = null
      market = null
    }

    function clearPicks() {
      given = null
      received = null
      part('.count-slider__range').value = '0'
    }

    function open(update) {
      if (!marketWindow && !isOpenRequested) {
        return
      }
      isOpenRequested = false
      market = update
      if (!marketWindow) {
        given = null
        received = null
        hasTraded = false
        marketWindow = document
          .getElementById('marketplace-template')
          .content.firstElementChild.cloneNode(true)
        gameShell.querySelector('.town-screen')?.append(marketWindow)
        part('.marketplace').focus()
      }
      if (update.traded) {
        hasTraded = true
        clearPicks()
      }
      render()
    }

    function pick(button) {
      if (button.dataset.marketplaceSide === 'give') {
        given = button.dataset.resource
      } else {
        received = button.dataset.resource
      }
      part('.count-slider__range').value = '0'
      render()
    }

    const actions = {
      fewer: () => setLots(Number(part('.count-slider__range').value) - 1),
      more: () => setLots(Number(part('.count-slider__range').value) + 1),
      max: () => setLots(part('.count-slider__range').max),
      trade: () =>
        emit(APP_COMMAND_MARKETPLACE_TRADE_REQUESTED, {
          townId,
          given,
          received,
          lots: Number(part('.count-slider__range').value)
        }),
      done: close
    }

    function onClick(event) {
      const { target } = event
      if (target.closest('[data-town-action="marketplace"]')) {
        isOpenRequested = true
        emit(APP_COMMAND_MARKETPLACE_OPEN_REQUESTED, { entityId: townId })
        return
      }
      if (!marketWindow?.contains(target)) {
        return
      }
      const resource = target.closest('[data-marketplace-side]')
      const action = target.closest('[data-marketplace-action]')?.dataset.marketplaceAction
      if (resource) {
        pick(resource)
      } else if (action) {
        actions[action]()
      }
    }

    function onInput(event) {
      if (marketWindow?.contains(event.target)) {
        renderDeal()
      }
    }

    function onKeyDown(event) {
      if (marketWindow && CLOSING_KEYS.has(event.key)) {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }

    return {
      subscriptions: [
        {
          type: APP_UI_TOWN_UPDATED,
          handler: (event) => {
            if (event.detail.entityId !== townId) {
              close()
            }
            townId = event.detail.entityId
          }
        },
        { type: APP_UI_MARKETPLACE_UPDATED, handler: (event) => open(event.detail) },
        {
          type: APP_FACT_TOWN_LEFT,
          handler: () => {
            close()
            townId = null
          }
        }
      ],
      domSubscriptions: [
        { target: gameShell, type: 'click', handler: onClick },
        { target: gameShell, type: 'input', handler: onInput },
        { target: gameShell, type: 'keydown', handler: onKeyDown }
      ],
      dispose: close
    }
  },
  {
    id: 'marketplace-view',
    phase: 'view',
    consumes: [APP_UI_TOWN_UPDATED, APP_UI_MARKETPLACE_UPDATED, APP_FACT_TOWN_LEFT],
    produces: [APP_COMMAND_MARKETPLACE_OPEN_REQUESTED, APP_COMMAND_MARKETPLACE_TRADE_REQUESTED]
  }
)
