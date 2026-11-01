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
  APP_COMMAND_BATTLE_RESULTS_CLOSE_REQUESTED,
  APP_COMMAND_BATTLE_RETREAT_REQUESTED,
  APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED,
  APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
  APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED,
  APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
  APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED,
  APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED,
  APP_FACT_BATTLE_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_BATTLE_SPELL_PICKED,
  APP_UI_BATTLE_UPDATED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED,
  APP_UI_SPELL_BOOK_OPEN_REQUESTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { renderMoraleOrLuckIcon } from '../presentation/morale-and-luck.js'

const HEX_SIDES = ['top-left', 'top-right', 'right', 'bottom-right', 'bottom-left', 'left']

// The game plays a short animation over the stack; ours is the morale or luck picture, faded out.
const EFFECT_MS = 1000

const EFFECTS = Object.freeze({
  goodMorale: { icon: 'morale', label: 'Good morale', state: 'good' },
  badMorale: { icon: 'morale', label: 'Bad morale', state: 'bad' },
  goodLuck: { icon: 'luck', label: 'Good luck', state: 'good' }
})

const COMMAND_BY_ACTION = {
  'auto-combat': APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
  wait: APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED,
  defend: APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED,
  'close-results': APP_COMMAND_BATTLE_RESULTS_CLOSE_REQUESTED
}

