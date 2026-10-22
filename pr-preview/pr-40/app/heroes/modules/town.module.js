import { sameTile } from '../../../engine/tile-utils.js'
import { findHero, isTown } from '../../../game/domain/entity-queries.js'
import { getTownName } from '../../../game/heroes/entity-behaviors/town.js'
import { ARMY_SLOT_COUNT, getHeroArmy } from '../../../game/heroes/hero-army.js'
import {
  BUILDING_STATUS,
  buildingStatus,
  createTownBuildings,
  describeHall,
  isTownNextToWater,
  townBuildingsCatalogue
} from '../../../game/heroes/town-buildings.js'
import { createOwnedTowns } from '../../../game/heroes/town-ownership.js'
import {
  APP_COMMAND_TILE_CLICKED,
  APP_COMMAND_TOWN_BUILD_REQUESTED,
  APP_COMMAND_TOWN_LEAVE_REQUESTED,
  APP_COMMAND_TOWN_OPEN_REQUESTED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_TOWN_BUILDING_BUILT,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_TOWN_OPENED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_TURN_ENDED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_HERO_SELECTED,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_SYSTEM_OPTIONS_CLOSED,
  APP_UI_SYSTEM_OPTIONS_OPENED,
  APP_UI_TOWN_SELECTED,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createMapObjects } from '../map-objects.js'

const DEFAULT_HERO_NAME = 'Hero'

