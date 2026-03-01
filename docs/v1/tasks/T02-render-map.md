# T02 — Render the map (binary passable/blocked)

## Goal (shipable milestone)

The tile map renders in the viewport from `scenarios/scenario.json` using V1 square-grid coordinate mapping.

- Passable tiles are visibly distinct from blocked tiles.
- The map is data-driven (changing scenario data changes the rendered map).

## Depends on

- `docs/v1/tasks/T01-bootstrap.md`

## Scope

- Implement `engine/map.js` coordinate math (`tileToScreen`, `screenToTile`) and basic map helpers (`inBounds`, `isPassable`).
- Implement a simple `engine/layers/terrain-layer.js` that draws one DOM element per tile (V1 maps can be small; no virtualization required yet).
- Ensure the terrain is rendered into the `.terrain-layer` inside `.world`.

## Out of scope

- Camera behavior beyond “world container exists”
- Any entities (hero/monster/resource/town)
- Movement or interactions

## Files to create / modify

- `engine/map.js`
- `engine/renderer.js` (if you need a place to own layers)
- `engine/layers/terrain-layer.js`
- `main.js`
- (optional) `styles.css`

## Implementation notes (V1 constraints)

- Terrain is **binary**: `0` passable, `1` blocked.
- “No terrain types” means:
  - no `terrain.json` type registry yet
  - no movement costs per terrain
- Use CSS transforms for positioning (avoid layout thrash).

## Acceptance

1. Start the server and open the app.
2. You see a rendered square tile grid in the viewport.
3. Editing `scenarios/scenario.json` terrain tile values (0/1) changes what is passable vs blocked visually after reload.
