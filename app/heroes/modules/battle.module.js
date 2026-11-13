import {
  areaTargetIds,
  attackStack,
  canStackStandOn,
  castDamageSpell,
  castHealingSpell,
  castLastingSpell,
  castRemovingSpell,
  chainTargetIds,
  cloneStack,
  createBattle,
  defendStack,
  endTurn,
  findCloneHex,
  finishAction,
  freezeStack,
  getActiveStack,
  getArmyAfterBattle,
  getAttackTargets,
  getBadMoraleChance,
  getExperienceForKills,
  getGoodMoraleChance,
  getShotTargets,
  getStackHexes,
  getStackReach,
  hasLivingStacks,
  hasWaited,
  heroBattleSide,
  moveStack,
  planStackAttack,
  planStackMove,
  planStackShot,
  resolveAttack,
  resolveShot,
  sacrificeStack,
  shootStack,
  spellTargetIds,
  teleportStack,
  waitStack
} from '../../../game/heroes/battle.js'
import { planComputerTurn } from '../../../game/heroes/battle-ai.js'
import {
  BATTLE_OUTCOME_LOST,
  BATTLE_OUTCOME_RETREATED,
  BATTLE_OUTCOME_SURRENDERED,
  BATTLE_OUTCOME_WON,
  describeBattleResults
} from '../../../game/heroes/battle-results.js'
import { canBeSacrificed, sacrificeTargetIds } from '../../../game/heroes/battle-sacrifice.js'
import { canCastInBattle, isHelpful } from '../../../game/heroes/battle-spells.js'
import {
  fightsFor,
  getSpellBalance,
  getSpellDamageTakenPercent,
  isBerserk
} from '../../../game/heroes/battle-stats.js'
import { getHexDistance, isOnBattlefield, isSameHex } from '../../../game/heroes/battlefield.js'
import {
  battleSpellTargeting,
  castsOnAllStacks,
  cloneRounds,
  hasSpellBook,
  knownSpells,
  sacrificeHealing,
  spellCost,
  spellDamage,
  spellHealing,
  spellLasting,
  spellSkillLevel
} from '../../../game/heroes/spell-book.js'
import { getHeroSpellPoints } from '../../../game/heroes/spell-points.js'
import { isResistible, rollResisted } from '../../../game/heroes/spell-resistance.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { resourcesOf } from '../../../game/heroes/state/kingdoms.js'
import { surrenderPrice } from '../../../game/heroes/surrender.js'
import {
  armyAfterRetreat,
  TAVERN_ROLE_RETREATED,
  TAVERN_ROLE_SURRENDERED
} from '../../../game/heroes/tavern.js'
import { firstHeroIdOf, heroOwner, turnNumber, viewingPlayer } from '../../../game/state/queries.js'
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
  APP_COMMAND_BATTLE_SURRENDER_REQUESTED,
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_FACT_BATTLE_AUTO_COMBAT_CHANGED,
  APP_FACT_BATTLE_ENDED,
  APP_FACT_BATTLE_FINISHED,
  APP_FACT_BATTLE_SPELL_CAST,
  APP_FACT_BATTLE_STACK_ATTACKED,
  APP_FACT_BATTLE_STACK_DEFENDED,
  APP_FACT_BATTLE_STACK_FROZE,
  APP_FACT_BATTLE_STACK_MOVED,
  APP_FACT_BATTLE_STACK_SHOT,
  APP_FACT_BATTLE_STACK_WAITED,
  APP_FACT_BATTLE_STARTED,
  APP_FACT_BATTLE_TURN_ENDED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_WENT_TO_TAVERN,
  APP_FACT_RESOURCES_GAINED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_WORLD_READY,
  APP_UI_BATTLE_SPELL_AFFECTS_NO_ONE,
  APP_UI_BATTLE_UPDATED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { battleDefenderEvents, battleDefenderName, battleDefenderOf } from '../battle-defenders.js'

const DEFAULT_STEP_DELAY_MS = 180
const DEFAULT_HERO_NAME = 'Hero'

