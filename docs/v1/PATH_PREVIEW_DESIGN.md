# Path Preview Design (Post-Spec UX Improvement)

## Purpose

This document defines a UX improvement on top of V1 movement:

- first click previews the route
- second click on the same tile confirms movement

It is intentionally documented outside `docs/v1/SPEC.md` as a post-spec enhancement.

## UX Contract

### Click behavior

1. Player clicks a destination tile.
2. If a valid path exists, the game shows a visual preview:
   - dashed route along the path
   - target marker (`X`) on the destination tile
3. If the player clicks the same destination tile again, movement starts.
4. If the player clicks a different tile before confirming, preview switches to that new path/target.
5. If no valid path exists, no preview is shown.

### During movement

- As hero movement progresses step-by-step, already-traversed preview segments disappear.
- When movement ends (successfully or not), preview is cleared.
- While movement is running, additional click-to-move input is ignored (existing V1 rule).

## Rendering

- Render preview into `.effects-layer` (inside `.world`) as SVG overlay.
- Use rounded dash styling for route readability.
- Use a distinct target marker (e.g. ring + X lines) at destination.
- Path/tile coordinates must use the same map-origin helpers used by terrain/entity rendering.

## Path Semantics

- Preview path must use the same pathfinding rules as actual movement:
  - 8-direction shortest path by steps
  - no diagonal corner cutting
  - occupancy blocks intermediates

## Non-Goals

- No change to movement points/end-turn behavior.
- No full visual snapshot persistence (only selected preview target restore is supported).
- No combat/resource/town interaction changes.
