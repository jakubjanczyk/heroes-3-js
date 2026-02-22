# Technical Plan
## HoMM3-Inspired Browser Game Engine

---

## Core Principles

1. **Engine knows nothing about the game.** Deleting `/game` leaves a working engine.
2. **Events are facts, commands are intent.** Only facts hit the log. Commands are validated and discarded.
3. **Definition is static, state is derived.** Entity definitions live in JSON and never mutate. State is always reconstructable from the event log.
4. **One listener per layer.** Layers dispatch to entities — entities don't register global listeners.
5. **State shape is per entity type.** No forced common schema beyond the engine's minimal contract (`id`, `type`, `tile`).

---

## Folder Structure

```
/engine
  db.js              ← promise wrappers around IndexedDB primitives
  eventlog.js        ← append-only fact log, persisted to IndexedDB
  map.js             ← tile grid, coordinate math
  occupancy.js       ← tile → entityId index
  movement.js        ← pathfinding (A*), movement validation
  entity.js          ← base Entity class (minimal contract)
  input.js           ← raw browser events → commands
  renderer.js        ← main rAF loop, owns layers
  layers/
    terrain.js       ← TerrainLayer
    object.js        ← ObjectLayer (static map objects)
    entity.js        ← EntityLayer (heroes, monsters, etc.)
    effects.js       ← EffectsLayer (animations, highlights)
    ui.js            ← UILayer (notifications, buttons, cursor)

/game
  world.js           ← initializes map and entities from scenario
  systems/
    movement.js      ← validates MOVE_COMMAND, emits HERO_MOVED
    interaction.js   ← resolves what happens when hero arrives on occupied tile
  entities/
    hero.js
    monster.js
    resource.js
    town.js
  data/
    heroes.json
    monsters.json
    resources.json
    towns.json
    terrain.json

/scenarios
  test.json          ← hand-crafted V1 test map

index.html
main.js              ← boots engine, loads scenario, wires game systems
```

---

## Architecture

### Coordinate System

One canonical coordinate system throughout. Everything derives from tile `{x, y}`.

```js
// engine/map.js — the only place this math lives
const TILE_WIDTH = 64
const TILE_HEIGHT = 32  // diamond tiles, 2:1 ratio

function tileToScreen(tile) {
  return {
    x: (tile.x - tile.y) * (TILE_WIDTH / 2),
    y: (tile.x + tile.y) * (TILE_HEIGHT / 2)
  }
}

function screenToTile(screen) {
  // inverse of above, used for mouse click → tile
}
```

Never inline this math anywhere else. Always call these functions.

### Layer Stack

Five absolutely-positioned divs covering the full map, stacked by z-index:

```
UILayer        z: 50  ← notifications, buttons, cursor element
EffectsLayer   z: 40  ← movement trails, selection rings
EntityLayer    z: 30  ← heroes, monsters, resources, towns
ObjectLayer    z: 20  ← trees, rocks (static, rarely redraws)
TerrainLayer   z: 10  ← tiles, always at bottom
```

Layers communicate only through the event bus, never by direct reference.

### Event Bus

No custom implementation. The native `EventTarget` is used directly — it provides `addEventListener`, `removeEventListener`, and `dispatchEvent` out of the box. Events carry their payload in `e.detail` via `CustomEvent`.

```js
// main.js — the entire event bus
const bus = new EventTarget()

// emitting
bus.dispatchEvent(new CustomEvent('HERO_MOVED', { detail: { heroId: 'h1', tile: {x, y} } }))

// listening
bus.addEventListener('HERO_MOVED', (e) => console.log(e.detail))
```

The one thin wrapper is on `GameBus`, which intercepts emits to record fact-events to the log before dispatching. Commands pass through without being recorded.

