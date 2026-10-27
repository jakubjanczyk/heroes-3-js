import { defineModule } from './shared/module-runtime.js'

const OPEN_DIALOGS =
  'dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]'
const ADVENTURE_PANEL = '.adventure-panel'

function keyName(key) {
  if (key === ' ') {
    return 'Space'
  }

  return key.length === 1 ? key.toUpperCase() : key
}

// Space and Enter already press a focused button.
const pressesFocusedButton = (event) =>
  (event.key === ' ' || event.key === 'Enter') &&
  Boolean(event.target?.closest?.('button, [role="button"], input, select, textarea, a[href]'))

// A key presses the enabled button listing it in `aria-keyshortcuts` on the top screen: the last
// open dialog, else the adventure panel. So a shortcut works exactly when a click would.
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
