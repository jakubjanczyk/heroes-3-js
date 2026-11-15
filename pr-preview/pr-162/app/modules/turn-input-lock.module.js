import { activePlayer, viewingPlayer } from '../../game/state/queries.js'
import { defineModule } from './shared/module-runtime.js'

const BLOCKED_INPUTS = [
  'click',
  'dblclick',
  'auxclick',
  'contextmenu',
  'pointerdown',
  'mousedown',
  'keydown'
]

// While another player takes their turn every click, press and key the player makes is stopped
// before any part of the screen hears it.
export const registerTurnInputLockModule = defineModule(
  ({ env, state }) => {
    const gameShell = env.document?.querySelector('.game-shell')

    function isOtherPlayersTurn() {
      const current = state.get()
      const player = current ? activePlayer(current) : null
      return Boolean(player) && player !== viewingPlayer(current)
    }

    // A key pressed with nothing focused goes to the window, the document or its body.
    function isOnGameScreen(target) {
      if (!target?.nodeType || target === env.document || target === env.document?.body) {
        return true
      }
      return Boolean(gameShell?.contains(target))
    }

    function stopInput(event) {
      if (isOtherPlayersTurn() && isOnGameScreen(event.target)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }

    return {
      domSubscriptions: env.window
        ? BLOCKED_INPUTS.map((type) => ({
            target: env.window,
            type,
            handler: stopInput,
            options: { capture: true }
          }))
        : []
    }
  },
  { id: 'turn-input-lock', phase: 'view', consumes: [], produces: [] }
)
