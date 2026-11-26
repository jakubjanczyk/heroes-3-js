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
].map((segment) => ({ ...segment, along: segment.place, aimedAs: 'wall' }))

const DRAWBRIDGE_PART = {
  part: DRAWBRIDGE,
  name: 'Drawbridge',
  hex: INNER_DRAWBRIDGE,
  place: 3,
  along: 3,
  aimedAs: 'drawbridge'
}

// A tower above the wall comes before its parts from the top, one below after them, and one
// standing on the battlefield last.
const TOWER_PLACES = { above: 0, below: 6, on: 7 }

// How near the parts are to each other: a tower standing on the battlefield counts as near the
// wall's bottom end as the tower below it.
const TOWER_ALONG_THE_WALL = { above: 0, below: 6, on: 6 }

const towerPartOf = ({ tower, name, hex, stands = 'on', aimedAs = 'tower' }) => ({
  part: tower,
  name,
  hex,
  stands,
  aimedAs,
  place: TOWER_PLACES[stands],
  along: TOWER_ALONG_THE_WALL[stands]
})

const shootableTowersOf = (walls) => towersOf(walls).filter(({ hitPoints }) => hitPoints > 0)

const partsOf = (walls) => [
  ...SEGMENTS,
  DRAWBRIDGE_PART,
  ...shootableTowersOf(walls).map(towerPartOf)
]

const partOf = (walls, part) => partsOf(walls).find((each) => each.part === part)

const segmentAt = (hex) => SEGMENTS.find((segment) => isSameHex(segment.hex, hex))

export const CATAPULT_HEX = { row: 7, column: 0 }

const SEGMENT_HIT_POINTS = 2
const CASTLE_SEGMENT_HIT_POINTS = 3
const DRAWBRIDGE_HIT_POINTS = 2

export function createSiegeWalls({ castle = false, moat = null, towers = [] } = {}) {
  const segmentHitPoints = castle ? CASTLE_SEGMENT_HIT_POINTS : SEGMENT_HIT_POINTS
  const hitPoints = {
    ...Object.fromEntries(SEGMENTS.map(({ part }) => [part, segmentHitPoints])),
    [DRAWBRIDGE]: DRAWBRIDGE_HIT_POINTS,
    ...Object.fromEntries(
      towers.filter((tower) => tower.hitPoints > 0).map((tower) => [tower.tower, tower.hitPoints])
    )
  }
  return { hitPoints, fullHitPoints: hitPoints, moat, towers }
}

export const towersOf = (walls) => walls?.towers ?? []

export const towerOf = (walls, tower) => towersOf(walls).find((each) => each.tower === tower)

export const isTowerStanding = (walls, tower) => (walls?.hitPoints[tower] ?? 1) > 0

export const describeTowers = (walls) =>
  towersOf(walls).map(({ tower, name, hex, stands = 'on' }) => ({
    tower,
    name,
    stands,
    state: walls.hitPoints[tower] === undefined ? 'standing' : stateOf(walls, tower),
    ...hex
  }))

export const isMoatHex = (walls, hex) =>
  Boolean(walls?.moat?.hexes.some((moatHex) => isSameHex(moatHex, hex)))

export const describeMoat = (walls) => ({
  name: walls?.moat?.name ?? '',
  hexes: walls?.moat?.hexes ?? []
})

export const moatOf = (walls) => walls?.moat ?? null

export const isAffectedByTheMoat = (walls, stack) =>
  Boolean(walls?.moat?.affects.includes(stack.side))

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

export const isInsideTheWalls = (stack) => isInside(stack.hex)

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

// The hex the stack is taken to doesn't count: it can be taken into the moat.
const isWayAcrossTheMoat = (walls, from, to) =>
  isInside(from) !== isInside(to) &&
  wayBetween(from, to)
    .slice(0, -1)
    .some((hex) => isMoatHex(walls, hex))

export const canTeleportBetween = (walls, from, to, { acrossWalls, acrossMoat }) =>
  (acrossWalls || !isWayThroughTheWalls(walls, from, to)) &&
  (acrossMoat || !isWayAcrossTheMoat(walls, from, to))

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

export function describeWallPartHex(walls, part) {
  const { hex, stands } = partOf(walls, part)
  return stands ? { ...hex, tower: true } : hex
}

// The Keep, standing on the battlefield, before the towers past the wall's ends.
function towerAimOf(walls, random) {
  const standing = shootableTowersOf(walls)
    .map(towerPartOf)
    .filter(({ part }) => isStanding(walls, part))
  const onTheBattlefield = standing.filter(({ stands }) => stands === 'on')
  const choices = onTheBattlefield.length > 0 ? onTheBattlefield : standing
  return choices.length > 0 ? pickOne(choices, random) : null
}

function weakestSegmentOf(walls, random) {
  const standing = SEGMENTS.filter(({ part }) => isStanding(walls, part))
  if (standing.length === 0) {
    return null
  }
  const fewest = Math.min(...standing.map(({ part }) => walls.hitPoints[part]))
  return pickOne(
    standing.filter(({ part }) => walls.hitPoints[part] === fewest),
    random
  )
}

const drawbridgeAimOf = (walls) => (isStanding(walls, DRAWBRIDGE) ? DRAWBRIDGE_PART : null)

