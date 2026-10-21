import { findHero } from '../../../game/domain/entity-queries.js'
import { getTownName } from '../../../game/heroes/entity-behaviors/town.js'
import { ARMY_SLOT_COUNT, getHeroArmy } from '../../../game/heroes/hero-army.js'
import {
  APP_COMMAND_TOWN_LEAVE_REQUESTED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_TOWN_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

const DEFAULT_HERO_NAME = 'Hero'

export const registerTownModule = defineModule(
  ({ emit }) => {
    let townsById = new Map()
    let definitions = {}
    let hero = null
    let heroName = DEFAULT_HERO_NAME
    let openTownId = null

    function showTown() {
      emit(APP_UI_TOWN_UPDATED, {
        name: getTownName({ entity: townsById.get(openTownId), definitions }),
        // Towns have no garrison yet.
        garrison: new Array(ARMY_SLOT_COUNT).fill(null),
        visitingHero: { name: heroName, army: getHeroArmy({ entity: hero, definitions }) }
      })
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const { scenario } = event.detail
            townsById = new Map(
              scenario.entities
                .filter((entity) => entity.kind === 'TOWN')
                .map((town) => [town.id, town])
            )
            definitions = event.detail.definitions ?? {}
            hero = findHero(scenario.entities)
            heroName = definitions.hero?.name ?? DEFAULT_HERO_NAME
            openTownId = null
          }
        },
        {
          type: APP_FACT_HERO_ARMY_CHANGED,
          handler: (event) => {
            hero = { ...hero, army: event.detail.army }
          }
        },
        {
          type: APP_FACT_TOWN_VISITED,
          handler: (event) => {
            openTownId = event.detail.entityId
            showTown()
          }
        },
        {
          type: APP_COMMAND_TOWN_LEAVE_REQUESTED,
          handler: () => {
            if (openTownId) {
              emit(APP_FACT_TOWN_LEFT, { entityId: openTownId })
            }
          }
        },
        {
          type: APP_FACT_TOWN_LEFT,
          handler: () => {
            openTownId = null
          }
        }
      ]
    }
  },
  {
    id: 'town',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_FACT_TOWN_VISITED,
      APP_COMMAND_TOWN_LEAVE_REQUESTED,
      APP_FACT_TOWN_LEFT
    ],
    produces: [APP_UI_TOWN_UPDATED, APP_FACT_TOWN_LEFT]
  }
)
