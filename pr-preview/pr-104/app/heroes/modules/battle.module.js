import { BATTLE_DEFENDER_ARTIFACT_GUARDS, hasFullBackpack } from '../../../game/heroes/artifacts.js'
import {
  attackStack,
  createBattle,
  defendStack,
  endTurn,
  finishAction,
  freezeStack,
  getActiveStack,
  getAttackTargets,
  getBadMoraleChance,
  getExperienceForWin,
  getGoodMoraleChance,
  getHeroArmyAfterBattle,
  getShotTargets,
  getStackHexes,
  getStackReach,
  hasLivingStacks,
  hasWaited,
  moveStack,
  planStackAttack,
  planStackMove,
  planStackShot,
  resolveAttack,
  resolveShot,
  shootStack,
  waitStack
} from '../../../game/heroes/battle.js'
import { planComputerTurn } from '../../../game/heroes/battle-ai.js'
import {
  BATTLE_OUTCOME_LOST,
  BATTLE_OUTCOME_RETREATED,
  BATTLE_OUTCOME_WON,
  describeBattleResults
} from '../../../game/heroes/battle-results.js'
import { getHexDistance } from '../../../game/heroes/battlefield.js'
import { BATTLE_DEFENDER_DWELLING_GUARDS } from '../../../game/heroes/map-dwellings.js'
import { splitMonster } from '../../../game/heroes/monster-stacks.js'
import { getHeroPrimarySkills } from '../../../game/heroes/primary-skills.js'
import { hasSpellBook } from '../../../game/heroes/spell-book.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { firstHeroIdOf, heroOwner, viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
  APP_COMMAND_BATTLE_RESULTS_CLOSE_REQUESTED,
  APP_COMMAND_BATTLE_RETREAT_REQUESTED,
  APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
  APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED,
  APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
  APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED,
  APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED,
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_FACT_ARTIFACT_GUARDS_CHANGED,
  APP_FACT_ARTIFACT_PICKED_UP,
  APP_FACT_BATTLE_AUTO_COMBAT_CHANGED,
  APP_FACT_BATTLE_ENDED,
  APP_FACT_BATTLE_FINISHED,
  APP_FACT_BATTLE_STACK_ATTACKED,
  APP_FACT_BATTLE_STACK_DEFENDED,
  APP_FACT_BATTLE_STACK_FROZE,
  APP_FACT_BATTLE_STACK_MOVED,
  APP_FACT_BATTLE_STACK_SHOT,
  APP_FACT_BATTLE_STACK_WAITED,
  APP_FACT_BATTLE_STARTED,
  APP_FACT_BATTLE_TURN_ENDED,
  APP_FACT_DWELLING_FLAGGED,
  APP_FACT_DWELLING_GUARDS_CHANGED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_MONSTER_COUNT_CHANGED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_WORLD_READY,
  APP_UI_BATTLE_UPDATED,
  APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const DEFAULT_STEP_DELAY_MS = 180
const DEFAULT_HERO_NAME = 'Hero'

const withHexes = (stacks) => stacks.map((stack) => ({ ...stack, hexes: getStackHexes(stack) }))

const isDwellingGuards = (started) => started.defender?.kind === BATTLE_DEFENDER_DWELLING_GUARDS
const isArtifactGuards = (started) => started.defender?.kind === BATTLE_DEFENDER_ARTIFACT_GUARDS

// A battle started before battles named their defender was against a monster on the map. The
// results window names an artifact's guards by their first stack.
function defenderOf(started) {
  if (isArtifactGuards(started)) {
    return started.defender.stacks[0]
  }
  return started.defender ?? { creature: started.entityType, count: started.count }
}

function defenderArmy({ started, heroArmy, definitions }) {
  const defender = defenderOf(started)
  if (isArtifactGuards(started)) {
    return started.defender.stacks.map(({ creature, count }) => ({ creature, count }))
  }
  if (isDwellingGuards(started)) {
    return [{ creature: defender.creature, count: defender.count }]
  }

  return splitMonster({
    monster: { ...defender, stacks: started.stacks },
    heroArmy,
    tile: started.tile,
    definitions
  })
}

const sleep = (ms) =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()

