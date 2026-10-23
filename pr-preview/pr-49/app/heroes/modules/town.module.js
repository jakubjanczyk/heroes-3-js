import { sameTile } from '../../../engine/tile-utils.js'
import { findHero, isTown } from '../../../game/domain/entity-queries.js'
import { moveStack } from '../../../game/heroes/army-exchange.js'
import { calendarDateOfTurn } from '../../../game/heroes/calendar.js'
import {
  addToGarrison,
  describeTownCreatures,
  weeklyGrowthByTier
} from '../../../game/heroes/creature-recruitment.js'
import { getTownName } from '../../../game/heroes/entity-behaviors/town.js'
import { describeFort } from '../../../game/heroes/fort-window.js'
import { getHeroArmy, getTownGarrison } from '../../../game/heroes/hero-army.js'
import { startingResourcesOf } from '../../../game/heroes/starting-resources.js'
import {
  BUILDING_STATUS,
  buildingStatus,
  createTownBuildings,
  describeHall,
  isTownNextToWater,
  townBuildingsCatalogue
} from '../../../game/heroes/town-buildings.js'
import { dailyIncomeOfTown, sumIncomes } from '../../../game/heroes/town-income.js'
import { createOwnedTowns } from '../../../game/heroes/town-ownership.js'
import { describeTownPicture } from '../../../game/heroes/town-picture.js'
import { createTreasury } from '../../../game/heroes/treasury.js'
import {
  APP_COMMAND_TILE_CLICKED,
  APP_COMMAND_TOWN_BUILD_REQUESTED,
  APP_COMMAND_TOWN_LEAVE_REQUESTED,
  APP_COMMAND_TOWN_OPEN_REQUESTED,
  APP_COMMAND_TOWN_RECRUIT_REQUESTED,
  APP_COMMAND_TOWN_STACK_MOVE_REQUESTED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_MOVED,
  APP_FACT_INCOME_COLLECTED,
  APP_FACT_INTERACTION_REACHED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_TOWN_BUILDING_BUILT,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TOWN_CREATURES_RECRUITED,
  APP_FACT_TOWN_GARRISON_CHANGED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_TOWN_OPENED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_TREASURE_CHEST_OPENED,
  APP_FACT_TURN_ENDED,
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

const DEFAULT_HERO_NAME = 'Hero'
const NO_ROOM_IN_GARRISON = 'There is no room in the garrison for this army.'

export const registerTownModule = defineModule(
  ({ emit }) => {
    const mapObjects = createMapObjects()
    const ownedTowns = createOwnedTowns()
    const townBuildings = createTownBuildings()
    const treasury = createTreasury()
    let townsById = new Map()
    let townIdsNextToWater = new Set()
    // By town: the creatures each tier's dwelling has to buy, and the garrison they join.
    const availableByTown = new Map()
    const garrisons = new Map()
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

    function incomeOf(townId) {
      return dailyIncomeOfTown({
        buildings: catalogueOf(townId).buildings,
        built: townBuildings.builtIn(townId)
      })
    }

    function weeklyGrowthOf(townId) {
      return weeklyGrowthByTier({
        buildings: catalogueOf(townId).buildings,
        built: townBuildings.builtIn(townId),
        monsters: definitions.monsters
      })
    }

    function creaturesOf(townId) {
      return describeTownCreatures({
        buildings: catalogueOf(townId).buildings,
        built: townBuildings.builtIn(townId),
        monsters: definitions.monsters,
        resources: definitions.resources,
        available: availableByTown.get(townId) ?? [],
        treasury: treasury.totals()
      })
    }

    // As in Heroes 3, every town's dwellings, neutral towns' too, add a week of creatures at the
    // start of each week, on top of those left unbought. Like income, it follows from the turn ends.
    function growCreatures() {
      for (const townId of townsById.keys()) {
        const growth = weeklyGrowthOf(townId)
        availableByTown.set(
          townId,
          growth.map((amount, index) => (availableByTown.get(townId)?.[index] ?? 0) + amount)
        )
      }
    }

    // A dwelling just built has a week of its creature's own growth (VCMI: no Citadel or Castle
    // bonus until the next week); its upgrade keeps the creatures already there.
    function stockNewDwelling(townId, building) {
      const creature = definitions.monsters?.[building?.creature]
      if (!creature || building.upgrades) {
        return
      }

      const available = [...(availableByTown.get(townId) ?? [])]
      available[creature.tier - 1] = creature.growth
      availableByTown.set(townId, available)
    }

    function recruit({ entityId, tier, creature, count }) {
      const recruitable = creaturesOf(entityId)[tier - 1]?.recruits.find(
        (recruit) => recruit.creature === creature
      )
      if (!ownedTowns.has(entityId) || !recruitable || count < 1 || count > recruitable.maxCount) {
        return
      }

      const garrison = addToGarrison(garrisons.get(entityId), creature, count)
      if (!garrison) {
        emit(APP_UI_TOWN_MESSAGE_OPENED, { message: NO_ROOM_IN_GARRISON })
        return
      }

      const cost = definitions.monsters[creature].cost
      emit(APP_FACT_RESOURCES_SPENT, {
        resources: Object.fromEntries(
          Object.entries(cost).map(([resourceType, amount]) => [resourceType, amount * count])
        ),
        reason: 'town.recruit',
        entityId
      })
      emit(APP_FACT_TOWN_CREATURES_RECRUITED, { entityId, tier, creature, count })
      emit(APP_FACT_TOWN_GARRISON_CHANGED, { entityId, garrison })
    }

    // Income follows from the persisted captures, buildings and turn ends, so it is not logged
    // itself: replaying the log pays it again in the same order.
    function collectIncome() {
      const income = sumIncomes(ownedTowns.ids().map(incomeOf))
      if (Object.keys(income).length > 0) {
        emit(APP_FACT_INCOME_COLLECTED, { income }, { log: false })
      }
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
          treasury: treasury.totals()
        })
      if (ownedTowns.has(entityId) && status === BUILDING_STATUS.BUILDABLE) {
        emit(APP_FACT_RESOURCES_SPENT, {
          resources: { ...building.cost },
          reason: 'town.building',
          entityId,
          buildingId
        })
        emit(APP_FACT_TOWN_BUILDING_BUILT, { entityId, buildingId })
      }
    }

    function isHeroIn(townId) {
      return Boolean(hero && heroTile && sameTile(heroTile, townsById.get(townId).tile))
    }

    // Between the open town's garrison and its visiting hero, or within either.
    function moveStackInTown({ from, to }) {
      if (!openTownId) {
        return
      }

      const armies = { garrison: garrisons.get(openTownId) }
      if (isHeroIn(openTownId)) {
        armies.hero = hero.army
      }
      const moved = moveStack(armies, from, to)
      if (!moved) {
        return
      }

      if (moved.hero !== armies.hero) {
        emit(APP_FACT_HERO_ARMY_CHANGED, { heroId: hero.id, army: moved.hero })
      }
      if (moved.garrison !== armies.garrison) {
        emit(APP_FACT_TOWN_GARRISON_CHANGED, { entityId: openTownId, garrison: moved.garrison })
      }
    }

    function showTown() {
      emit(APP_UI_TOWN_UPDATED, {
        entityId: openTownId,
        name: nameOf(openTownId),
        garrison: getTownGarrison({ entity: { garrison: garrisons.get(openTownId) }, definitions }),
        visitingHero: isHeroIn(openTownId)
          ? { name: heroName, army: getHeroArmy({ entity: hero, definitions }) }
          : null,
        ownedTowns: ownedTowns.ids().map((townId) => ({ entityId: townId, name: nameOf(townId) })),
        goldIncome: incomeOf(openTownId).GOLD_PILE ?? 0,
        creatures: creaturesOf(openTownId),
        fort: describeFort({
          buildings: catalogueOf(openTownId).buildings,
          built: townBuildings.builtIn(openTownId),
          monsters: definitions.monsters,
          available: availableByTown.get(openTownId) ?? []
        }),
        picture: describeTownPicture({
          ...catalogueOf(openTownId),
          built: townBuildings.builtIn(openTownId),
          monsters: definitions.monsters
        }),
        hall: describeHall({
          catalogue: catalogueOf(openTownId),
          town: buildingsOf(openTownId),
          builtElsewhere: builtElsewhere(openTownId),
          resources: definitions.resources,
          treasury: treasury.totals()
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
            treasury.onWorldReady(startingResourcesOf(scenario))
            garrisons.clear()
            availableByTown.clear()
            for (const town of towns) {
              garrisons.set(town.id, town.garrison ?? [])
            }
            hero = findHero(scenario.entities)
            heroTile = hero?.tile ?? null
            heroName = definitions.hero?.name ?? DEFAULT_HERO_NAME
            // The dwellings standing at the start of the game have a week of creatures.
            growCreatures()
            openTownId = null
            selectedTownId = null
            mapBlockers.clear()
          }
        },
        {
          type: APP_FACT_HERO_ARMY_CHANGED,
          handler: (event) => {
            hero = { ...hero, army: event.detail.army }
            if (openTownId) {
              showTown()
            }
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
          handler: () => {
            mapBlockers.delete('moving')
          }
        },
        {
          type: APP_FACT_INTERACTION_REACHED,
          handler: (event) => {
            const town = townsById.get(event.detail.entityId)
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
        { type: APP_COMMAND_TOWN_RECRUIT_REQUESTED, handler: (event) => recruit(event.detail) },
        {
          type: APP_COMMAND_TOWN_STACK_MOVE_REQUESTED,
          handler: (event) => moveStackInTown(event.detail)
        },
        {
          type: APP_FACT_TOWN_CREATURES_RECRUITED,
          handler: (event) => {
            const { entityId, tier, count } = event.detail
            const available = [...(availableByTown.get(entityId) ?? [])]
            available[tier - 1] = Math.max(0, (available[tier - 1] ?? 0) - count)
            availableByTown.set(entityId, available)
          }
        },
        {
          type: APP_FACT_TOWN_GARRISON_CHANGED,
          handler: (event) => {
            garrisons.set(event.detail.entityId, event.detail.garrison)
            if (openTownId) {
              showTown()
            }
          }
        },
        {
          type: APP_FACT_TOWN_BUILDING_BUILT,
          handler: (event) => {
            const { entityId, buildingId } = event.detail
            townBuildings.onBuildingBuilt(entityId, buildingId)
            stockNewDwelling(entityId, catalogueOf(entityId).buildings[buildingId])
            if (openTownId) {
              showTown()
            }
          }
        },
        {
          type: APP_FACT_TURN_ENDED,
          handler: (event) => {
            townBuildings.onTurnEnded()
            collectIncome()
            if (calendarDateOfTurn(event.detail.turnNumber).day === 1) {
              growCreatures()
            }
          }
        },
        {
          type: APP_FACT_RESOURCE_COLLECTED,
          handler: (event) => treasury.add({ [event.detail.entityType]: event.detail.amount })
        },
        {
          type: APP_FACT_INCOME_COLLECTED,
          handler: (event) => treasury.add(event.detail.income)
        },
        {
          type: APP_FACT_TREASURE_CHEST_OPENED,
          handler: (event) => treasury.add(event.detail.resources)
        },
        {
          type: APP_FACT_RESOURCES_SPENT,
          handler: (event) => treasury.spend(event.detail.resources)
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
      APP_FACT_HERO_MOVED,
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
      APP_FACT_TOWN_BUILDING_BUILT,
      APP_FACT_TOWN_CREATURES_RECRUITED,
      APP_FACT_TOWN_GARRISON_CHANGED,
      APP_FACT_TURN_ENDED,
      APP_FACT_RESOURCE_COLLECTED,
      APP_FACT_INCOME_COLLECTED,
      APP_FACT_TREASURE_CHEST_OPENED,
      APP_FACT_RESOURCES_SPENT
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
      APP_FACT_TOWN_CAPTURED,
      APP_FACT_INCOME_COLLECTED
    ]
  }
)
