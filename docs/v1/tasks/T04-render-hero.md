# T04 — Render the hero + initial camera center

## Goal (shipable milestone)

The hero renders at its scenario tile, and on load the camera centers on the hero.

## Depends on

- `docs/v1/tasks/T03-camera.md`

## Scope

- Implement `engine/layers/entity-layer.js` to render entities into `.entity-layer`.
- Implement minimal hero rendering (simple DOM element is fine).
- Add an occupancy index so later movement + interactions can query what is on a tile.
- Wire camera follow to the hero:
  - set the camera follow getter to return the hero’s current tile
  - on initial boot, center on the hero (pan offset starts at zero)

## Out of scope

- Hero movement
- Interactions

## Files to create / modify

- `engine/occupancy.js`
- `engine/layers/entity-layer.js`
- `main.js`

## Implementation notes (V1 constraints)

- V1 has **no hero types**. Treat the hero as one definition (e.g. `game/data/hero.json`) with one placement in the scenario.
- Occupancy key format must be stable (recommend `${x},${y}`).

## Acceptance

1. Load the app.
2. You can see the hero on top of the map.
3. The camera starts centered (or near-centered) on the hero tile.
4. Arrow keys / edge scroll pan the camera even while hero-follow is enabled (pan offset behavior).