// The battle the hero is fighting. The monster's stacks play by `battle-ai.js`, and so do the
// hero's while Auto combat is on.
export const registerBattleModule = defineModule(
  ({ emit, config, state }) => {
    const stepDelayMs = config?.battleStepDelayMs ?? DEFAULT_STEP_DELAY_MS
    const random = typeof config?.random === 'function' ? config.random : Math.random
    const moraleRandom =
      typeof config?.moraleRandom === 'function' ? config.moraleRandom : Math.random
    const luckRandom = typeof config?.luckRandom === 'function' ? config.luckRandom : Math.random

    let heroId = null
    let definitions = {}
    let started = null
    let battle = null
    let isRestoring = false
    // A move or attack is saved as one fact; until the walk ends the battle is shown as before.
    let moving = null
    let autoCombat = false
    let passedTurns = 0
    // How the battle went, once it is over and its results window waits for the player.
    let outcome = null
    // The battle as the active stack's turn started, once its bad morale was rolled for.
    let badMoraleRolledFor = null
    // How many of the battle's morale and luck effects the player has been shown.
    let effectsShown = 0

    function heroNameOf() {
      return heroById(state.get(), heroId)?.name ?? DEFAULT_HERO_NAME
    }

    function describeResults() {
      const heroName = heroNameOf()
      const experience = outcome === BATTLE_OUTCOME_WON ? getExperienceForWin(battle) : 0
      return describeBattleResults({
        battle,
        outcome,
        heroName,
        monster: defenderOf(started),
        experience
      })
    }

    // A reload shows the battle as it is, without the effects that led there.
    function takeNewEffects() {
      const effects = isRestoring ? [] : battle.effects.slice(effectsShown)
      effectsShown = battle.effects.length
      return effects
    }

    function showBattle() {
      if (moving) {
        emit(APP_UI_BATTLE_UPDATED, {
          tile: started.tile,
          heroId,
          heroName: heroNameOf(),
          stacks: withHexes(
            moving.battle.stacks.map((stack) =>
              stack.id === moving.stackId ? { ...stack, hex: moving.hex } : stack
            )
          ),
          activeStackId: moving.stackId,
          moving: true,
          reachableHexes: [],
          attackTargets: [],
          shotTargets: [],
          messages: moving.battle.messages,
          effects: [],
          canWait: false,
          canDefend: false,
          canRetreat: false,
          canCastSpell: false,
          results: null,
          autoCombat,
          stepDelayMs
        })
        return
      }

      const activeStack = outcome ? null : getActiveStack(battle)
      const canAct = isPlayersTurn()
      emit(APP_UI_BATTLE_UPDATED, {
        tile: started.tile,
        heroId,
        heroName: heroNameOf(),
        stacks: withHexes(battle.stacks),
        activeStackId: activeStack?.id ?? null,
        reachableHexes: activeStack ? getStackReach(battle, activeStack) : [],
        attackTargets: activeStack ? getAttackTargets(battle, activeStack) : [],
        shotTargets: activeStack ? getShotTargets(battle, activeStack) : [],
        messages: battle.messages,
        effects: takeNewEffects(),
        canWait: canAct && !hasWaited(battle, activeStack.id),
        canDefend: canAct,
        canRetreat: canAct,
        canCastSpell: canAct && hasSpellBook(heroById(state.get(), heroId)),
        results: outcome ? describeResults() : null,
        autoCombat,
        stepDelayMs
      })
    }

    // Beaten guards leave the dwelling to the hero's player, who may recruit there straight away,
    // or the artifact to the hero.
    function winBattle() {
      const fought = started
      const { entityId, entityType, tile } = fought
      const experience = getExperienceForWin(battle)
      const army = getHeroArmyAfterBattle(battle, heroById(state.get(), heroId)?.army ?? [])
      emit(APP_FACT_BATTLE_ENDED, { entityId, heroId, winner: 'attacker' })
      emit(APP_FACT_HERO_ARMY_CHANGED, { heroId, army })
      if (isDwellingGuards(fought)) {
        emit(APP_FACT_DWELLING_GUARDS_CHANGED, { entityId, count: 0 })
        emit(APP_FACT_DWELLING_FLAGGED, {
          entityId,
          entityType,
          owner: heroOwner(state.get(), heroId)
        })
      } else if (
        isArtifactGuards(fought) &&
        hasFullBackpack(heroById(state.get(), heroId)?.artifacts)
      ) {
        emit(APP_FACT_ARTIFACT_GUARDS_CHANGED, { entityId, stacks: [] })
      } else if (isArtifactGuards(fought)) {
        emit(APP_FACT_ARTIFACT_PICKED_UP, {
          heroId,
          entityId,
          entityType,
          tile,
          artifact: entityType
        })
        emit(APP_FACT_ENTITY_REMOVED, { entityId })
      } else {
        emit(APP_FACT_MONSTER_DEFEATED, { entityId, entityType, tile })
        emit(APP_FACT_ENTITY_REMOVED, { entityId })
      }
      emit(APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED, { heroId, amount: experience })
      if (isDwellingGuards(fought)) {
        emit(APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED, { heroId, entityId })
      }
    }

    function emitDefenderLeft(fought, survivors) {
      const { entityId } = fought
      if (isArtifactGuards(fought)) {
        const stacks = survivors.map(({ creature, count }) => ({ creature, count }))
        emit(APP_FACT_ARTIFACT_GUARDS_CHANGED, { entityId, stacks })
        return
      }
      const count = survivors.reduce((sum, stack) => sum + stack.count, 0)
      const fact = isDwellingGuards(fought)
        ? APP_FACT_DWELLING_GUARDS_CHANGED
        : APP_FACT_MONSTER_COUNT_CHANGED
      emit(fact, { entityId, count })
    }

    // Beaten or retreated: the hero leaves the map and the defender keeps what it has left.
    function loseBattle() {
      const fought = started
      const survivors = battle.stacks.filter(
        (stack) => stack.side === 'defender' && stack.count > 0
      )
      emit(APP_FACT_BATTLE_ENDED, { entityId: fought.entityId, heroId, winner: 'defender' })
      emitDefenderLeft(fought, survivors)
      emit(APP_FACT_ENTITY_REMOVED, { entityId: heroId })
    }

    // The roll is saved with the action, so a reload gives the stack the same extra turn.
    function withGoodMoraleRoll(detail, resolved) {
      const chance = getGoodMoraleChance(resolved, detail.stackId)
      return chance > 0 && moraleRandom() < chance ? { ...detail, goodMorale: true } : detail
    }

    function moveDetail(stackId, path) {
      const detail = { stackId, path }
      return withGoodMoraleRoll(detail, moveStack(battle, stackId, path.at(-1)))
    }

    const attackDetail = (detail) => withGoodMoraleRoll(detail, resolveAttack(battle, detail))

    const shotDetail = (detail) => withGoodMoraleRoll(detail, resolveShot(battle, detail))

    function playComputerTurn(stack) {
      const plan = planComputerTurn(battle, stack, { random, luckRandom })
      if (plan?.shot) {
        void walkThenShow({
          stack,
          path: [],
          fact: APP_FACT_BATTLE_STACK_SHOT,
          detail: shotDetail({ stackId: stack.id, ...plan.shot })
        })
        return
      }

      if (plan?.attack) {
        void walkThenShow({
          stack,
          path: plan.attack.path,
          fact: APP_FACT_BATTLE_STACK_ATTACKED,
          detail: attackDetail({ stackId: stack.id, ...plan.attack })
        })
        return
      }

      if (plan?.path) {
        void walkThenShow({
          stack,
          path: plan.path,
          fact: APP_FACT_BATTLE_STACK_MOVED,
          detail: moveDetail(stack.id, plan.path)
        })
        return
      }

      emit(APP_FACT_BATTLE_TURN_ENDED, { stackId: stack.id })
      passedTurns += 1
      continueBattle()
    }

    function closeResults() {
      if (outcome === BATTLE_OUTCOME_WON) {
        winBattle()
      } else {
        loseBattle()
      }
    }

    function continueBattle() {
      if (outcome) {
        return
      }

      if (!hasLivingStacks(battle, 'defender')) {
        emit(APP_FACT_BATTLE_FINISHED, { outcome: BATTLE_OUTCOME_WON })
        return
      }

      if (!hasLivingStacks(battle, 'attacker')) {
        emit(APP_FACT_BATTLE_FINISHED, { outcome: BATTLE_OUTCOME_LOST })
        return
      }

      // No stack can get anywhere: the player takes over rather than the turns passing forever.
      if (autoCombat && passedTurns >= battle.stacks.length) {
        emit(APP_FACT_BATTLE_AUTO_COMBAT_CHANGED, { enabled: false })
        return
      }

      const stack = getActiveStack(battle)
      if (freezesInPanic(stack)) {
        emit(APP_FACT_BATTLE_STACK_FROZE, { stackId: stack.id })
        continueBattle()
        return
      }

      if (stack.side === 'defender' || autoCombat) {
        playComputerTurn(stack)
      }
    }

    function freezesInPanic(stack) {
      if (badMoraleRolledFor === battle) {
        return false
      }

      badMoraleRolledFor = battle
      const chance = getBadMoraleChance(battle, stack.id)
      return chance > 0 && moraleRandom() < chance
    }

    const isPlayersTurn = () =>
      Boolean(battle) &&
      !outcome &&
      !moving &&
      !autoCombat &&
      getActiveStack(battle)?.side === 'attacker'

    async function walkThenShow({ stack, path, fact, detail }) {
      const walkingBattle = started
      passedTurns = 0
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
        detail: moveDetail(stack.id, path)
      })
    }

    function attackWithActiveStack({ targetId, fromHex }) {
      const stack = getActiveStack(battle)
      const attack =
        stack && planStackAttack(battle, stack, { targetId, fromHex, random, luckRandom })
      if (!attack) {
        return
      }

      const { path, strikes } = attack
      void walkThenShow({
        stack,
        path,
        fact: APP_FACT_BATTLE_STACK_ATTACKED,
        detail: attackDetail({ stackId: stack.id, targetId, path, strikes })
      })
    }

    function shootWithActiveStack({ targetId }) {
      const stack = getActiveStack(battle)
      const shot = stack && planStackShot(battle, stack, { targetId, random, luckRandom })
      if (!shot) {
        return
      }

      void walkThenShow({
        stack,
        path: [],
        fact: APP_FACT_BATTLE_STACK_SHOT,
        detail: shotDetail({ stackId: stack.id, targetId, strikes: shot.strikes })
      })
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            heroId = null
            definitions = event.detail.definitions ?? {}
            started = null
            battle = null
            autoCombat = false
            outcome = null
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
            effectsShown = 0
            // A battle saved before battles named their hero was the only hero's.
            heroId = started.heroId ?? firstHeroIdOf(state.get(), viewingPlayer(state.get()))
            const hero = heroById(state.get(), heroId)
            const skills = getHeroPrimarySkills({ entity: hero, definitions })
            battle = createBattle({
              heroArmy: hero?.army,
              heroSkills: Object.fromEntries(skills.map(({ key, value }) => [key, value])),
              heroSecondarySkills: hero?.secondarySkills,
              heroBattleBonuses: hero?.battleBonuses,
              heroArtifacts: hero?.artifacts,
              monsterArmy: defenderArmy({ started, heroArmy: hero?.army, definitions }),
              definitions
            })
            showBattle()
            if (!isRestoring) {
              continueBattle()
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
            battle = finishAction(moveStack(battle, stackId, path.at(-1)), event.detail)
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
          type: APP_FACT_BATTLE_STACK_SHOT,
          handler: (event) => {
            if (!battle) {
              return
            }

            battle = shootStack(battle, event.detail)
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
          type: APP_FACT_BATTLE_STACK_FROZE,
          handler: (event) => {
            if (!battle) {
              return
            }

            battle = freezeStack(battle, event.detail.stackId)
            showBattle()
          }
        },
        {
          type: APP_FACT_BATTLE_STACK_WAITED,
          handler: (event) => {
            if (!battle) {
              return
            }

            battle = waitStack(battle, event.detail.stackId)
            showBattle()
          }
        },
        {
          type: APP_FACT_BATTLE_STACK_DEFENDED,
          handler: (event) => {
            if (!battle) {
              return
            }

            battle = defendStack(battle, event.detail.stackId)
            showBattle()
          }
        },
        {
          type: APP_FACT_BATTLE_AUTO_COMBAT_CHANGED,
          handler: (event) => {
            if (!battle) {
              return
            }

            autoCombat = event.detail.enabled
            passedTurns = 0
            showBattle()
          }
        },
        {
          type: APP_FACT_BATTLE_FINISHED,
          handler: (event) => {
            if (!battle) {
              return
            }

            outcome = event.detail.outcome
            autoCombat = false
            showBattle()
          }
        },
        {
          type: APP_FACT_BATTLE_ENDED,
          handler: () => {
            started = null
            battle = null
            moving = null
            autoCombat = false
            outcome = null
          }
        },
        {
          type: APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
          handler: (event) => {
            if (!isPlayersTurn()) {
              return
            }

            moveActiveStack(event.detail.hex)
          }
        },
        {
          type: APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
          handler: (event) => {
            if (!isPlayersTurn()) {
              return
            }

            attackWithActiveStack(event.detail)
          }
        },
        {
          type: APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED,
          handler: (event) => {
            if (!isPlayersTurn()) {
              return
            }

            shootWithActiveStack(event.detail)
          }
        },
        {
          type: APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED,
          handler: () => {
            const stack = isPlayersTurn() && getActiveStack(battle)
            if (!stack || hasWaited(battle, stack.id)) {
              return
            }

            emit(APP_FACT_BATTLE_STACK_WAITED, { stackId: stack.id })
            continueBattle()
          }
        },
        {
          type: APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED,
          handler: () => {
            if (!isPlayersTurn()) {
              return
            }

            emit(APP_FACT_BATTLE_STACK_DEFENDED, { stackId: getActiveStack(battle).id })
            continueBattle()
          }
        },
        {
          type: APP_COMMAND_BATTLE_RETREAT_REQUESTED,
          handler: () => {
            if (!isPlayersTurn()) {
              return
            }

            emit(APP_FACT_BATTLE_FINISHED, { outcome: BATTLE_OUTCOME_RETREATED })
          }
        },
        {
          type: APP_COMMAND_BATTLE_RESULTS_CLOSE_REQUESTED,
          handler: () => {
            if (outcome) {
              closeResults()
            }
          }
        },
        {
          type: APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
          handler: () => {
            if (!battle || outcome) {
              return
            }

            emit(APP_FACT_BATTLE_AUTO_COMBAT_CHANGED, { enabled: !autoCombat })
            if (autoCombat && !moving) {
              continueBattle()
            }
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
      APP_FACT_BATTLE_STACK_ATTACKED,
      APP_FACT_BATTLE_STACK_SHOT,
      APP_FACT_BATTLE_TURN_ENDED,
      APP_FACT_BATTLE_STACK_WAITED,
      APP_FACT_BATTLE_STACK_DEFENDED,
      APP_FACT_BATTLE_STACK_FROZE,
      APP_FACT_BATTLE_AUTO_COMBAT_CHANGED,
      APP_FACT_BATTLE_FINISHED,
      APP_FACT_BATTLE_ENDED,
      APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
      APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
      APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED,
      APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED,
      APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED,
      APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
      APP_COMMAND_BATTLE_RETREAT_REQUESTED,
      APP_COMMAND_BATTLE_RESULTS_CLOSE_REQUESTED
    ],
    produces: [
      APP_UI_BATTLE_UPDATED,
      APP_FACT_BATTLE_STACK_MOVED,
      APP_FACT_BATTLE_STACK_ATTACKED,
      APP_FACT_BATTLE_STACK_SHOT,
      APP_FACT_BATTLE_TURN_ENDED,
      APP_FACT_BATTLE_STACK_WAITED,
      APP_FACT_BATTLE_STACK_DEFENDED,
      APP_FACT_BATTLE_STACK_FROZE,
      APP_FACT_BATTLE_AUTO_COMBAT_CHANGED,
      APP_FACT_BATTLE_FINISHED,
      APP_FACT_BATTLE_ENDED,
      APP_FACT_MONSTER_DEFEATED,
      APP_FACT_MONSTER_COUNT_CHANGED,
      APP_FACT_DWELLING_GUARDS_CHANGED,
      APP_FACT_DWELLING_FLAGGED,
      APP_FACT_ARTIFACT_PICKED_UP,
      APP_FACT_ARTIFACT_GUARDS_CHANGED,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_FACT_ENTITY_REMOVED,
      APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
      APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED
    ]
  }
)
