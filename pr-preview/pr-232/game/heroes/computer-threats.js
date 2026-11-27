import { enemiesOf, heroIdsOf, heroTile, isTileExplored } from '../state/queries.js'
import { heroStrength } from './computer-strength.js'
import { heroById } from './state/hero-details.js'

function visibleEnemyHeroes({ state, player, definitions }) {
  return enemiesOf(state, player)
    .flatMap((enemy) => heroIdsOf(state, enemy))
    .filter((enemyHeroId) => isTileExplored(state, player, heroTile(state, enemyHeroId)))
    .map((enemyHeroId) => ({
      id: enemyHeroId,
      strength: heroStrength(heroById(state, enemyHeroId), definitions)
    }))
}

// For each tile, the strength of the strongest enemy hero that can get there next turn without a
// battle on the way, or 0. The deciding hero, if any, is taken off the map, as it may move away
// first.
export function createDangerMap({ state, player, heroId = null, routesOf, definitions }) {
  const enemies = visibleEnemyHeroes({ state, player, definitions })

  return function dangerAt(tiles) {
    const danger = tiles.map(() => 0)
    for (const enemy of enemies) {
      const routes = routesOf(enemy.id, { absentHeroId: heroId })
      routes.planRoutes(tiles).forEach((path, index) => {
        if (path && routes.getPathToBattle(path) === null && routes.reachesOnNewDay(path)) {
          danger[index] = Math.max(danger[index], enemy.strength)
        }
      })
    }
    return danger
  }
}

export function threatenedTownIds({ state, player, towns, routesOf, definitions }) {
  const danger = createDangerMap({ state, player, routesOf, definitions })(
    towns.map(({ tile }) => tile)
  )
  return new Set(towns.filter((_, index) => danger[index] > 0).map(({ id }) => id))
}
