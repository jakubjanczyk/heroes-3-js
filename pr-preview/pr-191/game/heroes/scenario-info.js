import { DEFAULT_PLAYER } from '../state/core-slices.js'
import { enemiesOf, playerColors, viewingPlayer } from '../state/queries.js'
import { calendarDateOfTurn } from './calendar.js'
import { heroById } from './state/hero-details.js'
import {
  goalTownName,
  lossConditionOf,
  lossTownName,
  victoryConditionOf
} from './state/scenario-goal.js'
import { artifactName, resourceName } from './victory-condition.js'

const STANDARD_VICTORY = 'Defeat all enemy heroes and capture all enemy towns.'
const STANDARD_VICTORY_TOO = 'You may also defeat all heroes and towns.'
const STANDARD_LOSS = 'Lose all your heroes and towns.'

export const DIFFICULTY_LEVELS = Object.freeze(['Easy', 'Normal', 'Hard', 'Expert', 'Impossible'])

const MAP_SIZE_LETTERS = { 36: 'S', 72: 'M', 108: 'L', 144: 'XL' }

const heroName = (state, heroId) => heroById(state, heroId)?.name

const goalTexts = {
  captureTown: (state) => `Capture the town '${goalTownName(state)}'.`,
  defeatHero: (state, { hero }) => `Defeat the hero '${heroName(state, hero)}'.`,
  gatherResource: (_state, { resource, amount }, definitions) =>
    `Accumulate ${amount} ${resourceName(resource, definitions)}.`,
  findArtifact: (_state, { artifact }, definitions) =>
    `Find the ${artifactName(artifact, definitions)}.`
}

const lossTexts = {
  loseTown: (state) => `Lose the town '${lossTownName(state)}'.`,
  loseHero: (state, { hero }) => `Lose the hero '${heroName(state, hero)}'.`,
  timeExpires: (_state, { days }) => {
    const { month, week, day } = calendarDateOfTurn(days)
    return `Fail to win by month ${month}, week ${week}, day ${day}.`
  }
}

function victoryText(state, definitions) {
  const condition = victoryConditionOf(state)
  const goalText = goalTexts[condition?.type]
  if (!goalText) {
    return STANDARD_VICTORY
  }
  const text = goalText(state, condition, definitions)
  return condition.standardVictory === false ? text : `${text} ${STANDARD_VICTORY_TOO}`
}

function lossText(state) {
  const condition = lossConditionOf(state)
  return lossTexts[condition?.type]?.(state, condition) ?? STANDARD_LOSS
}

const ownerOf = (entity) => entity.owner ?? (entity.kind === 'HERO' ? DEFAULT_PLAYER : null)

const firstOwned = (scenario, kind, player) =>
  (scenario?.entities ?? []).find((entity) => entity.kind === kind && ownerOf(entity) === player)

function playerRow(state, scenario, definitions, player) {
  const town = firstOwned(scenario, 'TOWN', player)
  const hero = firstOwned(scenario, 'HERO', player)
  return {
    player,
    isHuman: player === viewingPlayer(state),
    town: town ? (definitions?.towns?.[town.type]?.name ?? '') : '',
    hero: hero ? (heroName(state, hero.id) ?? '') : ''
  }
}

// What the Scenario Information screen shows: the players still in the game, the scenario and
// its conditions. The difficulty is Normal until the player can choose it.
export function scenarioInfo({ state, scenario, definitions }) {
  const player = viewingPlayer(state)
  const width = scenario?.terrain?.width
  const height = scenario?.terrain?.height
  return {
    name: scenario?.meta?.name ?? '',
    description: scenario?.meta?.description ?? '',
    mapSize: `${width}x${height}`,
    mapSizeLetter: width === height ? (MAP_SIZE_LETTERS[width] ?? '') : '',
    players: playerColors(state).map((color) => playerRow(state, scenario, definitions, color)),
    allies: [player],
    enemies: enemiesOf(state, player),
    victory: victoryText(state, definitions),
    loss: lossText(state),
    difficulty: 'Normal',
    rating: '100%'
  }
}
