# T06 — Movement points (15) + end turn reset

## Goal (shipable milestone)

The hero has movement points per turn:

- Starts each turn with **15** movement points.
- Moving consumes 1 point per step.
- If the path would exceed remaining points, the hero moves as far as possible this turn and stops at the movement limit (partial move).
- Clicking “End turn” resets movement points to 15.

## Depends on

- `docs/v1/tasks/T05-move-hero.md`

## Scope

- Track hero movement points in state.
- Validate `MOVE_COMMAND` against remaining movement points.
- Add a UI control in `.ui-layer` for “End turn”.
- End turn while moving (V1 rule):
  - if the hero is mid-walk, ignore the end turn input until movement completes

## Out of scope

- Persistence
- Multiple heroes

## Files to create / modify

- `game/systems/turn-system.js`
- `game/systems/movement-system.js`
- `engine/layers/ui-layer.js` (or implement UI in `main.js` if you prefer; keep it isolated)
- `main.js`

## Acceptance

1. Move the hero along a longer path than remaining points; the hero stops at the movement limit.
2. Click “End turn”; points reset; movement works again.
