import { findPath } from '../../engine/pathfinding.js'
import { sameTile } from '../../engine/tile-utils.js'
import { toEntityIdOrNull } from '../domain/value-objects/entity-id.js'

function isStep(from, to) {
  const dx = Math.abs(to.x - from.x)
  const dy = Math.abs(to.y - from.y)
  return (dx !== 0 || dy !== 0) && dx <= 1 && dy <= 1
}

// `canCross(tile)` says whether the hero may still go through a tile between the ends.
function isValidPlannedPath({ path, fromTile, toTile, map, canCross }) {
  if (!Array.isArray(path) || path.length < 2) {
    return false
  }

  if (!sameTile(path[0], fromTile) || !sameTile(path[path.length - 1], toTile)) {
    return false
  }

  const lastIndex = path.length - 1
  return path.every((tile, index) => {
    const isEnd = index === 0 || index === lastIndex
    return (
      map.inBounds(tile) &&
      (isEnd ? map.isPassable(tile) : canCross(tile)) &&
      (index === 0 || isStep(path[index - 1], tile))
    )
  })
}

async function defaultSleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function clampDelayMs(delayMs) {
  return Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0
}

// `getHero` returns the moving hero ({ id, tile }); `occupancy.getAt(tile)` says what blocks a tile,
// and `occupancy.getObjectAt(tile)` what map object stands there under any hero.
// `getStepCost(from, to, routeCost)` is what the route search minimises; `getStepCharges(path)`
// lists what each step of `path` the hero can still take costs. `getGuardsAt(tile)` lists the
// entities that fight a hero stepping onto `tile`, in the order it fights them; a route can't go
// on from there. `getFlightPoints()` is how many movement points the hero can still fly with
// today, or null when they walk: in the air they cross water, objects and guarded tiles, and the
// route must land before those points run out. `getStepDelayMs(from, to)` is how long one step
// takes, `stepDelayMs` for every step unless given.
export function createMovementSystem({
  getHero,
  map,
  occupancy,
  entityBehaviors,
  getGuardsAt = () => [],
  isExplored = () => true,
  sleep = defaultSleep,
  stepDelayMs = 80,
  getStepDelayMs = () => stepDelayMs,
  getStepCost = () => 1,
  getStepCharges = (path) => new Array(path.length - 1).fill(1),
  getArrivalContext = () => ({}),
  getFlightPoints = () => null,
  spendMovementPoints = () => {},
  onMoveStart = () => {},
  onMoveFinish = () => {},
  onStep = () => {}
}) {
  let isMoving = false

  // A guard's own tile is not guarded.
  function guardsAt(tile) {
    return entityBehaviors.guardsSurroundings(occupancy.getAt(tile)) ? [] : getGuardsAt(tile)
  }

  // Whether the hero interacts with what stands on `tile` from the tile next to it.
  function isVisitedFromNextTo(tile, hero) {
    const occupant = occupancy.getAt(tile)
    if (!occupant || occupant.id === hero.id) {
      return false
    }

    return (
      entityBehaviors.isArrivalInteractionEntity(occupant) &&
      !entityBehaviors.entersTarget(occupant, getArrivalContext())
    )
  }

  function isEntrance(tile) {
    return entityBehaviors.getArrivalInteraction(occupancy.getObjectAt(tile))
      ?.requiresSteppingIntoTarget
  }

  // An entrance is entered and left from below or the sides, never through the row above it.
  function crossesEntranceTop(from, to) {
    return (to.y < from.y && isEntrance(from)) || (to.y > from.y && isEntrance(to))
  }

  function isTakenByOther(tile, hero) {
    const occupant = occupancy.getAt(tile)
    return occupant !== null && occupant.id !== hero.id
  }

  function canFlyOver(tile) {
    return map.isPassable(tile) || map.getTerrainType(tile)?.flyable === true
  }

  // Whether the hero may go through `tile` on some route, with or without flying.
  function canCross(tile, hero) {
    const walkable = map.isPassable(tile) && !isTakenByOther(tile, hero)
    return walkable || (getFlightPoints() !== null && canFlyOver(tile))
  }

  function findRoute(hero, toTile) {
    const visitsTargetFromNextTo = isVisitedFromNextTo(toTile, hero)
    const flightPoints = getFlightPoints()
    const isAirborne = (routeCost) => flightPoints !== null && routeCost <= flightPoints
    const canWalkOn = (tile) => map.isPassable(tile) && !isTakenByOther(tile, hero)
    return findPath({
      fromTile: hero.tile,
      toTile,
      map,
      getStepCost,
      // A hero never walks or flies through tiles its owner has not explored.
      canPass: (tile, routeCost) =>
        isExplored(tile) && (canWalkOn(tile) || (canFlyOver(tile) && isAirborne(routeCost))),
      // The hero fights on the first guarded tile it lands on, so a route ends there, unless it
      // only goes on to visit the target from it.
      canLeave: (from, to, routeCost) =>
        !crossesEntranceTop(from, to) &&
        (sameTile(from, hero.tile) ||
          isAirborne(routeCost) ||
          (canWalkOn(from) &&
            (guardsAt(from).length === 0 || (visitsTargetFromNextTo && sameTile(to, toTile)))))
    })
  }

  // The first step of `path`, from `firstStepIndex` up to `lastStepIndex`, that lands on a
  // guarded tile.
  function firstGuardedStep(path, lastStepIndex, firstStepIndex = 1) {
    for (let stepIndex = firstStepIndex; stepIndex <= lastStepIndex; stepIndex += 1) {
      if (guardsAt(path[stepIndex]).length > 0) {
        return stepIndex
      }
    }

    return null
  }

  // A flying hero passes over the guarded tiles of today's steps until they land.
  function firstLandingStep(path, lastStepIndex) {
    if (getFlightPoints() === null) {
      return 1
    }
    return Math.max(1, Math.min(getStepCharges(path).length, lastStepIndex))
  }

  function battlesWith(guards) {
    return guards.map((guard) => ({
      entityId: guard.id,
      kind: entityBehaviors.getArrivalInteraction(guard)?.movementInteractionKind,
      targetTile: guard.tile
    }))
  }

  // The part of `path` the hero walks and pays for before a battle on the way, or null when it
  // gets to the end of `path` without one.
  function getPathToBattle(path) {
    const hero = getHero()
    const toTile = path[path.length - 1]
    const visitsTargetFromNextTo = hero ? isVisitedFromNextTo(toTile, hero) : false
    const lastStepIndex = path.length - (visitsTargetFromNextTo ? 2 : 1)
    const guardedStep = firstGuardedStep(path, lastStepIndex, firstLandingStep(path, lastStepIndex))
    if (guardedStep !== null) {
      return path.slice(0, guardedStep + 1)
    }

    const target = occupancy.getAt(toTile)
    const fightsAtTarget =
      visitsTargetFromNextTo &&
      (entityBehaviors.guardsSurroundings(target) || guardsAt(toTile).length > 0)
    return fightsAtTarget ? path : null
  }

  // The route the hero would take to `toTile`, or null when it can't go there.
  // A destination holding an entity is only a valid target if the hero can interact with it.
  function planRoute(toTile) {
    const hero = getHero()
    if (!hero?.tile || !isExplored(toTile)) {
      return null
    }

    const destinationOccupant = occupancy.getAt(toTile)
    if (
      destinationOccupant &&
      destinationOccupant.id !== hero.id &&
      !entityBehaviors.isArrivalInteractionEntity(destinationOccupant)
    ) {
      return null
    }

    const path = findRoute(hero, toTile)
    return path && path.length >= 2 ? path : null
  }

  // What stands on `toTile` for the moving hero: nothing, an entity the arrival plan interacts
  // with, or an entity that blocks the hero from ending its route there.
  function resolveArrival(hero, toTile, arrivalPlan) {
    const occupant = occupancy.getAt(toTile)
    if (!occupant || occupant.id === hero.id) {
      return { blocked: false, interaction: null }
    }

    if (occupant.id !== toEntityIdOrNull(arrivalPlan?.entityId)) {
      return { blocked: true, interaction: null }
    }

    return {
      blocked: false,
      interaction: {
        entityId: occupant.id,
        kind: arrivalPlan.movementInteractionKind,
        targetTile: toTile,
        stopBeforeTarget: arrivalPlan.stopBeforeTarget
      }
    }
  }

  // Where the walk ends and what the hero does there, in order: the battles with the guards of
  // the first guarded tile it steps onto, else of the target it visits, then the target itself.
  function planStop({ path, cappedStepCount, interaction }) {
    const walkedStepCount = interaction?.stopBeforeTarget ? cappedStepCount - 1 : cappedStepCount
    const guardedStep = firstGuardedStep(
      path,
      walkedStepCount,
      firstLandingStep(path, walkedStepCount)
    )
    if (guardedStep !== null) {
      const entersTarget = interaction && guardedStep === path.length - 1
      return {
        executedStepCount: guardedStep,
        interactions: [
          ...battlesWith(guardsAt(path[guardedStep])),
          ...(entersTarget ? [interaction] : [])
        ],
        chargesTargetStep: false
      }
    }

    if (!interaction) {
      return { executedStepCount: walkedStepCount, interactions: [], chargesTargetStep: false }
    }

    const targetGuards = interaction.stopBeforeTarget ? guardsAt(interaction.targetTile) : []
    return {
      executedStepCount: walkedStepCount,
      interactions: [...battlesWith(targetGuards), interaction],
      // Visiting from the tile next to the target still costs the step onto it.
      chargesTargetStep: Boolean(interaction.stopBeforeTarget)
    }
  }

  // The selected route when it still leads from the hero to `toTile`, else a fresh one.
  function routeFor(hero, toTile, plannedPath) {
    const isStillValid = isValidPlannedPath({
      path: plannedPath,
      fromTile: hero.tile,
      toTile,
      map,
      canCross: (tile) => canCross(tile, hero)
    })
    if (isStillValid) {
      return plannedPath
    }

    const path = findRoute(hero, toTile)
    return path && path.length >= 2 ? path : null
  }

  // The steps the hero takes towards `toTile` today, or null when it can't set off.
  function planMove(toTile, plannedPath, arrivalPlan) {
    const hero = getHero()
    if (!hero) {
      return null
    }

    const path = routeFor(hero, toTile, plannedPath)
    if (!path) {
      return null
    }

    const totalStepCount = path.length - 1
    const stepCharges = getStepCharges(path).slice(0, totalStepCount)
    const cappedStepCount = stepCharges.length
    if (cappedStepCount < 1) {
      return null
    }

    const reachesTarget = cappedStepCount === totalStepCount
    const arrival = resolveArrival(hero, toTile, arrivalPlan)
    // A hero can only end its route on another entity's tile by interacting with it.
    if (reachesTarget && arrival.blocked) {
      return null
    }

    const interaction = reachesTarget ? arrival.interaction : null
    return {
      hero,
      path,
      stepCharges,
      cappedStepCount,
      ...planStop({ path, cappedStepCount, interaction })
    }
  }

  // Walks the planned steps and returns the tile the hero ends on.
  async function walk({ hero, path, stepCharges, executedStepCount }, onTileReached) {
    let currentTile = { x: hero.tile.x, y: hero.tile.y }
    let lastStepDelayMs = 0
    for (let stepIndex = 0; stepIndex < executedStepCount; stepIndex += 1) {
      const stepTile = path[stepIndex + 1]
      const stepFromTile = currentTile
      lastStepDelayMs = clampDelayMs(getStepDelayMs(stepFromTile, stepTile))
      await sleep(lastStepDelayMs)
      currentTile = { x: stepTile.x, y: stepTile.y }
      onTileReached(currentTile)
      onStep({ hero, from: stepFromTile, to: stepTile })
      spendMovementPoints(stepCharges[stepIndex])
    }

    if (executedStepCount > 0) {
      await sleep(lastStepDelayMs)
    }
  }

  async function moveHeroTo(toTile, { path: plannedPath = null, arrivalPlan = null } = {}) {
    if (isMoving) {
      return false
    }

    const plan = planMove(toTile, plannedPath, arrivalPlan)
    if (!plan) {
      return false
    }

    const {
      hero,
      path,
      stepCharges,
      cappedStepCount,
      interactions,
      chargesTargetStep,
      executedStepCount
    } = plan
    const fromTile = { x: hero.tile.x, y: hero.tile.y }
    let currentTile = fromTile
    isMoving = true
    onMoveStart({
      hero,
      from: fromTile,
      targetTile: toTile,
      reachedTile: path[executedStepCount],
      cappedStepCount
    })
    try {
      await walk(plan, (tile) => {
        currentTile = tile
      })

      if (chargesTargetStep) {
        spendMovementPoints(stepCharges[cappedStepCount - 1])
      }
    } finally {
      isMoving = false
      onMoveFinish({
        hero,
        from: fromTile,
        targetTile: toTile,
        reachedTile: currentTile,
        cappedStepCount,
        interactions: interactions.map(({ kind, entityId, targetTile }) => ({
          kind,
          entityId,
          targetTile
        }))
      })
    }

    return true
  }

  // The battles a hero fights on arriving at `tile` without walking there.
  function battlesOnArrivalAt(tile) {
    return battlesWith(guardsAt(tile))
  }

  return {
    planRoute,
    getPathToBattle,
    battlesOnArrivalAt,
    moveHeroTo
  }
}
