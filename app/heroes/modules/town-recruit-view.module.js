import {
  APP_COMMAND_TOWN_RECRUIT_REQUESTED,
  APP_FACT_TOWN_CREATURES_RECRUITED,
  APP_FACT_TOWN_LEFT,
  APP_UI_TOWN_MESSAGE_OPENED,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

// The recruit window opens from a creature in the town screen's panel, as in Heroes 3: the
// dwelling's creatures (the upgraded one chosen first), what one costs, how many are available, and
// a slider up to as many as the player can pay for. Recruiting closes it.
export const registerTownRecruitViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let town = null
    let recruitWindow = null
    let message = null
    let openTier = null
    let chosenCreature = null

    function cloneTemplate(id) {
      return document.getElementById(id).content.firstElementChild.cloneNode(true)
    }

    function townScreen() {
      return gameShell.querySelector('.town-screen')
    }

    function openTierOf(update) {
      return update?.creatures?.[openTier - 1] ?? null
    }

    function chosenRecruit(tier) {
      return tier.recruits.find(({ creature }) => creature === chosenCreature)
    }

    function slider() {
      return recruitWindow.querySelector('.recruit-window__slider')
    }

    function renderCost(list, cost, count) {
      list.replaceChildren(
        ...cost.map(({ resource, amount }) => {
          const item = document.createElement('li')
          item.textContent = `${amount * count} ${resource}`
          return item
        })
      )
    }

    function renderCount() {
      const recruit = chosenRecruit(openTierOf(town))
      const count = Number(slider().value)
      recruitWindow.querySelector('.recruit-window__count').textContent = String(count)
      renderCost(recruitWindow.querySelector('.recruit-window__total'), recruit.cost, count)
      recruitWindow.querySelector('[data-recruit-action="recruit"]').disabled = count === 0
    }

    function renderChoice(recruit) {
      const choice = document.createElement('button')
      choice.type = 'button'
      choice.className = 'recruit-window__creature entity--monster'
      choice.dataset.recruitCreature = recruit.creature
      choice.setAttribute('aria-label', recruit.name)
      choice.title = recruit.name
      choice.setAttribute('aria-pressed', String(recruit.creature === chosenCreature))
      // Until creatures have pictures, the name tells the plain and upgraded creature apart.
      const caption = document.createElement('span')
      caption.className = 'recruit-window__creature-name'
      caption.textContent = recruit.name
      choice.append(caption)
      return choice
    }

    // The slider starts at one creature when there is one the player can pay for, else at none.
    function renderRecruitWindow({ resetCount }) {
      const tier = openTierOf(town)
      const recruit = tier && chosenRecruit(tier)
      if (!recruit) {
        closeRecruitWindow()
        return
      }

      const title = `Recruit ${recruit.name}`
      recruitWindow.querySelector('.recruit-window').setAttribute('aria-label', title)
      recruitWindow.querySelector('.recruit-window__title').textContent = title
      recruitWindow
        .querySelector('.recruit-window__creatures')
        .replaceChildren(...tier.recruits.map(renderChoice))
      renderCost(recruitWindow.querySelector('.recruit-window__cost'), recruit.cost, 1)
      recruitWindow.querySelector('.recruit-window__available').textContent = String(tier.available)
      const previousCount = Number(slider().value)
      slider().max = String(recruit.maxCount)
      slider().value = String(Math.min(resetCount ? 1 : previousCount, recruit.maxCount))
      renderCount()
    }

    function openRecruitWindow(tierNumber) {
      const tier = town?.creatures?.[tierNumber - 1]
      if (!tier || recruitWindow) {
        return
      }

      openTier = tierNumber
      chosenCreature = tier.recruits.at(-1).creature
      recruitWindow = cloneTemplate('recruit-window-template')
      townScreen().append(recruitWindow)
      renderRecruitWindow({ resetCount: true })
      // So Enter recruits rather than pressing the panel's button again.
      recruitWindow.querySelector('.recruit-window').focus()
    }

    function chooseCreature(creature) {
      chosenCreature = creature
      renderRecruitWindow({ resetCount: true })
    }

    function setCount(count) {
      slider().value = String(count)
      renderCount()
    }

    function closeRecruitWindow() {
      closeMessage()
      recruitWindow?.remove()
      recruitWindow = null
      openTier = null
      chosenCreature = null
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
      if (recruitWindow) {
        renderRecruitWindow({ resetCount: false })
      }
    }

    function onRecruitAction(action) {
      const count = Number(slider().value)
      const actions = {
        fewer: () => setCount(count - 1),
        more: () => setCount(count + 1),
        max: () => setCount(slider().max),
        cancel: closeRecruitWindow,
        recruit: () =>
          emit(APP_COMMAND_TOWN_RECRUIT_REQUESTED, {
            entityId: town.entityId,
            tier: openTier,
            creature: chosenCreature,
            count
          })
      }
      actions[action]?.()
    }

    function onClick(event) {
      const { target } = event
      if (target.closest('[data-town-message-action="close"]')) {
        closeMessage()
      } else if (target.closest('[data-recruit-action]')) {
        onRecruitAction(target.closest('[data-recruit-action]').dataset.recruitAction)
      } else if (target.closest('[data-recruit-creature]')) {
        chooseCreature(target.closest('[data-recruit-creature]').dataset.recruitCreature)
      } else if (target.closest('[data-recruit-tier]')) {
        openRecruitWindow(Number(target.closest('[data-recruit-tier]').dataset.recruitTier))
      }
    }

    function onInput(event) {
      if (recruitWindow?.contains(event.target)) {
        renderCount()
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
      domSubscriptions: [
        { target: gameShell, type: 'click', handler: onClick },
        { target: gameShell, type: 'input', handler: onInput }
      ],
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
