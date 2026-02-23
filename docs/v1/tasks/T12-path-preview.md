# T12 — Two-click path preview UX (post-spec improvement)

## Goal

Add a Heroes-style movement preview:

- first click previews path (dashes + target marker)
- second click on same tile confirms movement
- clicking a different tile updates preview

## Depends on

- `docs/v1/tasks/T05-move-hero.md`

## Scope

- Render SVG path preview and target marker in `.effects-layer`.
- Introduce click state machine for preview/confirm flow.
- Keep preview synchronized with movement progress (trim reached segments).

## Out of scope

- Movement points / turn rules
- Persistence
- New gameplay rules

## Files to create / modify

- `engine/layers/path-preview-layer.js`
- `engine/layers/path-preview-layer.css`
- `styles.css`
- `main.js`
- tests for preview renderer and click-state flow

## Acceptance

1. First click on reachable tile draws dashed path and target marker.
2. Second click on same tile starts movement.
3. Click different tile before movement: preview retargets.
4. During movement, traversed preview segments disappear.
5. Preview clears at movement end.
