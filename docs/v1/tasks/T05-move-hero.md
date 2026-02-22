# T05 — Click-to-move hero (8-dir BFS, no corner cutting)

## Goal (shipable milestone)

Clicking a destination tile moves the hero there step-by-step, routing around blocked tiles.

Constraints:

- 8-direction movement.
- Path is shortest by number of steps (no movement-cost optimization).
- Diagonal corner-cutting is disallowed.

## Depends on

- `docs/v1/tasks/T04-render-hero.md`

## Scope

- Implement `engine/pathfinding.js` (BFS):
  - inputs: `fromTile`, `toTile`, `isPassable(tile)`, `isBlocked(tile)` (occupancy)
  - output: array of tiles from start to destination inclusive, or `null`
- Implement click handling:
  - convert mouse click to a tile via `screenToTile`
  - validate tile is in bounds and passable
  - compute path and ignore click if no path
- Input while moving (V1 rule):
  - if the hero is mid-walk, ignore additional clicks until the movement completes
- Implement step-by-step movement animation:
  - state updates happen per step
  - hero DOM position updates per step
  - use a small delay per step to create walking feel
- Ensure camera follow remains correct while the hero moves:
  - if the camera follow getter returns the hero tile, the camera should naturally track movement
  - do not disable manual panning; it remains an offset on top of follow

## Out of scope

- Movement points limit
- End turn
- Monsters/resources/towns
- Persistence

## Files to create / modify

- `engine/pathfinding.js`
- `engine/input.js` (tile click command)
- `game/systems/movement-system.js`
- `main.js`

## Implementation notes (no assumptions)

- Implement “no corner cutting” as:
  - for diagonal neighbor `(x+dx, y+dy)`, require both `(x+dx, y)` and `(x, y+dy)` to be passable.
- During movement, update occupancy so the hero’s current tile is always correct.

## Acceptance

1. Click a reachable passable tile: hero walks there step-by-step.
2. Click a blocked tile: hero does not move.
3. Place blocked tiles in the scenario to form obstacles: hero routes around them.
4. Arrange two blocked orthogonal tiles around a diagonal: hero does not take the diagonal “corner cut”.
5. Click repeatedly while the hero is mid-walk: the current move is not interrupted (new input is ignored).
