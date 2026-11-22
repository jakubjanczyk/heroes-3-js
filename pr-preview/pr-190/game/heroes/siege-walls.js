import { fightsFor } from './battle-stats.js'
import {
  getHexDistance,
  getHexNeighbours,
  getOccupiedHexes,
  hexKey,
  isSameHex
} from './battlefield.js'

const WALL_COLUMN_BY_ROW = { 0: 11, 1: 11, 2: 10, 3: 10, 4: 9, 6: 9, 7: 10, 8: 10, 9: 11, 10: 11 }

const WALL_HEXES = Object.entries(WALL_COLUMN_BY_ROW).map(([row, column]) => ({
  row: Number(row),
  column
}))

const OUTER_DRAWBRIDGE = { row: 5, column: 9 }
const INNER_DRAWBRIDGE = { row: 5, column: 10 }
const DRAWBRIDGE_HEXES = [OUTER_DRAWBRIDGE, INNER_DRAWBRIDGE]

const IN_FRONT_OF_THE_DRAWBRIDGE = { row: 5, column: 8 }

export const DRAWBRIDGE = 'DRAWBRIDGE'

// From the top of the wall to its bottom: a missed shot lands on the nearest one still standing.
const SEGMENTS = [
  { part: 'UPPER_WALL', name: 'Upper Wall', hex: { row: 1, column: 11 }, place: 1 },
  { part: 'MID_UPPER_WALL', name: 'Mid-Upper Wall', hex: { row: 4, column: 9 }, place: 2 },
  { part: 'MID_LOWER_WALL', name: 'Mid-Lower Wall', hex: { row: 7, column: 10 }, place: 4 },
  { part: 'LOWER_WALL', name: 'Lower Wall', hex: { row: 10, column: 11 }, place: 5 }
]

const PARTS = [
  ...SEGMENTS,
  { part: DRAWBRIDGE, name: 'Drawbridge', hex: INNER_DRAWBRIDGE, place: 3 }
]

const partOf = (part) => PARTS.find((each) => each.part === part)

const segmentAt = (hex) => SEGMENTS.find((segment) => isSameHex(segment.hex, hex))

export const CATAPULT_HEX = { row: 7, column: 0 }

const SEGMENT_HIT_POINTS = 2
const CASTLE_SEGMENT_HIT_POINTS = 3
const DRAWBRIDGE_HIT_POINTS = 2

export function createSiegeWalls({ castle = false } = {}) {
  const segmentHitPoints = castle ? CASTLE_SEGMENT_HIT_POINTS : SEGMENT_HIT_POINTS
  const hitPoints = {
    ...Object.fromEntries(SEGMENTS.map(({ part }) => [part, segmentHitPoints])),
    [DRAWBRIDGE]: DRAWBRIDGE_HIT_POINTS
  }
  return { hitPoints, fullHitPoints: hitPoints }
}

const isStanding = (walls, part) => walls.hitPoints[part] > 0

const isDrawbridgeDestroyed = (walls) => !isStanding(walls, DRAWBRIDGE)

const wallKeys = new Set(WALL_HEXES.map(hexKey))

const isDrawbridgeHex = (hex) => DRAWBRIDGE_HEXES.some((part) => isSameHex(part, hex))

const covers = (stack, hex) => getOccupiedHexes(stack).some((part) => isSameHex(part, hex))

// A dead stack holds it open too; a sacrificed one leaves nothing behind.
const isHeldOpen = (stacks) =>
  stacks.some((stack) => !stack.sacrificed && DRAWBRIDGE_HEXES.some((hex) => covers(stack, hex)))

const isDrawbridgeOpen = ({ walls, stacks }) => isDrawbridgeDestroyed(walls) || isHeldOpen(stacks)

const isDrawbridgeBlocked = (stacks) =>
  stacks.some(
    (stack) =>
      stack.count > 0 &&
      fightsFor(stack) === 'attacker' &&
      covers(stack, IN_FRONT_OF_THE_DRAWBRIDGE)
  )

const isStandingWallHex = (walls, hex) => {
  const segment = segmentAt(hex)
  return segment ? isStanding(walls, segment.part) : wallKeys.has(hexKey(hex))
}

// Shut, it is a wall for the attacker, and the defender's stacks open it unless an attacker's
// stack stands in front of it.
export function blocksStanding({ walls, stacks, side, hex }) {
  if (isStandingWallHex(walls, hex)) {
    return true
  }
  if (!isDrawbridgeHex(hex) || isDrawbridgeOpen({ walls, stacks })) {
    return false
  }
  return side !== 'defender' || isDrawbridgeBlocked(stacks)
}

// The drawbridge's inner hex is the wall's hex on its row.
const isInside = ({ row, column }) => column > (WALL_COLUMN_BY_ROW[row] ?? 10)

// The drawbridge's outer hex never stops a shot; its inner one does while it stands.
const stopsTheWay = (walls, hex) =>
  isStandingWallHex(walls, hex) ||
  (isSameHex(hex, INNER_DRAWBRIDGE) && !isDrawbridgeDestroyed(walls))

// Each step to the neighbour nearest the end; on a tie, the one further along towards it, then
// the one nearer its row.
function stepToward(from, to, direction) {
  const byNearness = (a, b) =>
    getHexDistance(a, to) - getHexDistance(b, to) ||
    direction * (b.column - a.column) ||
    Math.abs(a.row - to.row) - Math.abs(b.row - to.row)
  return getHexNeighbours(from).sort(byNearness)[0]
}

