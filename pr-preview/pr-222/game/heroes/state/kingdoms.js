import { DEFAULT_PLAYER, playerColorsOf } from '../../state/core-slices.js'
import { heroOwner, playerColors } from '../../state/queries.js'
import { calendarDateOfTurn } from '../calendar.js'
import { dailyIncomeOfMines } from '../mine-income.js'
import { COMPUTER_STARTING_RESOURCES, startingResourcesOf } from '../starting-resources.js'
import { sumIncomes } from '../town-income.js'
import { mineIdsOf } from './map-objects.js'
import { dailyIncomeOf, townIdsOf, weeklyInterestOf } from './towns.js'

function addResources(resources, added = {}, sign = 1) {
  const totals = { ...resources }
  for (const [resourceType, amount] of Object.entries(added)) {
    const parsedAmount = Number(amount)
    totals[resourceType] =
      (totals[resourceType] ?? 0) + sign * (Number.isFinite(parsedAmount) ? parsedAmount : 0)
  }
  return totals
}

function changeResources(kingdoms, player, added, sign = 1) {
  const kingdom = kingdoms[player] ?? { resources: {} }
  return { ...kingdoms, [player]: { resources: addResources(kingdom.resources, added, sign) } }
}

// Resources found before facts named the hero who found them were the red player's.
function finderOf(previousState, heroId) {
  return heroOwner(previousState, heroId) ?? DEFAULT_PLAYER
}

// What a player earns a day from the towns and mines they own.
export function dailyIncomeOfPlayer(state, player, definitions) {
  const towns = townIdsOf(state, player).map((townId) =>
    dailyIncomeOf(state.towns.byId[townId], definitions)
  )
  const mines = dailyIncomeOfMines({
    mines: mineIdsOf(state, player).map((mineId) => state.mines[mineId]),
    definitions
  })
  return sumIncomes([...towns, mines])
}

// Counted on what the player holds as the week ends, before the new day's income.
function weeklyInterestOfPlayer(state, player, definitions) {
  const resources = resourcesOf(state, player)
  return sumIncomes(
    townIdsOf(state, player).map((townId) =>
      weeklyInterestOf(state.towns.byId[townId], definitions, resources)
    )
  )
}

function payIncome(kingdoms, { turnNumber }, { previousState, definitions }) {
  const isNewWeek = calendarDateOfTurn(turnNumber).day === 1
  return playerColors(previousState).reduce(
    (paid, player) =>
      changeResources(
        changeResources(
          paid,
          player,
          isNewWeek ? weeklyInterestOfPlayer(previousState, player, definitions) : {}
        ),
        player,
        dailyIncomeOfPlayer(previousState, player, definitions)
      ),
    kingdoms
  )
}

export const kingdomsSlice = {
  key: 'kingdoms',
  initial: ({ scenario }) =>
    Object.fromEntries(
      playerColorsOf(scenario).map((player) => [
        player,
        {
          resources: {
            ...(player === DEFAULT_PLAYER
              ? startingResourcesOf(scenario)
              : COMPUTER_STARTING_RESOURCES)
          }
        }
      ])
    ),
  on: {
    'fact.resource.collected': (kingdoms, { heroId, entityType, amount }, { previousState }) =>
      changeResources(kingdoms, finderOf(previousState, heroId), { [entityType]: amount }),
    'fact.treasureChest.opened': (kingdoms, { heroId, resources }, { previousState }) =>
      resources ? changeResources(kingdoms, finderOf(previousState, heroId), resources) : kingdoms,
    'fact.resources.gained': (kingdoms, { player = DEFAULT_PLAYER, resources }) =>
      changeResources(kingdoms, player, resources),
    'fact.town.resources.produced': (kingdoms, { player, resources }) =>
      changeResources(kingdoms, player, resources),
    'fact.resources.spent': (kingdoms, { player = DEFAULT_PLAYER, resources }) =>
      changeResources(kingdoms, player, resources, -1),
    'fact.turn.ended': payIncome
  }
}

export function resourcesOf(state, player) {
  return state.kingdoms[player]?.resources ?? {}
}
