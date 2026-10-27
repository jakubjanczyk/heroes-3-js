import { getHeroArmy } from '../../../game/heroes/hero-army.js'
import { levelForExperience } from '../../../game/heroes/hero-experience.js'
import { getHeroPrimarySkills } from '../../../game/heroes/primary-skills.js'
import { describeSecondarySkill } from '../../../game/heroes/secondary-skills.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import {
  APP_COMMAND_HEROES_ARMIES_SWAP_REQUESTED,
  APP_COMMAND_HEROES_ARMY_SEND_REQUESTED,
  APP_COMMAND_HEROES_STACK_MOVE_REQUESTED,
  APP_COMMAND_HEROES_STACK_SEND_REQUESTED,
  APP_COMMAND_HEROES_STACK_SPLIT_REQUESTED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_HERO_EXCHANGE_OPEN_REQUESTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createArmyRearranging } from '../presentation/army-rearranging.js'
import { renderArmyStack } from '../presentation/hero-box.js'
import {
  renderSecondarySkillIcon,
  secondarySkillStatusText
} from '../presentation/secondary-skill-icon.js'

const SIDES = ['left', 'right']
const OTHER_SIDE = { left: 'right', right: 'left' }
const SELECT_TEXT = { left: 'Select %s', right: 'Select %s' }
const EXCHANGE_BUTTONS =
  '.hero-exchange__slot-arrow, .hero-exchange__army-button, .hero-exchange__close'

function statusSourceAt(target) {
  return target?.closest?.('[data-status]') ?? null
}

function armySlotAt(target) {
  return target?.closest?.('.hero-exchange__army > .army-slot') ?? null
}

function renderSecondarySkill(document, skill) {
  const icon = renderSecondarySkillIcon(document, skill)
  icon.setAttribute('role', 'img')
  icon.setAttribute('aria-label', skill.title)
  icon.dataset.status = secondarySkillStatusText(skill)
  return icon
}

function sideOf(element) {
  return element.closest('[data-side]').dataset.side
}

