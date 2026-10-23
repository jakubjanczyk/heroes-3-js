import { sameTile } from '../../../engine/tile-utils.js'
import { findHero } from '../../../game/domain/entity-queries.js'
import { getHeroArmy } from '../../../game/heroes/hero-army.js'
import { levelForExperience } from '../../../game/heroes/hero-experience.js'
import { getHeroPrimarySkills } from '../../../game/heroes/primary-skills.js'
import {
  APP_COMMAND_TILE_CLICKED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_EXPERIENCE_GAINED,
  APP_FACT_HERO_LEVELED_UP,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_HERO_SCREEN_OPEN_REQUESTED,
  APP_UI_HERO_SELECTED,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_SYSTEM_OPTIONS_CLOSED,
  APP_UI_SYSTEM_OPTIONS_OPENED,
  APP_UI_TOWN_SELECTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { renderArmyStack } from '../presentation/hero-box.js'

const DEFAULT_HERO_NAME = 'Hero'

function statusSourceAt(target) {
  return target?.closest?.('[data-status]') ?? null
}

// The Heroes 3 hero screen, laid out as the game's: what the hero is and has on the left, the
// artifacts on the right, the army along the bottom. It shows the hero as they are when it opens,
// as nothing changes the hero while it is open. As in Heroes 3, clicking the selected hero on the
// map opens it, as do the hero list (hero-panel) and the town screen. It is not saved: a reload
// shows the map.
export const registerHeroScreenViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let heroScreen = null
    let hero = null
    let heroName = DEFAULT_HERO_NAME
    let definitions = {}
    let experience = 0
    let levelUpSkills = []
    let heroTile = null
    let isHeroSelected = true
    let isMapCovered = false
    // Whether this screen covered the map, so closing it uncovers only what it covered: over the
    // town screen, the map stays covered.
    let coversMap = false
    const mapBlockers = new Set()

    function fillHeroScreen() {
      const heroClass = definitions?.heroClasses?.[definitions?.hero?.heroClass]
      const portrait = heroScreen.querySelector('.hero-screen__portrait')
      portrait.setAttribute('aria-label', heroName)
      portrait.textContent = heroName.charAt(0)
      heroScreen.querySelector('.hero-screen__heroes .hero-screen__hero').textContent =
        heroName.charAt(0)
      heroScreen.querySelector('.hero-screen__name').textContent = heroName
      heroScreen.querySelector('.hero-screen__level').textContent =
        `Level ${levelForExperience(experience)} ${heroClass?.name ?? ''}`.trim()

      for (const { key, value } of getHeroPrimarySkills({
        entity: hero,
        definitions,
        levelUpSkills
      })) {
        heroScreen.querySelector(`[data-skill="${key}"] .hero-screen__skill-value`).textContent =
          String(value)
      }
      heroScreen.querySelector('.hero-screen__experience .hero-screen__box-value').textContent =
        String(experience)

      const army = getHeroArmy({ entity: hero, definitions })
      heroScreen.querySelectorAll('.hero-screen__army .army-slot').forEach((slot, index) => {
        const stack = army[index]
        slot.replaceChildren(...(stack ? [renderArmyStack(document, stack)] : []))
      })
    }

    function openHeroScreen() {
      if (!gameShell || heroScreen) {
        return
      }

      heroScreen = document
        .getElementById('hero-screen-template')
        .content.firstElementChild.cloneNode(true)
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
      if (coversMap) {
        coversMap = false
        emit(APP_UI_ADVENTURE_MAP_UNCOVERED, {})
      }
    }

    function showStatus(text) {
      heroScreen.querySelector('.hero-screen__status-bar').textContent = text
    }

    function openOnSelectedHeroClicked(tile) {
      if (isHeroSelected && mapBlockers.size === 0 && heroTile && sameTile(tile, heroTile)) {
        openHeroScreen()
      }
    }

    function block(blocker) {
      return () => mapBlockers.add(blocker)
    }

    function unblock(blocker) {
      return () => mapBlockers.delete(blocker)
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const { scenario } = event.detail
            definitions = event.detail.definitions
            hero = findHero(scenario.entities)
            heroName = definitions?.hero?.name ?? DEFAULT_HERO_NAME
            heroTile = hero?.tile ?? null
            experience = hero?.experience ?? 0
            levelUpSkills = []
            isHeroSelected = true
          }
        },
        {
          type: APP_FACT_HERO_EXPERIENCE_GAINED,
          handler: (event) => {
            experience += event.detail.amount
          }
        },
        {
          type: APP_FACT_HERO_LEVELED_UP,
          handler: (event) => {
            levelUpSkills = [...levelUpSkills, event.detail.primarySkill]
          }
        },
        {
          type: APP_FACT_HERO_ARMY_CHANGED,
          handler: (event) => {
            hero = { ...hero, army: event.detail.army }
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            heroTile = event.detail.to
          }
        },
        {
          type: APP_UI_TOWN_SELECTED,
          handler: () => {
            isHeroSelected = false
          }
        },
        {
          type: APP_UI_HERO_SELECTED,
          handler: () => {
            isHeroSelected = true
          }
        },
        { type: APP_FACT_MOVE_STARTED, handler: block('moving') },
        { type: APP_FACT_MOVE_FINISHED, handler: unblock('moving') },
        { type: APP_UI_INTERACTION_MODAL_OPENED, handler: block('modal') },
        { type: APP_UI_INTERACTION_MODAL_CLOSED, handler: unblock('modal') },
        { type: APP_UI_SYSTEM_OPTIONS_OPENED, handler: block('system options') },
        { type: APP_UI_SYSTEM_OPTIONS_CLOSED, handler: unblock('system options') },
        {
          type: APP_UI_ADVENTURE_MAP_COVERED,
          handler: () => {
            isMapCovered = true
            mapBlockers.add('covered')
          }
        },
        {
          type: APP_UI_ADVENTURE_MAP_UNCOVERED,
          handler: () => {
            isMapCovered = false
            mapBlockers.delete('covered')
          }
        },
        {
          type: APP_COMMAND_TILE_CLICKED,
          handler: (event) => openOnSelectedHeroClicked(event.detail.tile)
        },
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
            }
          }
        },
        {
          target: gameShell,
          type: 'mouseover',
          handler: (event) => {
            if (heroScreen?.contains(event.target)) {
              showStatus(statusSourceAt(event.target)?.dataset.status ?? '')
            }
          }
        },
        {
          target: gameShell,
          type: 'mouseout',
          handler: (event) => {
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
      }
    }
  },
  {
    id: 'hero-screen-view',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_EXPERIENCE_GAINED,
      APP_FACT_HERO_LEVELED_UP,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_FACT_HERO_MOVED,
      APP_FACT_MOVE_STARTED,
      APP_FACT_MOVE_FINISHED,
      APP_UI_TOWN_SELECTED,
      APP_UI_HERO_SELECTED,
      APP_UI_INTERACTION_MODAL_OPENED,
      APP_UI_INTERACTION_MODAL_CLOSED,
      APP_UI_SYSTEM_OPTIONS_OPENED,
      APP_UI_SYSTEM_OPTIONS_CLOSED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
      APP_COMMAND_TILE_CLICKED,
      APP_UI_HERO_SCREEN_OPEN_REQUESTED
    ],
    produces: [APP_UI_ADVENTURE_MAP_COVERED, APP_UI_ADVENTURE_MAP_UNCOVERED]
  }
)
