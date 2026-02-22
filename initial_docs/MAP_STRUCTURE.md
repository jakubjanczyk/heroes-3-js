# Map Structure
## Data Format & Editor-Ready Design

---

## Core Principle

A map is several independent layers of data stacked on top of each other. Terrain is one thing. Objects placed on terrain are another. Entity starting positions are another. Metadata is another.

If these are conflated into one structure, an editor cannot edit them independently. If they are separate layers from the start, the editor gets separate tools for each layer for free — and they never step on each other.

```
map
 ├── meta          ← name, size, description, win/loss conditions
 ├── terrain       ← tile type at every x,y position
 ├── objects       ← decorative and interactive objects placed on tiles
 ├── entities      ← starting positions and definitions of all entities
 └── zones         ← named regions, patrol areas, trigger areas
```

---

## Terrain Layer

The simplest possible representation. A flat array of tile type IDs, read as a 2D grid by index math. No nesting, no objects — just integers.

```json
{
  "width": 24,
  "height": 24,
  "tiles": [0, 0, 0, 1, 1, 2, 2, 0, 0, ...]
}
```

```js
function getTile(x, y) {
  return terrain.tiles[y * terrain.width + x]
}
```

Flat array is cache-friendly, trivially serializable, and easy for an editor to manipulate. Painting terrain is writing values into the array. Flood fill is a graph traversal over the same array.

Tile type IDs reference a separate terrain definition file — not embedded in the map. Map files contain only the minimal data needed to describe the world. Visual and gameplay properties of terrain types live in definitions.

```json
// game/data/terrain.json
{
  "0": { "type": "GRASS",    "name": "Grass",    "passable": true,  "movementCost": 1.0 },
  "1": { "type": "DIRT",     "name": "Dirt",     "passable": true,  "movementCost": 1.0 },
  "2": { "type": "ROAD",     "name": "Road",     "passable": true,  "movementCost": 0.5 },
  "3": { "type": "WATER",    "name": "Water",    "passable": false, "movementCost": null },
  "4": { "type": "MOUNTAIN", "name": "Mountain", "passable": false, "movementCost": null },
  "5": { "type": "SAND",     "name": "Sand",     "passable": true,  "movementCost": 1.5 },
  "6": { "type": "SNOW",     "name": "Snow",     "passable": true,  "movementCost": 1.5 },
  "7": { "type": "SWAMP",    "name": "Swamp",    "passable": true,  "movementCost": 2.0 }
}
```

Editor paint palette reads this file to populate available terrain types. Adding a new terrain type means adding to this file — no map format changes needed.

---

## Objects Layer

Objects are things placed on the map that are not entities — trees, rocks, ruins, signposts, decorative buildings, treasure chests. They have a position, a type, and optionally type-specific properties.

```json
{
  "objects": [
    { "id": "obj_01", "type": "OAK_TREE",  "tile": { "x": 5,  "y": 3 } },
    { "id": "obj_02", "type": "PINE_TREE", "tile": { "x": 6,  "y": 3 } },
    { "id": "obj_03", "type": "SIGNPOST",  "tile": { "x": 8,  "y": 6 }, "text": "Danger ahead" },
    { "id": "obj_04", "type": "RUINS",     "tile": { "x": 12, "y": 9 }, "loot": { "GOLD": 500 } },
    { "id": "obj_05", "type": "ROCK",      "tile": { "x": 3,  "y": 11 } }
  ]
}
```

The distinction between decorative objects (tree, rock) and interactive objects (signpost, ruins) lives in the object type definition, not in the map data. The editor places them identically. The game loader checks the definition to decide if interaction is possible.

Object definitions:

