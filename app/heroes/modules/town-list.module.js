import { isTown } from '../../../game/domain/entity-queries.js'
import { getTownName } from '../../../game/heroes/entity-behaviors/town.js'
import { viewingPlayersTownIds } from '../../../game/heroes/state/towns.js'
import {
  APP_COMMAND_CAMERA_CENTER_ON_TILE,
  APP_COMMAND_TOWN_OPEN_REQUESTED,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_WORLD_READY,
  APP_UI_HERO_SELECTED,
  APP_UI_TOWN_SELECTED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { markSelectedTown, renderTownList } from '../presentation/town-list.js'

// The town list on the adventure panel. As in Heroes 3, clicking a town selects it and centres
// the map on it; clicking the selected town again, or double-clicking one, opens its town screen.
export const registerTownListModule = defineModule(
  ({ emit, env, state }) => {
    const townList = env.document?.getElementById('town-list')
    let townsById = new Map()
    let definitions = {}
    let selectedTownId = null

    function render() {
      if (!townList) {
        return
      }

      renderTownList(townList, env.document, {
        towns: viewingPlayersTownIds(state.get()).map((entityId) => ({
          entityId,
          name: getTownName({ entity: townsById.get(entityId), definitions })
        })),
        selectedTownId
      })
    }

    function selectTown(townId) {
      const town = townsById.get(townId)
      selectedTownId = townId
      markSelectedTown(townList, selectedTownId)
      emit(APP_UI_TOWN_SELECTED, {
        entityId: townId,
        name: getTownName({ entity: town, definitions })
      })
      emit(APP_COMMAND_CAMERA_CENTER_ON_TILE, { tile: town.tile })
    }

    function townClickedIn(event) {
      event.stopPropagation()
      return event.target.closest?.('.town-list__town')?.dataset.entityId ?? null
    }

    return {
      domSubscriptions: [
        {
          target: townList,
          type: 'click',
          handler: (event) => {
            const townId = townClickedIn(event)
            if (!townId) {
              return
            }

            if (townId === selectedTownId) {
              emit(APP_COMMAND_TOWN_OPEN_REQUESTED, { entityId: townId })
              return
            }

            selectTown(townId)
          }
        },
        {
          target: townList,
          type: 'dblclick',
          handler: (event) => {
            const townId = townClickedIn(event)
            if (townId) {
              emit(APP_COMMAND_TOWN_OPEN_REQUESTED, { entityId: townId })
            }
          }
        }
      ],
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const { entities } = event.detail.scenario
            townsById = new Map(entities.filter(isTown).map((town) => [town.id, town]))
            definitions = event.detail.definitions ?? {}
            selectedTownId = null
            render()
          }
        },
        {
          type: APP_FACT_TOWN_CAPTURED,
          handler: () => render()
        },
        {
          type: APP_UI_HERO_SELECTED,
          handler: () => {
            selectedTownId = null
            if (townList) {
              markSelectedTown(townList, selectedTownId)
            }
          }
        }
      ]
    }
  },
  {
    id: 'town-list',
    phase: 'view',
    consumes: [APP_FACT_WORLD_READY, APP_FACT_TOWN_CAPTURED, APP_UI_HERO_SELECTED],
    produces: [
      APP_UI_TOWN_SELECTED,
      APP_COMMAND_CAMERA_CENTER_ON_TILE,
      APP_COMMAND_TOWN_OPEN_REQUESTED
    ]
  }
)
