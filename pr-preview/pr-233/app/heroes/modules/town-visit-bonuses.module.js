import { isTown } from '../../../game/domain/entity-queries.js'
import { builtIn, townType } from '../../../game/heroes/state/towns.js'
import { visitedBuildingsOf } from '../../../game/heroes/town-visit-bonuses.js'
import { heroIdAt } from '../../../game/state/queries.js'
import {
  APP_COMMAND_TOWN_BUILDING_VISIT_REQUESTED,
  APP_FACT_TOWN_BUILDING_BUILT,
  APP_FACT_TOWN_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

// The hero in a town visits each of its buildings that gives a bonus (`visit` in the building's
// data), on walking in and when one is built while the hero is there.
export const registerTownVisitBonusesModule = defineModule(
  ({ emit, state }) => {
    let definitions = {}
    let townsById = new Map()
    // Facts replayed on load already include the bonuses given then.
    let isRestoring = false

    function visitBuildings(townId, heroId, onlyBuildingId = null) {
      if (isRestoring || !heroId || !townsById.has(townId)) {
        return
      }
      const current = state.get()
      const buildingIds = visitedBuildingsOf(
        definitions,
        townType(current, townId),
        builtIn(current, townId)
      ).filter((buildingId) => !onlyBuildingId || buildingId === onlyBuildingId)
      for (const buildingId of buildingIds) {
        emit(APP_COMMAND_TOWN_BUILDING_VISIT_REQUESTED, { heroId, townId, buildingId })
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
            townsById = new Map(
              event.detail.scenario.entities.filter(isTown).map((town) => [town.id, town])
            )
          }
        },
        {
          type: APP_FACT_TOWN_VISITED,
          handler: ({ detail }) => visitBuildings(detail.entityId, detail.heroId)
        },
        {
          type: APP_FACT_TOWN_BUILDING_BUILT,
          handler: ({ detail }) => {
            const town = townsById.get(detail.entityId)
            const heroId = town && heroIdAt(state.get(), town.tile)
            visitBuildings(detail.entityId, heroId, detail.buildingId)
          }
        },
        { type: APP_UI_RESTORE_STARTED, handler: () => (isRestoring = true) },
        { type: APP_UI_RESTORE_COMPLETED, handler: () => (isRestoring = false) }
      ]
    }
  },
  {
    id: 'town-visit-bonuses',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_TOWN_VISITED,
      APP_FACT_TOWN_BUILDING_BUILT,
      APP_UI_RESTORE_STARTED,
      APP_UI_RESTORE_COMPLETED
    ],
    produces: [APP_COMMAND_TOWN_BUILDING_VISIT_REQUESTED]
  }
)