```json
// game/data/objects.json
{
  "OAK_TREE":  { "type": "OAK_TREE",  "name": "Oak Tree",  "passable": false, "interactive": false },
  "PINE_TREE": { "type": "PINE_TREE", "name": "Pine Tree", "passable": false, "interactive": false },
  "ROCK":      { "type": "ROCK",      "name": "Rock",      "passable": false, "interactive": false },
  "SIGNPOST":  { "type": "SIGNPOST",  "name": "Signpost",  "passable": true,  "interactive": true  },
  "RUINS":     { "type": "RUINS",     "name": "Ruins",     "passable": true,  "interactive": true,
                 "properties": ["loot"] }
}
```

---

## Entities Layer

Starting positions for all entities that exist at scenario start. Separate from the objects layer because entities are dynamic — they move, disappear, and change state during play. Objects are mostly static.

```json
{
  "entities": [
    {
      "id": "h1",
      "type": "KNIGHT",
      "tile": { "x": 2, "y": 2 },
      "owner": "player1",
      "army": [
        { "type": "PIKEMAN", "count": 20 },
        { "type": "ARCHER",  "count": 8 }
      ]
    },
    {
      "id": "h2",
      "type": "NECROMANCER",
      "tile": { "x": 20, "y": 20 },
      "owner": "player2",
      "army": [
        { "type": "SKELETON", "count": 30 }
      ]
    },
    {
      "id": "m1",
      "type": "GRIFFIN",
      "tile": { "x": 10, "y": 8 },
      "count": 7,
      "side": "neutral"
    },
    {
      "id": "m2",
      "type": "WOLF",
      "tile": { "x": 14, "y": 5 },
      "count": 15,
      "side": "neutral"
    },
    {
      "id": "r1",
      "type": "GOLD",
      "tile": { "x": 6, "y": 6 }
    },
    {
      "id": "r2",
      "type": "WOOD",
      "tile": { "x": 9, "y": 12 }
    },
    {
      "id": "t1",
      "type": "CASTLE",
      "tile": { "x": 18, "y": 4 },
      "owner": null,
      "buildings": []
    },
    {
      "id": "mine1",
      "type": "GOLD_MINE",
      "tile": { "x": 7, "y": 15 },
      "owner": null
    }
  ]
}
```

---

## Zones Layer

Named regions of the map. Not needed for V1 but present as an empty array so the format is stable and parsers don't need version checks for this field.

Zones enable:
- Patrol areas for neutral creatures (creature wanders within zone)
- Trigger regions (entering fires a script event)
- Restricted areas (faction-locked zones)
- Editor-named regions for readability during map design

```json
{
  "zones": [
    {
      "id": "z1",
      "name": "Starting Area",
      "type": "safe",
      "tiles": [
        { "x": 0, "y": 0 }, { "x": 1, "y": 0 }, { "x": 2, "y": 0 }
      ]
    },
    {
      "id": "z2",
      "name": "Dragon Lair",
      "type": "patrol",
      "entityId": "m3",
      "tiles": [
        { "x": 15, "y": 15 }, { "x": 16, "y": 15 }, { "x": 15, "y": 16 }
      ]
    }
  ]
}
```

---

## Complete Map File

```json
{
  "meta": {
    "id": "map_test_001",
    "name": "The First Journey",
    "description": "A small map for early development and testing.",
    "width": 24,
    "height": 24,
    "version": 1,
    "created": "2025-01-01",
    "players": 2,
    "winConditions": [
      { "type": "CAPTURE_TOWN", "townId": "t1" }
    ],
    "lossConditions": [
      { "type": "LOSE_ALL_HEROES" }
    ]
  },
  "terrain": {
    "width": 24,
    "height": 24,
    "tiles": [0, 0, 0, 1, 1, 3, 3, 0, 0, 1, ...]
  },
  "objects": [
    { "id": "obj_01", "type": "OAK_TREE",  "tile": { "x": 5, "y": 3 } },
    { "id": "obj_02", "type": "SIGNPOST",  "tile": { "x": 8, "y": 6 }, "text": "Beware the griffins" }
  ],
  "entities": [
    { "id": "h1",    "type": "KNIGHT",    "tile": { "x": 2,  "y": 2  }, "owner": "player1" },
    { "id": "m1",    "type": "GRIFFIN",   "tile": { "x": 10, "y": 8  }, "count": 7 },
    { "id": "r1",    "type": "GOLD",      "tile": { "x": 6,  "y": 6  } },
    { "id": "t1",    "type": "CASTLE",    "tile": { "x": 18, "y": 4  }, "owner": null },
    { "id": "mine1", "type": "GOLD_MINE", "tile": { "x": 7,  "y": 15 }, "owner": null }
  ],
  "zones": []
}
```

