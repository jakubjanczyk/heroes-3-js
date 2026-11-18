import {
  banishedMessage,
  daysLeftMessage,
  GAME_END_MESSAGES,
  isBanished,
  playerBanishedMessage,
  playerName,
  vanquishedMessage
} from '../../../game/heroes/game-end.js'
import { daysWithoutTownOf, townIdsOf } from '../../../game/heroes/state/towns.js'
import {
  activePlayer,
  gameResult,
  heroIdsOf,
  isStandardVictoryAndLossOn,
  playerColors,
  viewingPlayer
} from '../../../game/state/queries.js'
import {
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_PLAYER_TURN_ENDED,
  APP_FACT_PLAYER_VANQUISHED,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_GAME_ENDED,
  APP_UI_INTERACTION_MODAL_CONFIRMED,
  APP_UI_NOTICE_OPENED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const GAME_END_SUBJECT = 'game-end'

const flagOf = (player) => ({ label: `${playerName(player)} player flag`, player, caption: [] })

const hasNothingLeft = (state, player) =>
  heroIdsOf(state, player).length === 0 && townIdsOf(state, player).length === 0

export const registerGameEndModule = defineModule(
  ({ emit, state }) => {
    let isRestoring = false
    let isCheckQueued = false
    let isWarningQueued = false

    function announce(message, player, subject = null) {
      emit(APP_UI_NOTICE_OPENED, { title: null, message, rewards: [flagOf(player)], subject })
    }

    function vanquish(player) {
      emit(APP_FACT_PLAYER_VANQUISHED, { player })
      if (player !== viewingPlayer(state.get())) {
        announce(vanquishedMessage(player), player)
      }
    }

    const isGameOn = (current) =>
      !isRestoring && isStandardVictoryAndLossOn(current) && !gameResult(current)

    function announceGameEnd(message) {
      const result = gameResult(state.get())
      if (result) {
        const viewing = viewingPlayer(state.get())
        announce(message ?? GAME_END_MESSAGES[result], viewing, GAME_END_SUBJECT)
      }
    }

    function checkPlayers() {
      isCheckQueued = false
      const current = state.get()
      if (!isGameOn(current)) {
        return
      }

      for (const player of playerColors(current).filter((color) =>
        hasNothingLeft(current, color)
      )) {
        vanquish(player)
      }
      announceGameEnd()
    }

    // The player is told at once; a computer player's heroes leave the map, back to the taverns.
    function banish(player) {
      const current = state.get()
      emit(APP_FACT_PLAYER_VANQUISHED, { player })
      if (player === viewingPlayer(current)) {
        announceGameEnd(playerBanishedMessage(player))
        return
      }
      announce(banishedMessage(player), player)
      for (const heroId of heroIdsOf(current, player)) {
        emit(APP_FACT_ENTITY_REMOVED, { entityId: heroId })
      }
      announceGameEnd()
    }

    function checkDaysWithoutTown(player) {
      const current = state.get()
      if (isGameOn(current) && isBanished(daysWithoutTownOf(current, player))) {
        banish(player)
      }
    }

    function warnPlayerWithoutTown() {
      isWarningQueued = false
      const current = state.get()
      const player = viewingPlayer(current)
      const days = daysWithoutTownOf(current, player)
      if (isGameOn(current) && activePlayer(current) === player && days !== null) {
        announce(daysLeftMessage(player, days), player)
      }
    }

    // After the new day's own windows (a new week).
    function queueTurnStartWarning() {
      if (!isRestoring && !isWarningQueued) {
        isWarningQueued = true
        queueMicrotask(warnPlayerWithoutTown)
      }
    }

    // Checked once what caused it has settled, so its own windows (captured artifacts, a
    // level-up) come first.
    function queueCheck() {
      if (!isRestoring && !isCheckQueued) {
        isCheckQueued = true
        queueMicrotask(checkPlayers)
      }
    }

    function endGame() {
      const result = gameResult(state.get())
      if (result) {
        emit(APP_UI_GAME_ENDED, { result })
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: () => {
            isCheckQueued = false
            isWarningQueued = false
          }
        },
        { type: APP_FACT_ENTITY_REMOVED, handler: queueCheck },
        {
          type: APP_FACT_PLAYER_TURN_ENDED,
          handler: (event) => {
            checkDaysWithoutTown(event.detail?.player)
            queueTurnStartWarning()
          }
        },
        { type: APP_FACT_TURN_ENDED, handler: queueTurnStartWarning },
        { type: APP_FACT_TOWN_CAPTURED, handler: queueCheck },
        {
          type: APP_UI_INTERACTION_MODAL_CONFIRMED,
          handler: (event) => {
            if (event.detail?.subject === GAME_END_SUBJECT) {
              endGame()
            }
          }
        },
        { type: APP_UI_RESTORE_STARTED, handler: () => (isRestoring = true) },
        {
          type: APP_UI_RESTORE_COMPLETED,
          handler: () => {
            isRestoring = false
            endGame()
          }
        }
      ]
    }
  },
  {
    id: 'game-end',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_ENTITY_REMOVED,
      APP_FACT_PLAYER_TURN_ENDED,
      APP_FACT_TURN_ENDED,
      APP_FACT_TOWN_CAPTURED,
      APP_UI_INTERACTION_MODAL_CONFIRMED,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED
    ],
    produces: [
      APP_FACT_PLAYER_VANQUISHED,
      APP_FACT_ENTITY_REMOVED,
      APP_UI_NOTICE_OPENED,
      APP_UI_GAME_ENDED
    ]
  }
)
