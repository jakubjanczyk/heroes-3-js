import { DEFAULT_PLAYER } from '../../state/core-slices.js'
import { heroOwner } from '../../state/queries.js'
import { getTownName } from '../entity-behaviors/town.js'
import { townOwner } from './towns.js'

function townNameIn(scenario, townId, definitions) {
  const entity = (scenario?.entities ?? []).find((candidate) => candidate.id === townId)
  return entity ? getTownName({ entity, definitions }) : null
}

function startBattle(goal, { heroId, entityId, defender }) {
  return {
    ...goal,
    battle: {
      attackerHeroId: heroId ?? null,
      defenderHeroId: defender?.heroId ?? null,
      defenderTownId: defender?.townId ?? entityId ?? null
    }
  }
}

function sidesOf(battle, state) {
  const defenderPlayer = battle.defenderHeroId
    ? heroOwner(state, battle.defenderHeroId)
    : townOwner(state, battle.defenderTownId)
  return {
    attacker: { heroId: battle.attackerHeroId, player: heroOwner(state, battle.attackerHeroId) },
    defender: { heroId: battle.defenderHeroId, player: defenderPlayer }
  }
}

// The hero who lost a battle was beaten by the player on the other side, if any (not monsters).
function endBattle(goal, { winner }, { previousState }) {
  if (!goal.battle) {
    return goal
  }
  const sides = sidesOf(goal.battle, previousState)
  const won = sides[winner]
  const lost = sides[winner === 'attacker' ? 'defender' : 'attacker']
  const beatenBy =
    lost?.heroId && won?.player ? { ...goal.beatenBy, [lost.heroId]: won.player } : goal.beatenBy
  return { ...goal, battle: null, beatenBy }
}

const townOwnerIn = (scenario, townId) =>
  (scenario?.entities ?? []).find((candidate) => candidate.id === townId)?.owner ?? null

// Losing the scenario's town counts only once the player has held it.
function captureTown(goal, { entityId, owner = DEFAULT_PLAYER }) {
  return entityId === goal.lossCondition?.town && owner === DEFAULT_PLAYER
    ? { ...goal, isLossTownHeld: true }
    : goal
}

export const scenarioGoalSlice = {
  key: 'scenarioGoal',
  initial: ({ scenario, definitions }) => {
    const condition = scenario?.victoryCondition ?? null
    const lossCondition = scenario?.lossCondition ?? null
    return {
      condition,
      townName: condition?.town ? townNameIn(scenario, condition.town, definitions) : null,
      lossCondition,
      lossTownName: lossCondition?.town
        ? townNameIn(scenario, lossCondition.town, definitions)
        : null,
      isLossTownHeld: townOwnerIn(scenario, lossCondition?.town) === DEFAULT_PLAYER,
      battle: null,
      beatenBy: {}
    }
  },
  on: {
    'fact.battle.started': startBattle,
    'fact.battle.ended': endBattle,
    'fact.town.captured': captureTown
  }
}

export const victoryConditionOf = (state) => state.scenarioGoal?.condition ?? null

export const goalTownName = (state) => state.scenarioGoal?.townName ?? null

export const heroBeatenBy = (state, heroId) => state.scenarioGoal?.beatenBy[heroId] ?? null

export const lossConditionOf = (state) => state.scenarioGoal?.lossCondition ?? null

export const lossTownName = (state) => state.scenarioGoal?.lossTownName ?? null

export const isLossTownHeld = (state) => state.scenarioGoal?.isLossTownHeld === true
