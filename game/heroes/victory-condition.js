import { heroIdsOf } from '../state/queries.js'
import { heroById } from './state/hero-details.js'
import { resourcesOf } from './state/kingdoms.js'
import { goalTownName, heroBeatenBy, victoryConditionOf } from './state/scenario-goal.js'
import { townOwner } from './state/towns.js'

const hasArtifact = (artifacts, artifactId) =>
  Object.values(artifacts?.worn ?? {}).includes(artifactId) ||
  (artifacts?.backpack ?? []).includes(artifactId)

const goals = {
  captureTown: {
    isMetBy: (state, player, { town }) => townOwner(state, town) === player,
    won: (state) => `Congratulations! You captured ${goalTownName(state)}, and are victorious!`,
    enemyWon: (state) => `The enemy has captured ${goalTownName(state)}, and claims victory!`
  },
  defeatHero: {
    isMetBy: (state, player, { hero }) => heroBeatenBy(state, hero) === player,
    won: (state, { hero }) =>
      `Congratulations! You have completed your quest to defeat the enemy hero ${heroById(state, hero)?.name}. Victory is yours!`,
    enemyWon: (state, { hero }) =>
      `The hero, ${heroById(state, hero)?.name}, has suffered defeat - your quest is over!`
  },
  gatherResource: {
    isMetBy: (state, player, { resource, amount }) =>
      (resourcesOf(state, player)[resource] ?? 0) >= amount,
    won: (_state, { resource, amount }, definitions) =>
      `Congratulations! You have collected over ${amount} ${resourceName(resource, definitions)} in your treasury. Victory is yours!`,
    enemyWon: (_state, { resource, amount }, definitions) =>
      `The enemy has collected over ${amount} ${resourceName(resource, definitions)}. Victory is theirs!`
  },
  findArtifact: {
    isMetBy: (state, player, { artifact }) =>
      heroIdsOf(state, player).some((heroId) =>
        hasArtifact(heroById(state, heroId)?.artifacts, artifact)
      ),
    won: (_state, { artifact }, definitions) =>
      `Congratulations! You have found the ${artifactName(artifact, definitions)}, and can claim victory!`,
    enemyWon: (_state, { artifact }, definitions) =>
      `The enemy has found the ${artifactName(artifact, definitions)}, and can claim victory!`
  }
}

const resourceName = (resource, definitions) => definitions?.resources?.[resource]?.name ?? resource

const artifactName = (artifact, definitions) => definitions?.artifacts?.[artifact]?.name ?? artifact

// The first of `players` to have met the scenario's goal; a computer player only when the
// scenario lets them win by it.
export function goalWinner(state, players, humanPlayer) {
  const condition = victoryConditionOf(state)
  const goal = goals[condition?.type]
  if (!goal) {
    return null
  }
  return (
    players.find(
      (player) =>
        (player === humanPlayer || condition.computerCanWin === true) &&
        goal.isMetBy(state, player, condition)
    ) ?? null
  )
}

// What the player sees when `winner` meets the goal: their own victory or the enemy's.
export function goalMessage(state, winner, viewing, definitions) {
  const condition = victoryConditionOf(state)
  const goal = goals[condition.type]
  return winner === viewing
    ? goal.won(state, condition, definitions)
    : goal.enemyWon(state, condition, definitions)
}
