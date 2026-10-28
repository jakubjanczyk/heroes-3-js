import {
  APP_COMMAND_TAVERN_HIRE_REQUESTED,
  APP_COMMAND_TAVERN_OPEN_REQUESTED,
  APP_FACT_HERO_HIRED,
  APP_FACT_TOWN_LEFT,
  APP_UI_TAVERN_UPDATED,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { renderHeroBox } from '../presentation/hero-box.js'

// The Tavern opens from the Tavern on the town picture: the heroes for hire, none picked until the
// player clicks one, and Recruit. Holding the right button on a hero shows their hero box until it is let go.
export const registerTavernViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let townId = null
    let tavern = null
    let tavernWindow = null
    let selectedIndex = null
    let heroPopup = null
    // Updates for a tavern the player has closed are not shown until they open it again.
    let isOpenRequested = false

    function part(selector) {
      return tavernWindow.querySelector(selector)
    }

    function renderHeroButton(hero, index) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'tavern-window__hero'
      button.dataset.heroIndex = String(index)
      button.dataset.statusText = `Select ${hero.name}`
      button.setAttribute('aria-label', hero.name)
      button.setAttribute('aria-pressed', String(index === selectedIndex))
      button.textContent = hero.name.charAt(0)
      return button
    }

    function render() {
      const selected = tavern.heroes[selectedIndex]
      part('.tavern-window__rumour').textContent = tavern.rumour
      part('.tavern-window__heroes').replaceChildren(...tavern.heroes.map(renderHeroButton))
      part('.tavern-window__description').textContent = selected?.description ?? ''
      part('.tavern-window__amount').textContent = String(tavern.cost)
      const recruit = part('[data-tavern-action="recruit"]')
      recruit.disabled = !selected || !tavern.canHire
      recruit.dataset.statusText = selected ? `Recruit ${selected.name}` : ''
    }

    function open(update) {
      if (!tavernWindow && !isOpenRequested) {
        return
      }
      if (!tavernWindow) {
        isOpenRequested = false
        selectedIndex = null
        tavernWindow = document
          .getElementById('tavern-window-template')
          .content.firstElementChild.cloneNode(true)
        gameShell.querySelector('.town-screen')?.append(tavernWindow)
        part('.tavern-window').focus()
      }
      tavern = update
      render()
    }

    function closeHeroPopup() {
      heroPopup?.remove()
      heroPopup = null
    }

    function close() {
      closeHeroPopup()
      tavernWindow?.remove()
      tavernWindow = null
      tavern = null
    }

    function showStatus(text) {
      part('.tavern-window__status').textContent = text
    }

    function openHeroPopup(heroButton) {
      closeHeroPopup()
      const hero = tavern.heroes[Number(heroButton.dataset.heroIndex)]
      heroPopup = document.createElement('div')
      heroPopup.className = 'info-popup info-popup--hero message-box'
      heroPopup.setAttribute('role', 'tooltip')
      const box = document.createElement('div')
      renderHeroBox(box, document, hero)
      heroPopup.append(box)
      gameShell.append(heroPopup)

      const portrait = heroButton.getBoundingClientRect()
      const { width } = heroPopup.getBoundingClientRect()
      heroPopup.style.left = `${Math.max(0, portrait.left + portrait.width / 2 - width / 2)}px`
      heroPopup.style.top = `${portrait.bottom}px`
    }

    function heroButtonAt(target) {
      return tavernWindow?.contains(target) ? target.closest('.tavern-window__hero') : null
    }

    function onClick(event) {
      const { target } = event
      if (target.closest('[data-town-action="tavern"]')) {
        isOpenRequested = true
        emit(APP_COMMAND_TAVERN_OPEN_REQUESTED, { entityId: townId })
        return
      }
      if (!tavernWindow?.contains(target)) {
        return
      }

      const heroButton = heroButtonAt(target)
      if (heroButton) {
        selectedIndex = Number(heroButton.dataset.heroIndex)
        render()
      } else if (target.closest('[data-tavern-action="recruit"]')) {
        emit(APP_COMMAND_TAVERN_HIRE_REQUESTED, {
          entityId: townId,
          slot: tavern.heroes[selectedIndex]?.slot
        })
      } else if (target.closest('[data-tavern-action="close"]')) {
        close()
      }
    }

    function onPointerDown(event) {
      const heroButton = heroButtonAt(event.target)
      if (heroButton && event.button === 2) {
        openHeroPopup(heroButton)
      }
    }

    function onMouseOver(event) {
      if (tavernWindow?.contains(event.target)) {
        showStatus(event.target.closest('[data-status-text]')?.dataset.statusText ?? '')
      }
    }

    function onKeyDown(event) {
      if (tavernWindow && event.key === 'Escape') {
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
        { type: APP_UI_TAVERN_UPDATED, handler: (event) => open(event.detail) },
        { type: APP_FACT_HERO_HIRED, handler: close },
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
        { target: gameShell, type: 'pointerdown', handler: onPointerDown },
        { target: gameShell, type: 'mouseover', handler: onMouseOver },
        { target: gameShell, type: 'keydown', handler: onKeyDown },
        {
          target: gameShell,
          type: 'contextmenu',
          handler: (event) => {
            if (heroButtonAt(event.target)) {
              event.preventDefault()
            }
          }
        },
        { target: env.window, type: 'pointerup', handler: closeHeroPopup },
        { target: env.window, type: 'pointercancel', handler: closeHeroPopup }
      ],
      dispose: close
    }
  },
  {
    id: 'tavern-view',
    phase: 'view',
    consumes: [APP_UI_TOWN_UPDATED, APP_UI_TAVERN_UPDATED, APP_FACT_HERO_HIRED, APP_FACT_TOWN_LEFT],
    produces: [APP_COMMAND_TAVERN_OPEN_REQUESTED, APP_COMMAND_TAVERN_HIRE_REQUESTED]
  }
)
