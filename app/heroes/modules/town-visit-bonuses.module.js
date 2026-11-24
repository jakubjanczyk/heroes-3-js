import { isTown } from '../../../game/domain/entity-queries.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { builtIn, townType } from '../../../game/heroes/state/towns.js'
import { townBuildingsCatalogue } from '../../../game/heroes/town-buildings.js'
import { townWeekBonusesFor } from '../../../game/heroes/town-visit-bonuses.js'
import {
  heroIdAt,
  heroMovementPoints,
  heroOwner,
  viewingPlayer
} from '../../../game/state/queries.js'
import {
  APP_FACT_HERO_WEEK_BONUS_GAINED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TOWN_BUILDING_BUILT,
  APP_FACT_TOWN_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_NOTICE_OPENED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

// A town building that gives the hero in the town a bonus for the rest of the week (Castle's
// Stables), on walking in and when it is built while the hero is there.
export const registerTownVisitBonusesModule = defineModule(
  ({ emit, state }) => {
    let definitions = {}
    let townsById = new Map()
    // Facts replayed on load already include the bonuses given then.
    let isRestoring = false

    function give(heroId, { buildingId, entityType, movementPoints, message }, townId) {
      emit(APP_FACT_HERO_WEEK_BONUS_GAINED, {
        heroId,
        entityId: townId,
        entityType,
        buildingId,
        movementPoints
      })
      const { value, max } = heroMovementPoints(state.get(), heroId)
      emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { heroId, value: value + movementPoints, max })
      if (heroOwner(state.get(), heroId) === viewingPlayer(state.get())) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message })
      }
    }

    function giveBonuses(townId, heroId, onlyBuildingId = null) {
      if (isRestoring || !heroId || !townsById.has(townId)) {
        return
      }
      const current = state.get()
      const { buildings } = townBuildingsCatalogue(definitions, townType(current, townId))
      const bonuses = townWeekBonusesFor({
        built: builtIn(current, townId),
        buildings,
        hero: heroById(current, heroId)
      }).filter(({ buildingId }) => !onlyBuildingId || buildingId === onlyBuildingId)
      for (const bonus of bonuses) {
        give(heroId, bonus, townId)
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
          handler: ({ detail }) => giveBonuses(detail.entityId, detail.heroId)
        },
        {
          type: APP_FACT_TOWN_BUILDING_BUILT,
          handler: ({ detail }) => {
            const town = townsById.get(detail.entityId)
            const heroId = town && heroIdAt(state.get(), town.tile)
            giveBonuses(detail.entityId, heroId, detail.buildingId)
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
    produces: [
      APP_FACT_HERO_WEEK_BONUS_GAINED,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_UI_NOTICE_OPENED
    ]
  }
)