```js
// engine/eventlog.js — GameBus wraps EventTarget
class GameBus extends EventTarget {
  constructor(log) {
    super()
    this.log = log
    this.silent = false  // set true during replay to suppress rendering
  }
  emit(type, detail, { log: shouldLog = true } = {}) {
    if (shouldLog) this.log.record({ type, detail })
    if (!this.silent) {
      this.dispatchEvent(new CustomEvent(type, { detail }))
    }
  }
}
```

Commands are emitted with `{ log: false }` and are never recorded.

### Event Log + IndexedDB Persistence

The log is persisted to IndexedDB so sessions survive page reload. On boot, the log is read back and replayed to reconstruct state. No separate save/load mechanism is needed — the log *is* the save.

`db.js` is a thin promise wrapper around the verbose native IndexedDB API. It knows nothing about games or events.

```js
// engine/db.js
function openDB(name, version, onUpgrade) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version)
    request.onupgradeneeded = (e) => onUpgrade(e.target.result)
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

function dbAdd(db, store, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const request = tx.objectStore(store).add(value)
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

function dbGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const request = tx.objectStore(store).getAll()
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

function dbClear(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const request = tx.objectStore(store).clear()
    request.onsuccess = () => resolve()
    request.onerror = (e) => reject(e.target.error)
  })
}
```

`EventLog` uses `db.js` and holds an in-memory cache for synchronous reads:

```js
// engine/eventlog.js
class EventLog {
  constructor() {
    this.db = null
    this.cache = []
  }

  async init() {
    this.db = await openDB('gameEngine', 1, (db) => {
      db.createObjectStore('events', { keyPath: 'id', autoIncrement: true })
    })
    this.cache = await dbGetAll(this.db, 'events')
  }

  async record(event) {
    const entry = { ...event, at: Date.now() }
    await dbAdd(this.db, 'events', entry)
    this.cache.push(entry)
  }

  async reset() {
    await dbClear(this.db, 'events')
    this.cache = []
  }

  getAll() { return this.cache }
  hasExistingSession() { return this.cache.length > 0 }
}
```

### Boot Sequence

On every page load, `main.js` checks the log before deciding whether to start fresh or restore a session:

```js
// main.js
const log = new EventLog()
await log.init()

if (log.hasExistingSession()) {
  bus.silent = true
  for (const event of log.getAll()) {
    await applyEvent(event)   // rebuilds state, no rendering
  }
  bus.silent = false
  render(currentState)        // single render pass
} else {
  await loadScenario('scenarios/test.json')
}
```

Rendering is suppressed during replay. The full session history collapses into a single render of the final state.

### Reset

Reset clears the log and reloads. The reload is intentional — cleanest way to guarantee no stale in-memory state:

```js
async function onResetClicked() {
  await log.reset()
  location.reload()
}
```

The reset button lives in UILayer. It dispatches `RESET_COMMAND` (not logged) which `main.js` handles.

### Entity Contract

The engine only requires this much from any entity:

```js
// engine/entity.js
class Entity {
  constructor(definition, state) {
    this.def = definition   // static, from JSON
    this.state = state      // dynamic, updated by events
  }
  // id, type, tile are required on state
  get id() { return this.state.id }
  get type() { return this.state.type }
  get tile() { return this.state.tile }

  // EntityLayer calls this — optional, entities implement if they care
  onHeroArrived(event) {}
  render() {}  // returns DOM element or updates existing one
}
```

State shapes are per entity type — not enforced by the base class beyond the three required fields.

### EntityLayer Dispatch Pattern

One listener, dispatches to entity instances by tile lookup:

```js
// engine/layers/entity.js
class EntityLayer {
  constructor(bus, occupancy) {
    this.entities = new Map()  // id → Entity instance

    bus.addEventListener('HERO_MOVED', (e) => this.onHeroMoved(e.detail))
    bus.addEventListener('HERO_ARRIVED', (e) => {
      const occupant = occupancy.getAt(e.detail.tile)
      if (occupant) occupant.onHeroArrived(e.detail)
    })
    bus.addEventListener('MONSTER_DEFEATED', (e) => this.removeEntity(e.detail.monsterId))
    bus.addEventListener('RESOURCE_COLLECTED', (e) => this.removeEntity(e.detail.resourceId))
  }
}
```

