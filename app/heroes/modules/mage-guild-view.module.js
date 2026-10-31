import {
  APP_COMMAND_MAGE_GUILD_OPEN_REQUESTED,
  APP_FACT_TOWN_LEFT,
  APP_UI_MAGE_GUILD_UPDATED,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { renderDescriptionPopup } from '../presentation/artifacts.js'
import { SCROLL_PLACES, SCROLL_SIZE } from '../presentation/mage-guild-room.js'

function placeAt(element, [x, y]) {
  element.style.setProperty('--x', String(x))
  element.style.setProperty('--y', String(y))
  element.style.setProperty('--w', String(SCROLL_SIZE.width))
  element.style.setProperty('--h', String(SCROLL_SIZE.height))
}

// The Mage Guild opens from the Mage Guild on the town picture: each level's spells on scrolls,
// closed scrolls for the levels not built yet. Hovering a spell names it, clicking it shows its
// description until OK, holding the right button on it shows the description until it is let go.
export const registerMageGuildViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let townId = null
    let guild = null
    let guildWindow = null
    let popup = null
    let isOpenRequested = false

    function part(selector) {
      return guildWindow.querySelector(selector)
    }

    function renderSpell(spell, place) {
      const scroll = document.createElement('button')
      scroll.type = 'button'
      scroll.className = 'mage-guild__scroll'
      scroll.dataset.spell = spell.spellId
      scroll.dataset.status = spell.name
      scroll.setAttribute('aria-label', spell.name)
      const name = document.createElement('span')
      name.className = 'mage-guild__spell-name'
      name.textContent = spell.name
      scroll.append(name)
      placeAt(scroll, place)
      return scroll
    }

    function renderClosedScroll(place) {
      const scroll = document.createElement('div')
      scroll.className = 'mage-guild__scroll mage-guild__scroll--closed'
      scroll.setAttribute('role', 'img')
      scroll.setAttribute('aria-label', 'Closed scroll')
      placeAt(scroll, place)
      return scroll
    }

    function renderLevel({ level, spells, closedScrolls }) {
      const group = document.createElement('div')
      group.className = 'mage-guild__level'
      group.setAttribute('role', 'group')
      group.setAttribute('aria-label', `Level ${level}`)
      const places = SCROLL_PLACES[level]
      group.append(
        ...spells.map((spell, index) => renderSpell(spell, places[index])),
        ...Array.from({ length: closedScrolls }, (_, index) => renderClosedScroll(places[index]))
      )
      return group
    }

    function open(update) {
      if (!guildWindow && !isOpenRequested) {
        return
      }
      if (!guildWindow) {
        isOpenRequested = false
        guildWindow = document
          .getElementById('mage-guild-template')
          .content.firstElementChild.cloneNode(true)
        gameShell.querySelector('.town-screen')?.append(guildWindow)
        part('.mage-guild').focus()
      }
      guild = update
      part('.mage-guild__levels').replaceChildren(...guild.levels.map(renderLevel))
    }

    function closePopup() {
      popup?.remove()
      popup = null
    }

    function close() {
      closePopup()
      guildWindow?.remove()
      guildWindow = null
      guild = null
    }

    function spellAt(target) {
      const spellId = target?.closest?.('.mage-guild__scroll')?.dataset.spell
      return spellId
        ? guild.levels.flatMap(({ spells }) => spells).find((spell) => spell.spellId === spellId)
        : null
    }

    function closeMessage() {
      part('.mage-guild__message')?.remove()
      part('.mage-guild').focus()
    }

    function showMessage({ name, description }) {
      part('.mage-guild__message')?.remove()
      const message = document.createElement('div')
      message.className = 'mage-guild__message message-box'
      message.setAttribute('role', 'alertdialog')
      message.setAttribute('aria-modal', 'true')
      message.setAttribute('aria-label', name)
      const heading = document.createElement('h2')
      heading.textContent = name
      const text = document.createElement('p')
      text.textContent = description
      const ok = document.createElement('button')
      ok.type = 'button'
      ok.className = 'mage-guild__message-ok'
      ok.setAttribute('aria-label', 'OK')
      ok.setAttribute('aria-keyshortcuts', 'Enter Escape')
      ok.textContent = 'OK'
      message.append(heading, text, ok)
      part('.mage-guild').append(message)
      ok.focus()
    }

    function openPopup(source, spell) {
      closePopup()
      popup = renderDescriptionPopup(document, {
        title: spell.name,
        description: spell.description
      })
      gameShell.append(popup)
      const sourceBox = source.getBoundingClientRect()
      const { width } = popup.getBoundingClientRect()
      popup.style.left = `${Math.max(0, sourceBox.left + sourceBox.width / 2 - width / 2)}px`
      popup.style.top = `${sourceBox.bottom}px`
    }

    function onClick(event) {
      const { target } = event
      if (target.closest('[data-town-action="mage-guild"]')) {
        isOpenRequested = true
        emit(APP_COMMAND_MAGE_GUILD_OPEN_REQUESTED, { entityId: townId })
        return
      }
      if (!guildWindow?.contains(target)) {
        return
      }

      if (target.closest('.mage-guild__message-ok')) {
        closeMessage()
      } else if (target.closest('[data-mage-guild-action="close"]')) {
        close()
      } else {
        const spell = spellAt(target)
        if (spell) {
          showMessage(spell)
        }
      }
    }

    function onKeyDown(event) {
      if (!guildWindow || (event.key !== 'Escape' && event.key !== 'Enter')) {
        return
      }
      event.stopPropagation()
      event.preventDefault()
      if (part('.mage-guild__message')) {
        closeMessage()
      } else {
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
        { type: APP_UI_MAGE_GUILD_UPDATED, handler: (event) => open(event.detail) },
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
        { target: gameShell, type: 'keydown', handler: onKeyDown },
        {
          target: gameShell,
          type: 'pointerdown',
          handler: (event) => {
            const source = event.target?.closest?.('.mage-guild__scroll')
            const spell = guildWindow?.contains(source) ? spellAt(source) : null
            if (spell && event.button === 2) {
              openPopup(source, spell)
            }
          }
        },
        {
          target: gameShell,
          type: 'contextmenu',
          handler: (event) => {
            if (guildWindow?.contains(event.target)) {
              event.preventDefault()
            }
          }
        },
        {
          target: gameShell,
          type: 'mouseover',
          handler: (event) => {
            if (guildWindow?.contains(event.target)) {
              part('.mage-guild__status').textContent =
                event.target.closest('[data-status]')?.dataset.status ?? ''
            }
          }
        },
        { target: env.window, type: 'pointerup', handler: closePopup },
        { target: env.window, type: 'pointercancel', handler: closePopup }
      ],
      dispose: close
    }
  },
  {
    id: 'mage-guild-view',
    phase: 'view',
    consumes: [APP_UI_TOWN_UPDATED, APP_UI_MAGE_GUILD_UPDATED, APP_FACT_TOWN_LEFT],
    produces: [APP_COMMAND_MAGE_GUILD_OPEN_REQUESTED]
  }
)
