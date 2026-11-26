import { areaTargetIds, canTeleportTo, getStackHexes } from '../../../game/heroes/battle.js'
import { canBeSacrificed, sacrificeTargetIds } from '../../../game/heroes/battle-sacrifice.js'
import { isSpellTarget } from '../../../game/heroes/battle-spells.js'
import { areEnemies, fightsFor } from '../../../game/heroes/battle-stats.js'
import {
  BATTLEFIELD_COLUMNS,
  BATTLEFIELD_ROWS,
  EDGE_COLUMNS,
  findNearestHexSide,
  getAreaHexes,
  getHexDistance,
  getHexNeighbourOnSide,
  hexKey,
  isOnBattlefield,
  isSameHex
} from '../../../game/heroes/battlefield.js'
import {
  APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
  APP_COMMAND_BATTLE_CATAPULT_AIM_REQUESTED,
  APP_COMMAND_BATTLE_RESULTS_CLOSE_REQUESTED,
  APP_COMMAND_BATTLE_RETREAT_REQUESTED,
  APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED,
  APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
  APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED,
  APP_COMMAND_BATTLE_STACK_HEAL_REQUESTED,
  APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
  APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED,
  APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED,
  APP_COMMAND_BATTLE_SURRENDER_REQUESTED,
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
import {
  renderCatapultStone,
  renderMoat,
  renderTower,
  renderTowerArrow,
  renderWall,
  renderWallHit
} from '../presentation/siege.js'
import { renderWarMachinePicture } from '../presentation/war-machines.js'

const describeDamageRange = ({ min, max }) => (min === max ? `${min}` : `${min}-${max}`)

// A shooter that never runs out leaves its shots out.
function describeShotsLeft({ shots }) {
  if (!Number.isFinite(shots)) {
    return ''
  }
  return shots === 1 ? '1 shot left, ' : `${shots} shots left, `
}

const HEX_SIDES = ['top-left', 'top-right', 'right', 'bottom-right', 'bottom-left', 'left']

const NO_MOAT = Object.freeze({ name: '', hexes: [] })

// The game plays a short animation over the stack; ours is the morale or luck picture, faded out.
const EFFECT_MS = 1000
const CHAIN_JUMP_MS = 300

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

const SVG = 'http://www.w3.org/2000/svg'

function centreWithin(container, element) {
  const outer = container.getBoundingClientRect()
  const inner = element.getBoundingClientRect()
  return {
    x: inner.left + inner.width / 2 - outer.left,
    y: inner.top + inner.height / 2 - outer.top
  }
}

// A jagged line: a few points pushed off the straight path, either way in turn.
function boltPoints({ from, to }) {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
  const across = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length }
  const bends = 6
  return Array.from({ length: bends + 1 }, (_, bend) => {
    const along = bend / bends
    const offset =
      bend === 0 || bend === bends ? 0 : (bend % 2 ? 1 : -1) * Math.min(14, length / 10)
    return `${from.x + (to.x - from.x) * along + across.x * offset},${from.y + (to.y - from.y) * along + across.y * offset}`
  }).join(' ')
}

// A stack further down a chain is shown as it was until the bolt reaches it.
const teleportedStacks = (effects) =>
  new Set(effects.filter(({ teleported }) => teleported).map(({ stackId }) => stackId))

const stacksAChainReachesLater = (effects) =>
  new Set(effects.filter(({ place }) => place > 0).map(({ stackId }) => stackId))

