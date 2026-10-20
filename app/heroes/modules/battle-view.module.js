import {
  BATTLEFIELD_COLUMNS,
  BATTLEFIELD_ROWS,
  getHexDistance
} from '../../../game/heroes/battlefield.js'
import {
  APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
  APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
  APP_FACT_BATTLE_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_BATTLE_UPDATED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const DEFAULT_HERO_NAME = 'Hero'
const DEFAULT_STEP_DELAY_MS = 180

// Full-screen battle over the adventure map, cloned from `#battle-screen-template` in index.html:
// the battlefield with its hexes, the hero and the stacks, and the combat bar along the bottom.
export const registerBattleViewModule = defineModule(
  ({ emit, env, config }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    const stepDelayMs = config?.battleStepDelayMs ?? DEFAULT_STEP_DELAY_MS
    let map = null
    let heroName = DEFAULT_HERO_NAME
    let battleScreen = null
    let hexes = []
    let statusBar = null
    let stackElements = new Map()
    let shown = null
    let isRestoring = false

    function cloneTemplate(id) {
      return document.getElementById(id).content.firstElementChild.cloneNode(true)
    }

    // No creature pictures yet: a stack is drawn as monsters are on the map, with its count.
    function createStack({ name, count, side }) {
      const stack = cloneTemplate('battle-stack-template')
      stack.classList.add(`battle-stack--${side}`)
      const creature = stack.querySelector('.battle-stack__creature')
      creature.setAttribute('aria-label', name)
      creature.title = name
      stack.querySelector('.battle-stack__count').textContent = String(count)
      return stack
    }

    function isReachable(hex) {
      return (shown?.reachableHexes ?? []).some(
        ({ row, column }) => row === hex.row && column === hex.column
      )
    }

    function describeHex(hex) {
      const activeStack = shown?.stacks.find(({ id }) => id === shown.activeStackId)
      if (!activeStack || !isReachable(hex)) {
        return ''
      }

      return `${activeStack.flying ? 'Fly' : 'Move'} ${activeStack.name} here`
    }

    function readHex(element) {
      const hexElement = battleScreen && element?.closest?.('.battlefield__hex')
      if (!hexElement) {
        return null
      }

      return { row: Number(hexElement.dataset.row), column: Number(hexElement.dataset.column) }
    }

    function fillBattlefield(grid) {
      hexes = Array.from({ length: BATTLEFIELD_ROWS }, (_, row) => {
        const rowElement = document.createElement('div')
        rowElement.className = 'battlefield__row'
        rowElement.setAttribute('role', 'row')
        rowElement.setAttribute('aria-rowindex', String(row + 1))
        grid.append(rowElement)
        return Array.from({ length: BATTLEFIELD_COLUMNS }, (_, column) => {
          const hex = document.createElement('div')
          hex.className = 'battlefield__hex'
          hex.setAttribute('role', 'gridcell')
          hex.setAttribute('aria-colindex', String(column + 1))
          hex.dataset.row = String(row)
          hex.dataset.column = String(column)
          rowElement.append(hex)
          return hex
        })
      })
    }

    function openBattle(battle) {
      battleScreen = cloneTemplate('battle-screen-template')

      const terrainName = map?.getTerrainType(battle.tile)?.name
      if (terrainName) {
        battleScreen
          .querySelector('.battle-screen__ground')
          .classList.add(`terrain-tile--${terrainName}`)
      }

      const heroFigure = battleScreen.querySelector('.battle-hero--attacker')
      heroFigure.setAttribute('aria-label', heroName)
      heroFigure.title = heroName

      statusBar = battleScreen.querySelector('.battle-screen__status-bar')
      fillBattlefield(battleScreen.querySelector('.battlefield'))

      gameShell.append(battleScreen)
      emit(APP_UI_ADVENTURE_MAP_COVERED, {})
    }

    function placeStack(element, from, to) {
      const hexElement = hexes[to.row][to.column]
      if (!from || isRestoring || typeof element.animate !== 'function') {
        hexElement.append(element)
        return
      }

      const before = element.getBoundingClientRect()
      hexElement.append(element)
      const after = element.getBoundingClientRect()
      element.animate(
        [
          { translate: `${before.left - after.left}px ${before.top - after.top}px` },
          { translate: '0 0' }
        ],
        { duration: stepDelayMs * getHexDistance(from, to), easing: 'linear' }
      )
    }

    function showBattle(battle) {
      if (!gameShell) {
        return
      }

      if (!battleScreen) {
        openBattle(battle)
      }

      const previous = shown
      shown = battle

      for (const stack of battle.stacks) {
        let element = stackElements.get(stack.id)
        if (!element) {
          element = createStack(stack)
          stackElements.set(stack.id, element)
        }

        const from = previous?.stacks.find(({ id }) => id === stack.id)?.hex
        if (!from || from.row !== stack.hex.row || from.column !== stack.hex.column) {
          placeStack(element, from, stack.hex)
        }

        const isActive = stack.id === battle.activeStackId
        element.classList.toggle('battle-stack--active', isActive)
        const creature = element.querySelector('.battle-stack__creature')
        if (isActive) {
          creature.setAttribute('aria-current', 'true')
        } else {
          creature.removeAttribute('aria-current')
        }
      }

      for (const row of hexes) {
        for (const hexElement of row) {
          const reachable = isReachable(readHex(hexElement))
          hexElement.classList.toggle('battlefield__hex--reachable', reachable)
          hexElement.setAttribute('aria-disabled', String(!reachable))
        }
      }
    }

    function closeBattle() {
      if (!battleScreen) {
        return
      }

      battleScreen.remove()
      battleScreen = null
      hexes = []
      stackElements = new Map()
      shown = null
      emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            map = event.detail.map
            heroName = event.detail.definitions?.hero?.name ?? DEFAULT_HERO_NAME
          }
        },
        { type: APP_UI_RESTORE_STARTED, handler: () => (isRestoring = true) },
        { type: APP_UI_RESTORE_COMPLETED, handler: () => (isRestoring = false) },
        {
          type: APP_UI_BATTLE_UPDATED,
          handler: (event) => {
            showBattle(event.detail)
          }
        },
        {
          type: APP_FACT_BATTLE_ENDED,
          handler: closeBattle
        }
      ],
      // Delegated from the game shell, so they outlive each battle screen and go with the module.
      domSubscriptions: [
        {
          target: gameShell,
          type: 'click',
          handler: (event) => {
            if (!battleScreen?.contains(event.target)) {
              return
            }

            if (event.target.closest('[data-battle-action="auto-combat"]')) {
              event.stopPropagation()
              emit(APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED, {})
              return
            }

            const hex = readHex(event.target)
            if (hex) {
              event.stopPropagation()
              emit(APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED, { hex })
            }
          }
        },
        {
          target: gameShell,
          type: 'mouseover',
          handler: (event) => {
            if (!battleScreen?.contains(event.target)) {
              return
            }

            const hex = readHex(event.target)
            statusBar.textContent = hex ? describeHex(hex) : ''
          }
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
    consumes: [
      APP_FACT_WORLD_READY,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED,
      APP_UI_BATTLE_UPDATED,
      APP_FACT_BATTLE_ENDED
    ],
    produces: [
      APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
      APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED
    ]
  }
)
