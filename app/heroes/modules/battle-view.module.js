import {
  BATTLEFIELD_COLUMNS,
  BATTLEFIELD_ROWS,
  EDGE_COLUMNS,
  findNearestHexSide,
  getHexDistance,
  getHexNeighbourOnSide,
  hexKey,
  isSameHex
} from '../../../game/heroes/battlefield.js'
import {
  APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
  APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
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
const HEX_SIDES = ['top-left', 'top-right', 'right', 'bottom-right', 'bottom-left', 'left']

// Full-screen battle over the adventure map, cloned from `#battle-screen-template` in index.html:
// the battlefield with its hexes, the hero and the stacks, and the combat bar along the bottom.
export const registerBattleViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let map = null
    let heroName = DEFAULT_HERO_NAME
    let battleScreen = null
    let hexes = []
    let statusBar = null
    let stackElements = new Map()
    let shown = null
    let reachableKeys = new Set()
    let hoveredHex = null
    let pointer = null
    let pointerType = 'mouse'
    let messageLog = null
    let isRestoring = false

    function cloneTemplate(id) {
      return document.getElementById(id).content.firstElementChild.cloneNode(true)
    }

    // Edge columns included, from -1 to 15.
    function hexElementAt({ row, column }) {
      return hexes[row]?.[column + 1] ?? null
    }

    // No creature pictures yet: a stack is drawn as monsters are on the map, with its count. A
    // double-wide creature is drawn over both its hexes; its back half only marks the hex
    // behind it, for screen readers.
    function createStack({ side, doubleWide }) {
      const stack = cloneTemplate('battle-stack-template')
      stack.classList.add(`battle-stack--${side}`)
      stack.classList.toggle('battle-stack--double-wide', Boolean(doubleWide))
      const backHalf = document.createElement('div')
      backHalf.className = 'battle-stack__back-half'
      backHalf.setAttribute('role', 'img')
      return { stack, backHalf }
    }

    function drawStack({ stack: element, backHalf }, { name, count }) {
      const isDead = count === 0
      const label = isDead ? `Dead ${name}` : name
      element.classList.toggle('battle-stack--dead', isDead)
      const creature = element.querySelector('.battle-stack__creature')
      creature.setAttribute('aria-label', label)
      creature.title = label
      element.querySelector('.battle-stack__count').textContent = isDead ? '' : String(count)
      backHalf.setAttribute('aria-label', `${name} (back half)`)
    }

    function findLivingStackOn(hex) {
      return shown?.stacks.find(
        (stack) => stack.count > 0 && stack.hexes.some((own) => isSameHex(own, hex))
      )
    }

    // Attacks from the side nearest the mouse. A finger cannot aim before it taps, so a stack
    // already next to the target attacks from where it stands.
    function findAttack(hex, hexElement) {
      const target = findLivingStackOn(hex)
      const attackTarget =
        target && shown.attackTargets.find(({ stackId }) => stackId === target.id)
      if (!attackTarget || !pointer) {
        return null
      }

      const activeStack = shown.stacks.find(({ id }) => id === shown.activeStackId)
      const canAttackFrom = (fromHex) =>
        attackTarget.fromHexes.some((option) => isSameHex(option, fromHex))
      const standingNextToIt = activeStack.hexes.find(canAttackFrom)
      if (pointerType === 'touch' && standingNextToIt) {
        return { target, fromHex: standingNextToIt, damage: attackTarget.damage }
      }

      const box = hexElement.getBoundingClientRect()
      const sides = HEX_SIDES.filter((side) => {
        const neighbour = getHexNeighbourOnSide(hex, side)
        return neighbour && canAttackFrom(neighbour)
      })
      const side = findNearestHexSide({
        point: {
          x: pointer.x - (box.left + box.width / 2),
          y: pointer.y - (box.top + box.height / 2)
        },
        hexSize: { width: box.width, height: box.height },
        sides
      })
      return { target, fromHex: getHexNeighbourOnSide(hex, side), damage: attackTarget.damage }
    }

    function isReachable(hex) {
      return reachableKeys.has(hexKey(hex))
    }

    function describeHex(hex) {
      const activeStack = shown?.stacks.find(({ id }) => id === shown.activeStackId)
      if (!activeStack) {
        return ''
      }

      if (findLivingStackOn(hex)) {
        const attack = findAttack(hex, hexElementAt(hex))
        return attack
          ? `Attack ${attack.target.name} (damage ${attack.damage.min}-${attack.damage.max})`
          : ''
      }

      return isReachable(hex)
        ? `${activeStack.flying ? 'Fly' : 'Move'} ${activeStack.name} here`
        : ''
    }

    function describeHoveredHex() {
      statusBar.textContent = hoveredHex ? describeHex(hoveredHex) : ''
    }

    function showMessages(messages) {
      messageLog.replaceChildren(
        ...messages.map((message) => {
          const line = document.createElement('p')
          line.className = 'battle-bar__message'
          line.textContent = message
          return line
        })
      )
      messageLog.scrollTop = messageLog.scrollHeight
    }

    function readHex(element) {
      const hexElement = battleScreen && element?.closest?.('.battlefield__hex')
      if (!hexElement) {
        return null
      }

      return { row: Number(hexElement.dataset.row), column: Number(hexElement.dataset.column) }
    }

    // Each row runs from the edge column on the attacker's side to the one on the defender's.
    function fillBattlefield(grid) {
      hexes = Array.from({ length: BATTLEFIELD_ROWS }, (_, row) => {
        const rowElement = document.createElement('div')
        rowElement.className = 'battlefield__row'
        rowElement.setAttribute('role', 'row')
        rowElement.setAttribute('aria-rowindex', String(row + 1))
        grid.append(rowElement)
        return Array.from({ length: BATTLEFIELD_COLUMNS + 2 }, (_, index) => {
          const column = index - 1
          const hex = document.createElement('div')
          hex.className = 'battlefield__hex'
          hex.classList.toggle('battlefield__hex--edge', EDGE_COLUMNS.includes(column))
          hex.setAttribute('role', 'gridcell')
          hex.setAttribute('aria-colindex', String(index + 1))
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
      messageLog = battleScreen.querySelector('.battle-bar__log')
      fillBattlefield(battleScreen.querySelector('.battlefield'))

      gameShell.append(battleScreen)
      emit(APP_UI_ADVENTURE_MAP_COVERED, {})
    }

    function placeStack(element, from, to) {
      const hexElement = hexElementAt(to)
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
        { duration: shown.stepDelayMs * getHexDistance(from, to), easing: 'linear' }
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
      reachableKeys = new Set(battle.reachableHexes.map(hexKey))

      for (const stack of battle.stacks) {
        let elements = stackElements.get(stack.id)
        if (!elements) {
          elements = createStack(stack)
          stackElements.set(stack.id, elements)
        }

        drawStack(elements, stack)
        const element = elements.stack

        const from = previous?.stacks.find(({ id }) => id === stack.id)?.hex
        if (!from || !isSameHex(from, stack.hex)) {
          placeStack(element, from, stack.hex)
        }

        const backHex = stack.count > 0 ? stack.hexes[1] : null
        if (backHex) {
          hexElementAt(backHex).append(elements.backHalf)
        } else {
          elements.backHalf.remove()
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

      showMessages(battle.messages)
      describeHoveredHex()
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
      reachableKeys = new Set()
      hoveredHex = null
      pointer = null
      messageLog = null
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
            if (!hex) {
              return
            }

            event.stopPropagation()
            pointer = { x: event.clientX, y: event.clientY }
            if (!findLivingStackOn(hex)) {
              emit(APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED, { hex })
              return
            }

            const attack = findAttack(hex, hexElementAt(hex))
            if (attack) {
              emit(APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED, {
                targetId: attack.target.id,
                fromHex: attack.fromHex
              })
            }
          }
        },
        {
          target: gameShell,
          type: 'pointerdown',
          handler: (event) => {
            pointerType = event.pointerType || 'mouse'
          }
        },
        ...['mouseover', 'mousemove'].map((type) => ({
          target: gameShell,
          type,
          handler: (event) => {
            if (!battleScreen?.contains(event.target)) {
              return
            }

            pointer = { x: event.clientX, y: event.clientY }
            hoveredHex = readHex(event.target)
            describeHoveredHex()
          }
        }))
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
      APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
      APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED
    ]
  }
)