EntityLayer contains no game logic. It only manages DOM nodes and dispatches to entities.

### Entity State Shapes (V1)

```js
// hero state
{ id, type, tile, owner, movementPoints }

// monster state
{ id, type, tile, count, side: 'neutral' }

// resource state
{ id, type, tile }

// town state
{ id, type, tile, owner: null }
```

### Game Entity Behavior

Logic lives on entity classes in `/game/entities/`, not in the engine:

```js
// game/entities/monster.js
class Monster extends Entity {
  onHeroArrived(detail) {
    bus.emit('MONSTER_DEFEATED', { monsterId: this.id, name: this.def.name })
    bus.emit('NOTIFICATION_SHOWN', { message: `Defeated ${this.def.name}!` })
  }
}
```

### Command → Event Flow

```
Player clicks tile
  → input.js emits MOVE_COMMAND (not logged)
  → game/systems/movement.js receives MOVE_COMMAND
      validates: enough movement points? path exists? tile passable?
      on success: emits HERO_MOVED for each tile in path (logged)
      then emits HERO_ARRIVED at destination (logged)
  → EntityLayer hears HERO_MOVED, repositions hero DOM element
  → EntityLayer hears HERO_ARRIVED, checks occupancy, dispatches to occupant
  → Occupant (monster/resource/town) emits fact events (logged)
  → UILayer hears NOTIFICATION_SHOWN, displays panel
```

### Cursor System

One DOM element in UILayer that follows the mouse. Cursor type is determined by querying occupancy on mousemove:

```js
// engine/layers/ui.js
mapEl.addEventListener('mousemove', (e) => {
  const tile = screenToTile(e)
  const occupant = occupancy.getAt(tile)
  cursorEl.style.transform = `translate(${e.x}px, ${e.y}px)`
  cursorEl.className = `cursor cursor--${resolveCursorType(tile, occupant)}`
})

function resolveCursorType(tile, occupant) {
  if (!map.isPassable(tile)) return 'blocked'
  if (!occupant) return 'move'
  if (occupant.type === 'MONSTER') return 'attack'
  if (occupant.type === 'TOWN') return 'enter'
  return 'interact'
}
```

Pure CSS handles the actual icon via class.

---

## Events Reference (V1)

| Event | Logged | Emitted by | Heard by |
|---|---|---|---|
| MOVE_COMMAND | no | input.js | movement system |
| END_TURN_COMMAND | no | input.js | turn system |
| RESET_COMMAND | no | UILayer | main.js |
| HERO_MOVED | yes | movement system | EntityLayer |
| HERO_ARRIVED | yes | movement system | EntityLayer |
| MONSTER_DEFEATED | yes | Monster entity | EntityLayer |
| RESOURCE_COLLECTED | yes | Resource entity | EntityLayer |
| TOWN_VISITED | yes | Town entity | — |
| TURN_ENDED | yes | turn system | movement system |
| NOTIFICATION_SHOWN | yes | any entity | UILayer |

---

## Scenario Format

```json
{
  "meta": {
    "name": "Test Map",
    "width": 24,
    "height": 24
  },
  "terrain": [
    [0, 0, 1, 1, 2, ...],
    ...
  ],
  "terrainTypes": {
    "0": "GRASS",
    "1": "DIRT",
    "2": "WATER"
  },
  "entities": [
    { "id": "h1", "type": "KNIGHT", "tile": { "x": 2, "y": 2 }, "owner": "player1" },
    { "id": "m1", "type": "GRIFFIN", "tile": { "x": 8, "y": 5 }, "count": 5 },
    { "id": "m2", "type": "WOLF", "tile": { "x": 12, "y": 3 }, "count": 10 },
    { "id": "r1", "type": "GOLD", "tile": { "x": 5, "y": 7 } },
    { "id": "r2", "type": "WOOD", "tile": { "x": 14, "y": 9 } },
    { "id": "t1", "type": "CASTLE", "tile": { "x": 18, "y": 4 } }
  ]
}
```

