import { sameTile } from '../../../engine/tile-utils.js'
import { isTown } from '../../../game/domain/entity-queries.js'
import { getHeroSpellPoints } from '../../../game/heroes/spell-points.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import {
  heroIdsOf,
  heroMovementPoints,
  heroTile,
  selectedHeroIdOf,
  viewingPlayer
} from '../../../game/state/queries.js'
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_COMMAND_HERO_SELECT_REQUESTED,
  APP_FACT_ARTIFACT_PICKED_UP,
  APP_FACT_BATTLE_SPELL_CAST,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_ARTIFACTS_CHANGED,
  APP_FACT_HERO_HIRED,
  APP_FACT_HERO_LEVELED_UP,
  APP_FACT_HERO_PRIMARY_SKILLS_GAINED,
  APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
  APP_FACT_HERO_SELECTED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_TREASURE_CHEST_OPENED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_HERO_SCREEN_OPEN_REQUESTED,
  APP_UI_HERO_SELECTED,
  APP_UI_TOWN_SELECTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const DEFAULT_HERO_NAME = 'Hero'

// The hero list with each hero's movement and spell points bars, and the Next hero button. The selection is
// announced again on a new day and on leaving a town the selected hero is in, even when the hero
// already was selected, so the info box shows the hero again.
export const registerHeroPanelModule = defineModule(
  ({ emit, env, state }) => {
    const heroList = env.document?.getElementById('hero-list')
    const nextHeroButton = env.document?.getElementById('next-hero-button')
    let heroIds = []
    const itemsByHeroId = new Map()
    let isHeroSelected = true
    let townTilesById = new Map()
    let definitions = {}

    function selectedHeroId() {
      return selectedHeroIdOf(state.get(), viewingPlayer(state.get()))
    }

    function selectHero() {
      isHeroSelected = true
      renderSelection()
      emit(APP_UI_HERO_SELECTED, { heroId: selectedHeroId() })
    }

    function centerOnHero(heroId) {
      const tile = heroTile(state.get(), heroId)
      if (tile) {
        emit(APP_COMMAND_CAMERA_CENTER_ON_TILE, { tile })
      }
    }

    function selectAndCenterOnHero() {
      selectHero()
      centerOnHero(selectedHeroId())
    }

    function selectOtherHero(heroId) {
      emit(APP_COMMAND_HERO_SELECT_REQUESTED, { heroId })
      centerOnHero(heroId)
    }

    function canMove(heroId) {
      return (heroMovementPoints(state.get(), heroId)?.value ?? 0) > 0
    }

    // The next hero after the selected one, wrapping round, who can still move today.
    function nextHeroId() {
      const start = heroIds.indexOf(selectedHeroId())
      const inTurn = heroIds.map((_, offset) => heroIds[(start + 1 + offset) % heroIds.length])
      return inTurn.find(canMove) ?? null
    }

    function selectNextHero() {
      const heroId = nextHeroId()
      if (heroId && heroId !== selectedHeroId()) {
        selectOtherHero(heroId)
        return
      }
      selectAndCenterOnHero()
    }

    function clickPortrait(heroId) {
      if (heroId !== selectedHeroId()) {
        selectOtherHero(heroId)
        return
      }

      if (isHeroSelected) {
        emit(APP_UI_HERO_SCREEN_OPEN_REQUESTED, {})
        return
      }
      selectAndCenterOnHero()
    }

    function renderBar(className, label) {
      const bar = env.document.createElement('div')
      bar.className = className
      bar.setAttribute('role', 'progressbar')
      bar.setAttribute('aria-label', label)
      bar.setAttribute('aria-valuemin', '0')
      return bar
    }

    function renderHeroItem(heroId) {
      const name = heroById(state.get(), heroId)?.name ?? DEFAULT_HERO_NAME
      const item = env.document.createElement('li')
      item.className = 'hero-list__item'

      const portrait = env.document.createElement('button')
      portrait.type = 'button'
      portrait.className = 'hero-list__portrait'
      portrait.setAttribute('aria-label', name)
      portrait.title = name
      portrait.textContent = name.charAt(0)
      portrait.addEventListener('click', (event) => {
        event.stopPropagation()
        clickPortrait(heroId)
      })

      const movementBar = renderBar('hero-list__movement', 'Movement points')

      const spellPointsBar = renderBar('hero-list__spell-points', 'Spell points')

      item.append(movementBar, portrait, spellPointsBar)
      itemsByHeroId.set(heroId, { portrait, movementBar, spellPointsBar })
      return item
    }

    function removeHero() {
      heroIds = heroIdsOf(state.get(), viewingPlayer(state.get()))
      renderHeroes()
      if (isHeroSelected && selectedHeroId()) {
        selectAndCenterOnHero()
      }
    }

    function renderHeroes() {
      if (!heroList || !env.document) {
        return
      }

      itemsByHeroId.clear()
      heroList.replaceChildren(...heroIds.map(renderHeroItem))
      renderMovementPoints()
      renderSpellPoints()
      renderSelection()
    }

    function renderSelection() {
      const selected = isHeroSelected ? selectedHeroId() : null
      for (const [heroId, { portrait }] of itemsByHeroId) {
        if (heroId === selected) {
          portrait.setAttribute('aria-current', 'true')
        } else {
          portrait.removeAttribute('aria-current')
        }
      }
      renderNextHeroButton()
    }

    function renderMovementPoints() {
      for (const [heroId, { movementBar }] of itemsByHeroId) {
        const movementPoints = heroMovementPoints(state.get(), heroId)
        if (movementPoints) {
          fillBar(movementBar, movementPoints, '--movement-fill')
        }
      }
      renderNextHeroButton()
    }

    function fillBar(bar, { value, max }, fillProperty) {
      bar.setAttribute('aria-valuenow', String(value))
      bar.setAttribute('aria-valuemax', String(max))
      bar.style.setProperty(fillProperty, `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`)
    }

    // A share of the hero's maximum for now; the game's own bar grows by a fixed amount instead.
    function renderSpellPoints() {
      for (const [heroId, { spellPointsBar }] of itemsByHeroId) {
        const hero = heroById(state.get(), heroId)
        fillBar(
          spellPointsBar,
          getHeroSpellPoints({ entity: hero, definitions }),
          '--spell-points-fill'
        )
      }
    }

    function renderNextHeroButton() {
      if (nextHeroButton) {
        nextHeroButton.disabled = nextHeroId() === null
      }
    }

    return {
      domSubscriptions: [
        {
          target: nextHeroButton,
          type: 'click',
          handler: (event) => {
            event?.stopPropagation?.()
            selectNextHero()
          }
        }
      ],
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const { entities } = event.detail.scenario
            definitions = event.detail.definitions
            heroIds = heroIdsOf(state.get(), viewingPlayer(state.get()))
            townTilesById = new Map(entities.filter(isTown).map((town) => [town.id, town.tile]))
            isHeroSelected = true
            renderHeroes()
          }
        },
        {
          type: APP_FACT_HERO_HIRED,
          handler: () => {
            heroIds = heroIdsOf(state.get(), viewingPlayer(state.get()))
            renderHeroes()
          }
        },
        {
          type: APP_FACT_ENTITY_REMOVED,
          handler: (event) => {
            if (heroIds.includes(event.detail.entityId)) {
              removeHero()
            }
          }
        },
        {
          type: APP_FACT_HERO_SELECTED,
          handler: selectHero
        },
        {
          type: APP_UI_TOWN_SELECTED,
          handler: () => {
            isHeroSelected = false
            renderSelection()
          }
        },
        {
          type: APP_FACT_TURN_ENDED,
          handler: () => {
            renderSpellPoints()
            selectAndCenterOnHero()
          }
        },
        ...[
          APP_FACT_ARTIFACT_PICKED_UP,
          APP_FACT_BATTLE_SPELL_CAST,
          APP_FACT_HERO_ARTIFACTS_CHANGED,
          APP_FACT_HERO_LEVELED_UP,
          APP_FACT_HERO_PRIMARY_SKILLS_GAINED,
          APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
          APP_FACT_TREASURE_CHEST_OPENED
        ].map((type) => ({ type, handler: renderSpellPoints })),
        {
          type: APP_FACT_TOWN_LEFT,
          handler: (event) => {
            const tile = heroTile(state.get(), selectedHeroId())
            const townTile = townTilesById.get(event.detail.entityId)
            if (tile && townTile && sameTile(tile, townTile)) {
              selectHero()
            }
          }
        },
        {
          type: APP_FACT_MOVEMENT_POINTS_CHANGED,
          handler: renderMovementPoints
        }
      ]
    }
  },
  {
    id: 'hero-panel',
    phase: 'view',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_ARTIFACT_PICKED_UP,
      APP_FACT_BATTLE_SPELL_CAST,
      APP_FACT_HERO_ARTIFACTS_CHANGED,
      APP_FACT_HERO_LEVELED_UP,
      APP_FACT_HERO_PRIMARY_SKILLS_GAINED,
      APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
      APP_FACT_TREASURE_CHEST_OPENED,
      APP_FACT_ENTITY_REMOVED,
      APP_FACT_HERO_HIRED,
      APP_FACT_HERO_SELECTED,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_UI_TOWN_SELECTED,
      APP_FACT_TURN_ENDED,
      APP_FACT_TOWN_LEFT
    ],
    produces: [
      APP_COMMAND_CAMERA_CENTER_ON_TILE,
      APP_COMMAND_HERO_SELECT_REQUESTED,
      APP_UI_HERO_SELECTED,
      APP_UI_HERO_SCREEN_OPEN_REQUESTED
    ]
  }
)
