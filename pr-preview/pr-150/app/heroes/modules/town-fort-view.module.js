import { APP_FACT_TOWN_LEFT, APP_UI_TOWN_UPDATED } from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

function formatDamage({ min, max }) {
  return min === max ? String(min) : `${min}-${max}`
}

function statRows({ attack, defense, damage, health, speed, growth }) {
  return [
    ['Attack', String(attack)],
    ['Defense', String(defense)],
    ['Damage', formatDamage(damage)],
    ['Health', String(health)],
    ['Speed', String(speed)],
    ['Growth', String(growth)]
  ]
}

// The Fort window opens from the town screen's Fort icon, as in Heroes 3: a card for each creature
// tier. Clicking a built dwelling's card opens its recruit window over it (town-recruit-view);
// recruiting goes back to the Fort window, which shows the new numbers.
export const registerTownFortViewModule = defineModule(
  ({ env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let town = null
    let fortWindow = null

    function cloneTemplate(id) {
      return document.getElementById(id).content.firstElementChild.cloneNode(true)
    }

    function renderStats(list, stats) {
      list.replaceChildren(
        ...statRows(stats).flatMap(([label, value]) => {
          const term = document.createElement('dt')
          term.textContent = label
          const definition = document.createElement('dd')
          definition.textContent = value
          return [term, definition]
        })
      )
    }

    function renderCard(card) {
      const article = cloneTemplate('fort-card-template')
      article.setAttribute('aria-label', card.name)
      article.classList.toggle('fort-card--unbuilt', !card.canRecruit)
      if (card.canRecruit) {
        article.dataset.recruitTier = String(card.tier)
        article.title = `Recruit ${card.name}`
      }
      article.querySelector('.fort-card__name').textContent = card.name
      article.querySelector('.fort-card__dwelling-name').textContent = card.dwelling
      article.querySelector('.fort-card__available').textContent = `Available: ${card.available}`
      // Until creatures have pictures, the name stands in for the creature.
      article.querySelector('.fort-card__creature').textContent = card.name
      renderStats(article.querySelector('.fort-card__stats'), card.stats)
      return article
    }

    function renderFortWindow() {
      const { fort } = town
      if (!fort) {
        closeFortWindow()
        return
      }

      fortWindow.querySelector('.fort-window').setAttribute('aria-label', fort.name)
      fortWindow.querySelector('.fort-window__title').textContent = fort.name
      fortWindow.querySelector('.fort-window__cards').replaceChildren(...fort.cards.map(renderCard))
    }

    function openFortWindow() {
      const townScreen = gameShell.querySelector('.town-screen')
      if (!town?.fort || !townScreen || fortWindow) {
        return
      }

      fortWindow = cloneTemplate('fort-window-template')
      townScreen.append(fortWindow)
      renderFortWindow()
    }

    function closeFortWindow() {
      fortWindow?.remove()
      fortWindow = null
    }

    function onTownUpdated(update) {
      if (update.entityId !== town?.entityId) {
        closeFortWindow()
      }

      town = update
      if (fortWindow) {
        renderFortWindow()
      }
    }

    function onClick(event) {
      const { target } = event
      if (target.closest('[data-town-action="fort"]')) {
        openFortWindow()
      } else if (target.closest('[data-fort-action="close"]')) {
        closeFortWindow()
      }
    }

    return {
      subscriptions: [
        { type: APP_UI_TOWN_UPDATED, handler: (event) => onTownUpdated(event.detail) },
        {
          type: APP_FACT_TOWN_LEFT,
          handler: () => {
            closeFortWindow()
            town = null
          }
        }
      ],
      domSubscriptions: [{ target: gameShell, type: 'click', handler: onClick }],
      dispose: closeFortWindow
    }
  },
  {
    id: 'town-fort-view',
    phase: 'view',
    consumes: [APP_UI_TOWN_UPDATED, APP_FACT_TOWN_LEFT],
    produces: []
  }
)