function renderSpellBolt(document, { spellName, from, to }) {
  const bolt = document.createElementNS(SVG, 'svg')
  bolt.setAttribute('class', 'battle-spell-bolt')
  bolt.setAttribute('role', 'img')
  bolt.setAttribute('aria-label', `${spellName} bolt`)
  const points = boltPoints({ from, to })
  for (const kind of ['glow', 'core']) {
    const line = document.createElementNS(SVG, 'polyline')
    line.setAttribute('class', `battle-spell-bolt__${kind}`)
    line.setAttribute('points', points)
    bolt.append(line)
  }
  return bolt
}

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
    // A tower's picture under the mouse: it stands over a hex that may be a wall's.
    let hoveredTower = null
    let pointer = null
    let pointerType = 'mouse'
    let messageLog = null
    let isRestoring = false
    let question = null
    let resultsWindow = null
    // A spell the player picked from the book, cast on the next stack clicked that it can target:
    // an enemy stack, or for a helpful spell one of the hero's own.
    let pickedSpell = null
    // Shown in the status bar until the mouse leaves the hex it was given on.
    let statusNote = null

    function cloneTemplate(id) {
      return document.getElementById(id).content.firstElementChild.cloneNode(true)
    }

    function hexElementAt({ row, column }) {
      return hexes[row]?.[column + 1] ?? null
    }

    // No creature pictures yet: a stack is drawn as monsters are on the map, with its count, and a
    // war machine as itself. The back half of a double-wide creature only marks its hex for screen
    // readers.
    function createStack({ side, creature, doubleWide, cloneOf, warMachine }) {
      const stack = cloneTemplate('battle-stack-template')
      stack.classList.add(`battle-stack--${side}`)
      stack.classList.toggle('battle-stack--clone', Boolean(cloneOf))
      stack.classList.toggle('battle-stack--double-wide', Boolean(doubleWide))
      const picture = warMachine ? renderWarMachinePicture(document, creature) : null
      if (picture) {
        stack.classList.add('battle-stack--war-machine')
        stack.querySelector('.battle-stack__creature').append(picture)
      }
      const backHalf = document.createElement('div')
      backHalf.className = 'battle-stack__back-half'
      backHalf.setAttribute('role', 'img')
      return { stack, backHalf }
    }

    function drawStack(
      { stack: element, backHalf },
      { name: creatureName, count, spellBalance, cloneOf, warMachine }
    ) {
      const name = cloneOf ? `${creatureName} (clone)` : creatureName
      const isDead = count === 0
      const label = isDead ? `${warMachine ? 'Destroyed' : 'Dead'} ${name}` : name
      element.classList.toggle('battle-stack--dead', isDead)
      const creature = element.querySelector('.battle-stack__creature')
      creature.setAttribute('aria-label', label)
      creature.title = label
      const countBox = element.querySelector('.battle-stack__count')
      countBox.textContent = isDead ? '' : String(count)
      countBox.classList.toggle('battle-stack__count--helped', spellBalance === 'helpful')
      countBox.classList.toggle('battle-stack__count--harmed', spellBalance === 'harmful')
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

    function findHealTarget(hex) {
      const target = findLivingStackOn(hex)
      return target && shown.healTargetIds?.includes(target.id) ? target : null
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

    const isAimingCatapult = () =>
      Boolean(findIdleActiveStack()) && (shown.catapultTargets?.length ?? 0) > 0

    function findCatapultTarget(hex, tower) {
      if (tower) {
        return shown.catapultTargets.find((target) => target.tower === tower) ?? null
      }
      return (
        shown.catapultTargets.find((target) => target.hexes.some((own) => isSameHex(own, hex))) ??
        null
      )
    }

    function describeCatapultAim(hex) {
      const target = findCatapultTarget(hex, hoveredTower)
      return target ? `Shoot the Catapult at the ${target.name}` : ''
    }

    function pickCatapultCursor(hex) {
      if (findCatapultTarget(hex, hoveredTower)) {
        return 'catapult'
      }
      return EDGE_COLUMNS.includes(hex.column) && !hoveredTower ? null : 'blocked'
    }

    // The stack the player is moving, while it stands still waiting for an order.
    function findIdleActiveStack() {
      const activeStack = shown?.stacks.find(({ id }) => id === shown.activeStackId)
      return activeStack && !shown.moving ? activeStack : null
    }

    // A tower stands off the battlefield, so its turn has no active stack.
    const findIdleTower = () => (shown?.activeTower && !shown.moving ? shown.activeTower : null)

    // The side whose turn waits for the player's order.
    function idleTurnSide() {
      const activeStack = findIdleActiveStack()
      return activeStack ? fightsFor(activeStack) : (findIdleTower()?.side ?? null)
    }

    function describeTowerAim(hex) {
      const shot = findShot(hex)
      return shot ? `Shoot ${shot.target.name} (damage ${describeDamageRange(shot.damage)})` : ''
    }

    function describeStackHex(hex, activeStack) {
      const healed = findHealTarget(hex)
      if (healed) {
        return `Apply first aid to the ${healed.name}`
      }

      const shot = findShot(hex)
      if (shot) {
        return `Shoot ${shot.target.name} (${describeShotsLeft(activeStack)}damage ${describeDamageRange(shot.damage)})`
      }

      const attack = findAttack(hex, hexElementAt(hex))
      return attack
        ? `Attack ${attack.target.name} (damage ${describeDamageRange(attack.damage)})`
        : ''
    }

    function isPickedSpellTarget(target) {
      const casterSide = idleTurnSide()
      return Boolean(casterSide) && isSpellTarget(pickedSpell.targeting, target, casterSide)
    }

    function findCorpseOn(hex) {
      return shown?.stacks.find(
        (stack) => stack.count === 0 && stack.hexes.some((own) => isSameHex(own, hex))
      )
    }

    const sacrificeAim = () => ({
      targeting: pickedSpell.targeting,
      casterSide: idleTurnSide()
    })

    // Sacrifice brings back a stack that lost creatures, or a dead one no stack stands on.
    function findStackToRaise(hex) {
      const target = findLivingStackOn(hex) ?? findCorpseOn(hex)
      return target && sacrificeTargetIds(shown.stacks, sacrificeAim()).includes(target.id)
        ? target
        : null
    }

    function findSpellTarget(hex) {
      if (!idleTurnSide()) {
        return null
      }
      if (pickedSpell.targeting.sacrifices) {
        return findStackToRaise(hex)
      }
      const target = findLivingStackOn(hex)
      return target && isPickedSpellTarget(target) ? target : null
    }

    // Sacrifice is aimed twice: at the stack to bring back, then at the stack to sacrifice.
    const isPickingSacrifice = () => Boolean(pickedSpell.raisingId)

    function findStackToSacrifice(hex) {
      const target = findLivingStackOn(hex)
      const aim = { ...sacrificeAim(), raisedId: pickedSpell.raisingId }
      return target && canBeSacrificed(target, aim) ? target : null
    }

    function describeSacrificeAim(hex) {
      const target = findStackToSacrifice(hex)
      return target ? `Sacrifice the ${target.name}` : 'Choose an army to sacrifice'
    }

    function stacksInAreaAt(hex) {
      const inArea = areaTargetIds(shown, pickedSpell.targeting, hex)
      return pickedSpell.targeting.areaNeedsTarget
        ? inArea.filter((id) => isPickedSpellTarget(shown.stacks.find((stack) => stack.id === id)))
        : inArea
    }

    // An area damage spell is aimed at any hex of the battlefield, empty or not; one that only goes
    // on stacks needs one it can go on in its area.
    const canAimAreaAt = (hex) =>
      Boolean(pickedSpell.targeting.area) &&
      isOnBattlefield(hex) &&
      (!pickedSpell.targeting.areaNeedsTarget || stacksInAreaAt(hex).length > 0)

    // Teleport is aimed twice: at an own stack, then at the hex it goes to.
    const findTeleportingStack = () =>
      pickedSpell.teleportingId
        ? shown.stacks.find(({ id }) => id === pickedSpell.teleportingId)
        : null

    const canTeleportPickedStackTo = (hex) =>
      canTeleportTo(
        { ...shown, walls: shown.siege },
        findTeleportingStack(),
        hex,
        pickedSpell.targeting
      )

    function describeTeleportAim(hex) {
      return canTeleportPickedStackTo(hex) ? 'Teleport Here' : 'Invalid Teleport Destination'
    }

    function describeSpellAim(hex) {
      if (isPickingSacrifice()) {
        return describeSacrificeAim(hex)
      }
      if (findTeleportingStack()) {
        return describeTeleportAim(hex)
      }
      if (canAimAreaAt(hex)) {
        return `Cast ${pickedSpell.name}`
      }
      const target = findSpellTarget(hex)
      return target ? `Cast ${pickedSpell.name} on ${target.name}` : 'Select Spell Target'
    }

    function pickSacrificeCursor(hex) {
      if (findStackToSacrifice(hex)) {
        return 'sacrifice'
      }
      return EDGE_COLUMNS.includes(hex.column) ? null : 'blocked'
    }

    function pickSpellCursor(hex) {
      if (isPickingSacrifice()) {
        return pickSacrificeCursor(hex)
      }
      if (findTeleportingStack() && canTeleportPickedStackTo(hex)) {
        return 'teleport'
      }
      if (findTeleportingStack()) {
        return EDGE_COLUMNS.includes(hex.column) ? null : 'blocked'
      }
      if (canAimAreaAt(hex) || findSpellTarget(hex)) {
        return 'spell'
      }
      return EDGE_COLUMNS.includes(hex.column) ? null : 'blocked'
    }

    function findSpellHexes(hex) {
      if (isPickingSacrifice()) {
        return findStackToSacrifice(hex)?.hexes ?? []
      }
      const teleporting = findTeleportingStack()
      if (teleporting) {
        return canTeleportPickedStackTo(hex) ? getStackHexes(teleporting, hex) : []
      }
      if (canAimAreaAt(hex)) {
        return getAreaHexes(hex, pickedSpell.targeting.area)
      }
      return findSpellTarget(hex)?.hexes ?? []
    }

    function describeHex(hex) {
      if (!idleTurnSide()) {
        return ''
      }

      if (pickedSpell) {
        return describeSpellAim(hex)
      }

      if (findIdleTower()) {
        return describeTowerAim(hex)
      }

      return isAimingCatapult() ? describeCatapultAim(hex) : describeActiveStackHex(hex)
    }

    function describeActiveStackHex(hex) {
      const activeStack = findIdleActiveStack()
      if (findLivingStackOn(hex)) {
        return describeStackHex(hex, activeStack)
      }

      return isReachable(hex)
        ? `${activeStack.flying ? 'Fly' : 'Move'} ${activeStack.name} here`
        : ''
    }

    function pickStackCursor(hex, stack, activeStack) {
      if (activeStack.healing > 0) {
        return findHealTarget(hex) ? 'heal' : 'blocked'
      }
      if (!areEnemies(stack, activeStack)) {
        return 'query'
      }

      const shot = findShot(hex)
      if (shot) {
        return shot.penalty ? 'shoot-penalty' : 'shoot'
      }

      const attack = findAttack(hex, hexElementAt(hex))
      return attack ? `attack-from-${attack.side}` : 'blocked'
    }

    function pickCursor(hex) {
      if (!idleTurnSide()) {
        return null
      }

      if (pickedSpell) {
        return pickSpellCursor(hex)
      }

      if (findIdleTower()) {
        return findShot(hex) ? 'shoot' : 'blocked'
      }

      return isAimingCatapult() ? pickCatapultCursor(hex) : pickActiveStackCursor(hex)
    }

    function pickActiveStackCursor(hex) {
      const activeStack = findIdleActiveStack()
      const stack = findLivingStackOn(hex)
      if (stack) {
        return pickStackCursor(hex, stack, activeStack)
      }

      if (isReachable(hex)) {
        return activeStack.flying ? 'fly' : 'walk'
      }

      return EDGE_COLUMNS.includes(hex.column) ? null : 'blocked'
    }

    // The cursor shadow: the hex under the mouse, or every hex of the enemy it would attack
    // or shoot. Not after a tap, or the hex would stay lit once the finger is gone.
    function findHighlightedHexes(hex) {
      if (!hex || !idleTurnSide() || pointerType === 'touch') {
        return []
      }

      if (pickedSpell) {
        return findSpellHexes(hex)
      }

      if (isAimingCatapult()) {
        return findCatapultTarget(hex, hoveredTower)?.hexes ?? []
      }

      return findOrderHexes(hex)
    }

    function findOrderHexes(hex) {
      const target = findLivingStackOn(hex)
      if (target) {
        const canHit = findHealTarget(hex) || findShot(hex) || findAttack(hex, hexElementAt(hex))
        return canHit ? target.hexes : []
      }

      return isReachable(hex) ? [hex] : []
    }

    function findStacksSpellWouldHit(hex) {
      if (!hex || !pickedSpell || !idleTurnSide() || pointerType === 'touch') {
        return []
      }
      if (isPickingSacrifice()) {
        const target = findStackToSacrifice(hex)
        return target ? [target.id] : []
      }
      if (findTeleportingStack()) {
        return []
      }
      if (canAimAreaAt(hex)) {
        return stacksInAreaAt(hex)
      }
      const target = findSpellTarget(hex)
      return target ? [target.id] : []
    }

    function showStacksSpellWouldHit(stackIds) {
      for (const [stackId, { stack }] of stackElements) {
        stack.classList.toggle('battle-stack--spell-target', stackIds.includes(stackId))
      }
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
      showStacksSpellWouldHit(findStacksSpellWouldHit(hoveredHex))
      statusBar.textContent = statusNote ?? (hoveredHex ? describeHex(hoveredHex) : '')
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

    const readTower = (element) => element?.closest?.('.battlefield__tower')?.dataset.tower ?? null

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

      showHero('attacker', { name: battle.heroName, owner: battle.heroOwner })
      if (battle.defenderHero) {
        showHero('defender', battle.defenderHero)
      }

      statusBar = battleScreen.querySelector('.battle-screen__status-bar')
      messageLog = battleScreen.querySelector('.battle-bar__log')
      battlefield = battleScreen.querySelector('.battlefield')
      fillBattlefield(battlefield)

      gameShell.append(battleScreen)
      emit(APP_UI_ADVENTURE_MAP_COVERED, {})
    }

    function showHero(side, hero) {
      const figure = battleScreen.querySelector(`.battle-hero--${side}`)
      figure.hidden = false
      figure.setAttribute('aria-label', hero.name)
      figure.title = hero.name
      if (hero.owner) {
        figure.style.setProperty('--battle-hero-banner', `var(--player-${hero.owner})`)
      }
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

    function removeGoneStacks(battle) {
      for (const [stackId, { stack, backHalf }] of stackElements) {
        if (!battle.stacks.some(({ id }) => id === stackId)) {
          stack.remove()
          backHalf.remove()
          stackElements.delete(stackId)
        }
      }
    }

    function showStacks(battle, previous) {
      removeGoneStacks(battle)
      const reachedLater = stacksAChainReachesLater(battle.effects ?? [])
      // A teleported stack is there at once, without walking.
      const teleported = teleportedStacks(battle.effects ?? [])
      for (const stack of battle.stacks) {
        const before = previous?.stacks.find(({ id }) => id === stack.id)
        showStack(reachedLater.has(stack.id) && before ? before : stack, {
          from: teleported.has(stack.id) ? null : before?.hex,
          isActive: stack.id === battle.activeStackId
        })
      }
    }

    function showWalls(walls = []) {
      for (const element of battlefield.querySelectorAll('.battlefield__wall')) {
        element.remove()
      }
      for (const wall of walls) {
        hexElementAt(wall).prepend(renderWall(document, wall))
      }
    }

    function showMoat({ name, hexes } = NO_MOAT) {
      for (const element of battlefield.querySelectorAll('.battlefield__moat')) {
        element.remove()
      }
      for (const hex of hexes) {
        hexElementAt(hex).prepend(renderMoat(document, name))
      }
    }

    function showTowers(towers = [], activeTower = null) {
      for (const element of battlefield.querySelectorAll('.battlefield__tower')) {
        element.remove()
      }
      for (const tower of towers) {
        const isActive = tower.tower === activeTower?.tower
        hexElementAt(tower).append(renderTower(document, { ...tower, isActive }))
      }
    }

    function showTowerArrow(arrow) {
      if (!arrow || battlefield.querySelector('.battle-tower-arrow')) {
        return
      }
      const element = renderTowerArrow(document, {
        name: arrow.name,
        from: centreWithin(battlefield, hexElementAt(arrow.from)),
        to: centreWithin(battlefield, hexElementAt(arrow.to)),
        flightMs: arrow.flightMs
      })
      battlefield.append(element)
      setTimeout(() => element.remove(), arrow.flightMs)
    }

    function showCatapultStone(stone) {
      const catapult = battlefield.querySelector('.battle-catapult')
      if (!stone || !catapult || battlefield.querySelector('.battle-catapult-stone')) {
        return
      }
      const element = renderCatapultStone(document, {
        from: centreWithin(battlefield, catapult),
        to: centreWithin(battlefield, hexElementAt(stone.to)),
        flightMs: stone.flightMs
      })
      battlefield.append(element)
      setTimeout(() => element.remove(), stone.flightMs)
    }

    function showWallHits(wallHits = []) {
      for (const wallHit of wallHits) {
        const element = renderWallHit(document, wallHit, EFFECT_MS)
        const hexElement = hexElementAt(wallHit)
        const onTheTower = wallHit.tower && hexElement.querySelector('.battlefield__tower')
        ;(onTheTower || hexElement).append(element)
        setTimeout(() => element.remove(), EFFECT_MS)
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

      showStacks(battle, previous)
      showWalls(battle.walls)
      showMoat(battle.moat)
      showTowers(battle.towers, battle.activeTower)
      battlefield.classList.toggle(
        'battlefield--aiming-catapult',
        battle.catapultTargets.length > 0 && !battle.moving
      )
      showCatapultStone(battle.catapultStone)
      showTowerArrow(battle.towerArrow)
      showWallHits(battle.wallHits)

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

    function renderEffect({ kind, spellName, resisted }) {
      const effect = document.createElement('div')
      effect.setAttribute('role', 'img')
      effect.style.setProperty('--battle-effect-ms', `${EFFECT_MS}ms`)
      if (kind === 'spellHit' && resisted) {
        effect.className = 'battle-effect spell-resisted'
        effect.setAttribute('aria-label', 'Resisted')
        return effect
      }
      if (kind === 'firstAid') {
        effect.className = 'battle-effect spell-hit'
        effect.setAttribute('aria-label', 'First Aid')
        return effect
      }
      if (kind === 'spellHit') {
        effect.className = 'battle-effect spell-hit'
        effect.setAttribute('aria-label', spellName)
        return effect
      }

      const { icon, label, state } = EFFECTS[kind]
      effect.className = 'battle-effect morale-luck'
      effect.dataset.state = state
      effect.setAttribute('aria-label', label)
      effect.append(renderMoraleOrLuckIcon(document, icon))
      return effect
    }

    function showEffect(shownEffect) {
      if (shownEffect.place) {
        setTimeout(() => showChainJump(shownEffect), shownEffect.place * CHAIN_JUMP_MS)
        return
      }
      showEffectOnStack(shownEffect)
    }

    function showEffectOnStack(shownEffect) {
      const stack = stackElements.get(shownEffect.stackId)?.stack
      if (!stack) {
        return
      }

      const effect = renderEffect(shownEffect)
      stack.append(effect)
      setTimeout(() => effect.remove(), EFFECT_MS)
    }

    function showChainJump(shownEffect) {
      const from = stackElements.get(shownEffect.from)?.stack
      const to = stackElements.get(shownEffect.stackId)?.stack
      if (!battlefield || !from || !to) {
        return
      }

      const bolt = renderSpellBolt(document, {
        spellName: shownEffect.spellName,
        from: centreWithin(battlefield, from),
        to: centreWithin(battlefield, to)
      })
      bolt.style.setProperty('--battle-effect-ms', `${EFFECT_MS}ms`)
      battlefield.append(bolt)
      setTimeout(() => bolt.remove(), EFFECT_MS)
      showEffectOnStack(shownEffect)
      showStackAsItIsNow(shownEffect.stackId)
    }

    function showStackAsItIsNow(stackId) {
      const stack = shown?.stacks.find(({ id }) => id === stackId)
      if (stack) {
        showStack(stack, { from: stack.hex, isActive: stack.id === shown.activeStackId })
      }
    }

    function showActions({
      canWait,
      canDefend,
      canRetreat,
      canCastSpell,
      autoCombat,
      surrenderRefusal,
      surrender
    }) {
      const button = (action) => battleScreen.querySelector(`[data-battle-action="${action}"]`)
      button('surrender').title = surrenderRefusal ?? 'Surrender (S)'
      button('surrender').disabled = !surrender
      button('cast-spell').disabled = !canCastSpell
      button('wait').disabled = !canWait
      button('defend').disabled = !canDefend
      button('retreat').disabled = !canRetreat
      button('auto-combat').setAttribute('aria-pressed', String(Boolean(autoCombat)))
      if (!canRetreat) {
        closeQuestion()
      }
    }

    function askQuestion({ name, text, onConfirm = () => {}, canCancel = true }) {
      closeQuestion()
      const element = cloneTemplate('battle-question-template')
      element.setAttribute('aria-label', name)
      element.querySelector('.battle-question__text').textContent = text
      element.querySelector('[data-battle-action="cancel-question"]').hidden = !canCancel
      battleScreen.append(element)
      element.querySelector('[data-battle-action="confirm-question"]').focus()
      question = { element, onConfirm }
    }

    function closeQuestion() {
      question?.element.remove()
      question = null
    }

    function answerQuestion(action) {
      const { onConfirm } = question ?? {}
      closeQuestion()
      if (action === 'confirm-question') {
        onConfirm?.()
      }
    }

    function askToSurrender() {
      const offer = shown?.surrender
      if (question || !offer) {
        return
      }

      askQuestion({
        name: 'Surrender',
        text: `${offer.heroName} states:  "I will accept your surrender and grant you and your troops safe passage for the price of ${offer.price} gold."`,
        onConfirm: () => {
          if (offer.canAfford) {
            emit(APP_COMMAND_BATTLE_SURRENDER_REQUESTED, {})
            return
          }
          askQuestion({ name: 'Surrender', text: "You don't have enough gold!", canCancel: false })
        }
      })
    }

    function askToRetreat() {
      if (question || !shown?.canRetreat) {
        return
      }

      askQuestion({
        name: 'Retreat',
        text: 'Are you sure you want to retreat?',
        onConfirm: () => emit(APP_COMMAND_BATTLE_RETREAT_REQUESTED, {})
      })
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
      question = null
      resultsWindow = null
      pickedSpell = null
      statusNote = null
      hexes = []
      battlefield = null
      stackElements = new Map()
      shown = null
      reachableKeys = new Set()
      hoveredHex = null
      hoveredTower = null
      pointer = null
      messageLog = null
      emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
    }

    function pressBattleButton(action) {
      pickedSpell = null
      if (COMMAND_BY_ACTION[action]) {
        emit(COMMAND_BY_ACTION[action], {})
      } else if (action === 'cast-spell') {
        emit(APP_UI_SPELL_BOOK_OPEN_REQUESTED, { heroId: shown.casterHeroId, kind: 'combat' })
      } else if (action === 'retreat') {
        askToRetreat()
      } else if (action === 'surrender') {
        askToSurrender()
      } else if (action === 'confirm-question' || action === 'cancel-question') {
        answerQuestion(action)
      }
    }

    function cancelPickedSpell() {
      pickedSpell = null
      statusNote = 'Spell cancelled'
      describeHoveredHex()
    }

    // A click where the stack can't go waits for one where it can.
    function teleportPickedStackTo(hex) {
      if (!canTeleportPickedStackTo(hex)) {
        return
      }
      const { id: spellId, teleportingId: targetId } = pickedSpell
      pickedSpell = null
      emit(APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED, { spellId, targetId, destination: hex })
    }

    // A click on a stack that can't be sacrificed waits for one that can.
    function sacrificeStackOn(hex) {
      const target = findStackToSacrifice(hex)
      if (!target) {
        return
      }
      const { id: spellId, raisingId: targetId } = pickedSpell
      pickedSpell = null
      emit(APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED, { spellId, targetId, sacrificedId: target.id })
    }

    // Clicking anywhere the spell can't be aimed at cancels it.
    function castPickedSpellOn(hex) {
      if (isPickingSacrifice()) {
        sacrificeStackOn(hex)
        return
      }
      if (findTeleportingStack()) {
        teleportPickedStackTo(hex)
        return
      }
      if (canAimAreaAt(hex)) {
        const spellId = pickedSpell.id
        pickedSpell = null
        emit(APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED, { spellId, hex })
        return
      }

      const target = findSpellTarget(hex)
      if (!target) {
        cancelPickedSpell()
        return
      }
      if (pickedSpell.targeting.teleports) {
        pickedSpell.teleportingId = target.id
        describeHoveredHex()
        return
      }
      if (pickedSpell.targeting.sacrifices) {
        pickedSpell.raisingId = target.id
        describeHoveredHex()
        return
      }

      const spellId = pickedSpell.id
      pickedSpell = null
      emit(APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED, { spellId, targetId: target.id, hex })
    }

    // A click on a hex: move there, or shoot or attack the enemy standing on it.
    function orderActiveStackTo(hex, tower) {
      if (pickedSpell) {
        castPickedSpellOn(hex)
        return
      }

      if (isAimingCatapult()) {
        aimCatapultAt(hex, tower)
        return
      }

      if (findIdleTower()) {
        shootAt(hex)
        return
      }

      orderStackTo(hex)
    }

    function aimCatapultAt(hex, tower) {
      const target = findCatapultTarget(hex, tower)
      if (target) {
        emit(APP_COMMAND_BATTLE_CATAPULT_AIM_REQUESTED, { part: target.part })
      }
    }

    function shootAt(hex) {
      const shot = findShot(hex)
      if (shot) {
        emit(APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED, { targetId: shot.target.id })
      }
      return Boolean(shot)
    }

    function orderStackTo(hex) {
      if (!findLivingStackOn(hex)) {
        emit(APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED, { hex })
        return
      }

      const healed = findHealTarget(hex)
      if (healed) {
        emit(APP_COMMAND_BATTLE_STACK_HEAL_REQUESTED, { targetId: healed.id })
        return
      }

      if (shootAt(hex)) {
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
            const { spellId, spellName, targeting } = event.detail
            pickedSpell = { id: spellId, name: spellName, targeting }
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
            const hex = !question && !resultsWindow && readHex(event.target)
            if (hex) {
              event.stopPropagation()
              pointer = { x: event.clientX, y: event.clientY }
              orderActiveStackTo(hex, readTower(event.target))
            }
          }
        },
        {
          target: gameShell,
          type: 'contextmenu',
          handler: (event) => {
            if (pickedSpell && battlefield?.contains(event.target)) {
              event.preventDefault()
              cancelPickedSpell()
            }
          }
        },
        {
          target: document,
          type: 'keydown',
          handler: (event) => {
            if (pickedSpell && battleScreen && event.key === 'Escape') {
              event.preventDefault()
              cancelPickedSpell()
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
            const hex = readHex(event.target)
            if (!hex || !hoveredHex || !isSameHex(hex, hoveredHex)) {
              statusNote = null
            }
            hoveredHex = hex
            hoveredTower = readTower(event.target)
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
      APP_COMMAND_BATTLE_CATAPULT_AIM_REQUESTED,
      APP_COMMAND_BATTLE_RESULTS_CLOSE_REQUESTED,
      APP_COMMAND_BATTLE_RETREAT_REQUESTED,
      APP_COMMAND_BATTLE_SURRENDER_REQUESTED,
      APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED,
      APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
      APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED,
      APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
      APP_COMMAND_BATTLE_STACK_HEAL_REQUESTED,
      APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED,
      APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
      APP_UI_SPELL_BOOK_OPEN_REQUESTED
    ]
  }
)