export const registerHeroExchangeViewModule = defineModule(
  ({ emit, env, state }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let exchange = null
    let heroIds = null
    let rearranging = null
    let definitions = {}

    function heroOn(side) {
      return heroById(state.get(), heroIds[side])
    }

    function sideElement(side) {
      return exchange.querySelector(`.hero-exchange__hero[data-side="${side}"]`)
    }

    function fillHero(side) {
      const hero = heroOn(side)
      const heroClass = definitions?.heroClasses?.[hero.heroClass]
      const level = `Level ${levelForExperience(hero.experience)} ${heroClass?.name ?? ''}`.trim()
      const element = sideElement(side)
      element.setAttribute('aria-label', hero.name)
      element.querySelector('.hero-exchange__banner').textContent = `${hero.name}, ${level}`
      const portrait = element.querySelector('.hero-exchange__portrait')
      portrait.setAttribute('aria-label', `${hero.name} portrait`)
      portrait.textContent = hero.name.charAt(0)
      element.querySelector('.hero-exchange__experience .hero-exchange__box-value').textContent =
        String(hero.experience)
      element
        .querySelector('.hero-exchange__army')
        .setAttribute('aria-label', `${hero.name}'s army`)
      fillSecondarySkills(element, hero)

      const otherName = heroOn(OTHER_SIDE[side]).name
      element.querySelectorAll('.hero-exchange__slot-arrow').forEach((arrow, index) => {
        arrow.setAttribute('aria-label', `Move slot ${index + 1} to ${otherName}`)
      })
      const moveAll = exchange.querySelector(`[data-exchange-action="${OTHER_SIDE[side]}"]`)
      moveAll.setAttribute('aria-label', `Move all to ${otherName}`)
      moveAll.dataset.status = `Move all to ${otherName}`

      for (const { key, value } of getHeroPrimarySkills({ entity: hero, definitions })) {
        exchange.querySelector(
          `[data-skill="${key}"] .hero-exchange__skill-value[data-side="${side}"]`
        ).textContent = String(value)
      }
    }

    function fillSecondarySkills(element, hero) {
      const list = element.querySelector('.hero-exchange__secondary-skills')
      list.setAttribute('aria-label', `${hero.name}'s secondary skills`)
      const skills = hero.secondarySkills.map((skill) => describeSecondarySkill(skill, definitions))
      list.querySelectorAll('li').forEach((slot, index) => {
        slot.replaceChildren(
          ...(skills[index] ? [renderSecondarySkill(document, skills[index])] : [])
        )
      })
    }

    function showArmies() {
      const armies = {}
      for (const side of SIDES) {
        armies[side] = getHeroArmy({ entity: heroOn(side), definitions })
        sideElement(side)
          .querySelectorAll('.hero-exchange__army .army-slot')
          .forEach((slot, index) => {
            const stack = armies[side][index]
            slot.replaceChildren(...(stack ? [renderArmyStack(document, stack)] : []))
          })
      }
      rearranging.showArmies(armies)
    }

    function open({ heroId, otherHeroId }) {
      if (!gameShell || exchange) {
        return
      }

      heroIds = { left: heroId, right: otherHeroId }
      if (!heroOn('left') || !heroOn('right')) {
        heroIds = null
        return
      }

      exchange = document
        .getElementById('hero-exchange-template')
        .content.firstElementChild.cloneNode(true)
      rearranging = createArmyRearranging({
        document,
        container: exchange,
        slotLists: exchange.querySelectorAll('.hero-exchange__army'),
        selectText: SELECT_TEXT,
        showStatus,
        onMove: (move) => emit(APP_COMMAND_HEROES_STACK_MOVE_REQUESTED, { heroIds, ...move }),
        onSplit: (split) => emit(APP_COMMAND_HEROES_STACK_SPLIT_REQUESTED, { heroIds, ...split })
      })
      SIDES.forEach(fillHero)
      showArmies()
      gameShell.append(exchange)
      exchange.focus()
      emit(APP_UI_ADVENTURE_MAP_COVERED, {})
    }

    function close() {
      if (!exchange) {
        return
      }

      exchange.remove()
      exchange = null
      heroIds = null
      rearranging = null
      emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
    }

    function showStatus(text) {
      exchange.querySelector('.hero-exchange__status-bar').textContent = text
    }

    function clickButton(button) {
      if (button.classList.contains('hero-exchange__close')) {
        close()
        return
      }
      if (button.classList.contains('hero-exchange__slot-arrow')) {
        const side = sideOf(button)
        emit(APP_COMMAND_HEROES_STACK_SEND_REQUESTED, {
          heroIds,
          from: { army: side, slot: Number(button.dataset.slot) },
          toArmy: OTHER_SIDE[side]
        })
        return
      }

      const action = button.dataset.exchangeAction
      if (action === 'swap') {
        emit(APP_COMMAND_HEROES_ARMIES_SWAP_REQUESTED, { heroIds })
      } else if (action) {
        emit(APP_COMMAND_HEROES_ARMY_SEND_REQUESTED, {
          heroIds,
          fromArmy: OTHER_SIDE[action],
          toArmy: action
        })
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions
          }
        },
        {
          type: APP_FACT_HERO_ARMY_CHANGED,
          handler: () => {
            if (exchange) {
              showArmies()
            }
          }
        },
        {
          type: APP_UI_HERO_EXCHANGE_OPEN_REQUESTED,
          handler: (event) => open(event.detail)
        }
      ],
      domSubscriptions: [
        {
          target: gameShell,
          type: 'click',
          handler: (event) => {
            if (!exchange?.contains(event.target)) {
              return
            }

            event.stopPropagation()
            const button = event.target.closest(EXCHANGE_BUTTONS)
            if (button) {
              rearranging.unselect()
              clickButton(button)
              return
            }

            const armySlot = armySlotAt(event.target)
            if (armySlot) {
              rearranging.clickSlot(armySlot, event)
            }
          }
        },
        {
          target: gameShell,
          type: 'mouseover',
          handler: (event) => {
            if (!exchange?.contains(event.target)) {
              return
            }

            const slot = armySlotAt(event.target)
            if (slot) {
              rearranging.hoverSlot(slot)
              return
            }
            showStatus(statusSourceAt(event.target)?.dataset.status ?? '')
          }
        },
        {
          target: gameShell,
          type: 'mouseout',
          handler: (event) => {
            const slot = armySlotAt(event.target)
            if (exchange?.contains(slot) && armySlotAt(event.relatedTarget) !== slot) {
              rearranging.leaveSlot()
            }
            const source = statusSourceAt(event.target)
            if (exchange?.contains(source) && statusSourceAt(event.relatedTarget) !== source) {
              showStatus('')
            }
          }
        }
      ],
      dispose: () => {
        exchange?.remove()
        exchange = null
        rearranging = null
      }
    }
  },
  {
    id: 'hero-exchange-view',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_UI_HERO_EXCHANGE_OPEN_REQUESTED
    ],
    produces: [
      APP_COMMAND_HEROES_STACK_MOVE_REQUESTED,
      APP_COMMAND_HEROES_STACK_SPLIT_REQUESTED,
      APP_COMMAND_HEROES_STACK_SEND_REQUESTED,
      APP_COMMAND_HEROES_ARMY_SEND_REQUESTED,
      APP_COMMAND_HEROES_ARMIES_SWAP_REQUESTED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED
    ]
  }
)
