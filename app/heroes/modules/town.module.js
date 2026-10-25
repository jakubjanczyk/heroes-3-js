import { sameTile } from '../../../engine/tile-utils.js'
import { isTown } from '../../../game/domain/entity-queries.js'
import { moveStack, splitStack } from '../../../game/heroes/army-exchange.js'
import { addToGarrison, describeTownCreatures } from '../../../game/heroes/creature-recruitment.js'
import { getTownName } from '../../../game/heroes/entity-behaviors/town.js'
import { describeFort } from '../../../game/heroes/fort-window.js'
import { getHeroArmy, getTownGarrison } from '../../../game/heroes/hero-army.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { resourcesOf } from '../../../game/heroes/state/kingdoms.js'
import {
  availableCreatures,
  builtIn,
  dailyIncomeOf,
  hasBuiltToday,
  townGarrison,
  townIdsOf,
  townOwner
} from '../../../game/heroes/state/towns.js'
import {
  BUILDING_STATUS,
  buildingStatus,
  describeHall,
  describeTownBox,
  isTownNextToWater,
  townBuildingsCatalogue
} from '../../../game/heroes/town-buildings.js'
import { describeTownPicture } from '../../../game/heroes/town-picture.js'
import { activePlayer, heroIdAt, heroOwner, viewingPlayer } from '../../../game/state/queries.js'
import {
  APP_COMMAND_TILE_CLICKED,
  APP_COMMAND_TOWN_BUILD_REQUESTED,
  APP_COMMAND_TOWN_GARRISON_STACK_MOVE_REQUESTED,
  APP_COMMAND_TOWN_LEAVE_REQUESTED,
  APP_COMMAND_TOWN_OPEN_REQUESTED,
  APP_COMMAND_TOWN_RECRUIT_REQUESTED,
  APP_COMMAND_TOWN_STACK_MOVE_REQUESTED,
  APP_COMMAND_TOWN_STACK_SPLIT_REQUESTED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_INTERACTION_REACHED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_TOWN_BUILDING_BUILT,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TOWN_CREATURES_RECRUITED,
  APP_FACT_TOWN_GARRISON_CHANGED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_TOWN_OPENED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_ADVENTURE_MAP_COVERED,
  APP_UI_ADVENTURE_MAP_UNCOVERED,
  APP_UI_HERO_SELECTED,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED,
  APP_UI_SYSTEM_OPTIONS_CLOSED,
  APP_UI_SYSTEM_OPTIONS_OPENED,
  APP_UI_TOWN_MESSAGE_OPENED,
  APP_UI_TOWN_SELECTED,
  APP_UI_TOWN_UPDATED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { createMapObjects } from '../map-objects.js'

const NO_ROOM_IN_GARRISON = 'There is no room in the garrison for this army.'

export const registerTownModule = defineModule(
  ({ emit, emitAll, state }) => {
    const mapObjects = createMapObjects(state)
    let townsById = new Map()
    let townIdsNextToWater = new Set()
    let definitions = {}
    let openTownId = null
    let selectedTownId = null
    // As for moving the hero, map clicks count only while nothing covers the map and the hero
    // stands still.
    const mapBlockers = new Set()

    function isActivePlayersTown(townId) {
      const current = state.get()
      return townOwner(current, townId) === activePlayer(current)
    }

    function nameOf(townId) {
      return getTownName({ entity: townsById.get(townId), definitions })
    }

    function treasuryOf(townId) {
      return resourcesOf(state.get(), townOwner(state.get(), townId))
    }

    function buildingsOf(townId) {
      return {
        built: builtIn(state.get(), townId),
        hasBuiltToday: hasBuiltToday(state.get(), townId),
        isNextToWater: townIdsNextToWater.has(townId)
      }
    }

    // Some buildings, the Capitol, a player may have in one town only.
    function builtElsewhere(townId) {
      const current = state.get()
      return (buildingId) =>
        townIdsOf(current, townOwner(current, townId)).some(
          (otherTownId) => otherTownId !== townId && builtIn(current, otherTownId).has(buildingId)
        )
    }

    function catalogueOf(townId) {
      return townBuildingsCatalogue(definitions, townsById.get(townId)?.type)
    }

    function creaturesOf(townId) {
      return describeTownCreatures({
        buildings: catalogueOf(townId).buildings,
        built: builtIn(state.get(), townId),
        monsters: definitions.monsters,
        resources: definitions.resources,
        available: availableCreatures(state.get(), townId),
        treasury: treasuryOf(townId)
      })
    }

    function recruit({ entityId, tier, creature, count }) {
      const recruitable = creaturesOf(entityId)[tier - 1]?.recruits.find(
        (recruit) => recruit.creature === creature
      )
      if (
        !isActivePlayersTown(entityId) ||
        !recruitable ||
        count < 1 ||
        count > recruitable.maxCount
      ) {
        return
      }

      const garrison = addToGarrison(townGarrison(state.get(), entityId), creature, count)
      if (!garrison) {
        emit(APP_UI_TOWN_MESSAGE_OPENED, { message: NO_ROOM_IN_GARRISON })
        return
      }

      const cost = definitions.monsters[creature].cost
      emitAll([
        {
          type: APP_FACT_RESOURCES_SPENT,
          detail: {
            player: townOwner(state.get(), entityId),
            resources: Object.fromEntries(
              Object.entries(cost).map(([resourceType, amount]) => [resourceType, amount * count])
            ),
            reason: 'town.recruit',
            entityId
          }
        },
        {
          type: APP_FACT_TOWN_CREATURES_RECRUITED,
          detail: { entityId, tier, creature, count }
        },
        { type: APP_FACT_TOWN_GARRISON_CHANGED, detail: { entityId, garrison } }
      ])
    }

    function build({ entityId, buildingId }) {
      const building = catalogueOf(entityId).buildings[buildingId]
      const status =
        building &&
        buildingStatus({
          buildingId,
          building,
          town: buildingsOf(entityId),
          builtElsewhere: builtElsewhere(entityId),
          treasury: treasuryOf(entityId)
        })
      if (isActivePlayersTown(entityId) && status === BUILDING_STATUS.BUILDABLE) {
        emitAll([
          {
            type: APP_FACT_RESOURCES_SPENT,
            detail: {
              player: townOwner(state.get(), entityId),
              resources: { ...building.cost },
              reason: 'town.building',
              entityId,
              buildingId
            }
          },
          { type: APP_FACT_TOWN_BUILDING_BUILT, detail: { entityId, buildingId } }
        ])
      }
    }

    function visitingHeroOf(townId) {
      return heroById(state.get(), heroIdAt(state.get(), townsById.get(townId).tile))
    }

    // Between the open town's garrison and its visiting hero, or within either. `rearrange` is the
    // army-exchange rule applied to the armies, returning them changed or null.
    function rearrangeArmiesInTown(rearrange) {
      if (!openTownId) {
        return
      }

      const hero = visitingHeroOf(openTownId)
      const armies = { garrison: townGarrison(state.get(), openTownId) }
      if (hero) {
        armies.hero = hero.army
      }
      const changed = rearrange(armies)
      if (!changed) {
        return
      }

      emitAll([
        ...(changed.hero === armies.hero
          ? []
          : [
              { type: APP_FACT_HERO_ARMY_CHANGED, detail: { heroId: hero.id, army: changed.hero } }
            ]),
        ...(changed.garrison === armies.garrison
          ? []
          : [
              {
                type: APP_FACT_TOWN_GARRISON_CHANGED,
                detail: { entityId: openTownId, garrison: changed.garrison }
              }
            ])
      ])
    }

    function moveGarrisonStack(entityId, from, to) {
      const garrison = townGarrison(state.get(), entityId)
      const changed = moveStack({ garrison }, from, to)
      if (changed) {
        emit(APP_FACT_TOWN_GARRISON_CHANGED, { entityId, garrison: changed.garrison })
      }
    }

    function showTown() {
      const current = state.get()
      const visitingHero = visitingHeroOf(openTownId)
      const built = builtIn(current, openTownId)
      emit(APP_UI_TOWN_UPDATED, {
        entityId: openTownId,
        name: nameOf(openTownId),
        garrison: getTownGarrison({
          entity: { garrison: townGarrison(current, openTownId) },
          definitions
        }),
        visitingHero: visitingHero
          ? { name: visitingHero.name, army: getHeroArmy({ entity: visitingHero, definitions }) }
          : null,
        ownedTowns: townIdsOf(state.get(), viewingPlayer(state.get())).map((townId) => ({
          entityId: townId,
          name: nameOf(townId)
        })),
        goldIncome: dailyIncomeOf(current.towns.byId[openTownId], definitions).GOLD_PILE ?? 0,
        hallName: describeTownBox({ catalogue: catalogueOf(openTownId), built }).hall.name,
        creatures: creaturesOf(openTownId),
        fort: describeFort({
          buildings: catalogueOf(openTownId).buildings,
          built,
          monsters: definitions.monsters,
          available: availableCreatures(current, openTownId)
        }),
        picture: describeTownPicture({
          ...catalogueOf(openTownId),
          built,
          monsters: definitions.monsters
        }),
        hall: describeHall({
          catalogue: catalogueOf(openTownId),
          town: buildingsOf(openTownId),
          builtElsewhere: builtElsewhere(openTownId),
          resources: definitions.resources,
          treasury: treasuryOf(openTownId)
        })
      })
    }

    function openTown(townId) {
      if (isActivePlayersTown(townId) && townId !== openTownId) {
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
            const towns = scenario.entities.filter(isTown)
            townsById = new Map(towns.map((town) => [town.id, town]))
            townIdsNextToWater = new Set(
              towns.filter((town) => isTownNextToWater(town, event.detail.map)).map(({ id }) => id)
            )
            definitions = event.detail.definitions ?? {}
            openTownId = null
            selectedTownId = null
            mapBlockers.clear()
          }
        },
        {
          type: APP_FACT_HERO_ARMY_CHANGED,
          handler: () => {
            if (openTownId) {
              showTown()
            }
          }
        },
        { type: APP_FACT_MOVE_STARTED, handler: blockMap('moving') },
        {
          type: APP_FACT_MOVE_FINISHED,
          handler: () => {
            mapBlockers.delete('moving')
          }
        },
        {
          type: APP_FACT_INTERACTION_REACHED,
          handler: (event) => {
            const town = townsById.get(event.detail.entityId)
            const current = state.get()
            const owner = heroOwner(current, event.detail.heroId)
            if (town && owner && townOwner(current, town.id) !== owner) {
              emit(APP_FACT_TOWN_CAPTURED, { entityId: town.id, owner })
            }
          }
        },
        {
          type: APP_FACT_TOWN_CAPTURED,
          handler: () => {
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
        { type: APP_COMMAND_TOWN_RECRUIT_REQUESTED, handler: (event) => recruit(event.detail) },
        {
          type: APP_COMMAND_TOWN_STACK_MOVE_REQUESTED,
          handler: ({ detail: { from, to } }) =>
            rearrangeArmiesInTown((armies) => moveStack(armies, from, to))
        },
        {
          type: APP_COMMAND_TOWN_GARRISON_STACK_MOVE_REQUESTED,
          handler: ({ detail: { entityId, from, to } }) => moveGarrisonStack(entityId, from, to)
        },
        {
          type: APP_COMMAND_TOWN_STACK_SPLIT_REQUESTED,
          handler: ({ detail: { from, to, count } }) =>
            rearrangeArmiesInTown((armies) => splitStack(armies, from, to, count))
        },
        {
          type: APP_FACT_TOWN_GARRISON_CHANGED,
          handler: () => {
            if (openTownId) {
              showTown()
            }
          }
        },
        {
          type: APP_FACT_TOWN_BUILDING_BUILT,
          handler: () => {
            if (openTownId) {
              showTown()
            }
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
      APP_FACT_MOVE_STARTED,
      APP_FACT_MOVE_FINISHED,
      APP_FACT_INTERACTION_REACHED,
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
      APP_COMMAND_TOWN_RECRUIT_REQUESTED,
      APP_COMMAND_TOWN_STACK_MOVE_REQUESTED,
      APP_COMMAND_TOWN_GARRISON_STACK_MOVE_REQUESTED,
      APP_COMMAND_TOWN_STACK_SPLIT_REQUESTED,
      APP_FACT_TOWN_BUILDING_BUILT,
      APP_FACT_TOWN_GARRISON_CHANGED
    ],
    produces: [
      APP_UI_TOWN_UPDATED,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_FACT_RESOURCES_SPENT,
      APP_FACT_TOWN_BUILDING_BUILT,
      APP_FACT_TOWN_CREATURES_RECRUITED,
      APP_FACT_TOWN_GARRISON_CHANGED,
      APP_UI_TOWN_MESSAGE_OPENED,
      APP_FACT_TOWN_OPENED,
      APP_FACT_TOWN_LEFT,
      APP_FACT_TOWN_CAPTURED
    ]
  }
)