---

## Build Order

Do these strictly in sequence. Each step has a working, testable result before moving on.

### Step 1 — Event infrastructure + persistence
`db.js`, `eventlog.js`, and `GameBus` (inside eventlog.js). No rendering, no game logic yet. Test in console: emit a fact event, verify listener fires via `addEventListener`, verify IndexedDB has the entry, reload the page and verify `hasExistingSession()` returns true. Test reset clears the store. ~80 lines total across both files.

### Step 2 — Map data structure
`map.js`. Tile grid as a 2D array, terrain type lookup, passability check, `tileToScreen` and `screenToTile`. No rendering. Test coordinate round-trips in console.

### Step 3 — Terrain rendering
`TerrainLayer`. Read the map and paint tiles as colored divs. Grass = green, dirt = tan, water = blue, mountain = grey. Just colors, no art. You should see a map on screen.

### Step 4 — Occupancy
`occupancy.js`. A Map of `"x,y" → entityId`. Methods: `setAt(tile, id)`, `getAt(tile)`, `clearAt(tile)`. No rendering. Test in console.

### Step 5 — Entity layer + hero
`EntityLayer` and `entity.js`. Spawn a hero as a colored square at its starting tile from the scenario. Should appear on the map at the right position.

### Step 6 — Input + movement (adjacent only first)
`input.js` captures mouse click → emits `MOVE_COMMAND`. `movement.js` validates and emits `HERO_MOVED`. EntityLayer repositions hero div. No pathfinding yet — only allow adjacent tile moves. First full event flow working end to end.

### Step 7 — Pathfinding
Add A* to `movement.js`. Hero can now click any reachable tile and walk there through a sequence of `HERO_MOVED` events. Test with impassable tiles blocking paths.

### Step 8 — Movement points
Hero state gains `movementPoints`. Movement system deducts per tile (factoring terrain cost). Hero stops when out of points. End turn resets them.

### Step 9 — Spawn all entity types
Add `Monster`, `Resource`, `Town` entity classes. Spawn from scenario JSON. Each renders as a distinct colored square (different colors per type). Occupancy system registers them all.

### Step 10 — Interaction
`HERO_ARRIVED` dispatches to occupant. Monster and Resource entities implement `onHeroArrived`, emit defeat/collect events. EntityLayer removes their DOM nodes. UILayer shows notifications.

### Step 11 — Visual pass
Replace colored squares with SVG or CSS art. This step is entirely independent of logic and can be done incrementally — replace one entity type at a time. Engine and game don't care what `render()` produces as long as it's a DOM element.

---

## What This Doesn't Block

These features slot in without revisiting core architecture:

- **Combat view** — `COMBAT_INITIATED` event, UILayer opens a new scene layer on top. CombatSystem is a new file in `/game/systems/`.
- **Town screen** — same pattern as combat, different scene.
- **Fog of war** — TerrainLayer listens for `FOG_REVEALED` events, reveals tiles. OccupancySystem already knows positions.
- **Spell system** — spells are items in hero state's spellbook list. Resolution is CombatSystem's problem.
- **Artifact system** — inventory list on hero state. Effects applied at resolution time by relevant systems.
- **Multiple heroes** — EntityLayer already manages a Map of all entities. Movement system accepts any heroId.
- **AI opponent** — reads game state, emits commands through the same command interface as the player.
- **Multiplayer** — commands routed through a server before validation. Event log synced across clients. All clients apply same events, arrive at identical state.
- **Portfolio mode** — different scenario JSON, different entity definitions, different interaction handlers in place of `/game`. Engine untouched.
- **Replay** — feed event log back into the system. Renderer consumes state snapshots, not raw events, so replay speed is controllable.
