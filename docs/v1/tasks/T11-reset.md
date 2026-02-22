# T11 — Reset session (clear event log + reload)

## Goal (shipable milestone)

Clicking “Reset” clears the persisted session and starts fresh from the base scenario.

## Depends on

- `docs/v1/tasks/T10-persistence.md`

## Scope

- Add a Reset UI control.
- Implement `EventLog.reset()` that clears the IndexedDB store.
- Reload the page after reset to guarantee clean in-memory state.

## Out of scope

- Multiple sessions / save slots

## Files to create / modify

- `engine/eventlog.js`
- `engine/layers/ui-layer.js` (or wherever V1 UI buttons live)
- `main.js`

## Acceptance

1. Make changes (move hero, defeat monster, collect resource).
2. Click Reset.
3. App reloads into the initial scenario state (entities restored, hero reset).
