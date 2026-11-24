import { DIFFICULTY_LEVELS } from '../../../game/heroes/scenario-info.js'
import { APP_FACT_WORLD_READY, APP_UI_SCENARIO_INFO_UPDATED } from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createPlayerFlag } from '../presentation/player-flag.js'

const DIFFICULTY_PIECES = ['\u265F', '\u265E', '\u265C', '\u265B', '\u265A']

export const registerScenarioInfoViewModule = defineModule(
  ({ env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let infoScreen = null

    function part(selector) {
      return infoScreen.querySelector(selector)
    }

    function element(tagName, className, text) {
      const created = document.createElement(tagName)
      created.className = className
      if (text !== undefined) {
        created.textContent = text
      }
      return created
    }

    // A picture box with its caption under it, as the game draws a starting town or hero.
    function pictureCell(kind, name) {
      const cell = element('td', `scenario-info__cell scenario-info__cell--${kind}`)
      const picture = element('div', `scenario-info__picture scenario-info__picture--${kind}`)
      picture.setAttribute('aria-hidden', 'true')
      picture.textContent = name.charAt(0)
      cell.append(picture, element('span', `scenario-info__${kind}-name`, name))
      return cell
    }

    function playerRow({ player, isHuman, town, hero }) {
      const row = element('tr', 'scenario-info__player')
      row.dataset.player = player
      const banner = element('th', 'scenario-info__banner')
      banner.scope = 'row'
      banner.append(createPlayerFlag(document, player))
      const name = element('td', 'scenario-info__cell scenario-info__cell--name')
      name.append(
        element('span', 'scenario-info__player-name', isHuman ? 'Player' : 'Computer'),
        element('span', 'scenario-info__handicap', isHuman ? 'Human' : 'CPU')
      )
      row.append(banner, name, pictureCell('town', town), pictureCell('hero', hero))
      return row
    }

    function flags(players) {
      return players.map((player) => createPlayerFlag(document, player))
    }

    function difficultyPieces(selected) {
      return DIFFICULTY_LEVELS.map((level, index) => {
        const piece = element('span', 'scenario-info__piece', DIFFICULTY_PIECES[index])
        piece.setAttribute('role', 'img')
        piece.setAttribute('aria-label', level)
        piece.title = level
        if (level === selected) {
          piece.setAttribute('aria-current', 'true')
        }
        return piece
      })
    }

    function render(info) {
      part('.scenario-info__players-rows').replaceChildren(...info.players.map(playerRow))
      part('.scenario-info__name').textContent = info.name
      part('.scenario-info__map-size-letter').textContent = info.mapSizeLetter
      part('.scenario-info__map-size-tiles').textContent = info.mapSize
      part('.scenario-info__description').textContent = info.description
      part('.scenario-info__victory').textContent = info.victory
      part('.scenario-info__loss').textContent = info.loss
      part('.scenario-info__allies').replaceChildren(...flags(info.allies))
      part('.scenario-info__enemies').replaceChildren(...flags(info.enemies))
      part('.scenario-info__map-difficulty').textContent = info.difficulty
      part('.scenario-info__player-difficulty').replaceChildren(
        ...difficultyPieces(info.difficulty)
      )
      part('.scenario-info__rating').textContent = info.rating
    }

    function close() {
      infoScreen?.remove()
      infoScreen = null
    }

    function onClick(event) {
      event.stopPropagation()
      if (event.target.closest('[data-scenario-info-action="back"]')) {
        close()
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }

    function open(info) {
      close()
      if (!gameShell) {
        return
      }
      infoScreen = document
        .getElementById('scenario-info-template')
        .content.firstElementChild.cloneNode(true)
      infoScreen.addEventListener('click', onClick)
      infoScreen.addEventListener('keydown', onKeyDown)
      render(info)
      gameShell.append(infoScreen)
      part('.scenario-info').focus()
    }

    return {
      subscriptions: [
        { type: APP_UI_SCENARIO_INFO_UPDATED, handler: (event) => open(event.detail) },
        { type: APP_FACT_WORLD_READY, handler: close }
      ],
      dispose: close
    }
  },
  {
    id: 'scenario-info-view',
    phase: 'view',
    consumes: [APP_UI_SCENARIO_INFO_UPDATED, APP_FACT_WORLD_READY],
    produces: []
  }
)
