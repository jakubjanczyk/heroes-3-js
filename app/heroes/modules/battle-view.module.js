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

// Full-screen battle over the adventure map, cloned from `#battle-screen-template` in index.html:
// the battlefield with its hexes, the hero and the stacks, and the combat bar along the bottom.
export const registerBattleViewModule = defineModule(
  ({ emit, env }) => {
    const document = env.document
    const gameShell = document?.querySelector('.game-shell')
    let map = null
    let hero = null
    let heroName = DEFAULT_HERO_NAME
    let definitions = {}
    let battleScreen = null

    function cloneTemplate(id) {
      return document.getElementById(id).content.firstElementChild.cloneNode(true)
    }

    // No creature pictures yet: a stack is drawn as monsters are on the map, with its count.
    function createStack({ name, count }, side) {
      const stack = cloneTemplate('battle-stack-template')
      stack.classList.add(`battle-stack--${side}`)
      const creature = stack.querySelector('.battle-stack__creature')
      creature.setAttribute('aria-label', name)
      creature.title = name
      stack.querySelector('.battle-stack__count').textContent = String(count)
      return stack
    }

    function placeArmy(hexes, stacks, side) {
      const startHexes = getStartHexes({ side, stackCount: stacks.length })
      stacks.forEach((stack, index) => {
        const { row, column } = startHexes[index]
        hexes[row][column].append(createStack(stack, side))
      })
    }

    function fillBattlefield(grid, battle) {
      const hexes = Array.from({ length: BATTLEFIELD_ROWS }, (_, row) => {
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
    }

    function openBattle(battle) {
      closeBattle()
      if (!gameShell) {
        return
      }

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

      fillBattlefield(battleScreen.querySelector('.battlefield'), battle)

      battleScreen
        .querySelector('[data-battle-action="auto-combat"]')
        .addEventListener('click', (event) => {
          event.stopPropagation()
          emit(APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED, {})
        })

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
