import { getTowerTargets, planTowerShot } from '../../../game/heroes/arrow-towers.js'
import { withoutWornIn } from '../../../game/heroes/artifacts.js'
import {
  areaTargetIds,
  attackStack,
  CATAPULT,
  canHeroAimCatapult,
  canHeroAimTowers,
  canTeleportTo,
  castDamageSpell,
  castHealingSpell,
  castLastingSpell,
  castRemovingSpell,
  chainTargetIds,
  cloneStack,
  createBattle,
  defendStack,
  endTactics,
  endTurn,
  findCloneHex,
  finishAction,
  freezeStack,
  getActiveStack,
  getArmyAfterBattle,
  getAttackTargets,
  getBadMoraleChance,
  getCatapultStack,
  getDestroyedWarMachines,
  getExperienceForKills,
  getGoodMoraleChance,
  getHealTargets,
  getRoundStartShooter,
  getShotTargets,
  getStackHexes,
  getStackReach,
  getTacticsReach,
  getTacticsSide,
  getTacticsStack,
  getTurnSide,
  hasCastThisRound,
  hasLivingStacks,
  hasWaited,
  healStack,
  heroBattleSide,
  isTacticsPhase,
  moveStack,
  placeStack,
  planBattleCatapultShot,
  planStackAttack,
  planStackHeal,
  planStackMove,
  planStackShot,
  planTacticsMove,
  resolveAttack,
  resolveShot,
  sacrificeStack,
  selectNextTacticsStack,
  selectTacticsStack,
  shakeWalls,
  shootCatapult,
  shootStack,
  shootTower,
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
import {
  canCastInBattle,
  isHelpful,
  magicDamperAgainst
} from '../../../game/heroes/battle-spells.js'
import {
  fightsFor,
  getSpellBalance,
  getSpellDamageTakenPercent,
  isBerserk
} from '../../../game/heroes/battle-stats.js'
import { getHexDistance, isOnBattlefield, isSameHex } from '../../../game/heroes/battlefield.js'
import { defendingHeroExperience } from '../../../game/heroes/enemy-hero-battle.js'
import {
  describeCatapultShot,
  describeCatapultTargets,
  describeEarthquakeHit,
  describeMoat,
  describeTowers,
  describeWallPartHex,
  describeWalls,
  hasWallToShake,
  planEarthquake,
  towerOf
} from '../../../game/heroes/siege-walls.js'
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
import { NO_DEFENDER_BONUSES, withDefenderSkills } from '../../../game/heroes/town-visit-bonuses.js'
import {
  activePlayer,
  firstHeroIdOf,
  heroOwner,
  turnNumber,
  viewingPlayer
} from '../../../game/state/queries.js'
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
  APP_COMMAND_BATTLE_TACTICS_END_REQUESTED,
  APP_COMMAND_BATTLE_TACTICS_NEXT_REQUESTED,
  APP_COMMAND_BATTLE_TACTICS_STACK_SELECT_REQUESTED,
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_FACT_BATTLE_AUTO_COMBAT_CHANGED,
  APP_FACT_BATTLE_CATAPULT_SHOT,
  APP_FACT_BATTLE_ENDED,
  APP_FACT_BATTLE_FINISHED,
  APP_FACT_BATTLE_SPELL_CAST,
  APP_FACT_BATTLE_STACK_ATTACKED,
  APP_FACT_BATTLE_STACK_DEFENDED,
  APP_FACT_BATTLE_STACK_FROZE,
  APP_FACT_BATTLE_STACK_HEALED,
  APP_FACT_BATTLE_STACK_MOVED,
  APP_FACT_BATTLE_STACK_PLACED,
  APP_FACT_BATTLE_STACK_SHOT,
  APP_FACT_BATTLE_STACK_WAITED,
  APP_FACT_BATTLE_STARTED,
  APP_FACT_BATTLE_TACTICS_ENDED,
  APP_FACT_BATTLE_TOWER_SHOT,
  APP_FACT_BATTLE_TURN_ENDED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_ARTIFACTS_CHANGED,
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
import {
  battleDefenderEvents,
  battleDefenderName,
  battleDefenderOf,
  siegeWallsOf,
  townDefenderBonusesOf
} from '../battle-defenders.js'

const DEFAULT_STEP_DELAY_MS = 180
const DEFAULT_HERO_NAME = 'Hero'
const FLIGHT_STEPS = 4

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
  ({ emit, emitAll, config, state }) => {
    const stepDelayMs = config?.battleStepDelayMs ?? DEFAULT_STEP_DELAY_MS
    const random = typeof config?.random === 'function' ? config.random : Math.random
    const moraleRandom =
      typeof config?.moraleRandom === 'function' ? config.moraleRandom : Math.random
    const luckRandom = typeof config?.luckRandom === 'function' ? config.luckRandom : Math.random
    const resistanceRandom =
      typeof config?.resistanceRandom === 'function' ? config.resistanceRandom : Math.random
    const abilityRandom =
      typeof config?.abilityRandom === 'function' ? config.abilityRandom : Math.random
    const catapultRandom =
      typeof config?.catapultRandom === 'function' ? config.catapultRandom : random
    const towerRandom = typeof config?.towerRandom === 'function' ? config.towerRandom : random

    let heroId = null
    // The side the viewing player plays: 'attacker', 'defender', or null for a battle of other
    // players' they don't see.
    let playerSide = null
    let definitions = {}
    let started = null
    let battle = null
    let isRestoring = false
    // A move or attack is saved as one fact; until the walk ends the battle is shown as before.
    let moving = null
    // The catapult's stone or a tower's arrow in flight: the battle is shown as before until it
    // lands.
    let throwing = null
    // Where the last stone landed and what it did, shown once.
    let wallHits = []
    let autoCombat = false
    let passedTurns = 0
    // How the battle went, once it is over and its results window waits for the player.
    let outcome = null
    // Which side retreated or surrendered, when one did.
    let leavingSide = 'attacker'
    // The battle as the active stack's turn started, once its bad morale was rolled for.
    let badMoraleRolledFor = null
    // How many of the battle's morale and luck effects the player has been shown.
    let effectsShown = 0
    // What the town's buildings give its defenders, in a battle for a town.
    let defenderBonuses = NO_DEFENDER_BONUSES

    function heroNameOf() {
      return heroById(state.get(), heroId)?.name ?? DEFAULT_HERO_NAME
    }

    const casterNameOf = (casterId) => heroById(state.get(), casterId)?.name ?? DEFAULT_HERO_NAME

    function defenderHeroOf() {
      return battleDefenderOf(started).hero?.({ started, state }) ?? null
    }

    const playerHeroId = () => (playerSide === 'defender' ? defenderHeroOf()?.id : heroId)

    // The player's hero as it casts: a town's defender has the Power its buildings give.
    function castingHero() {
      const hero = heroById(state.get(), playerHeroId())
      return playerSide === 'defender' ? withDefenderSkills(hero, defenderBonuses) : hero
    }

    function enemyHeroOf() {
      if (playerSide === 'defender') {
        return { name: heroNameOf(), owner: heroOwner(state.get(), heroId) }
      }
      return battleDefenderOf(started).surrenderRefusal ? null : defenderHeroOf()
    }

    // Only a hero on the open map may leave the battle: one defending a town can't.
    const canLeave = () => playerSide === 'attacker' || !defenderHeroOf()?.townId

    // Only an enemy hero takes a surrender, for gold the player may not have.
    function surrenderOffer() {
      const enemy = enemyHeroOf()
      if (!enemy || !canLeave()) {
        return null
      }
      const current = state.get()
      const hero = heroById(current, playerHeroId())
      const price = surrenderPrice({ battle, hero, definitions, side: playerSide })
      const gold = resourcesOf(current, heroOwner(current, hero.id)).GOLD_PILE ?? 0
      return { heroName: enemy.name, owner: enemy.owner, price, canAfford: gold >= price }
    }

    function experienceForWin() {
      const bonus = battleDefenderOf(started).bonusExperience?.({ state, started }) ?? 0
      return getExperienceForKills(battle, 'attacker') + bonus
    }

    function playerExperience() {
      if (playerSide === 'defender') {
        return outcome === BATTLE_OUTCOME_WON ? 0 : defendingHeroExperience(battle, outcome)
      }
      return outcome === BATTLE_OUTCOME_WON ? experienceForWin() : 0
    }

    function describeResults() {
      return describeBattleResults({
        battle,
        outcome,
        leavingSide,
        heroName: heroNameOf(),
        defenderName: battleDefenderName({ started, state, definitions }),
        experience: playerExperience(),
        playerSide,
        playerHasHero: Boolean(playerHeroId())
      })
    }

    // A reload shows the battle as it is, without the effects that led there.
    function takeNewEffects() {
      const effects = isRestoring ? [] : battle.effects.slice(effectsShown)
      effectsShown = battle.effects.length
      return effects
    }

    function sideOfViewingPlayer() {
      const current = state.get()
      const viewer = viewingPlayer(current)
      if (!heroId || heroOwner(current, heroId) === viewer) {
        return 'attacker'
      }
      const owner = battleDefenderOf(started).owner?.({ started, state }) ?? defenderHeroOf()?.owner
      return owner === viewer ? 'defender' : null
    }

    // Other players' heroes fight where the player can't see: the battle AI plays both sides.
    const isUnseen = () => playerSide === null

    const siegeOf = (shown, stacks = shown.stacks) => ({
      walls: shown.walls ? describeWalls({ walls: shown.walls, stacks }) : [],
      moat: describeMoat(shown.walls),
      towers: describeTowers(shown.walls),
      siege: shown.walls
    })

    function takeWallHits() {
      const hits = wallHits
      wallHits = []
      return hits
    }

    function flightOf({ battle: shown, shot, arrow }) {
      const flightMs = stepDelayMs * FLIGHT_STEPS
      if (shot) {
        return { catapultStone: { to: describeWallPartHex(shown.walls, shot.part), flightMs } }
      }
      const { name, hex } = towerOf(shown.walls, arrow.tower)
      const target = shown.stacks.find(({ id }) => id === arrow.targetId)
      return { towerArrow: { name, from: hex, to: target.hex, flightMs } }
    }

    function busyView() {
      if (throwing) {
        return {
          shown: throwing.battle,
          stacks: throwing.battle.stacks,
          activeStackId: null,
          ...flightOf(throwing)
        }
      }
      const stacks = moving.battle.stacks.map((stack) =>
        stack.id === moving.stackId ? { ...stack, hex: moving.hex } : stack
      )
      return { shown: moving.battle, stacks, activeStackId: moving.stackId }
    }

    function showBusyBattle() {
      const { shown, stacks, activeStackId, catapultStone = null, towerArrow = null } = busyView()
      emit(APP_UI_BATTLE_UPDATED, {
        tile: started.tile,
        heroId,
        heroName: heroNameOf(),
        heroOwner: heroOwner(state.get(), heroId),
        defenderHero: defenderHeroOf(),
        stacks: withHexes(stacks),
        ...siegeOf(shown, stacks),
        catapultStone,
        towerArrow,
        wallHits: [],
        activeStackId,
        activeTower: null,
        moving: true,
        reachableHexes: [],
        attackTargets: [],
        shotTargets: [],
        healTargetIds: [],
        catapultTargets: [],
        messages: shown.messages,
        effects: [],
        canWait: false,
        canDefend: false,
        canRetreat: false,
        canCastSpell: false,
        tactics: isShownTactics(),
        results: null,
        autoCombat,
        stepDelayMs
      })
    }

    const NO_ORDERS = {
      reachableHexes: [],
      attackTargets: [],
      shotTargets: [],
      healTargetIds: [],
      catapultTargets: []
    }

    function tacticsStackView() {
      const stack = isPlayersTactics() ? getTacticsStack(battle) : null
      return stack
        ? { activeStackId: stack.id, ...NO_ORDERS, reachableHexes: getTacticsReach(battle, stack) }
        : { activeStackId: null, ...NO_ORDERS }
    }

    function activeStackView(activeStack) {
      if (isTacticsPhase(battle)) {
        return tacticsStackView()
      }
      if (isTowersTurn()) {
        const tower = controlledShooter()
        return {
          activeStackId: null,
          activeTower: { tower, side: getTurnSide(battle) },
          ...NO_ORDERS,
          shotTargets: getTowerTargets(battle, tower)
        }
      }
      if (!activeStack) {
        return { activeStackId: null, ...NO_ORDERS }
      }
      if (isCatapultAimTurn()) {
        return {
          activeStackId: activeStack.id,
          ...NO_ORDERS,
          catapultTargets: describeCatapultTargets(battle.walls)
        }
      }
      return {
        activeStackId: activeStack.id,
        reachableHexes: getStackReach(battle, activeStack),
        attackTargets: getAttackTargets(battle, activeStack),
        shotTargets: getShotTargets(battle, activeStack),
        healTargetIds: getHealTargets(battle, activeStack).map(({ id }) => id),
        catapultTargets: []
      }
    }

    function showBattle() {
      if (isUnseen()) {
        return
      }

      if (moving || throwing) {
        showBusyBattle()
        return
      }

      const activeStack = outcome ? null : turnStack()
      emit(APP_UI_BATTLE_UPDATED, {
        tile: started.tile,
        heroId,
        heroName: heroNameOf(),
        heroOwner: heroOwner(state.get(), heroId),
        defenderHero: defenderHeroOf(),
        stacks: withHexes(battle.stacks),
        ...siegeOf(battle),
        catapultStone: null,
        towerArrow: null,
        wallHits: takeWallHits(),
        ...activeStackView(activeStack),
        messages: battle.messages,
        effects: takeNewEffects(),
        ...playerActions(),
        results: outcome ? describeResults() : null,
        autoCombat,
        stepDelayMs
      })
    }

    function playerActions() {
      const canAct = isPlayersTurn()
      const canLeadHero = isLeadingHerosTurn()
      return {
        canWait: (canAct || isShootersTurn()) && !hasWaited(battle, turnStackId()),
        canDefend: canAct || isShootersTurn(),
        canRetreat: canLeadHero && canLeave(),
        surrenderRefusal:
          playerSide === 'attacker' ? battleDefenderOf(started).surrenderRefusal : null,
        surrender: canLeadHero ? surrenderOffer() : null,
        casterHeroId: playerHeroId() ?? null,
        extraSpellCost: magicDamperAgainst(battle.stacks, playerSide),
        tactics: isShownTactics(),
        canCastSpell:
          canLeadHero &&
          !isTacticsPhase(battle) &&
          !hasCastThisRound(battle, playerSide) &&
          hasSpellBook(heroById(state.get(), playerHeroId()))
      }
    }

    function loseDestroyedWarMachines() {
      const heroIds = { attacker: heroId, defender: defenderHeroOf()?.id }
      for (const [side, sideHeroId] of Object.entries(heroIds)) {
        const artifacts = heroById(state.get(), sideHeroId)?.artifacts
        const destroyed = getDestroyedWarMachines(battle, side)
        if (artifacts && destroyed.length > 0) {
          emit(APP_FACT_HERO_ARTIFACTS_CHANGED, {
            heroId: sideHeroId,
            artifacts: withoutWornIn(artifacts, destroyed)
          })
        }
      }
    }

    function winBattle() {
      const fought = { emit, state, heroId, battle, started, definitions }
      const defender = battleDefenderOf(started)
      const experience = experienceForWin()
      const army = getArmyAfterBattle(battle, 'attacker', heroById(state.get(), heroId)?.army ?? [])
      loseDestroyedWarMachines()
      emit(APP_FACT_BATTLE_ENDED, { entityId: started.entityId, heroId, winner: 'attacker' })
      emit(APP_FACT_HERO_ARMY_CHANGED, { heroId, army })
      defender.win(fought)
      emit(APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED, { heroId, amount: experience })
      if (!isUnseen()) {
        defender.afterWin?.(fought)
      }
    }

    // Beaten or retreated: the hero leaves the map and the defender keeps what it has left.
    function loseBattle() {
      const fought = { emit, state, heroId, battle, started, definitions, outcome }
      const defender = battleDefenderOf(started)
      const survivors = battle.stacks.filter(
        (stack) => stack.side === 'defender' && stack.count > 0
      )
      loseDestroyedWarMachines()
      emit(APP_FACT_BATTLE_ENDED, { entityId: started.entityId, heroId, winner: 'defender' })
      defender.lose({ ...fought, survivors })
      emit(APP_FACT_ENTITY_REMOVED, { entityId: heroId })
      if (fought.outcome !== BATTLE_OUTCOME_LOST) {
        goToTavern(fought)
      }
    }

    // The defending hero retreated or surrendered: the attacker wins, with the experience for the
    // creatures it killed only, and the defender leaves with its artifacts.
    function defenderLeft() {
      const leftId = defenderHeroOf().id
      const experience = getExperienceForKills(battle, 'attacker')
      const army = getArmyAfterBattle(battle, 'attacker', heroById(state.get(), heroId)?.army ?? [])
      loseDestroyedWarMachines()
      emitAll([
        {
          type: APP_FACT_BATTLE_ENDED,
          detail: { entityId: started.entityId, heroId, winner: 'attacker' }
        },
        { type: APP_FACT_HERO_ARMY_CHANGED, detail: { heroId, army } },
        { type: APP_FACT_ENTITY_REMOVED, detail: { entityId: leftId } },
        {
          type: APP_FACT_HERO_WENT_TO_TAVERN,
          detail: wentToTavern({ heroId: leftId, battle, outcome, side: 'defender' })
        }
      ])
      emit(APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED, { heroId, amount: experience })
    }

    // The roll settles which tavern slot the hero takes when both are worth the same.
    function wentToTavern({ heroId, battle, outcome, side = 'attacker' }) {
      const current = state.get()
      const hero = heroById(current, heroId)
      const player = heroOwner(current, heroId)
      const surrendered = outcome === BATTLE_OUTCOME_SURRENDERED
      return {
        heroId,
        player,
        name: hero.name,
        heroClass: hero.heroClass,
        army: surrendered
          ? getArmyAfterBattle(battle, side, hero.army)
          : armyAfterRetreat(hero, definitions),
        role: surrendered ? TAVERN_ROLE_SURRENDERED : TAVERN_ROLE_RETREATED,
        turnNumber: turnNumber(current),
        ...(activePlayer(current) === player ? {} : { afterOwnTurn: true }),
        roll: random()
      }
    }

    const goToTavern = (fought) => emit(APP_FACT_HERO_WENT_TO_TAVERN, wentToTavern(fought))

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
      const plan = planComputerTurn(battle, stack, {
        random,
        luckRandom,
        abilityRandom,
        resistanceRandom
      })
      if (plan?.shot) {
        void walkThenShow({
          stack,
          path: [],
          fact: APP_FACT_BATTLE_STACK_SHOT,
          detail: shotDetail({ stackId: stack.id, ...plan.shot })
        })
        return
      }

      if (plan?.heal) {
        void walkThenShow({
          stack,
          path: [],
          fact: APP_FACT_BATTLE_STACK_HEALED,
          detail: { stackId: stack.id, ...plan.heal }
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
      } else if (leavingSide === 'defender') {
        defenderLeft()
      } else {
        loseBattle()
      }
    }

    // The player's hero leaves the battle; a saved retreat with no side is the attacker's.
    function finishAs(battleOutcome) {
      emit(APP_FACT_BATTLE_FINISHED, {
        outcome: battleOutcome,
        ...(playerSide === 'defender' ? { side: 'defender' } : {})
      })
    }

    // An unseen battle has no results window to wait for.
    function finishBattle(battleOutcome) {
      emit(APP_FACT_BATTLE_FINISHED, { outcome: battleOutcome })
      if (isUnseen()) {
        closeResults()
      }
    }

    // No stack can get anywhere: the player takes over rather than the turns passing forever,
    // and an unseen battle is lost.
    function endStalemate() {
      if (isUnseen()) {
        finishBattle(BATTLE_OUTCOME_LOST)
      } else {
        emit(APP_FACT_BATTLE_AUTO_COMBAT_CHANGED, { enabled: false })
      }
    }

    // A spell can kill the last stacks of both sides: nobody wins, and the hero is beaten.
    function winnerOutcome() {
      if (!hasLivingStacks(battle, 'attacker')) {
        return BATTLE_OUTCOME_LOST
      }
      return hasLivingStacks(battle, 'defender') ? null : BATTLE_OUTCOME_WON
    }

    function isOver() {
      if (outcome) {
        if (isUnseen()) {
          closeResults()
        }
        return true
      }

      const finished = winnerOutcome()
      if (finished) {
        finishBattle(finished)
        return true
      }

      if ((autoCombat || isUnseen()) && passedTurns >= battle.stacks.length) {
        endStalemate()
        return true
      }
      return false
    }

    function continueBattle() {
      if (isOver()) {
        return
      }

      if (isTacticsPhase(battle)) {
        playTacticsPhase()
        return
      }

      const shooter = getRoundStartShooter(battle)
      if (shooter) {
        playRoundStartShooter(shooter)
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

    function playRoundStartShooter(shooter) {
      if (controlsShooter(shooter)) {
        return
      }
      if (shooter === CATAPULT) {
        void throwStone(planBattleCatapultShot(battle, catapultRandom))
        return
      }
      void shootArrow(planTowerShot(battle, shooter, towerRandom))
    }

    // The computer, and Auto combat for the player, end the tactics phase without placing a stack.
    function playTacticsPhase() {
      if (getTacticsSide(battle) === playerSide && !autoCombat) {
        return
      }

      emit(APP_FACT_BATTLE_TACTICS_ENDED, {})
      continueBattle()
    }

    function freezesInPanic(stack) {
      if (badMoraleRolledFor === battle) {
        return false
      }

      badMoraleRolledFor = battle
      const chance = getBadMoraleChance(battle, stack.id)
      return chance > 0 && moraleRandom() < chance
    }

    // A healer with nobody to heal has no order to wait for.
    const hasOrders = (stack) => !stack.healing || getHealTargets(battle, stack).length > 0

    // A berserk stack's turn plays itself, whoever's it is, and so does a war machine's the hero
    // doesn't aim.
    const isPlayers = (stack) =>
      Boolean(stack) &&
      !isUnseen() &&
      !isBerserk(stack) &&
      (!stack.warMachine || (stack.aimedByHero && hasOrders(stack))) &&
      fightsFor(stack) === playerSide

    const isPlayersTurn = () =>
      Boolean(battle) &&
      !outcome &&
      !moving &&
      !throwing &&
      !autoCombat &&
      !isTacticsPhase(battle) &&
      !getRoundStartShooter(battle) &&
      isPlayers(getActiveStack(battle))

    // The tactics phase the player's hero places their army in, as the view shows it.
    const isShownTactics = () =>
      Boolean(battle) &&
      !outcome &&
      !autoCombat &&
      isTacticsPhase(battle) &&
      getTacticsSide(battle) === playerSide

    const isPlayersTactics = () => isShownTactics() && !moving && !throwing

    // The player's hero with Ballistics aims the catapult, unless Auto combat plays for them.
    const aimsCatapult = () => playerSide === 'attacker' && canHeroAimCatapult(battle)

    // The defending player's hero with Artillery aims the towers.
    const aimsTowers = () => playerSide === 'defender' && canHeroAimTowers(battle)

    const controlsShooter = (shooter) =>
      !autoCombat && (shooter === CATAPULT ? aimsCatapult() : aimsTowers())

    // The tower or the catapult whose turn the player plays, before every stack's.
    function controlledShooter() {
      if (!battle || outcome || moving || throwing || isTacticsPhase(battle)) {
        return null
      }
      const shooter = getRoundStartShooter(battle)
      return shooter && controlsShooter(shooter) ? shooter : null
    }

    const isCatapultAimTurn = () => controlledShooter() === CATAPULT

    const isShootersTurn = () => Boolean(controlledShooter())

    const isTowersTurn = () => isShootersTurn() && !isCatapultAimTurn()

    function aimTowerAt(targetId) {
      const arrow = planTowerShot(battle, controlledShooter(), towerRandom, targetId)
      if (arrow) {
        void shootArrow(arrow)
      }
    }

    const shooterStackId = (shooter) =>
      shooter === CATAPULT ? getCatapultStack(battle).id : shooter

    function turnStackId() {
      const shooter = controlledShooter()
      return shooter ? shooterStackId(shooter) : getActiveStack(battle)?.id
    }

    const turnStack = () =>
      isCatapultAimTurn() ? getCatapultStack(battle) : getActiveStack(battle)

    function aimCatapultAt(part) {
      const canAim = describeCatapultTargets(battle.walls).some((target) => target.part === part)
      if (canAim) {
        void throwStone(planBattleCatapultShot(battle, catapultRandom, part))
      }
    }

    // The wall changes only once the stone lands on it.
    async function throwStone(shot) {
      const throwingBattle = started
      if (shot.damage > 0) {
        passedTurns = 0
      }
      if (isUnseen()) {
        emit(APP_FACT_BATTLE_CATAPULT_SHOT, shot)
        continueBattle()
        return
      }

      const { result } = describeCatapultShot(battle.walls, shot)
      throwing = { battle, shot }
      emit(APP_FACT_BATTLE_CATAPULT_SHOT, shot)
      await sleep(stepDelayMs * FLIGHT_STEPS)
      throwing = null
      if (started !== throwingBattle) {
        return
      }

      wallHits = [{ ...describeWallPartHex(battle.walls, shot.part), result }]
      showBattle()
      continueBattle()
    }

    // The target is hit only once the arrow lands on it.
    async function shootArrow(arrow) {
      const shootingBattle = started
      passedTurns = 0
      if (isUnseen()) {
        emit(APP_FACT_BATTLE_TOWER_SHOT, arrow)
        continueBattle()
        return
      }

      throwing = { battle, arrow }
      emit(APP_FACT_BATTLE_TOWER_SHOT, arrow)
      await sleep(stepDelayMs * FLIGHT_STEPS)
      throwing = null
      if (started !== shootingBattle) {
        return
      }

      showBattle()
      continueBattle()
    }

    // The player leads a hero as the attacker, or as the defender when the defender is a hero.
    const isLeadingHerosTurn = () =>
      (isPlayersTurn() || isShootersTurn() || isPlayersTactics()) && Boolean(playerHeroId())

    async function walkThenShow({ stack, path, fact, detail }) {
      const walkingBattle = started
      passedTurns = 0
      if (isUnseen()) {
        emit(fact, detail)
        continueBattle()
        return
      }

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

    function placeTacticsStack(hex) {
      const stack = getTacticsStack(battle)
      const path = stack && planTacticsMove(battle, stack, hex)
      if (!path?.length) {
        return
      }

      void walkThenShow({
        stack,
        path,
        fact: APP_FACT_BATTLE_STACK_PLACED,
        detail: { stackId: stack.id, path }
      })
    }

    function attackWithActiveStack({ targetId, fromHex }) {
      const stack = getActiveStack(battle)
      const attack =
        stack &&
        planStackAttack(battle, stack, {
          targetId,
          fromHex,
          random,
          luckRandom,
          abilityRandom,
          resistanceRandom
        })
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
      const shot =
        stack && planStackShot(battle, stack, { targetId, random, luckRandom, abilityRandom })
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

    function healWithActiveStack({ targetId }) {
      const stack = getActiveStack(battle)
      const heal = stack && planStackHeal(battle, stack, { targetId, random })
      if (heal) {
        void walkThenShow({
          stack,
          path: [],
          fact: APP_FACT_BATTLE_STACK_HEALED,
          detail: { stackId: stack.id, ...heal }
        })
      }
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
      const aim = { targeting, casterSide: getTurnSide(battle) }
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
    function spellDestination({ hero, spell }, { targetIds }, destination) {
      const target = battle.stacks.find(({ id }) => id === targetIds[0])
      if (spell.teleports) {
        const targeting = battleSpellTargeting({ hero, spell, definitions })
        return destination && canTeleportTo(battle, target, destination, targeting)
          ? destination
          : undefined
      }
      if (spell.clones) {
        return findCloneHex(battle, target) ?? undefined
      }
      return null
    }

    const heroSpellCost = (hero, spell) =>
      spellCost(hero, spell, magicDamperAgainst(battle.stacks, playerSide))

    function canHeroCast(hero, spell, spellId) {
      return (
        !hasCastThisRound(battle, playerSide) &&
        hasSpellBook(hero) &&
        knownSpells(hero, definitions).includes(spellId) &&
        canCastInBattle(spell) &&
        heroSpellCost(hero, spell) <= getHeroSpellPoints({ entity: hero, definitions }).value
      )
    }

    // Only the attacker can shake the walls; the defender's book finds no one for it.
    function castEarthquake(hero, spell, spellId) {
      if (!hasWallToShake(battle.walls)) {
        emit(APP_UI_BATTLE_SPELL_AFFECTS_NO_ONE, { noWalls: true })
        return
      }
      if (getTurnSide(battle) !== 'attacker') {
        emit(APP_UI_BATTLE_SPELL_AFFECTS_NO_ONE, {})
        return
      }
      const points = spell.earthquake.points[spellSkillLevel(hero, spell)]
      const hits = planEarthquake(battle.walls, points, catapultRandom)
      const shaken = battle.walls
      emit(APP_FACT_BATTLE_SPELL_CAST, {
        heroId: hero.id,
        spellId,
        wallHits: hits,
        cost: heroSpellCost(hero, spell)
      })
      wallHits = hits.map((hit) => ({
        ...describeWallPartHex(shaken, hit.part),
        result: describeEarthquakeHit(shaken, hit).result,
        cause: 'earthquake'
      }))
      showBattle()
      continueBattle()
    }

    function requestCast(detail) {
      const hero = castingHero()
      const spell = definitions.spells?.[detail.spellId]
      if (!spell?.earthquake) {
        castSpell(detail)
      } else if (canHeroCast(hero, spell, detail.spellId)) {
        castEarthquake(hero, spell, detail.spellId)
      }
    }

    function castSpell({ spellId, targetId, hex, destination, sacrificedId }) {
      const hero = castingHero()
      const spell = definitions.spells?.[spellId]
      const targets = canHeroCast(hero, spell, spellId)
        ? chooseSpellTargets(hero, spell, { targetId, hex, sacrificedId })
        : null
      if (targets?.noOne) {
        emit(APP_UI_BATTLE_SPELL_AFFECTS_NO_ONE, {})
        return
      }
      const goesTo = targets && spellDestination({ hero, spell }, targets, destination)
      if (goesTo === undefined || !targets) {
        return
      }

      const resistedIds = isResistible(spell)
        ? rollResisted(battle.stacks, targets.targetIds, resistanceRandom)
        : []
      emit(APP_FACT_BATTLE_SPELL_CAST, {
        heroId: hero.id,
        spellId,
        ...castDetailOn(hero, spell, targets),
        ...(goesTo ? { destination: goesTo } : {}),
        ...(resistedIds.length > 0 ? { resistedIds } : {}),
        cost: heroSpellCost(hero, spell)
      })
      continueBattle()
    }

    // The fact keeps a lasting spell's effects and rounds, a healing spell's hit points and the
    // damage each stack took, as they were when cast. A bolt saved before area spells has its
    // target's damage rather than hits.
    function castSpellOn(
      current,
      {
        heroId: casterId,
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
      const named = {
        heroName: casterNameOf(casterId),
        spellName: spell?.name ?? spellId,
        resistedIds
      }
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
            leavingSide = 'attacker'
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
            playerSide = sideOfViewingPlayer()
            const hero = heroById(state.get(), heroId)
            defenderBonuses = townDefenderBonusesOf({ started, state, definitions })
            battle = createBattle({
              attacker: heroBattleSide(hero, definitions),
              defender: battleDefenderOf(started).side({
                started,
                state,
                heroArmy: hero?.army,
                definitions
              }),
              walls: siegeWallsOf({ started, state, definitions }),
              defenderBonuses,
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
          type: APP_FACT_BATTLE_STACK_PLACED,
          handler: (event) => {
            if (!battle) {
              return
            }

            const { stackId, path } = event.detail
            battle = placeStack(battle, stackId, path.at(-1))
            showBattle()
          }
        },
        {
          type: APP_FACT_BATTLE_TACTICS_ENDED,
          handler: () => {
            if (!battle) {
              return
            }

            battle = endTactics(battle)
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
          type: APP_FACT_BATTLE_STACK_HEALED,
          handler: (event) => {
            if (!battle) {
              return
            }

            battle = healStack(battle, event.detail)
            showBattle()
          }
        },
        {
          type: APP_FACT_BATTLE_SPELL_CAST,
          handler: (event) => {
            if (!battle) {
              return
            }

            const cast = event.detail.wallHits
              ? shakeWalls(battle, {
                  heroName: casterNameOf(event.detail.heroId),
                  spellName: definitions.spells?.[event.detail.spellId]?.name,
                  wallHits: event.detail.wallHits
                })
              : castSpellOn(battle, event.detail)
            // The same stack's turn goes on, its morale already rolled for.
            if (badMoraleRolledFor === battle) {
              badMoraleRolledFor = cast
            }
            battle = cast
            showBattle()
          }
        },
        {
          type: APP_FACT_BATTLE_CATAPULT_SHOT,
          handler: (event) => {
            if (!battle) {
              return
            }

            battle = shootCatapult(battle, event.detail)
            showBattle()
          }
        },
        {
          type: APP_FACT_BATTLE_TOWER_SHOT,
          handler: (event) => {
            if (!battle) {
              return
            }

            battle = shootTower(battle, event.detail)
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
            leavingSide = event.detail.side ?? 'attacker'
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
            throwing = null
            autoCombat = false
            outcome = null
          }
        },
        {
          type: APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
          handler: (event) => {
            if (isPlayersTactics()) {
              placeTacticsStack(event.detail.hex)
              return
            }
            if (!isPlayersTurn()) {
              return
            }

            moveActiveStack(event.detail.hex)
          }
        },
        {
          type: APP_COMMAND_BATTLE_TACTICS_STACK_SELECT_REQUESTED,
          handler: (event) => {
            if (isPlayersTactics()) {
              battle = selectTacticsStack(battle, event.detail.stackId)
              showBattle()
            }
          }
        },
        {
          type: APP_COMMAND_BATTLE_TACTICS_NEXT_REQUESTED,
          handler: () => {
            if (isPlayersTactics()) {
              battle = selectNextTacticsStack(battle)
              showBattle()
            }
          }
        },
        {
          type: APP_COMMAND_BATTLE_TACTICS_END_REQUESTED,
          handler: () => {
            if (isPlayersTactics()) {
              emit(APP_FACT_BATTLE_TACTICS_ENDED, {})
              continueBattle()
            }
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
            if (isTowersTurn()) {
              aimTowerAt(event.detail.targetId)
              return
            }
            if (!isPlayersTurn()) {
              return
            }

            shootWithActiveStack(event.detail)
          }
        },
        {
          type: APP_COMMAND_BATTLE_STACK_HEAL_REQUESTED,
          handler: (event) => {
            if (isPlayersTurn()) {
              healWithActiveStack(event.detail)
            }
          }
        },
        {
          type: APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED,
          handler: (event) => {
            if (isLeadingHerosTurn() && !isTacticsPhase(battle)) {
              requestCast(event.detail)
            }
          }
        },
        {
          type: APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED,
          handler: () => {
            const stackId = (isPlayersTurn() || isShootersTurn()) && turnStackId()
            if (!stackId || hasWaited(battle, stackId)) {
              return
            }

            emit(APP_FACT_BATTLE_STACK_WAITED, { stackId })
            continueBattle()
          }
        },
        {
          type: APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED,
          handler: () => {
            if (!isPlayersTurn() && !isShootersTurn()) {
              return
            }

            emit(APP_FACT_BATTLE_STACK_DEFENDED, { stackId: turnStackId() })
            continueBattle()
          }
        },
        {
          type: APP_COMMAND_BATTLE_CATAPULT_AIM_REQUESTED,
          handler: (event) => {
            if (isCatapultAimTurn()) {
              aimCatapultAt(event.detail.part)
            }
          }
        },
        {
          type: APP_COMMAND_BATTLE_RETREAT_REQUESTED,
          handler: () => {
            if (!isLeadingHerosTurn() || !canLeave()) {
              return
            }

            finishAs(BATTLE_OUTCOME_RETREATED)
          }
        },
        {
          type: APP_COMMAND_BATTLE_SURRENDER_REQUESTED,
          handler: () => {
            const offer = isLeadingHerosTurn() ? surrenderOffer() : null
            if (!offer?.canAfford) {
              return
            }

            const paid = { GOLD_PILE: offer.price }
            emit(APP_FACT_RESOURCES_SPENT, {
              player: heroOwner(state.get(), playerHeroId()),
              resources: paid
            })
            emit(APP_FACT_RESOURCES_GAINED, { player: offer.owner, resources: paid })
            finishAs(BATTLE_OUTCOME_SURRENDERED)
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
            if (autoCombat && !moving && !throwing) {
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
      APP_FACT_BATTLE_STACK_PLACED,
      APP_FACT_BATTLE_TACTICS_ENDED,
      APP_FACT_BATTLE_STACK_ATTACKED,
      APP_FACT_BATTLE_STACK_SHOT,
      APP_FACT_BATTLE_STACK_HEALED,
      APP_FACT_BATTLE_TURN_ENDED,
      APP_FACT_BATTLE_STACK_WAITED,
      APP_FACT_BATTLE_STACK_DEFENDED,
      APP_FACT_BATTLE_STACK_FROZE,
      APP_FACT_BATTLE_AUTO_COMBAT_CHANGED,
      APP_FACT_BATTLE_SPELL_CAST,
      APP_FACT_BATTLE_CATAPULT_SHOT,
      APP_FACT_BATTLE_TOWER_SHOT,
      APP_FACT_BATTLE_FINISHED,
      APP_FACT_BATTLE_ENDED,
      APP_COMMAND_BATTLE_SPELL_CAST_REQUESTED,
      APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED,
      APP_COMMAND_BATTLE_TACTICS_STACK_SELECT_REQUESTED,
      APP_COMMAND_BATTLE_TACTICS_NEXT_REQUESTED,
      APP_COMMAND_BATTLE_TACTICS_END_REQUESTED,
      APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED,
      APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED,
      APP_COMMAND_BATTLE_STACK_HEAL_REQUESTED,
      APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED,
      APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED,
      APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED,
      APP_COMMAND_BATTLE_CATAPULT_AIM_REQUESTED,
      APP_COMMAND_BATTLE_RETREAT_REQUESTED,
      APP_COMMAND_BATTLE_SURRENDER_REQUESTED,
      APP_COMMAND_BATTLE_RESULTS_CLOSE_REQUESTED
    ],
    produces: [
      APP_UI_BATTLE_UPDATED,
      APP_FACT_BATTLE_STACK_MOVED,
      APP_FACT_BATTLE_STACK_PLACED,
      APP_FACT_BATTLE_TACTICS_ENDED,
      APP_FACT_BATTLE_STACK_ATTACKED,
      APP_FACT_BATTLE_STACK_SHOT,
      APP_FACT_BATTLE_STACK_HEALED,
      APP_FACT_BATTLE_TURN_ENDED,
      APP_FACT_BATTLE_STACK_WAITED,
      APP_FACT_BATTLE_STACK_DEFENDED,
      APP_FACT_BATTLE_STACK_FROZE,
      APP_FACT_BATTLE_AUTO_COMBAT_CHANGED,
      APP_FACT_BATTLE_SPELL_CAST,
      APP_FACT_BATTLE_CATAPULT_SHOT,
      APP_FACT_BATTLE_TOWER_SHOT,
      APP_FACT_BATTLE_FINISHED,
      APP_FACT_BATTLE_ENDED,
      APP_FACT_RESOURCES_SPENT,
      APP_FACT_RESOURCES_GAINED,
      ...battleDefenderEvents,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_FACT_HERO_ARTIFACTS_CHANGED,
      APP_FACT_HERO_WENT_TO_TAVERN,
      APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
      APP_UI_BATTLE_SPELL_AFFECTS_NO_ONE
    ]
  }
)