function wayBetween(from, to) {
  const direction = from.column > to.column ? -1 : 1
  const way = []
  let next = from
  while (!isSameHex(next, to)) {
    next = stepToward(next, to, direction)
    way.push(next)
  }
  return way
}

const isWayThroughTheWalls = (walls, from, to) =>
  isInside(from) !== isInside(to) && wayBetween(from, to).some((hex) => stopsTheWay(walls, hex))

export const canTeleportBetween = (walls, from, to) => !isWayThroughTheWalls(walls, from, to)

export const isShotThroughTheWalls = (walls, shooter, target) =>
  !isInside(shooter.hex) &&
  getOccupiedHexes(target).every(isInside) &&
  isWayThroughTheWalls(walls, shooter.hex, target.hex)

function stateOf(walls, part) {
  if (!isStanding(walls, part)) {
    return 'destroyed'
  }
  return walls.hitPoints[part] < walls.fullHitPoints[part] ? 'damaged' : 'standing'
}

export function describeWalls({ walls, stacks }) {
  const open = isDrawbridgeOpen({ walls, stacks })
  const drawbridgeState = stateOf(walls, DRAWBRIDGE)
  return [
    ...WALL_HEXES.map((hex) => {
      const segment = segmentAt(hex)
      return { ...hex, part: 'wall', state: segment ? stateOf(walls, segment.part) : 'standing' }
    }),
    ...DRAWBRIDGE_HEXES.map((hex) => ({ ...hex, part: 'drawbridge', open, state: drawbridgeState }))
  ]
}

export const describeWallPartHex = (part) => partOf(part).hex

// Without Ballistics it aims at the weakest standing segment, and at the drawbridge only once
// all four are down.
function aimOf(walls, random) {
  const standing = SEGMENTS.filter(({ part }) => isStanding(walls, part))
  if (standing.length === 0) {
    return isStanding(walls, DRAWBRIDGE) ? partOf(DRAWBRIDGE) : null
  }
  const fewest = Math.min(...standing.map(({ part }) => walls.hitPoints[part]))
  return pickOne(
    standing.filter(({ part }) => walls.hitPoints[part] === fewest),
    random
  )
}

const pickOne = (choices, random) =>
  choices.length === 1 ? choices[0] : choices[Math.floor(random() * choices.length)]

const HIT_CHANCE = 0.5

function landingOf(walls, aim, random) {
  if (random() < HIT_CHANCE) {
    return aim
  }
  const others = SEGMENTS.filter(({ part }) => part !== aim.part && isStanding(walls, part))
  if (others.length === 0) {
    return aim
  }
  const nearest = Math.min(...others.map(({ place }) => Math.abs(place - aim.place)))
  return pickOne(
    others.filter(({ place }) => Math.abs(place - aim.place) === nearest),
    random
  )
}

const DAMAGE_CHANCES = [
  { below: 0.1, damage: 0 },
  { below: 0.7, damage: 1 },
  { below: 1, damage: 2 }
]

const rollDamage = (random) => {
  const roll = random()
  return DAMAGE_CHANCES.find(({ below }) => roll < below)?.damage ?? 2
}

export function planCatapultShot(walls, random) {
  const aim = aimOf(walls, random)
  if (!aim) {
    return null
  }
  const landing = landingOf(walls, aim, random)
  return { part: landing.part, damage: rollDamage(random) }
}

export const hasCatapultTarget = (walls) => aimOf(walls, () => 0) !== null

export function hitWall(walls, { part, damage }) {
  return {
    ...walls,
    hitPoints: { ...walls.hitPoints, [part]: Math.max(0, walls.hitPoints[part] - damage) }
  }
}

export function describeCatapultShot(walls, { part, damage }) {
  const { name } = partOf(part)
  if (damage === 0) {
    return { message: `The Catapult hits the ${name}, but does no damage.`, result: 'none' }
  }
  if (!isStanding(hitWall(walls, { part, damage }), part)) {
    return { message: `The Catapult destroys the ${name}.`, result: 'destroyed' }
  }
  return { message: `The Catapult hits the ${name}.`, result: 'damaged' }
}

const PARTS_FROM_THE_TOP = [...PARTS].sort((a, b) => a.place - b.place)

export const hasWallToShake = (walls) =>
  Boolean(walls) && PARTS.some(({ part }) => isStanding(walls, part))

// Every point is placed before any damage is done; a part already given enough points to fall
// takes no more, and points left over once every part would fall are lost.
export function planEarthquake(walls, points, random) {
  const given = {}
  for (let point = 0; point < points; point += 1) {
    const candidates = PARTS_FROM_THE_TOP.filter(
      ({ part }) => (given[part] ?? 0) < walls.hitPoints[part]
    )
    if (candidates.length === 0) {
      break
    }
    const { part } = pickOne(candidates, random)
    given[part] = (given[part] ?? 0) + 1
  }
  return PARTS_FROM_THE_TOP.filter(({ part }) => given[part]).map(({ part }) => ({
    part,
    damage: given[part]
  }))
}

export function describeEarthquakeHit(walls, { part, damage }) {
  const { name } = partOf(part)
  return isStanding(hitWall(walls, { part, damage }), part)
    ? { message: `The Earthquake damages the ${name}.`, result: 'damaged' }
    : { message: `The Earthquake destroys the ${name}.`, result: 'destroyed' }
}