// A sacrificed stack is gone from the battlefield, with no corpse.
const withHexes = (stacks) =>
  stacks
    .filter(({ sacrificed }) => !sacrificed)
    .map((stack) => ({
      ...stack,
      hexes: getStackHexes(stack),
      spellBalance: getSpellBalance(stack)
    }))

const lastingRule = ({ lasting, ...spell }) => ({
  helpful: isHelpful({ lasting, ...spell }),
  addsUp: Boolean(lasting.addsUp),
  castMessage: lasting.castMessage,
  removable: !lasting.cannotBeRemoved,
  endsOnOwnTurn: Boolean(lasting.untilOwnTurn),
  endsOnOwnAttack: Boolean(lasting.untilOwnAttack),
  endsSpellIds: lasting.endsSpells ?? [],
  removesHarmful: Boolean(lasting.removesHarmfulSpells)
})

function castDetail({ hero, spell, definitions }) {
  if (spell.clones) {
    return { rounds: cloneRounds(hero, definitions) }
  }
  if (spell.lasting) {
    return spellLasting({ hero, spell, definitions })
  }
  if (spell.heals) {
    return { healing: spellHealing({ hero, spell, definitions }) }
  }
  return {}
}

// The damage each stack hit takes, as it was when cast.
// Each jump of a chain spell halves what the stack before it took.
function damageHits({ battle, hero, spell, definitions, targetIds }) {
  const damage = spellDamage({ hero, spell, definitions })
  const factor = spell.chain?.factor ?? 1
  return targetIds.map((stackId, place) => {
    const stack = battle.stacks.find(({ id }) => id === stackId)
    const percent = getSpellDamageTakenPercent(stack, spell.schools ?? [])
    const lessened = Math.floor((damage * percent) / 100)
    return { stackId, damage: Math.floor(lessened * factor ** place) }
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
    const resistanceRandom =
      typeof config?.resistanceRandom === 'function' ? config.resistanceRandom : Math.random

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

    function defenderHeroOf() {
      return battleDefenderOf(started).hero?.({ started, state }) ?? null
    }

    // Only an enemy hero takes a surrender, for gold the player may not have.
    function surrenderOffer() {
      const enemy = defenderHeroOf()
      if (!enemy || battleDefenderOf(started).surrenderRefusal) {
        return null
      }
      const current = state.get()
      const price = surrenderPrice({ battle, hero: heroById(current, heroId), definitions })
      const gold = resourcesOf(current, heroOwner(current, heroId)).GOLD_PILE ?? 0
      return { heroName: enemy.name, owner: enemy.owner, price, canAfford: gold >= price }
    }

    function experienceForWin() {
      const bonus = battleDefenderOf(started).bonusExperience?.({ state, started }) ?? 0
      return getExperienceForKills(battle, 'attacker') + bonus
    }

    function describeResults() {
      const heroName = heroNameOf()
      const experience = outcome === BATTLE_OUTCOME_WON ? experienceForWin() : 0
      return describeBattleResults({
        battle,
        outcome,
        heroName,
        defenderName: battleDefenderName({ started, state, definitions }),
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
          defenderHero: defenderHeroOf(),
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
      emit(APP_UI_BATTLE_UPDATED, {
        tile: started.tile,
        heroId,
        heroName: heroNameOf(),
        defenderHero: defenderHeroOf(),
        stacks: withHexes(battle.stacks),
        activeStackId: activeStack?.id ?? null,
        reachableHexes: activeStack ? getStackReach(battle, activeStack) : [],
        attackTargets: activeStack ? getAttackTargets(battle, activeStack) : [],
        shotTargets: activeStack ? getShotTargets(battle, activeStack) : [],
        messages: battle.messages,
        effects: takeNewEffects(),
        ...playerActions(activeStack),
        results: outcome ? describeResults() : null,
        autoCombat,
        stepDelayMs
      })
    }

    function playerActions(activeStack) {
      const canAct = isPlayersTurn()
      return {
        canWait: canAct && !hasWaited(battle, activeStack.id),
        canDefend: canAct,
        canRetreat: canAct,
        surrenderRefusal: battleDefenderOf(started).surrenderRefusal,
        surrender: canAct ? surrenderOffer() : null,
        canCastSpell:
          canAct && !battle.heroCastThisRound && hasSpellBook(heroById(state.get(), heroId))
      }
    }

    function winBattle() {
      const fought = { emit, state, heroId, battle, started, definitions }
      const defender = battleDefenderOf(started)
      const experience = experienceForWin()
      const army = getArmyAfterBattle(battle, 'attacker', heroById(state.get(), heroId)?.army ?? [])
      emit(APP_FACT_BATTLE_ENDED, { entityId: started.entityId, heroId, winner: 'attacker' })
      emit(APP_FACT_HERO_ARMY_CHANGED, { heroId, army })
      defender.win(fought)
      emit(APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED, { heroId, amount: experience })
      defender.afterWin?.(fought)
    }

    // Beaten or retreated: the hero leaves the map and the defender keeps what it has left.
    function loseBattle() {
      const fought = { emit, state, heroId, battle, started, definitions, outcome }
      const defender = battleDefenderOf(started)
      const survivors = battle.stacks.filter(
        (stack) => stack.side === 'defender' && stack.count > 0
      )
      emit(APP_FACT_BATTLE_ENDED, { entityId: started.entityId, heroId, winner: 'defender' })
      defender.lose({ ...fought, survivors })
      emit(APP_FACT_ENTITY_REMOVED, { entityId: heroId })
      if (fought.outcome !== BATTLE_OUTCOME_LOST) {
        goToTavern(fought)
      }
    }

    // The roll settles which tavern slot the hero takes when both are worth the same.
    function goToTavern({ heroId, battle, outcome }) {
      const current = state.get()
      const hero = heroById(current, heroId)
      const surrendered = outcome === BATTLE_OUTCOME_SURRENDERED
      emit(APP_FACT_HERO_WENT_TO_TAVERN, {
        heroId,
        player: heroOwner(current, heroId),
        name: hero.name,
        heroClass: hero.heroClass,
        army: surrendered
          ? getArmyAfterBattle(battle, 'attacker', hero.army)
          : armyAfterRetreat(hero.heroClass, definitions.heroClasses),
        role: surrendered ? TAVERN_ROLE_SURRENDERED : TAVERN_ROLE_RETREATED,
        turnNumber: turnNumber(current),
        roll: random()
      })
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

      // A spell can kill the last stacks of both sides: nobody wins, and the hero is beaten.
      if (!hasLivingStacks(battle, 'attacker')) {
        emit(APP_FACT_BATTLE_FINISHED, { outcome: BATTLE_OUTCOME_LOST })
        return
      }

      if (!hasLivingStacks(battle, 'defender')) {
        emit(APP_FACT_BATTLE_FINISHED, { outcome: BATTLE_OUTCOME_WON })
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

      if (!isPlayers(stack) || autoCombat) {
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

    // A berserk stack's turn plays itself, whoever's it is.
    const isPlayers = (stack) =>
      Boolean(stack) && !isBerserk(stack) && fightsFor(stack) === 'attacker'

    const isPlayersTurn = () =>
      Boolean(battle) && !outcome && !moving && !autoCombat && isPlayers(getActiveStack(battle))

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

    function chooseAreaTargets(targeting, hex) {
      if (!hex || !isOnBattlefield(hex)) {
        return null
      }
      const inArea = areaTargetIds(battle, targeting, hex)
      if (!targeting.areaNeedsTarget) {
        return { hex, targetIds: inArea }
      }
      const targetIds = spellTargetIds(battle, targeting).filter((id) => inArea.includes(id))
      return targetIds.length > 0 ? { targetIds } : null
    }

    function chooseSacrificeTargets(targeting, { targetId, sacrificedId }) {
      const aim = { targeting, casterSide: fightsFor(getActiveStack(battle)) }
      const sacrificed = battle.stacks.find(({ id }) => id === sacrificedId)
      return sacrificeTargetIds(battle.stacks, aim).includes(targetId) &&
        sacrificed &&
        canBeSacrificed(sacrificed, { ...aim, raisedId: targetId })
        ? { targetIds: [targetId], sacrificedId }
        : null
    }

    function chooseSpellTargets(hero, spell, { targetId, hex, sacrificedId }) {
      const targeting = battleSpellTargeting({ hero, spell, definitions })
      if (spell.sacrifices) {
        return chooseSacrificeTargets(targeting, { targetId, sacrificedId })
      }
      if (targeting.area) {
        return chooseAreaTargets(targeting, hex)
      }
      const targetIds = spellTargetIds(battle, targeting)
      if (castsOnAllStacks(hero, spell)) {
        return targetIds.length === 0 ? { noOne: true } : { targetIds }
      }
      if (!targetIds.includes(targetId)) {
        return null
      }
      return spell.chain
        ? { targetIds: chainOf(hero, spell, { targeting, targetId, hex }) }
        : { targetIds: [targetId] }
    }

    function chainOf(hero, spell, { targeting, targetId, hex }) {
      const target = battle.stacks.find(({ id }) => id === targetId)
      const landedOn =
        hex && getStackHexes(target).some((own) => isSameHex(own, hex)) ? hex : target.hex
      const strikes = spell.chain.strikes[spellSkillLevel(hero, spell)]
      return chainTargetIds(battle, { targeting, targetId, hex: landedOn, strikes, random })
    }

    function castDetailOn(hero, spell, { hex, targetIds, sacrificedId }) {
      if (spell.sacrifices) {
        const sacrificed = battle.stacks.find(({ id }) => id === sacrificedId)
        const healing = sacrificeHealing({ hero, spell, definitions, sacrificed })
        return { targetId: targetIds[0], sacrificedId, healing }
      }
      if (spell.damage) {
        const hits = damageHits({ battle, hero, spell, definitions, targetIds })
        if (hex || castsOnAllStacks(hero, spell)) {
          return hex ? { hex, hits } : { hits }
        }
        return { targetId: targetIds[0], hits }
      }
      const cast = castDetail({ hero, spell, definitions })
      return targetIds.length === 1 && !castsOnAllStacks(hero, spell)
        ? { targetId: targetIds[0], ...cast }
        : { targetIds, ...cast }
    }

    // Where Teleport takes its stack, or where the clone stands: undefined when there is no such
    // place, and nothing to keep for another spell.
    function spellDestination(spell, { targetIds }, destination) {
      const target = battle.stacks.find(({ id }) => id === targetIds[0])
      if (spell.teleports) {
        return destination && canStackStandOn(battle, target, destination) ? destination : undefined
      }
      if (spell.clones) {
        return findCloneHex(battle, target) ?? undefined
      }
      return null
    }

    function canHeroCast(hero, spell, spellId) {
      return (
        !battle.heroCastThisRound &&
        hasSpellBook(hero) &&
        knownSpells(hero, definitions).includes(spellId) &&
        canCastInBattle(spell) &&
        spellCost(hero, spell) <= getHeroSpellPoints({ entity: hero, definitions }).value
      )
    }

    function castSpell({ spellId, targetId, hex, destination, sacrificedId }) {
      const hero = heroById(state.get(), heroId)
      const spell = definitions.spells?.[spellId]
      const targets = canHeroCast(hero, spell, spellId)
        ? chooseSpellTargets(hero, spell, { targetId, hex, sacrificedId })
        : null
      if (targets?.noOne) {
        emit(APP_UI_BATTLE_SPELL_AFFECTS_NO_ONE, {})
        return
      }
      const goesTo = targets && spellDestination(spell, targets, destination)
      if (goesTo === undefined || !targets) {
        return
      }

      const resistedIds = isResistible(spell)
        ? rollResisted(battle.stacks, targets.targetIds, resistanceRandom)
        : []
      emit(APP_FACT_BATTLE_SPELL_CAST, {
        heroId,
        spellId,
        ...castDetailOn(hero, spell, targets),
        ...(goesTo ? { destination: goesTo } : {}),
        ...(resistedIds.length > 0 ? { resistedIds } : {}),
        cost: spellCost(hero, spell)
      })
      continueBattle()
    }

    // The fact keeps a lasting spell's effects and rounds, a healing spell's hit points and the
    // damage each stack took, as they were when cast. A bolt saved before area spells has its
    // target's damage rather than hits.
    function castSpellOn(
      current,
      {
        spellId,
        targetId,
        targetIds,
        damage,
        hits,
        effects,
        rounds,
        healing,
        destination,
        sacrificedId,
        resistedIds = []
      }
    ) {
      const spell = definitions.spells?.[spellId]
      const named = { heroName: heroNameOf(), spellName: spell?.name ?? spellId, resistedIds }
      const onStacks = { ...named, targetIds: targetIds ?? [targetId] }
      if (spell?.lasting) {
        return castLastingSpell(current, {
          ...onStacks,
          spellId,
          effects,
          rounds,
          ...lastingRule(spell)
        })
      }
      if (spell?.teleports) {
        return teleportStack(current, { ...onStacks, destination })
      }
      if (spell?.clones) {
        return cloneStack(current, { ...onStacks, destination, rounds })
      }
      if (spell?.sacrifices) {
        return sacrificeStack(current, { ...onStacks, sacrificedId, healing })
      }
      if (spell?.removesSpells) {
        return castRemovingSpell(current, onStacks)
      }
      if (spell?.heals) {
        return castHealingSpell(current, { ...onStacks, healing })
      }
      return castDamageSpell(current, {
        ...named,
        hits: hits ?? [{ stackId: targetId, damage }],
        chained: Boolean(spell?.chain)
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
            battle = createBattle({
              attacker: heroBattleSide(hero, definitions),
              defender: battleDefenderOf(started).side({
                started,
                state,
                heroArmy: hero?.army,
                definitions
              }),
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
          type: APP_FACT_BATTLE_SPELL_CAST,
          handler: (event) => {
            if (!battle) {
              return
            }

            const cast = castSpellOn(battle, event.detail)
            // The same stack's turn goes on, its morale already rolled for.
            if (badMoraleRolledFor === battle) {
              badMoraleRolledFor = cast
            }
            battle = cast
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
          type: APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED,
          handler: (event) => {
            if (isPlayersTurn()) {
              castSpell(event.detail)
            }
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
          type: APP_COMMAND_BATTLE_SURRENDER_REQUESTED,
          handler: () => {
            const offer = isPlayersTurn() ? surrenderOffer() : null
            if (!offer?.canAfford) {
              return
            }

            const paid = { GOLD_PILE: offer.price }
            emit(APP_FACT_RESOURCES_SPENT, {
              player: heroOwner(state.get(), heroId),
              resources: paid
            })
            emit(APP_FACT_RESOURCES_GAINED, { player: offer.owner, resources: paid })
            emit(APP_FACT_BATTLE_FINISHED, { outcome: BATTLE_OUTCOME_SURRENDERED })
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
      APP_FACT_BATTLE_SPELL_CAST,
      APP_FACT_BATTLE_FINISHED,
      APP_FACT_BATTLE_ENDED,
      APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED,
      APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
      APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
      APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED,
      APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED,
      APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED,
      APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
      APP_COMMAND_BATTLE_RETREAT_REQUESTED,
      APP_COMMAND_BATTLE_SURRENDER_REQUESTED,
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
      APP_FACT_BATTLE_SPELL_CAST,
      APP_FACT_BATTLE_FINISHED,
      APP_FACT_BATTLE_ENDED,
      APP_FACT_RESOURCES_SPENT,
      APP_FACT_RESOURCES_GAINED,
      ...battleDefenderEvents,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_FACT_HERO_WENT_TO_TAVERN,
      APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
      APP_UI_BATTLE_SPELL_AFFECTS_NO_ONE
    ]
  }
)
