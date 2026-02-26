# V1 Specification (Docs-First)
## HoMM3-Inspired Browser Game Engine — Proof of Concept

This document defines the **V1** scope only.

Source of truth: `initial_docs/SPEC.md`. This V1 spec intentionally **narrows** some content details (no extra features are added beyond the source), based on explicit project decisions made on **2026-02-22**.

---

## Purpose

V1 proves the core loop works in the browser:

- A tile map renders from a data file (not hardcoded).
- A hero moves by click-to-move, step-by-step, routing around blocked tiles.
- The hero has movement points per turn, and an end-turn button resets them.
- The hero can interact with monsters, resources, and towns.
- The session persists across page reloads via an event log.
- A reset action clears the session and starts fresh.

V1 is not a “game release”. It is an architectural proof under real conditions.

---

## Player Experience (V1)

1. The player sees a tile-based map in the browser and a hero on the map.
2. The player clicks a destination tile; the hero walks there step-by-step.
3. The hero cannot move through blocked tiles and will route around them.
4. The hero has **15 movement points** per turn.
5. Moving consumes **1 movement point per step**. If a confirmed route is longer than remaining movement points, the hero walks as far as possible this turn and stops at the movement limit (partial move).
6. When the hero reaches:
   - a **monster**: the monster is defeated and disappears; a temporary notification appears.
   - a **resource**: the resource is collected and disappears; a temporary notification appears.
   - a **town**: a temporary notification appears; the town remains.
7. The session survives a page reload (state is reconstructed from the event log).
8. The player can reset to clear the session.

Notifications are **ephemeral UI only** (not persisted and not replayed).

---

## World Content (V1)

### Terrain (V1)

V1 uses a minimal terrain model:

- The map is a grid with **passable** and **blocked** tiles only.
- There are **no named terrain types** (no grass/dirt/road system yet).
- There are **no roads** in V1.
- Movement cost is **1 movement point per step**.

### Entities (V1)

V1 supports these entity kinds:

- `HERO` (player-controlled; exactly one hero on the map)
- `MONSTER` (neutral blocker; removed on interaction)
- `RESOURCE` (pickup; removed on interaction)
- `TOWN` (permanent; not removed on interaction)

V1 content definitions are intentionally minimal:

- **No hero types** in V1 (one hero definition).
- Monster/resource/town “types” exist only as keys for loading static definitions (names/amounts/etc).

---

## Movement (V1)

- Movement is **8-directional** (orthogonal + diagonal).
- Pathfinding chooses the **shortest path by number of steps** (no optimization for movement cost).
- Diagonal corner-cutting is **disallowed**:
  - a diagonal step is permitted only if both adjacent orthogonal tiles are passable.
- All entity tiles (`MONSTER`, `RESOURCE`, `TOWN`) are treated as **blocked for pathfinding**, except when the entity tile is the chosen destination. This ensures the hero cannot “walk through” entities in V1.
- Interactions resolve only when the hero reaches the **final destination tile** of a move.
- While the hero is mid-walk, new move input and end-turn input are ignored until movement completes (V1 simplification).

---

## Camera (V1)

V1 includes a camera so maps can be larger than the viewport:

- The camera follows the hero (smooth follow is allowed but not required).
- The player can pan the camera using:
  - **arrow keys**, and
  - **edge scrolling** (mouse near viewport edge).

---

## Persistence & Replay (V1)

- The game uses **event sourcing**: state is derived by replaying an append-only log of facts.
- The event log is persisted in **IndexedDB**.
- On page reload:
  - the scenario and definition files load,
  - the event log is replayed to reconstruct derived state,
  - rendering occurs once at the final reconstructed state.
- Replay is **silent**: UI notifications do not replay.

Reset clears the event log store and reloads the page.

### Persisted state scope (V1)

V1 persistence must restore, after reload:

- hero tile position
- which monsters/resources have been removed
- current turn number
- remaining hero movement points for the current turn

---

## Explicit Non-Goals (V1)

V1 deliberately excludes:

- Combat systems or combat view
- Town screen/buildings
- Armies, economy, mines
- Fog of war
- AI opponent
- Multiple heroes
- Multiple save slots / multiple sessions
- Win/loss conditions

---

## Data Contracts (V1)

### Scenario file (V1)

One JSON scenario file (example shape):

- `meta`: `{ id, name, width, height }`
- `terrain`: `{ width, height, tiles }`
  - `tiles` is a flat array of length `width * height`
  - tile value `0` = passable, `1` = blocked
- `entities`: array of placements:
  - `{ id, kind, type, tile: {x,y} }`

Notes:

- `kind` is one of `HERO | MONSTER | RESOURCE | TOWN`.
- `type` is used to look up definitions for non-hero entities.
- The hero’s `type` may be a fixed string (e.g. `"HERO"`) but V1 does not support multiple hero types.

### Definitions (V1)

Static definitions live in separate JSON files under `game/data/`:

- `hero.json` (single hero definition)
- `monsters.json`
- `resources.json`
- `towns.json`

---

## Success Criteria (V1)

- Map renders from a scenario data file, not hardcoded
- Camera pans (arrow keys + edge scroll) and can follow the hero
- Hero click-to-move routes around blocked tiles and moves step-by-step
- 8-direction movement works and diagonal corner-cutting is prevented
- Movement points (15) are enforced (including partial movement when path exceeds remaining MP); end turn resets them
- Monsters/resources disappear after interaction; towns persist
- Session survives page reload by replaying persisted event log (including turn + remaining movement points)
- Reset clears the session
- `engine/` contains no imports from `game/`
