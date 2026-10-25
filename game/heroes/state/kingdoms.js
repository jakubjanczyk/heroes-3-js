import { DEFAULT_PLAYER } from '../../state/core-slices.js'
import { heroOwner, playerColors } from '../../state/queries.js'
import { dailyIncomeOfMines } from '../mine-income.js'
import { startingResourcesOf } from '../starting-resources.js'
import { sumIncomes } from '../town-income.js'
import { mineIdsOf } from './map-objects.js'
import { dailyIncomeOf, townIdsOf } from './towns.js'

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

function payIncome(kingdoms, _detail, { previousState, definitions }) {
  return playerColors(previousState).reduce(
    (paid, player) =>
      changeResources(paid, player, dailyIncomeOfPlayer(previousState, player, definitions)),
    kingdoms
  )
}

export const kingdomsSlice = {
  key: 'kingdoms',
  initial: ({ scenario }) => ({
    [DEFAULT_PLAYER]: { resources: { ...startingResourcesOf(scenario) } }
  }),
  on: {
    'fact.resource.collected': (kingdoms, { heroId, entityType, amount }, { previousState }) =>
      changeResources(kingdoms, finderOf(previousState, heroId), { [entityType]: amount }),
    'fact.treasureChest.opened': (kingdoms, { heroId, resources }, { previousState }) =>
      resources ? changeResources(kingdoms, finderOf(previousState, heroId), resources) : kingdoms,
    'fact.resources.spent': (kingdoms, { player = DEFAULT_PLAYER, resources }) =>
      changeResources(kingdoms, player, resources, -1),
    'fact.turn.ended': payIncome
  }
}

export function resourcesOf(state, player) {
  return state.kingdoms[player]?.resources ?? {}
}
