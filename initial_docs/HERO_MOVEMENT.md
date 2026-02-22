# Hero Movement
## Pathfinding & Tile-by-Tile Animation Reference

---

## Overview

Hero movement has two distinct concerns that must be kept separate:

- **Pathfinding** — finding which tiles to walk through
- **Animation** — visually moving the hero along that path step by step

Game state updates instantly as each tile is crossed. Visual position animates to catch up. This keeps the event log clean while rendering handles animation independently.

---

## Pathfinding

### BFS vs A*

Use BFS (breadth-first search) for now. It guarantees the shortest path in terms of tile count, is simpler to implement than A*, and is fast enough for HoMM3-sized maps.

A* is only worth the added complexity when terrain movement costs are factored in — different terrain costs different movement points to cross. When that feature arrives, swap BFS for A* inside `engine/movement.js` without touching anything else. The rest of the system is unaffected because pathfinding is isolated.

### BFS Implementation

```js
// engine/movement.js
function findPath(map, occupancy, from, to) {
  const queue = [[from]]
  const visited = new Set()
  visited.add(`${from.x},${from.y}`)

  while (queue.length > 0) {
    const path = queue.shift()
    const current = path[path.length - 1]

    if (current.x === to.x && current.y === to.y) return path

    for (const neighbor of getNeighbors(current)) {
      const key = `${neighbor.x},${neighbor.y}`
      if (visited.has(key)) continue
      if (!map.isPassable(neighbor)) continue
      // blocked by entity unless it is the destination
      if (occupancy.getAt(neighbor) && (neighbor.x !== to.x || neighbor.y !== to.y)) continue

      visited.add(key)
      queue.push([...path, neighbor])
    }
  }

  return null  // no path exists
}
```

Returns an array of tiles from start to destination inclusive, or `null` if unreachable. The calling system decides what to do with a null result (ignore the click, show a cursor change, etc).

### 8-Direction Neighbors

HoMM3 heroes move in 8 directions including diagonals:

```js
function getNeighbors(tile) {
  return [
    {x: tile.x - 1, y: tile.y},      // left
    {x: tile.x + 1, y: tile.y},      // right
    {x: tile.x,     y: tile.y - 1},  // up
    {x: tile.x,     y: tile.y + 1},  // down
    {x: tile.x - 1, y: tile.y - 1},  // top-left
    {x: tile.x + 1, y: tile.y - 1},  // top-right
    {x: tile.x - 1, y: tile.y + 1},  // bottom-left
    {x: tile.x + 1, y: tile.y + 1},  // bottom-right
  ]
}
```

---

## Tile-by-Tile Movement

The path is an array of tiles: `[{x:2,y:2}, {x:3,y:2}, {x:4,y:3}, ...]`

The hero walks each step with a delay between them. Game state and occupancy update on each step immediately. Visual position animates to catch up via CSS transitions.

### Movement System

```js
// game/systems/movement.js
async function executeMove(heroId, path) {
  const hero = getHero(heroId)

  for (const tile of path.slice(1)) {  // skip starting tile
    // update game state immediately
    occupancy.clearAt(hero.state.tile)
    hero.state.tile = tile
    occupancy.setAt(tile, heroId)
    hero.state.movementPoints -= movementCost(tile)

    // fire fact event — logged, triggers visual update in EntityLayer
    bus.emit('HERO_MOVED', { heroId, tile })

    // wait before processing next tile — creates the step-by-step feel
    await delay(150)
  }

  // fire arrival event after all steps complete
  bus.emit('HERO_ARRIVED', { heroId, tile: path[path.length - 1] })
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
```

### Visual Animation in EntityLayer

EntityLayer hears each `HERO_MOVED` and updates the hero element's position. CSS transition handles the smooth interpolation — no manual animation loop needed.

```js
// engine/layers/entity.js
bus.addEventListener('HERO_MOVED', (e) => {
  const { heroId, tile } = e.detail
  const heroEl = this.getElement(heroId)
  const screen = tileToScreen(tile)
  heroEl.style.transform = `translate(${screen.x}px, ${screen.y}px)`
})
```

