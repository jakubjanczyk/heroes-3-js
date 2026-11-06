import {
  APP_COMMAND_DWELLING_RECRUIT_REQUESTED,
  APP_FACT_DWELLING_CREATURES_RECRUITED,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_DWELLING_RECRUIT_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { openRecruitWindow } from '../presentation/recruit-window.js'

export const registerDwellingRecruitViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let recruitWindow = null

    function open({ heroId, entityId, available, recruits }) {
      if (recruitWindow || !gameShell) {
        return
      }

      recruitWindow = openRecruitWindow({
        document,
        container: gameShell,
        offer: { available, recruits },
        onRecruit: ({ creature, count }) =>
          emit(APP_COMMAND_DWELLING_RECRUIT_REQUESTED, { heroId, entityId, creature, count }),
        onCancel: close
      })
      emit(APP_UI_ADVENTURE_MAP_COVERED, {})
    }

    function close() {
      if (!recruitWindow) {
        return
      }

      recruitWindow.close()
      recruitWindow = null
      emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
    }

    return {
      subscriptions: [
        { type: APP_UI_DWELLING_RECRUIT_UPDATED, handler: (event) => open(event.detail) },
        { type: APP_FACT_DWELLING_CREATURES_RECRUITED, handler: close }
      ],
      dispose: close
    }
  },
  {
    id: 'dwelling-recruit-view',
    phase: 'view',
    consumes: [APP_UI_DWELLING_RECRUIT_UPDATED, APP_FACT_DWELLING_CREATURES_RECRUITED],
    produces: [
      APP_COMMAND_DWELLING_RECRUIT_REQUESTED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED
    ]
  }
)
