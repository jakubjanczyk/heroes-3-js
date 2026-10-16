# Terrain Types (2026-10-16)

Roadmap item 1.1. The map now has named terrain types instead of only passable/blocked tiles.

## Tile codes

Scenario `terrain.tiles` values are terrain codes. `0` and `1` keep their V1 meaning, so V1 scenarios load unchanged.

| Code | Terrain | Walkable |
|---|---|---|
| 0 | grass | yes |
| 1 | rock | no |
| 2 | dirt | yes |
| 3 | sand | yes |
| 4 | snow | yes |
| 5 | swamp | yes |
| 6 | rough | yes |
| 7 | subterranean | yes |
| 8 | lava | yes |
| 9 | water | no |

- The table is Heroes content (`game/heroes/terrain-types.js`, passed in as `content.terrainTypes`).
- `engine/map.js` reads passability and the terrain type from the table it is given; without one it keeps the V1 open/blocked behavior.
- Every walkable terrain still costs 1 movement point per step. Terrain movement costs belong to roadmap 4.6.
- Heroes 3 has no desert terrain (sand covers it), so there is no desert code.

## Scenario validation

Loading fails for:

- an unknown terrain code
- an entity on non-walkable terrain
- a building footprint on non-walkable terrain

The demo map's mines that were backed into rock were moved off it.

## Rendering

Each terrain tile gets a `terrain-tile--<name>` class; the Heroes colours are in `game/ui/terrain.css`. The minimap still shows passable/blocked only.

## Tests

- `tests/behavior/behavior.terrain.test.js` covers walking over the new terrains, water blocking movement, and each terrain being drawn in its own colour.
- That colour test loads the real stylesheet through `tests/behavior/app-styles.js`, which flattens `@layer`, nesting and `:root` variables with PostCSS because jsdom does not support them. Colours used by tested elements must be plain values or `:root` variables.