---

## Passability Resolution

Passability is not a property of terrain alone. It is resolved by combining terrain passability and object passability at load time. This gives map designers flexibility — a forest tile is passable, a tree object placed on it makes it impassable. A road tile with a decorative statue remains passable.

```js
// engine/map.js
function isPassable(tile) {
  const terrainType = getTerrain(tile)
  const terrainDef = terrainDefinitions[terrainType]
  if (!terrainDef.passable) return false

  const object = getObject(tile)
  if (object) {
    const objectDef = objectDefinitions[object.type]
    if (!objectDef.passable) return false
  }

  return true
}
```

The editor shows a passability overlay toggled by a keyboard shortcut so map designers can see at a glance what is actually walkable. Impassable tiles shown in red tint, passable in green, regardless of what they look like visually.

---

## Versioning

The `version` field in meta is the map format version, not the game version. It starts at 1. When the format changes in a breaking way, the loader detects the old version and runs a migration function before parsing.

```js
// engine/map.js
function loadMap(json) {
  const version = json.meta?.version ?? 1
  const migrated = migrateMap(json, version, CURRENT_VERSION)
  return parseMap(migrated)
}

function migrateMap(json, from, to) {
  if (from === to) return json
  // apply migrations in sequence
  if (from < 2) json = migrateV1toV2(json)
  if (from < 3) json = migrateV2toV3(json)
  return json
}
```

This means old map files always load correctly without manual conversion. The editor can also open old maps, migrate them on load, and save in the current format.

---

## Editor Implications

The layer structure maps directly onto editor tools. Each tool operates on exactly one layer.

**Terrain tool** — paint mode, flood fill mode. Reads terrain definitions to populate palette. Writes integer values into `terrain.tiles`. Shows tile type names on hover.

**Object tool** — place mode, select/edit mode, delete mode. Reads object definitions to populate palette. Writes and removes entries from `objects`. Clicking a placed object opens a property panel for editable fields (signpost text, ruins loot etc).

**Entity tool** — spawn mode, select/edit mode, delete mode. Reads entity definitions to populate palette. Writes and removes entries from `entities`. Clicking a placed entity opens a property panel (creature count, starting army, owner).

**Zone tool** — draw mode, select/edit mode. Tile selection by click or drag. Writes tile lists into `zones`. Each zone has a name, type, and optional linked entity.

**Overlay toggles** (visible in any tool mode):
- Passability — red/green tint per tile
- Grid — tile boundary lines
- Object bounds — outlines around placed objects
- Zone regions — colored overlays per zone

The editor saves the same JSON format the game loads. No compile step, no export step. Open in editor, save, reload game — same file, identical result.

---

## Files

```
/engine
  map.js              ← loadMap, getTile, getObject, isPassable, migrateMap

/game
  data/
    terrain.json      ← terrain type definitions
    objects.json      ← object type definitions

/scenarios
  test.json           ← V1 hand-crafted test map

/editor               ← future, not V1
  index.html
  tools/
    terrain.js
    objects.js
    entities.js
    zones.js
  preview.js          ← live map preview using the actual engine renderer
```

The editor's preview panel uses the actual engine renderer — not a separate implementation. What the editor shows is exactly what the game shows. This is possible because the renderer is a pure engine concern that accepts map data and draws it, with no game logic dependencies.
