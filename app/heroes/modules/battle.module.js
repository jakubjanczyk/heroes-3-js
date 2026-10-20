import { findHero } from '../../../game/domain/entity-queries.js'
import {
  attackStack,
  createBattle,
  endTurn,
  getActiveStack,
  getAttackTargets,
  getExperienceForWin,
  getStackReach,
  hasLivingStacks,
  moveStack,
  planStackAttack,
  planStackMove
} from '../../../game/heroes/battle.js'
import { getHexDistance } from '../../../game/heroes/battlefield.js'
import { getHeroPrimarySkills } from '../../../game/heroes/primary-skills.js'
import {
  APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
  APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
  APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_FACT_BATTLE_ENDED,
  APP_FACT_BATTLE_STACK_ATTACKED,
  APP_FACT_BATTLE_STACK_MOVED,
  APP_FACT_BATTLE_STARTED,
  APP_FACT_BATTLE_TURN_ENDED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_LEVELED_UP,
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

// The battle the hero is fighting. The player's stacks move and attack; the battle is won when
// the monster has no creatures left, or at once with Auto combat.
export const registerBattleModule = defineModule(
  ({ emit, config }) => {
    const stepDelayMs = config?.battleStepDelayMs ?? DEFAULT_STEP_DELAY_MS
    const random = typeof config?.random === 'function' ? config.random : Math.random

    let hero = null
    let definitions = {}
    let levelUpSkills = []
    let started = null
    let battle = null
    let isRestoring = false
    // A move or an attack is saved as one fact; until the stack gets where it is going the
    // battle is shown as it was before, with the stack on its way.
    let moving = null

    function showBattle() {
      if (moving) {
        emit(APP_UI_BATTLE_UPDATED, {
          tile: started.tile,
          stacks: moving.battle.stacks.map((stack) =>
            stack.id === moving.stackId ? { ...stack, hex: moving.hex } : stack
          ),
          activeStackId: moving.stackId,
          reachableHexes: [],
          attackTargets: [],
          messages: moving.battle.messages,
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
        attackTargets: activeStack ? getAttackTargets(battle, activeStack) : [],
        messages: battle.messages,
        stepDelayMs
      })
    }

    function winBattle() {
      const { entityId, entityType, tile } = started
      const experience = getExperienceForWin(battle)
      emit(APP_FACT_BATTLE_ENDED, { entityId, winner: 'attacker' })
      emit(APP_FACT_MONSTER_DEFEATED, { entityId, entityType, tile })
      emit(APP_FACT_ENTITY_REMOVED, { entityId })
      emit(APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED, { amount: experience })
    }

    // No AI yet: the monster lets its turn pass. With no hero stack left nothing happens
    // until the AI can finish the battle.
    function passEnemyTurns() {
      for (
        let stack = getActiveStack(battle);
        stack?.side === 'defender' && hasLivingStacks(battle, 'attacker');
        stack = getActiveStack(battle)
      ) {
        emit(APP_FACT_BATTLE_TURN_ENDED, { stackId: stack.id })
      }
    }

    function continueBattle() {
      if (!hasLivingStacks(battle, 'defender')) {
        winBattle()
        return
      }

      passEnemyTurns()
    }

    // Saves the fact, then shows the stack walking `path` before the outcome.
    async function walkThenShow({ stack, path, fact, detail }) {
      const walkingBattle = started
      moving = { stackId: stack.id, hex: stack.hex, battle }
      emit(fact, detail)
      for (const to of path) {
        const from = moving.hex
        moving.hex = to
        showBattle()
        await sleep(stepDelayMs * getHexDistance(from, to))
        if (started !== walkingBattle) {
          moving = null
          return
        }
      }

      moving = null
      showBattle()
      continueBattle()
    }

    function moveActiveStack(hex) {
      const stack = getActiveStack(battle)
      const path = stack && planStackMove(battle, stack, hex)
      if (!path) {
        return
      }

      void walkThenShow({
        stack,
        path,
        fact: APP_FACT_BATTLE_STACK_MOVED,
        detail: { stackId: stack.id, path }
      })
    }

    function attackWithActiveStack({ targetId, fromHex }) {
      const stack = getActiveStack(battle)
      const attack = stack && planStackAttack(battle, stack, { targetId, fromHex, random })
      if (!attack) {
        return
      }

      const { path, strikes } = attack
      void walkThenShow({
        stack,
        path,
        fact: APP_FACT_BATTLE_STACK_ATTACKED,
        detail: { stackId: stack.id, targetId, path, strikes }
      })
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            hero = findHero(event.detail.scenario.entities)
            definitions = event.detail.definitions ?? {}
            levelUpSkills = []
            started = null
            battle = null
          }
        },
        {
          type: APP_FACT_HERO_LEVELED_UP,
          handler: (event) => {
            levelUpSkills = [...levelUpSkills, event.detail.primarySkill]
          }
        },
        { type: APP_UI_RESTORE_STARTED, handler: () => (isRestoring = true) },
        {
          type: APP_UI_RESTORE_COMPLETED,
          handler: () => {
            isRestoring = false
            if (battle) {
              continueBattle()
            }
          }
        },
        {
          type: APP_FACT_BATTLE_STARTED,
          handler: (event) => {
            started = event.detail
            const skills = getHeroPrimarySkills({ entity: hero, definitions, levelUpSkills })
            battle = createBattle({
              heroArmy: hero?.army,
              heroSkills: Object.fromEntries(skills.map(({ key, value }) => [key, value])),
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
          type: APP_FACT_BATTLE_STACK_ATTACKED,
          handler: (event) => {
            if (!battle) {
              return
            }

            battle = attackStack(battle, event.detail)
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

            moveActiveStack(event.detail.hex)
          }
        },
        {
          type: APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
          handler: (event) => {
            if (!battle || moving) {
              return
            }

            attackWithActiveStack(event.detail)
          }
        },
        {
          type: APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
          handler: () => {
            if (!started) {
              return
            }

            winBattle()
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
      APP_FACT_HERO_LEVELED_UP,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED,
      APP_FACT_BATTLE_STARTED,
      APP_FACT_BATTLE_STACK_MOVED,
      APP_FACT_BATTLE_STACK_ATTACKED,
      APP_FACT_BATTLE_TURN_ENDED,
      APP_FACT_BATTLE_ENDED,
      APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
      APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
      APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED
    ],
    produces: [
      APP_UI_BATTLE_UPDATED,
      APP_FACT_BATTLE_STACK_MOVED,
      APP_FACT_BATTLE_STACK_ATTACKED,
      APP_FACT_BATTLE_TURN_ENDED,
      APP_FACT_BATTLE_ENDED,
      APP_FACT_MONSTER_DEFEATED,
      APP_FACT_ENTITY_REMOVED,
      APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED
    ]
  }
)
