import { activePlayer, viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_FACT_PLAYER_TURN_ENDED,
  APP_FACT_TURN_ENDED,
  APP_UI_RESTORE_COMPLETED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

export const registerMinimapShieldViewModule = defineModule(
  ({ env, state }) => {
    const shield = env.document?.getElementById('minimap-shield')

    function showShieldDuringComputersTurn() {
      const current = state.get()
      const player = current ? activePlayer(current) : null
      if (shield) {
        shield.hidden = !player || player === viewingPlayer(current)
      }
    }

    return {
      subscriptions: [
        { type: APP_FACT_PLAYER_TURN_ENDED, handler: showShieldDuringComputersTurn },
        { type: APP_FACT_TURN_ENDED, handler: showShieldDuringComputersTurn },
        { type: APP_UI_RESTORE_COMPLETED, handler: showShieldDuringComputersTurn }
      ]
    }
  },
  {
    id: 'minimap-shield-view',
    phase: 'view',
    consumes: [APP_FACT_PLAYER_TURN_ENDED, APP_FACT_TURN_ENDED, APP_UI_RESTORE_COMPLETED],
    produces: []
  }
)
