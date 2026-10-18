import {
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_COMMAND_RESET_SESSION_REQUESTED,
  APP_UI_MUSIC_STATE_CHANGED,
  APP_UI_SYSTEM_OPTIONS_CLOSED,
  APP_UI_SYSTEM_OPTIONS_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

function musicLabel(enabled) {
  return enabled ? 'Music: On' : 'Music: Off'
}

// The System options popup behind the gear button: Music, Reset and Return to game.
export const registerSystemOptionsModule = defineModule(
  ({ emit, env }) => {
    const systemOptionsButton = env.document?.getElementById('system-options-button')
    const gameShell = env.document?.querySelector('.game-shell')
    let isMusicEnabled = false
    let dialog = null
    let musicButton = null

    function createButton(label, onClick) {
      const button = env.document.createElement('button')
      button.type = 'button'
      button.className = 'system-options__button'
      button.textContent = label
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        onClick()
      })
      return button
    }

    function renderMusicButton() {
      if (!musicButton) {
        return
      }

      musicButton.textContent = musicLabel(isMusicEnabled)
      musicButton.setAttribute('aria-pressed', isMusicEnabled ? 'true' : 'false')
    }

    function onKeyDown(event) {
      // A modal dialog closes itself on Escape; this covers a dialog shown without showModal.
      if (event.key === 'Escape') {
        closeSystemOptions()
      }
    }

    function openSystemOptions() {
      if (dialog || !env.document || !gameShell) {
        return
      }

      dialog = env.document.createElement('dialog')
      dialog.className = 'system-options'
      dialog.setAttribute('aria-labelledby', 'system-options-title')

      const title = env.document.createElement('h2')
      title.className = 'system-options__title'
      title.id = 'system-options-title'
      title.textContent = 'System options'

      musicButton = createButton(musicLabel(isMusicEnabled), () => {
        emit(APP_COMMAND_MUSIC_TOGGLE_REQUESTED, {})
      })
      renderMusicButton()

      const actions = env.document.createElement('div')
      actions.className = 'system-options__actions'
      actions.append(
        musicButton,
        createButton('Reset', () => {
          emit(APP_COMMAND_RESET_SESSION_REQUESTED, {})
        }),
        createButton('Return to game', closeSystemOptions)
      )

      dialog.append(title, actions)
      dialog.addEventListener('close', closeSystemOptions)
      dialog.addEventListener('click', (event) => {
        event.stopPropagation()
      })
      gameShell.append(dialog)
      env.document.addEventListener('keydown', onKeyDown)

      try {
        dialog.showModal()
      } catch {
        dialog.setAttribute('open', '')
      }

      emit(APP_UI_SYSTEM_OPTIONS_OPENED, {})
    }

    function closeSystemOptions() {
      if (!dialog) {
        return
      }

      const closingDialog = dialog
      dialog = null
      musicButton = null
      env.document?.removeEventListener('keydown', onKeyDown)
      if (closingDialog.open) {
        closingDialog.close?.()
      }
      closingDialog.remove()
      emit(APP_UI_SYSTEM_OPTIONS_CLOSED, {})
    }

    return {
      domSubscriptions: [
        {
          target: systemOptionsButton,
          type: 'click',
          handler: (event) => {
            event?.stopPropagation?.()
            openSystemOptions()
          }
        }
      ],
      subscriptions: [
        {
          type: APP_UI_MUSIC_STATE_CHANGED,
          handler: (event) => {
            isMusicEnabled = Boolean(event.detail.enabled)
            renderMusicButton()
          }
        }
      ],
      dispose: closeSystemOptions
    }
  },
  {
    id: 'system-options',
    phase: 'view',
    consumes: [APP_UI_MUSIC_STATE_CHANGED],
    produces: [
      APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
      APP_COMMAND_RESET_SESSION_REQUESTED,
      APP_UI_SYSTEM_OPTIONS_OPENED,
      APP_UI_SYSTEM_OPTIONS_CLOSED
    ]
  }
)
