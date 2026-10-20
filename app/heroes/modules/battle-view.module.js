import { findHero } from '../../../game/domain/entity-queries.js'
import {
  BATTLEFIELD_COLUMNS,
  BATTLEFIELD_ROWS,
  getStartHexes
} from '../../../game/heroes/battlefield.js'
import { describeStack, getHeroArmy } from '../../../game/heroes/hero-army.js'
import {
  APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
  APP_FACT_BATTLE_ENDED,
  APP_FACT_BATTLE_STARTED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const DEFAULT_HERO_NAME = 'Hero'

// The Heroes 3 combat bar, left to right, with the message log between Auto combat and Cast
// spell. Icons are stand-ins for the game's. Only Auto combat works yet: it wins the battle.
const LEFT_BUTTONS = [
  { label: 'System options', icon: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5' },
  { label: 'Surrender', icon: 'M6 21V3M6 4h11l-3 4 3 4H6' },
  { label: 'Retreat', icon: 'M13 4a2 2 0 1 0 0 .1M9 21l3-7 3 3v4M12 14l-1-5 4 2 3-1M11 9l-4 3' },
  { label: 'Auto combat', icon: 'M4 4l16 16M20 4L4 20M3 15l6 6M15 21l6-6', works: true }
]
const RIGHT_BUTTONS = [
  {
    label: 'Cast spell',
    icon: 'M5 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5zM19 4h-4a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h4z'
  },
  { label: 'Wait', icon: 'M6 3h12v2l-4 7 4 7v2H6v-2l4-7-4-7z' },
  { label: 'Defend', icon: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z' }
]

// Full-screen battle over the adventure map: the battlefield with its hexes, the heroes and the
// stacks, and the combat bar along the bottom.
export const registerBattleViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let map = null
    let hero = null
    let heroName = DEFAULT_HERO_NAME
    let definitions = {}
    let battleScreen = null

    function createElement(tagName, className, attributes = {}) {
      const element = document.createElement(tagName)
      element.className = className
      for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value)
      }
      return element
    }

    function createButton({ label, icon, works = false }) {
      const button = createElement('button', 'battle-button', {
        type: 'button',
        'aria-label': label
      })
      button.title = works ? label : `${label} (not available yet)`
      button.disabled = !works
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('class', 'battle-button__icon')
      svg.setAttribute('viewBox', '0 0 24 24')
      svg.setAttribute('aria-hidden', 'true')
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', icon)
      svg.append(path)
      button.append(svg)
      if (works) {
        button.addEventListener('click', (event) => {
          event.stopPropagation()
          emit(APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED, {})
        })
      }
      return button
    }

    // No creature pictures yet: a stack is drawn as monsters are on the map, with its count.
    function createStack({ name, count }, side) {
      const stack = createElement('div', `battle-stack battle-stack--${side}`)
      const creature = createElement('div', 'battle-stack__creature entity--monster', {
        role: 'img',
        'aria-label': name
      })
      creature.title = name
      const countLabel = createElement('span', 'battle-stack__count')
      countLabel.textContent = String(count)
      stack.append(creature, countLabel)
      return stack
    }

    function placeArmy(hexes, stacks, side) {
      const startHexes = getStartHexes({ side, stackCount: stacks.length })
      stacks.forEach((stack, index) => {
        const { row, column } = startHexes[index]
        hexes[row][column].append(createStack(stack, side))
      })
    }

    function createBattlefield(battle) {
      const grid = createElement('div', 'battlefield', {
        role: 'grid',
        'aria-label': 'Battlefield',
        'aria-rowcount': String(BATTLEFIELD_ROWS),
        'aria-colcount': String(BATTLEFIELD_COLUMNS)
      })
      const hexes = Array.from({ length: BATTLEFIELD_ROWS }, (_, row) => {
        const rowElement = createElement('div', 'battlefield__row', {
          role: 'row',
          'aria-rowindex': String(row + 1)
        })
        grid.append(rowElement)
        return Array.from({ length: BATTLEFIELD_COLUMNS }, (_, column) => {
          const hex = createElement('div', 'battlefield__hex', {
            role: 'gridcell',
            'aria-colindex': String(column + 1)
          })
          rowElement.append(hex)
          return hex
        })
      })

      placeArmy(hexes, getHeroArmy({ entity: hero, definitions }).filter(Boolean), 'attacker')
      placeArmy(
        hexes,
        [describeStack({ creature: battle.entityType, count: battle.count }, definitions)],
        'defender'
      )
      return grid
    }

    function createField(battle) {
      const field = createElement('div', 'battle-screen__field')
      const terrainName = map?.getTerrainType(battle.tile)?.name
      const ground = createElement(
        'div',
        `battle-screen__ground${terrainName ? ` terrain-tile--${terrainName}` : ''}`,
        { 'aria-label': 'Battlefield ground' }
      )
      const sky = createElement('div', 'battle-screen__sky', { 'aria-hidden': 'true' })
      const heroFigure = createElement('div', 'battle-hero battle-hero--attacker', {
        role: 'img',
        'aria-label': heroName
      })
      heroFigure.title = heroName
      field.append(ground, sky, heroFigure, createBattlefield(battle))
      return field
    }

    function createCombatBar() {
      const bar = createElement('div', 'battle-bar')
      const log = createElement('div', 'battle-bar__log', {
        role: 'log',
        'aria-label': 'Combat messages'
      })
      const scroll = createElement('div', 'battle-bar__scroll', { 'aria-hidden': 'true' })
      scroll.append(
        createElement('span', 'battle-bar__arrow battle-bar__arrow--up'),
        createElement('span', 'battle-bar__arrow battle-bar__arrow--down')
      )
      bar.append(...LEFT_BUTTONS.map(createButton), log, scroll, ...RIGHT_BUTTONS.map(createButton))
      return bar
    }

    function openBattle(battle) {
      closeBattle()
      if (!gameShell) {
        return
      }

      battleScreen = createElement('section', 'battle-screen', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'Battle'
      })
      const statusBar = createElement('div', 'battle-screen__status-bar', {
        role: 'status',
        'aria-label': 'Battle status bar'
      })
      battleScreen.append(createField(battle), createCombatBar(), statusBar)
      gameShell.append(battleScreen)
      emit(APP_UI_ADVENTURE_MAP_COVERED, {})
    }

    function closeBattle() {
      if (!battleScreen) {
        return
      }

      battleScreen.remove()
      battleScreen = null
      emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            map = event.detail.map
            hero = findHero(event.detail.scenario.entities)
            heroName = event.detail.definitions?.hero?.name ?? DEFAULT_HERO_NAME
            definitions = event.detail.definitions ?? {}
          }
        },
        {
          type: APP_FACT_BATTLE_STARTED,
          handler: (event) => {
            openBattle(event.detail)
          }
        },
        {
          type: APP_FACT_BATTLE_ENDED,
          handler: closeBattle
        }
      ],
      dispose: () => {
        battleScreen?.remove()
        battleScreen = null
      }
    }
  },
  {
    id: 'battle-view',
    phase: 'view',
    consumes: [APP_FACT_WORLD_READY, APP_FACT_BATTLE_STARTED, APP_FACT_BATTLE_ENDED],
    produces: [
      APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED
    ]
  }
)