const allSegmentsStand = (walls) => SEGMENTS.every(({ part }) => isStanding(walls, part))

// Without Ballistics it aims at the weakest standing segment, at the drawbridge only once all
// four are down, and then at the towers. With it, at the drawbridge first, then at the segments
// only while all four stand, then at the towers, and at what is left of the segments last.
function aimOf(walls, random, hasBallistics) {
  if (!hasBallistics) {
    return weakestSegmentOf(walls, random) ?? drawbridgeAimOf(walls) ?? towerAimOf(walls, random)
  }
  return (
    drawbridgeAimOf(walls) ??
    (allSegmentsStand(walls) ? weakestSegmentOf(walls, random) : null) ??
    towerAimOf(walls, random) ??
    weakestSegmentOf(walls, random)
  )
}

const pickOne = (choices, random) =>
  choices.length === 1 ? choices[0] : choices[Math.floor(random() * choices.length)]

function nearestOf(choices, from, random) {
  const nearest = Math.min(...choices.map(({ along }) => Math.abs(along - from.along)))
  return pickOne(
    choices.filter(({ along }) => Math.abs(along - from.along) === nearest),
    random
  )
}

function landingOf(walls, aim, hitChance, random) {
  if (random() * 100 < hitChance[aim.aimedAs]) {
    return aim
  }
  const others = SEGMENTS.filter(({ part }) => part !== aim.part && isStanding(walls, part))
  return others.length === 0 ? aim : nearestOf(others, aim, random)
}

function rollDamage(damageChance, random) {
  const roll = random() * 100
  let below = 0
  const damage = damageChance.findIndex((chance) => {
    below += chance
    return roll < below
  })
  return damage === -1 ? damageChance.length - 1 : damage
}

// A shot after the first of the round goes at the same part; if that part has fallen, at the
// nearest one still standing, of any kind.
function nextAimOf(walls, aimed, random) {
  const previous = partOf(walls, aimed)
  if (isStanding(walls, aimed)) {
    return previous
  }
  const standing = partsOf(walls).filter(({ part }) => isStanding(walls, part))
  return standing.length === 0 ? null : nearestOf(standing, previous, random)
}

export function planCatapultShot(
  walls,
  random,
  { hitChance, damageChance, hasBallistics = false, aimed = null }
) {
  const aim = aimed ? nextAimOf(walls, aimed, random) : aimOf(walls, random, hasBallistics)
  if (!aim) {
    return null
  }
  const landing = landingOf(walls, aim, hitChance, random)
  return { aim: aim.part, part: landing.part, damage: rollDamage(damageChance, random) }
}

export const hasCatapultTarget = (walls) => aimOf(walls, () => 0, false) !== null

const aimedOnHexes = ({ part, hex, stands }) => {
  if (part === DRAWBRIDGE) {
    return DRAWBRIDGE_HEXES
  }
  // The tower below the wall is drawn under the Lower Wall's hex, which stays the wall's.
  return stands === 'below' ? [] : [hex]
}

// A tower is also aimed at on its picture.
export const describeCatapultTargets = (walls) =>
  partsOf(walls)
    .filter(({ part }) => isStanding(walls, part))
    .map((target) => ({
      part: target.part,
      name: target.name,
      hexes: aimedOnHexes(target),
      ...(target.stands ? { tower: target.part } : {})
    }))

export function hitWall(walls, { part, damage }) {
  return {
    ...walls,
    hitPoints: { ...walls.hitPoints, [part]: Math.max(0, walls.hitPoints[part] - damage) }
  }
}

export function describeCatapultShot(walls, { part, damage }) {
  const { name } = partOf(walls, part)
  if (damage === 0) {
    return { message: `The Catapult hits the ${name}, but does no damage.`, result: 'none' }
  }
  if (!isStanding(hitWall(walls, { part, damage }), part)) {
    return { message: `The Catapult destroys the ${name}.`, result: 'destroyed' }
  }
  return { message: `The Catapult hits the ${name}.`, result: 'damaged' }
}

const partsFromTheTop = (walls) => [...partsOf(walls)].sort((a, b) => a.place - b.place)

export const hasWallToShake = (walls) =>
  Boolean(walls) && partsOf(walls).some(({ part }) => isStanding(walls, part))

// Every point is placed before any damage is done; a part already given enough points to fall
// takes no more, and points left over once every part would fall are lost.
export function planEarthquake(walls, points, random) {
  const given = {}
  const parts = partsFromTheTop(walls)
  for (let point = 0; point < points; point += 1) {
    const candidates = parts.filter(({ part }) => (given[part] ?? 0) < walls.hitPoints[part])
    if (candidates.length === 0) {
      break
    }
    const { part } = pickOne(candidates, random)
    given[part] = (given[part] ?? 0) + 1
  }
  return parts
    .filter(({ part }) => given[part])
    .map(({ part }) => ({
      part,
      damage: given[part]
    }))
}

export function describeEarthquakeHit(walls, { part, damage }) {
  const { name } = partOf(walls, part)
  return isStanding(hitWall(walls, { part, damage }), part)
    ? { message: `The Earthquake damages the ${name}.`, result: 'damaged' }
    : { message: `The Earthquake destroys the ${name}.`, result: 'destroyed' }
}
