import {
  APP_COMMAND_TOWN_RECRUIT_REQUESTED,
  APP_FACT_TOWN_CREATURES_RECRUITED,
  APP_FACT_TOWN_LEFT,
  APP_UI_TOWN_MESSAGE_OPENED,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { openRecruitWindow } from '../presentation/recruit-window.js'

export const registerTownRecruitViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let town = null
    let recruitWindow = null
    let message = null
    let openTier = null

    function cloneTemplate(id) {
      return document.getElementById(id).content.firstElementChild.cloneNode(true)
    }

    function townScreen() {
      return gameShell.querySelector('.town-screen')
    }

    function openTierOf(update) {
      return update?.creatures?.[openTier - 1] ?? null
    }

    function openRecruitWindowFor(tierNumber) {
      const tier = town?.creatures?.[tierNumber - 1]
      if (!tier || recruitWindow) {
        return
      }

      openTier = tierNumber
      recruitWindow = openRecruitWindow({
        document,
        container: townScreen(),
        offer: tier,
        onRecruit: ({ creature, count }) =>
          emit(APP_COMMAND_TOWN_RECRUIT_REQUESTED, {
            entityId: town.entityId,
            tier: openTier,
            creature,
            count
          }),
        onCancel: closeRecruitWindow
      })
    }

    function closeRecruitWindow() {
      closeMessage()
      recruitWindow?.close()
      recruitWindow = null
      openTier = null
    }

    function openMessage(text) {
      closeMessage()
      message = cloneTemplate('town-message-template')
      message.querySelector('.town-message__text').textContent = text
      townScreen()?.append(message)
      message.querySelector('.town-message').focus()
    }

    function closeMessage() {
      message?.remove()
      message = null
    }

    function onTownUpdated(update) {
      if (update.entityId !== town?.entityId) {
        closeRecruitWindow()
      }

      town = update
      const tier = openTierOf(town)
      if (recruitWindow && tier) {
        recruitWindow.update(tier)
      } else if (recruitWindow) {
        closeRecruitWindow()
      }
    }

    function onClick(event) {
      const { target } = event
      if (target.closest('[data-town-message-action="close"]')) {
        closeMessage()
      } else if (target.closest('[data-recruit-tier]')) {
        openRecruitWindowFor(Number(target.closest('[data-recruit-tier]').dataset.recruitTier))
      }
    }

    return {
      subscriptions: [
        { type: APP_UI_TOWN_UPDATED, handler: (event) => onTownUpdated(event.detail) },
        { type: APP_FACT_TOWN_CREATURES_RECRUITED, handler: closeRecruitWindow },
        { type: APP_UI_TOWN_MESSAGE_OPENED, handler: (event) => openMessage(event.detail.message) },
        {
          type: APP_FACT_TOWN_LEFT,
          handler: () => {
            closeRecruitWindow()
            town = null
          }
        }
      ],
      domSubscriptions: [{ target: gameShell, type: 'click', handler: onClick }],
      dispose: closeRecruitWindow
    }
  },
  {
    id: 'town-recruit-view',
    phase: 'view',
    consumes: [
      APP_UI_TOWN_UPDATED,
      APP_FACT_TOWN_CREATURES_RECRUITED,
      APP_UI_TOWN_MESSAGE_OPENED,
      APP_FACT_TOWN_LEFT
    ],
    produces: [APP_COMMAND_TOWN_RECRUIT_REQUESTED]
  }
)