// Full-screen battle over the adventure map, cloned from `#battle-screen-template` in index.html:
// the battlefield with its hexes, the hero and the stacks, and the combat bar along the bottom.
export const registerBattleViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let map = null
    let battleScreen = null
    let hexes = []
    let statusBar = null
    let battlefield = null
    let stackElements = new Map()
    let shown = null
    let reachableKeys = new Set()
    let hoveredHex = null
    let pointer = null
    let pointerType = 'mouse'
    let messageLog = null
    let isRestoring = false
    let retreatDialog = null
    let resultsWindow = null
    // A spell the player picked from the book, cast on the next enemy stack clicked.
    let pickedSpellId = null

    function cloneTemplate(id) {
      return document.getElementById(id).content.firstElementChild.cloneNode(true)
    }

    function hexElementAt({ row, column }) {
      return hexes[row]?.[column + 1] ?? null
    }

    // No creature pictures yet: a stack is drawn as monsters are on the map, with its count. The
    // back half of a double-wide creature only marks its hex for screen readers.
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

    function findShot(hex) {
      const target = findLivingStackOn(hex)
      const shotTarget = target && shown.shotTargets.find(({ stackId }) => stackId === target.id)
      return shotTarget ? { target, ...shotTarget } : null
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
        const side = HEX_SIDES.find((option) =>
          isSameHex(getHexNeighbourOnSide(hex, option) ?? {}, standingNextToIt)
        )
        return { target, fromHex: standingNextToIt, side, damage: attackTarget.damage }
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
      return {
        target,
        fromHex: getHexNeighbourOnSide(hex, side),
        side,
        damage: attackTarget.damage
      }
    }

    function isReachable(hex) {
      return reachableKeys.has(hexKey(hex))
    }

    // The stack the player is moving, while it stands still waiting for an order.
    function findIdleActiveStack() {
      const activeStack = shown?.stacks.find(({ id }) => id === shown.activeStackId)
      return activeStack && !shown.moving ? activeStack : null
    }

    function describeStackHex(hex, activeStack) {
      const shot = findShot(hex)
      if (shot) {
        const shotsLeft = activeStack.shots === 1 ? '1 shot' : `${activeStack.shots} shots`
        return `Shoot ${shot.target.name} (${shotsLeft} left, damage ${shot.damage.min}-${shot.damage.max})`
      }

      const attack = findAttack(hex, hexElementAt(hex))
      return attack
        ? `Attack ${attack.target.name} (damage ${attack.damage.min}-${attack.damage.max})`
        : ''
    }

    function describeHex(hex) {
      const activeStack = findIdleActiveStack()
      if (!activeStack) {
        return ''
      }

      if (findLivingStackOn(hex)) {
        return describeStackHex(hex, activeStack)
      }

      return isReachable(hex)
        ? `${activeStack.flying ? 'Fly' : 'Move'} ${activeStack.name} here`
        : ''
    }

    function pickStackCursor(hex, stack, activeStack) {
      if (stack.side === activeStack.side) {
        return 'query'
      }

      const shot = findShot(hex)
      if (shot) {
        return shot.distancePenalty ? 'shoot-penalty' : 'shoot'
      }

      const attack = findAttack(hex, hexElementAt(hex))
      return attack ? `attack-from-${attack.side}` : 'blocked'
    }

    function pickCursor(hex) {
      const activeStack = findIdleActiveStack()
      if (!activeStack) {
        return null
      }

      const stack = findLivingStackOn(hex)
      if (stack) {
        return pickStackCursor(hex, stack, activeStack)
      }

      if (isReachable(hex)) {
        return activeStack.flying ? 'fly' : 'walk'
      }

      return EDGE_COLUMNS.includes(hex.column) ? null : 'blocked'
    }

    // Heroes 3's cursor shadow: the hex under the mouse, or every hex of the enemy it would attack
    // or shoot. Not after a tap, or the hex would stay lit once the finger is gone.
    function findHighlightedHexes(hex) {
      if (!hex || !findIdleActiveStack() || pointerType === 'touch') {
        return []
      }

      const target = findLivingStackOn(hex)
      if (target) {
        const canHit = findShot(hex) || findAttack(hex, hexElementAt(hex))
        return canHit ? target.hexes : []
      }

      return isReachable(hex) ? [hex] : []
    }

    function highlightHexes(highlighted) {
      for (const row of hexes) {
        for (const hexElement of row) {
          const hex = readHex(hexElement)
          hexElement.classList.toggle(
            'battlefield__hex--highlighted',
            highlighted.some((option) => isSameHex(option, hex))
          )
        }
      }
    }

    function describeHoveredHex() {
      highlightHexes(findHighlightedHexes(hoveredHex))
      statusBar.textContent = hoveredHex ? describeHex(hoveredHex) : ''
      const cursor = hoveredHex ? pickCursor(hoveredHex) : null
      if (cursor) {
        battlefield.dataset.cursor = cursor
      } else {
        delete battlefield.dataset.cursor
      }
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
      heroFigure.setAttribute('aria-label', battle.heroName)
      heroFigure.title = battle.heroName

      statusBar = battleScreen.querySelector('.battle-screen__status-bar')
      messageLog = battleScreen.querySelector('.battle-bar__log')
      battlefield = battleScreen.querySelector('.battlefield')
      fillBattlefield(battlefield)

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

    function showStack(stack, { from, isActive }) {
      let elements = stackElements.get(stack.id)
      if (!elements) {
        elements = createStack(stack)
        stackElements.set(stack.id, elements)
      }

      drawStack(elements, stack)
      const element = elements.stack
      if (!from || !isSameHex(from, stack.hex)) {
        placeStack(element, from, stack.hex)
      }

      const backHex = stack.count > 0 ? stack.hexes[1] : null
      if (backHex) {
        hexElementAt(backHex).append(elements.backHalf)
      } else {
        elements.backHalf.remove()
      }

      element.classList.toggle('battle-stack--active', isActive)
      const creature = element.querySelector('.battle-stack__creature')
      if (isActive) {
        creature.setAttribute('aria-current', 'true')
      } else {
        creature.removeAttribute('aria-current')
      }
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
        showStack(stack, {
          from: previous?.stacks.find(({ id }) => id === stack.id)?.hex,
          isActive: stack.id === battle.activeStackId
        })
      }

      for (const row of hexes) {
        for (const hexElement of row) {
          const reachable = isReachable(readHex(hexElement))
          hexElement.classList.toggle('battlefield__hex--reachable', reachable)
          hexElement.setAttribute('aria-disabled', String(!reachable))
        }
      }

      showMessages(battle.messages)
      for (const effect of battle.effects ?? []) {
        showEffect(effect)
      }
      showActions(battle)
      showResults(battle.results)
      describeHoveredHex()
    }

    function showEffect({ stackId, kind }) {
      const stack = stackElements.get(stackId)?.stack
      const { icon, label, state } = EFFECTS[kind]
      if (!stack) {
        return
      }

      const effect = document.createElement('div')
      effect.className = 'battle-effect morale-luck'
      effect.dataset.state = state
      effect.setAttribute('role', 'img')
      effect.setAttribute('aria-label', label)
      effect.style.setProperty('--battle-effect-ms', `${EFFECT_MS}ms`)
      effect.append(renderMoraleOrLuckIcon(document, icon))
      stack.append(effect)
      setTimeout(() => effect.remove(), EFFECT_MS)
    }

    function showActions({ canWait, canDefend, canRetreat, canCastSpell, autoCombat }) {
      const button = (action) => battleScreen.querySelector(`[data-battle-action="${action}"]`)
      button('cast-spell').disabled = !canCastSpell
      button('wait').disabled = !canWait
      button('defend').disabled = !canDefend
      button('retreat').disabled = !canRetreat
      button('auto-combat').setAttribute('aria-pressed', String(Boolean(autoCombat)))
      if (!canRetreat) {
        closeRetreatDialog()
      }
    }

    function openRetreatDialog() {
      if (retreatDialog || !shown?.canRetreat) {
        return
      }

      retreatDialog = cloneTemplate('battle-retreat-template')
      battleScreen.append(retreatDialog)
      retreatDialog.querySelector('[data-battle-action="confirm-retreat"]').focus()
    }

    function closeRetreatDialog() {
      retreatDialog?.remove()
      retreatDialog = null
    }

    function fillCasualties(group, casualties) {
      const list = group.querySelector('.battle-results__creatures')
      if (casualties.length === 0) {
        const none = document.createElement('p')
        none.className = 'battle-results__none'
        none.textContent = 'None'
        list.replaceWith(none)
        return
      }

      list.replaceChildren(
        ...casualties.map(({ name, count }) => {
          const slot = document.createElement('li')
          slot.className = 'battle-results__creature'
          const creature = document.createElement('div')
          creature.className = 'battle-results__picture entity--monster'
          creature.setAttribute('role', 'img')
          creature.setAttribute('aria-label', name)
          creature.title = name
          // No creature pictures yet, so the name says which creature the stand-in is.
          const caption = document.createElement('span')
          caption.className = 'battle-results__name-caption'
          caption.setAttribute('aria-hidden', 'true')
          caption.textContent = name
          const lost = document.createElement('span')
          lost.className = 'battle-results__count'
          lost.textContent = String(count)
          slot.append(creature, caption, lost)
          return slot
        })
      )
    }

    function fillSide(side, { name, outcome }) {
      const group = resultsWindow.querySelector(`[aria-label="${side}"]`)
      group.querySelector('.battle-results__name').textContent = name
      group.querySelector('.battle-results__outcome').textContent = outcome
    }

    function showResults(results) {
      if (!results || resultsWindow) {
        return
      }

      resultsWindow = cloneTemplate('battle-results-template')
      fillSide('Attacker', results.attacker)
      fillSide('Defender', results.defender)
      resultsWindow.querySelector('.battle-results__message').replaceChildren(
        ...results.messages.map((message) => {
          const line = document.createElement('p')
          line.textContent = message
          return line
        })
      )
      fillCasualties(
        resultsWindow.querySelector('[aria-label="Attacker casualties"]'),
        results.casualties.attacker
      )
      fillCasualties(
        resultsWindow.querySelector('[aria-label="Defender casualties"]'),
        results.casualties.defender
      )
      battleScreen.append(resultsWindow)
      resultsWindow.querySelector('[data-battle-action="close-results"]').focus()
    }

    function closeBattle() {
      if (!battleScreen) {
        return
      }

      battleScreen.remove()
      battleScreen = null
      retreatDialog = null
      resultsWindow = null
      pickedSpellId = null
      hexes = []
      battlefield = null
      stackElements = new Map()
      shown = null
      reachableKeys = new Set()
      hoveredHex = null
      pointer = null
      messageLog = null
      emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
    }

    function pressBattleButton(action) {
      pickedSpellId = null
      if (COMMAND_BY_ACTION[action]) {
        emit(COMMAND_BY_ACTION[action], {})
      } else if (action === 'cast-spell') {
        emit(APP_UI_SPELL_BOOK_OPEN_REQUESTED, { heroId: shown.heroId, kind: 'combat' })
      } else if (action === 'retreat') {
        openRetreatDialog()
      } else if (action === 'confirm-retreat' || action === 'cancel-retreat') {
        closeRetreatDialog()
        if (action === 'confirm-retreat') {
          emit(APP_COMMAND_BATTLE_RETREAT_REQUESTED, {})
        }
      }
    }

    // Clicking anywhere but an enemy stack cancels the spell.
    function castPickedSpellOn(hex) {
      const target = findLivingStackOn(hex)
      const caster = shown.stacks.find(({ id }) => id === shown.activeStackId)
      if (target && caster && target.side !== caster.side) {
        emit(APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED, {
          spellId: pickedSpellId,
          targetId: target.id
        })
      }
      pickedSpellId = null
    }

    // A click on a hex: move there, or shoot or attack the enemy standing on it.
    function orderActiveStackTo(hex) {
      if (pickedSpellId) {
        castPickedSpellOn(hex)
        return
      }

      if (!findLivingStackOn(hex)) {
        emit(APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED, { hex })
        return
      }

      const shot = findShot(hex)
      if (shot) {
        emit(APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED, { targetId: shot.target.id })
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

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            map = event.detail.map
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
          type: APP_UI_BATTLE_SPELL_PICKED,
          handler: (event) => {
            pickedSpellId = event.detail.spellId
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

            const action = event.target.closest('[data-battle-action]')?.dataset.battleAction
            if (action) {
              event.stopPropagation()
              pressBattleButton(action)
              return
            }

            // The battlefield cannot be played behind a dialog.
            const hex = !retreatDialog && !resultsWindow && readHex(event.target)
            if (hex) {
              event.stopPropagation()
              pointer = { x: event.clientX, y: event.clientY }
              orderActiveStackTo(hex)
            }
          }
        },
        ...['pointerdown', 'pointermove'].map((type) => ({
          target: gameShell,
          type,
          handler: (event) => {
            pointerType = event.pointerType || 'mouse'
          }
        })),
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
      APP_UI_BATTLE_SPELL_PICKED,
      APP_FACT_BATTLE_ENDED
    ],
    produces: [
      APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
      APP_COMMAND_BATTLE_RESULTS_CLOSE_REQUESTED,
      APP_COMMAND_BATTLE_RETREAT_REQUESTED,
      APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED,
      APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
      APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED,
      APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
      APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED,
      APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
      APP_UI_SPELL_BOOK_OPEN_REQUESTED
    ]
  }
)
