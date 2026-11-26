import {
  APP_COMMAND_BLACKSMITH_BUY_REQUESTED,
  APP_COMMAND_BLACKSMITH_OPEN_REQUESTED,
  APP_FACT_HERO_ARTIFACTS_CHANGED,
  APP_FACT_TOWN_LEFT,
  APP_UI_BLACKSMITH_UPDATED,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { openRecruitWindow } from '../presentation/recruit-window.js'

export const registerBlacksmithViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let recruitWindow = null
    let townId = null

    function open({ entityId, offer }) {
      const townScreen = gameShell?.querySelector('.town-screen')
      if (recruitWindow || !townScreen) {
        return
      }
      recruitWindow = openRecruitWindow({
        document,
        container: townScreen,
        offer,
        onRecruit: () => emit(APP_COMMAND_BLACKSMITH_BUY_REQUESTED, { entityId }),
        onCancel: close
      })
    }

    function close() {
      recruitWindow?.close()
      recruitWindow = null
    }

    function onClick(event) {
      if (townId && event.target.closest('[data-town-action="blacksmith"]')) {
        emit(APP_COMMAND_BLACKSMITH_OPEN_REQUESTED, { entityId: townId })
      }
    }

    return {
      subscriptions: [
        {
          type: APP_UI_TOWN_UPDATED,
          handler: (event) => {
            townId = event.detail.entityId
          }
        },
        { type: APP_UI_BLACKSMITH_UPDATED, handler: (event) => open(event.detail) },
        { type: APP_FACT_HERO_ARTIFACTS_CHANGED, handler: close },
        {
          type: APP_FACT_TOWN_LEFT,
          handler: () => {
            close()
            townId = null
          }
        }
      ],
      domSubscriptions: [{ target: gameShell, type: 'click', handler: onClick }],
      dispose: close
    }
  },
  {
    id: 'blacksmith-view',
    phase: 'view',
    consumes: [
      APP_UI_TOWN_UPDATED,
      APP_UI_BLACKSMITH_UPDATED,
      APP_FACT_HERO_ARTIFACTS_CHANGED,
      APP_FACT_TOWN_LEFT
    ],
    produces: [APP_COMMAND_BLACKSMITH_OPEN_REQUESTED, APP_COMMAND_BLACKSMITH_BUY_REQUESTED]
  }
)
