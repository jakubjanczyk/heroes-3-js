# T03 — Camera controls (arrow keys + edge scroll)

## Goal (shipable milestone)

The camera can move so maps larger than the viewport are usable:

- Arrow keys pan the camera.
- Moving the mouse near the viewport edges pans the camera (edge scroll).
- The camera can be centered on a tile (for later hero-follow).

## Depends on

- `docs/v1/tasks/T02-render-map.md`

## Scope

- Implement `engine/camera.js` with:
  - pixel-space offsets (`x`, `y`)
  - `moveBy(dx, dy)` and `moveTo(x, y)`
  - `centerOnTile(tile)`
  - clamping (optional in V1; if added, base it on map bounds)
- Include a follow-capable API even though the hero is not rendered yet:
  - `setFollowTileGetter(() => tile | null)`
  - a “pan offset” that arrow keys / edge scroll adjust
  - the final camera position is `followTarget + panOffset` when a follow target exists
- Implement `engine/input.js` for camera controls:
  - arrow keys pan at a fixed speed
  - edge scroll pans when mouse is within N pixels of viewport edge
- Wire camera into `.world` by applying `transform: translate(...)`.

## Out of scope

- Wiring follow target to the hero (lands in the hero task)
- Click-to-move

## Files to create / modify

- `engine/camera.js`
- `engine/input.js`
- `main.js`

## Implementation notes

- Edge scroll should only activate when the mouse is over the viewport.
- Keep camera updates smooth (can be per-frame or event-driven).
- This task should not introduce any persistence.

## Acceptance

1. Open the app.
2. Press arrow keys: the map pans.
3. Move the mouse near viewport edges: the map pans.