```css
.entity {
  transition: transform 140ms linear;
}
```

Transition duration (140ms) is intentionally slightly less than the step delay (150ms). Each animation finishes before the next step fires — no visual stuttering or queued animations piling up.

### Blocking Input During Movement

While the hero is walking, new move commands should be ignored to prevent conflicting state. A simple flag on the movement system is sufficient for V1:

```js
let heroMoving = false

bus.addEventListener('MOVE_COMMAND', async (e) => {
  if (heroMoving) return
  const path = findPath(map, occupancy, hero.state.tile, e.detail.targetTile)
  if (!path) return

  heroMoving = true
  await executeMove(e.detail.heroId, path)
  heroMoving = false
})
```

Future option: queue the next command instead of discarding it, so clicking a new destination mid-walk reroutes after the current step completes.

---

## Path Preview on Hover

When the mouse hovers a tile, run `findPath` from the hero's current tile to the hovered tile and highlight the result. BFS on a HoMM3-sized map is fast enough to run on every `mousemove` without throttling.

Highlight is a CSS class applied to the terrain pool divs that correspond to path tiles, removed on the next mousemove before the new path is drawn.

```js
// engine/layers/ui.js (or terrain.js)
let lastHighlightedPath = []

mapEl.addEventListener('mousemove', (e) => {
  const tile = screenToTile(mousePositionRelativeToWorld(e))

  // clear previous highlight
  for (const t of lastHighlightedPath) {
    getTileDiv(t)?.classList.remove('tile--path')
  }

  const path = findPath(map, occupancy, hero.state.tile, tile)
  if (!path) return

  lastHighlightedPath = path
  for (const t of path) {
    getTileDiv(t)?.classList.add('tile--path')
  }
})
```

```css
.tile--path {
  background-color: rgba(255, 255, 255, 0.25);
}
```

---

## Relationship to Event Log

Each `HERO_MOVED` is a separate logged event. The `delay()` between steps is a runtime rendering concern only — it does not exist in the log.

During replay, the bus is set to silent and all events are applied instantly. The hero appears at the final position in a single render pass. The step-by-step animation is invisible to the log and to replay.

```
logged: HERO_MOVED {heroId, tile: {x:3,y:2}}
logged: HERO_MOVED {heroId, tile: {x:4,y:3}}
logged: HERO_MOVED {heroId, tile: {x:5,y:3}}
logged: HERO_ARRIVED {heroId, tile: {x:5,y:3}}
```

---

## Movement Points

Movement points are deducted per tile in `executeMove`. The movement system checks remaining points before starting a move and trims the path if needed:

```js
function trimPathToMovementPoints(hero, path) {
  let remaining = hero.state.movementPoints
  const trimmed = [path[0]]  // always include start

  for (const tile of path.slice(1)) {
    const cost = movementCost(tile)
    if (remaining < cost) break
    remaining -= cost
    trimmed.push(tile)
  }

  return trimmed
}
```

Hero walks as far as movement points allow. Remaining path is discarded — player must click again next turn to continue. When terrain costs are introduced, `movementCost(tile)` reads from terrain definition. Until then it returns a flat 1.

---

## Future: Upgrading to A*

When terrain movement costs matter, replace BFS with A*. The interface stays identical — same inputs, same output. Nothing outside `engine/movement.js` changes.

A* adds a heuristic (Manhattan or Chebyshev distance for 8-direction grids) and a priority queue to process lower-cost paths first. The rest of the movement system, animation, input handling, and event flow are untouched.

---

## Files

```
/engine
  movement.js    ← findPath (BFS), getNeighbors, trimPathToMovementPoints, movementCost
  layers/
    entity.js    ← listens to HERO_MOVED, animates hero element via CSS transition
    terrain.js   ← listens to mousemove, draws path preview highlight

/game
  systems/
    movement.js  ← listens to MOVE_COMMAND, calls findPath, calls executeMove, manages heroMoving flag
```

Engine movement handles pure geometry — what tiles are reachable, what the path is. Game movement handles rules — is this hero allowed to move, do they have points, what happens when they arrive.
