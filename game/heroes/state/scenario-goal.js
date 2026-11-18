import { heroOwner } from '../../state/queries.js'
import { townOwner } from './towns.js'

const townNameIn = (scenario, townId) =>
  (scenario?.entities ?? []).find((entity) => entity.id === townId)?.name ?? null

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

export const scenarioGoalSlice = {
  key: 'scenarioGoal',
  initial: ({ scenario }) => {
    const condition = scenario?.victoryCondition ?? null
    return {
      condition,
      townName: condition?.town ? townNameIn(scenario, condition.town) : null,
      battle: null,
      beatenBy: {}
    }
  },
  on: {
    'fact.battle.started': startBattle,
    'fact.battle.ended': endBattle
  }
}

export const victoryConditionOf = (state) => state.scenarioGoal?.condition ?? null

export const goalTownName = (state) => state.scenarioGoal?.townName ?? null

export const heroBeatenBy = (state, heroId) => state.scenarioGoal?.beatenBy[heroId] ?? null
