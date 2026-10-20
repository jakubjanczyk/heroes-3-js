import { defineModule } from './shared/module-runtime.js'

// The screen on top takes the keys: the last open dialog (System options, the battle...), or the
// adventure screen's panel when none is open.
const OPEN_DIALOGS = 'dialog[open], [role="dialog"][aria-modal="true"]'
const ADVENTURE_PANEL = '.adventure-panel'

const keyName = (key) => (key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key)

// Space and Enter already press a focused button.
const pressesFocusedButton = (event) =>
  (event.key === ' ' || event.key === 'Enter') &&
  Boolean(event.target?.closest?.('button, input, select, textarea, a[href]'))

// A key presses the button on the top screen whose `aria-keyshortcuts` lists it, unless the button
// is disabled, so a shortcut does what a click does and only when a click would.
export const registerKeyboardShortcutsModule = defineModule(
  ({ env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')

    function findTopScreen() {
      const dialogs = gameShell.querySelectorAll(OPEN_DIALOGS)
      return dialogs.length > 0
        ? dialogs[dialogs.length - 1]
        : gameShell.querySelector(ADVENTURE_PANEL)
    }

    function findButtonFor(key) {
      const buttons = findTopScreen()?.querySelectorAll('button[aria-keyshortcuts]') ?? []
      return [...buttons].find((button) =>
        button.getAttribute('aria-keyshortcuts').split(' ').includes(key)
      )
    }

    return {
      domSubscriptions: [
        {
          target: document,
          type: 'keydown',
          handler: (event) => {
            if (
              !gameShell ||
              event.repeat ||
              event.ctrlKey ||
              event.altKey ||
              event.metaKey ||
              pressesFocusedButton(event)
            ) {
              return
            }

            const button = findButtonFor(keyName(event.key))
            if (!button || button.disabled) {
              return
            }

            event.preventDefault()
            button.click()
          }
        }
      ]
    }
  },
  { id: 'keyboard-shortcuts', phase: 'view', consumes: [], produces: [] }
)
