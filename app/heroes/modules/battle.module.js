import { findHero } from '../../../game/domain/entity-queries.js'
import {
  createBattle,
  endTurn,
  getActiveStack,
  getStackReach,
  moveStack,
  planStackMove
} from '../../../game/heroes/battle.js'
import { getHexDistance } from '../../../game/heroes/battlefield.js'
import {
  APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
  APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
  APP_FACT_BATTLE_ENDED,
  APP_FACT_BATTLE_STACK_MOVED,
  APP_FACT_BATTLE_STARTED,
  APP_FACT_BATTLE_TURN_ENDED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_WORLD_READY,
  APP_UI_BATTLE_UPDATED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const DEFAULT_STEP_DELAY_MS = 180

const sleep = (ms) =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()

// The battle the hero is fighting. Auto combat wins it outright.
export const registerBattleModule = defineModule(
  ({ emit, config }) => {
    const stepDelayMs = config?.battleStepDelayMs ?? DEFAULT_STEP_DELAY_MS

    let hero = null
    let definitions = {}
    let started = null
    let battle = null
    let isRestoring = false
    // A move is saved as one fact; this is where the stack is shown while it walks there.
    let moving = null

    function showBattle() {
      if (moving) {
        emit(APP_UI_BATTLE_UPDATED, {
          tile: started.tile,
          stacks: battle.stacks.map((stack) =>
            stack.id === moving.stackId ? { ...stack, hex: moving.hex } : stack
          ),
          activeStackId: moving.stackId,
          reachableHexes: [],
          stepDelayMs
        })
        return
      }

      const activeStack = getActiveStack(battle)
      emit(APP_UI_BATTLE_UPDATED, {
        tile: started.tile,
        stacks: battle.stacks,
        activeStackId: activeStack?.id ?? null,
        reachableHexes: activeStack ? getStackReach(battle, activeStack) : [],
        stepDelayMs
      })
    }

    // No AI yet: the monster lets its turn pass.
    function passEnemyTurns() {
      for (
        let stack = getActiveStack(battle);
        stack?.side === 'defender';
        stack = getActiveStack(battle)
      ) {
        emit(APP_FACT_BATTLE_TURN_ENDED, { stackId: stack.id })
      }
    }

    async function moveActiveStack(hex) {
      const stack = getActiveStack(battle)
      const path = stack && planStackMove(battle, stack, hex)
      if (!path) {
        return
      }

      const movingBattle = started
      moving = { stackId: stack.id, hex: stack.hex }
      emit(APP_FACT_BATTLE_STACK_MOVED, { stackId: stack.id, path })
      for (const to of path) {
        const from = moving.hex
        moving.hex = to
        showBattle()
        await sleep(stepDelayMs * getHexDistance(from, to))
        if (started !== movingBattle) {
          moving = null
          return
        }
      }

      moving = null
      showBattle()
      passEnemyTurns()
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            hero = findHero(event.detail.scenario.entities)
            definitions = event.detail.definitions ?? {}
            started = null
            battle = null
          }
        },
        { type: APP_UI_RESTORE_STARTED, handler: () => (isRestoring = true) },
        {
          type: APP_UI_RESTORE_COMPLETED,
          handler: () => {
            isRestoring = false
            if (battle) {
              passEnemyTurns()
            }
          }
        },
        {
          type: APP_FACT_BATTLE_STARTED,
          handler: (event) => {
            started = event.detail
            battle = createBattle({
              heroArmy: hero?.army,
              monster: { creature: started.entityType, count: started.count },
              definitions
            })
            showBattle()
            if (!isRestoring) {
              passEnemyTurns()
            }
          }
        },
        {
          type: APP_FACT_BATTLE_STACK_MOVED,
          handler: (event) => {
            if (!battle) {
              return
            }

            const { stackId, path } = event.detail
            battle = endTurn(moveStack(battle, stackId, path.at(-1)), stackId)
            showBattle()
          }
        },
        {
          type: APP_FACT_BATTLE_TURN_ENDED,
          handler: (event) => {
            if (!battle) {
              return
            }

            battle = endTurn(battle, event.detail.stackId)
            showBattle()
          }
        },
        {
          type: APP_FACT_BATTLE_ENDED,
          handler: () => {
            started = null
            battle = null
            moving = null
          }
        },
        {
          type: APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
          handler: (event) => {
            if (!battle || moving) {
              return
            }

            void moveActiveStack(event.detail.hex)
          }
        },
        {
          type: APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
          handler: () => {
            if (!started) {
              return
            }

            const { entityId, entityType, tile } = started
            emit(APP_FACT_BATTLE_ENDED, { entityId, winner: 'attacker' })
            emit(APP_FACT_MONSTER_DEFEATED, { entityId, entityType, tile })
            emit(APP_FACT_ENTITY_REMOVED, { entityId })
          }
        }
      ]
    }
  },
  {
    id: 'battle',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED,
      APP_FACT_BATTLE_STARTED,
      APP_FACT_BATTLE_STACK_MOVED,
      APP_FACT_BATTLE_TURN_ENDED,
      APP_FACT_BATTLE_ENDED,
      APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
      APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED
    ],
    produces: [
      APP_UI_BATTLE_UPDATED,
      APP_FACT_BATTLE_STACK_MOVED,
      APP_FACT_BATTLE_TURN_ENDED,
      APP_FACT_BATTLE_ENDED,
      APP_FACT_MONSTER_DEFEATED,
      APP_FACT_ENTITY_REMOVED
    ]
  }
)
