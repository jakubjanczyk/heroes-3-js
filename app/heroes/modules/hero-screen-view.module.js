import { getHeroArmy } from '../../../game/heroes/hero-army.js'
import { levelForExperience } from '../../../game/heroes/hero-experience.js'
import { getHeroPrimarySkills } from '../../../game/heroes/primary-skills.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { selectedHeroIdOf, viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_HERO_STACK_MOVE_REQUESTED,
  APP_COMMAND_HERO_STACK_SPLIT_REQUESTED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_HERO_SCREEN_OPEN_REQUESTED,
  APP_UI_SELECTED_HERO_CLICKED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createArmyRearranging } from '../presentation/army-rearranging.js'
import { renderArmyStack } from '../presentation/hero-box.js'

const DEFAULT_HERO_NAME = 'Hero'
const SELECT_TEXT = { hero: 'Select %s' }

function statusSourceAt(target) {
  return target?.closest?.('[data-status]') ?? null
}

function armySlotAt(target) {
  return target?.closest?.('.hero-screen__army > .army-slot') ?? null
}

export const registerHeroScreenViewModule = defineModule(
  ({ emit, env, state }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let heroScreen = null
    let rearranging = null
    let definitions = {}
    let isMapCovered = false
    // Whether this screen covered the map, so closing it uncovers only what it covered: over the
    // town screen, the map stays covered.
    let coversMap = false

    function selectedHero() {
      return heroById(state.get(), selectedHeroIdOf(state.get(), viewingPlayer(state.get())))
    }

    function fillHeroScreen() {
      const hero = selectedHero()
      const heroName = hero?.name ?? DEFAULT_HERO_NAME
      const heroClass = definitions?.heroClasses?.[hero?.heroClass]
      const portrait = heroScreen.querySelector('.hero-screen__portrait')
      portrait.setAttribute('aria-label', heroName)
      portrait.textContent = heroName.charAt(0)
      heroScreen.querySelector('.hero-screen__heroes .hero-screen__hero').textContent =
        heroName.charAt(0)
      heroScreen.querySelector('.hero-screen__name').textContent = heroName
      heroScreen.querySelector('.hero-screen__level').textContent =
        `Level ${levelForExperience(hero?.experience ?? 0)} ${heroClass?.name ?? ''}`.trim()

      for (const { key, value } of getHeroPrimarySkills({ entity: hero, definitions })) {
        heroScreen.querySelector(`[data-skill="${key}"] .hero-screen__skill-value`).textContent =
          String(value)
      }
      heroScreen.querySelector('.hero-screen__experience .hero-screen__box-value').textContent =
        String(hero?.experience ?? 0)

      showArmy()
    }

    function showArmy() {
      const army = getHeroArmy({ entity: selectedHero(), definitions })
      heroScreen.querySelectorAll('.hero-screen__army .army-slot').forEach((slot, index) => {
        const stack = army[index]
        slot.replaceChildren(...(stack ? [renderArmyStack(document, stack)] : []))
      })
      rearranging.showArmies({ hero: army })
    }

    function openHeroScreen() {
      if (!gameShell || heroScreen) {
        return
      }

      heroScreen = document
        .getElementById('hero-screen-template')
        .content.firstElementChild.cloneNode(true)
      rearranging = createArmyRearranging({
        document,
        container: heroScreen,
        slotLists: heroScreen.querySelectorAll('.hero-screen__army'),
        splitButton: heroScreen.querySelector('.hero-screen__split'),
        selectText: SELECT_TEXT,
        showStatus,
        onMove: (move) => emit(APP_COMMAND_HERO_STACK_MOVE_REQUESTED, move),
        onSplit: (split) => emit(APP_COMMAND_HERO_STACK_SPLIT_REQUESTED, split)
      })
      fillHeroScreen()
      gameShell.append(heroScreen)
      // The dialog takes the focus, so Enter closes it rather than pressing the button that opened it.
      heroScreen.focus()
      if (!isMapCovered) {
        coversMap = true
        emit(APP_UI_ADVENTURE_MAP_COVERED, {})
      }
    }

    function closeHeroScreen() {
      if (!heroScreen) {
        return
      }

      heroScreen.remove()
      heroScreen = null
      rearranging = null
      if (coversMap) {
        coversMap = false
        emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
      }
    }

    function showStatus(text) {
      heroScreen.querySelector('.hero-screen__status-bar').textContent = text
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
            if (heroScreen) {
              showArmy()
            }
          }
        },
        {
          type: APP_UI_ADVENTURE_MAP_COVERED,
          handler: () => {
            isMapCovered = true
          }
        },
        {
          type: APP_UI_ADVENTURE_MAP_UNCOVERED,
          handler: () => {
            isMapCovered = false
          }
        },
        { type: APP_UI_SELECTED_HERO_CLICKED, handler: openHeroScreen },
        { type: APP_UI_HERO_SCREEN_OPEN_REQUESTED, handler: openHeroScreen }
      ],
      domSubscriptions: [
        {
          target: gameShell,
          type: 'click',
          handler: (event) => {
            if (!heroScreen?.contains(event.target)) {
              return
            }

            event.stopPropagation()
            if (event.target.closest('.hero-screen__close')) {
              closeHeroScreen()
              return
            }

            if (event.target.closest('.hero-screen__split')) {
              rearranging.toggleSplitMode()
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
            if (!heroScreen?.contains(event.target)) {
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
            if (heroScreen?.contains(slot) && armySlotAt(event.relatedTarget) !== slot) {
              rearranging.leaveSlot()
            }
            const source = statusSourceAt(event.target)
            if (heroScreen?.contains(source) && statusSourceAt(event.relatedTarget) !== source) {
              showStatus('')
            }
          }
        }
      ],
      dispose: () => {
        heroScreen?.remove()
        heroScreen = null
        rearranging = null
      }
    }
  },
  {
    id: 'hero-screen-view',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
      APP_UI_SELECTED_HERO_CLICKED,
      APP_UI_HERO_SCREEN_OPEN_REQUESTED
    ],
    produces: [
      APP_COMMAND_HERO_STACK_MOVE_REQUESTED,
      APP_COMMAND_HERO_STACK_SPLIT_REQUESTED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED
    ]
  }
)
