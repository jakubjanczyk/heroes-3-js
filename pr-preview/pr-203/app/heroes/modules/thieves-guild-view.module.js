import {
  APP_FACT_HERO_HIRED,
  APP_FACT_TOWN_LEFT,
  APP_UI_THIEVES_GUILD_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createPlayerFlag } from '../presentation/player-flag.js'

const CLOSING_KEYS = new Set(['Escape', 'Enter'])

export const registerThievesGuildViewModule = defineModule(
  ({ env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let guildWindow = null

    function element(tagName, className, text) {
      const created = document.createElement(tagName)
      if (className) {
        created.className = className
      }
      if (text !== undefined) {
        created.textContent = text
      }
      return created
    }

    function rowOf(name, cells) {
      const row = element('tr', 'thieves-guild__row')
      row.setAttribute('aria-label', name)
      const header = element('th', 'thieves-guild__statistic', name)
      header.scope = 'row'
      row.append(header, ...cells)
      return row
    }

    function emptyCells(count) {
      return Array.from({ length: count }, () => element('td', 'thieves-guild__cell'))
    }

    function rankedRow({ name, places }, placeCount) {
      if (!places) {
        return rowOf(name, emptyCells(placeCount))
      }
      const cells = emptyCells(placeCount)
      places.forEach((players, index) => {
        const flags = element('div', 'thieves-guild__flags')
        flags.append(...players.map((player) => createPlayerFlag(document, player)))
        cells[index].append(flags)
      })
      return rowOf(name, cells)
    }

    function picture(className, name, text = '') {
      const created = element('div', className, text)
      created.setAttribute('role', 'img')
      created.setAttribute('aria-label', name)
      created.title = name
      return created
    }

    function heroContent({ hero }) {
      if (!hero) {
        return []
      }
      const skills = element('ul', 'thieves-guild__skills')
      skills.append(
        ...hero.skills.map(({ name, value }) => {
          const item = element('li', 'thieves-guild__skill')
          item.append(
            element('span', 'thieves-guild__skill-name', name),
            element('span', 'thieves-guild__skill-value', String(value))
          )
          return item
        })
      )
      return [
        picture('thieves-guild__portrait', hero.name, hero.name.charAt(0)),
        element('span', 'thieves-guild__hero-name', hero.name),
        ...(hero.skills.length > 0 ? [skills] : [])
      ]
    }

    function personalityContent({ personality }) {
      return [element('span', 'thieves-guild__personality', personality)]
    }

    function monsterContent({ monster }) {
      return monster ? [picture('thieves-guild__monster entity--monster', monster)] : []
    }

    function playerBoxRow(name, boxes, placeCount, describe) {
      if (!boxes) {
        return rowOf(name, emptyCells(placeCount))
      }
      const cells = boxes.map((box) => {
        const cell = element('td', 'thieves-guild__cell thieves-guild__player-box')
        cell.dataset.player = box.player
        cell.append(createPlayerFlag(document, box.player), ...describe(box))
        return cell
      })
      return rowOf(name, cells)
    }

    function render({ places, rankings, bestHeroes, personalities, bestMonsters }) {
      const placeHeaders = places.map((place) => {
        const header = element('th', 'thieves-guild__place', place)
        header.scope = 'col'
        return header
      })
      guildWindow.querySelector('.thieves-guild__places').append(...placeHeaders)
      guildWindow
        .querySelector('.thieves-guild__rows')
        .append(
          ...rankings.map((ranking) => rankedRow(ranking, places.length)),
          playerBoxRow('Best Hero', bestHeroes, places.length, heroContent),
          playerBoxRow('Personality', personalities, places.length, personalityContent),
          playerBoxRow('Best Monster', bestMonsters, places.length, monsterContent)
        )
    }

    function close() {
      guildWindow?.remove()
      guildWindow = null
    }

    function onClick(event) {
      if (event.target.closest('[data-thieves-guild-action="exit"]')) {
        close()
      }
    }

    function onKeyDown(event) {
      if (CLOSING_KEYS.has(event.key)) {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }

    function onMouseOver(event) {
      guildWindow.querySelector('.thieves-guild__status').textContent =
        event.target.closest('[data-status-text]')?.dataset.statusText ?? ''
    }

    function open(report) {
      close()
      guildWindow = document
        .getElementById('thieves-guild-template')
        .content.firstElementChild.cloneNode(true)
      guildWindow.addEventListener('click', onClick)
      guildWindow.addEventListener('keydown', onKeyDown)
      guildWindow.addEventListener('mouseover', onMouseOver)
      render(report)
      gameShell.querySelector('.town-screen')?.append(guildWindow)
      guildWindow.querySelector('.thieves-guild').focus()
    }

    return {
      subscriptions: [
        { type: APP_UI_THIEVES_GUILD_UPDATED, handler: (event) => open(event.detail) },
        { type: APP_FACT_HERO_HIRED, handler: close },
        { type: APP_FACT_TOWN_LEFT, handler: close }
      ],
      dispose: close
    }
  },
  {
    id: 'thieves-guild-view',
    phase: 'view',
    consumes: [APP_UI_THIEVES_GUILD_UPDATED, APP_FACT_HERO_HIRED, APP_FACT_TOWN_LEFT],
    produces: []
  }
)
