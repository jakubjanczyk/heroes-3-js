# T10 — Persist session across reload (IndexedDB event log, silent replay)

## Goal (shipable milestone)

After moving the hero and interacting with entities:

- reloading the page restores the same final state (hero position, removed monsters/resources, town still present)
- replay is silent: notifications do not replay

## Depends on

- `docs/v1/tasks/T09-towns.md`

## Scope

- Introduce an append-only event log persisted in IndexedDB.
- Ensure state is reconstructable from scenario + replayed events.
- Ensure only *facts* are logged; notifications are not logged.
- Implement silent replay (apply events without firing UI listeners/animations).

## Out of scope

- Multiple save slots
- Replay UI

## Files to create / modify

- `engine/db.js`
- `engine/eventlog.js`
- `engine/bus.js`
- `main.js`

## Implementation notes (critical constraints)

- Commands are not logged.
- Facts are logged.
- On boot:
  - load scenario + definitions
  - load event log from IndexedDB
  - apply events to reconstruct state
  - render once to the final state

## Acceptance

1. Load app, move hero, defeat a monster, collect a resource.
2. Reload page: hero remains at last location; defeated/collected entities remain gone.
3. No notification spam occurs during reload.