export const registerTownModule = defineModule(
  ({ emit }) => {
    const mapObjects = createMapObjects()
    const ownedTowns = createOwnedTowns()
    const townBuildings = createTownBuildings()
    let townsById = new Map()
    let townIdsNextToWater = new Set()
    let definitions = {}
    let hero = null
    let heroTile = null
    let heroName = DEFAULT_HERO_NAME
    let openTownId = null
    let selectedTownId = null
    // As for moving the hero, map clicks count only while nothing covers the map and the hero
    // stands still.
    const mapBlockers = new Set()

    function nameOf(townId) {
      return getTownName({ entity: townsById.get(townId), definitions })
    }

    function buildingsOf(townId) {
      return {
        built: townBuildings.builtIn(townId),
        hasBuiltToday: townBuildings.hasBuiltToday(townId),
        isNextToWater: townIdsNextToWater.has(townId)
      }
    }

    // Some buildings, the Capitol, a player may have in one town only.
    function builtElsewhere(townId) {
      return (buildingId) =>
        ownedTowns
          .ids()
          .some(
            (otherTownId) =>
              otherTownId !== townId && townBuildings.builtIn(otherTownId).has(buildingId)
          )
    }

    function catalogueOf(townId) {
      return townBuildingsCatalogue(definitions, townsById.get(townId)?.type)
    }

    function build({ entityId, buildingId }) {
      const building = catalogueOf(entityId).buildings[buildingId]
      const status =
        building &&
        buildingStatus({
          buildingId,
          building,
          town: buildingsOf(entityId),
          builtElsewhere: builtElsewhere(entityId)
        })
      if (ownedTowns.has(entityId) && status === BUILDING_STATUS.BUILDABLE) {
        emit(APP_FACT_TOWN_BUILDING_BUILT, { entityId, buildingId })
      }
    }

    function showTown() {
      const town = townsById.get(openTownId)
      const heroIsInTown = hero && heroTile && sameTile(heroTile, town.tile)
      emit(APP_UI_TOWN_UPDATED, {
        entityId: openTownId,
        name: nameOf(openTownId),
        // Towns have no garrison yet.
        garrison: new Array(ARMY_SLOT_COUNT).fill(null),
        visitingHero: heroIsInTown
          ? { name: heroName, army: getHeroArmy({ entity: hero, definitions }) }
          : null,
        ownedTowns: ownedTowns.ids().map((townId) => ({ entityId: townId, name: nameOf(townId) })),
        hall: describeHall({
          catalogue: catalogueOf(openTownId),
          town: buildingsOf(openTownId),
          builtElsewhere: builtElsewhere(openTownId),
          resources: definitions.resources
        })
      })
    }

    function openTown(townId) {
      if (ownedTowns.has(townId) && townId !== openTownId) {
        emit(APP_FACT_TOWN_OPENED, { entityId: townId })
      }
    }

    // As in Heroes 3, clicking an owned town opens it; its entrance does so only while the town,
    // not the hero, is selected: with the hero selected, the hero walks in.
    function openTownClickedOn(tile) {
      const entity = mapObjects.getEntityAt(tile)
      if (!isTown(entity) || (sameTile(tile, entity.tile) && !selectedTownId)) {
        return
      }

      openTown(entity.id)
    }

    function blockMap(blocker) {
      return () => mapBlockers.add(blocker)
    }

    function unblockMap(blocker) {
      return () => mapBlockers.delete(blocker)
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const { scenario } = event.detail
            mapObjects.onWorldReady(event.detail)
            ownedTowns.onWorldReady(scenario.entities)
            const towns = scenario.entities.filter(isTown)
            townsById = new Map(towns.map((town) => [town.id, town]))
            townBuildings.onWorldReady(towns)
            townIdsNextToWater = new Set(
              towns.filter((town) => isTownNextToWater(town, event.detail.map)).map(({ id }) => id)
            )
            definitions = event.detail.definitions ?? {}
            hero = findHero(scenario.entities)
            heroTile = hero?.tile ?? null
            heroName = definitions.hero?.name ?? DEFAULT_HERO_NAME
            openTownId = null
            selectedTownId = null
            mapBlockers.clear()
          }
        },
        {
          type: APP_FACT_HERO_ARMY_CHANGED,
          handler: (event) => {
            hero = { ...hero, army: event.detail.army }
          }
        },
        {
          type: APP_FACT_HERO_MOVED,
          handler: (event) => {
            heroTile = event.detail.to
            mapObjects.onHeroMoved(event.detail.to)
          }
        },
        { type: APP_FACT_MOVE_STARTED, handler: blockMap('moving') },
        {
          type: APP_FACT_MOVE_FINISHED,
          handler: (event) => {
            mapBlockers.delete('moving')
            const town = townsById.get(event.detail.interaction?.entityId)
            if (town && !ownedTowns.has(town.id)) {
              emit(APP_FACT_TOWN_CAPTURED, { entityId: town.id })
            }
          }
        },
        {
          type: APP_FACT_TOWN_CAPTURED,
          handler: (event) => {
            ownedTowns.onTownCaptured(event.detail.entityId)
            if (openTownId) {
              showTown()
            }
          }
        },
        { type: APP_UI_ADVENTURE_MAP_COVERED, handler: blockMap('covered') },
        { type: APP_UI_ADVENTURE_MAP_UNCOVERED, handler: unblockMap('covered') },
        { type: APP_UI_INTERACTION_MODAL_OPENED, handler: blockMap('modal') },
        { type: APP_UI_INTERACTION_MODAL_CLOSED, handler: unblockMap('modal') },
        { type: APP_UI_SYSTEM_OPTIONS_OPENED, handler: blockMap('system options') },
        { type: APP_UI_SYSTEM_OPTIONS_CLOSED, handler: unblockMap('system options') },
        {
          type: APP_UI_TOWN_SELECTED,
          handler: (event) => {
            selectedTownId = event.detail.entityId
          }
        },
        {
          type: APP_UI_HERO_SELECTED,
          handler: () => {
            selectedTownId = null
          }
        },
        {
          type: APP_COMMAND_TILE_CLICKED,
          handler: (event) => {
            if (mapBlockers.size === 0) {
              openTownClickedOn(event.detail.tile)
            }
          }
        },
        {
          type: APP_COMMAND_TOWN_OPEN_REQUESTED,
          handler: (event) => openTown(event.detail.entityId)
        },
        {
          type: APP_FACT_TOWN_VISITED,
          handler: (event) => {
            openTownId = event.detail.entityId
            showTown()
          }
        },
        {
          type: APP_FACT_TOWN_OPENED,
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
        },
        { type: APP_COMMAND_TOWN_BUILD_REQUESTED, handler: (event) => build(event.detail) },
        {
          type: APP_FACT_TOWN_BUILDING_BUILT,
          handler: (event) => {
            townBuildings.onBuildingBuilt(event.detail.entityId, event.detail.buildingId)
            if (openTownId) {
              showTown()
            }
          }
        },
        { type: APP_FACT_TURN_ENDED, handler: () => townBuildings.onTurnEnded() }
      ]
    }
  },
  {
    id: 'town',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_FACT_HERO_MOVED,
      APP_FACT_MOVE_STARTED,
      APP_FACT_MOVE_FINISHED,
      APP_FACT_TOWN_CAPTURED,
      APP_UI_ADVENTURE_MAP_COVERED,
      APP_UI_ADVENTURE_MAP_UNCOVERED,
      APP_UI_INTERACTION_MODAL_OPENED,
      APP_UI_INTERACTION_MODAL_CLOSED,
      APP_UI_SYSTEM_OPTIONS_OPENED,
      APP_UI_SYSTEM_OPTIONS_CLOSED,
      APP_UI_TOWN_SELECTED,
      APP_UI_HERO_SELECTED,
      APP_COMMAND_TILE_CLICKED,
      APP_COMMAND_TOWN_OPEN_REQUESTED,
      APP_FACT_TOWN_VISITED,
      APP_FACT_TOWN_OPENED,
      APP_COMMAND_TOWN_LEAVE_REQUESTED,
      APP_FACT_TOWN_LEFT,
      APP_COMMAND_TOWN_BUILD_REQUESTED,
      APP_FACT_TOWN_BUILDING_BUILT,
      APP_FACT_TURN_ENDED
    ],
    produces: [
      APP_UI_TOWN_UPDATED,
      APP_FACT_TOWN_BUILDING_BUILT,
      APP_FACT_TOWN_OPENED,
      APP_FACT_TOWN_LEFT,
      APP_FACT_TOWN_CAPTURED
    ]
  }
)
