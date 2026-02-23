# Implement V1 (shipable milestones)

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan must be maintained in accordance with `PLANS.md` at repository root.

## Purpose / Big Picture

After implementing this plan, a developer can start a local server, open the app in latest Chrome, and play a minimal V1 loop:

- a map renders from `scenarios/scenario.json`
- a hero is visible, click-to-move works with pathfinding around blocked tiles
- movement points are enforced (15 per turn) and reset on end turn
- stepping onto a monster/resource/town triggers the correct interaction (remove/remove/persist) with an ephemeral notification
- the session persists across reloads by replaying an IndexedDB-backed event log (silent replay; notifications do not replay)
- reset clears the persisted session

Milestones must be shipable slices (map renders, hero renders, hero moves, etc.), not internal “build the engine” phases. The architectural constraints are defined up-front so we can add features incrementally without rewrites.

## Progress

- [x] (2026-02-22) Create project skeleton (`index.html`, `main.js`) and serve locally.
- [x] (2026-02-23) Render map from `scenarios/scenario.json` (binary passable/blocked terrain).
- [ ] Add camera (follow hero + arrow keys + edge scroll).
- [ ] Render hero from scenario placement.
- [ ] Implement click-to-move with 8-direction BFS and no diagonal corner-cutting.
- [ ] Enforce movement points (15), end turn resets points.
- [ ] Add monsters/resources/towns rendering.
- [ ] Add interactions + ephemeral notifications (not logged).
- [ ] Add event log persistence in IndexedDB + silent replay on reload.
- [ ] Add reset (clear log + reload).
- [ ] Validate “engine has no imports from game”.

## Surprises & Discoveries

- (none yet)

## Decision Log

- Decision: V1 terrain is binary passable/blocked; no named terrain types; no roads.
  Rationale: Explicit scope decision to keep V1 minimal and avoid movement-cost/path-cost complexity.
  Date/Author: 2026-02-22 / user

- Decision: V1 has no hero types; a single hero definition exists.
  Rationale: Scope reduction; still preserves architecture for future content expansion.
  Date/Author: 2026-02-22 / user

- Decision: Movement is 8-directional; diagonal corner-cutting is disallowed.
  Rationale: Matches intended feel while avoiding “slip through corners”.
  Date/Author: 2026-02-22 / user

- Decision: Camera includes follow + arrow keys + edge scroll.
  Rationale: Needed to support maps larger than the viewport in a HoMM-style experience.
  Date/Author: 2026-02-22 / user

- Decision: Notifications are ephemeral UI only; not logged; silent replay on reload.
  Rationale: Avoid persisting temporary UI and keep event log as world facts.
  Date/Author: 2026-02-22 / user

## Outcomes & Retrospective

- (not started)

## Context and Orientation

Repository starting state (before implementation):

- `initial_docs/` contains reference docs that inspired the architecture.
- `docs/v1/SPEC.md` defines the V1 behavior and constraints (derived from `initial_docs/SPEC.md` plus explicit scope decisions).
- No runtime code exists yet; V1 implementation will add `index.html`, `main.js`, and the `engine/` + `game/` modules described below.

Terminology used in this plan:

- “Command”: a UI intent event (click-to-move, end turn). Commands are not persisted.
- “Fact event”: a state-changing truth (hero moved, monster defeated). Fact events are persisted in an append-only log.
- “Event sourcing”: reconstruct state by replaying fact events from the beginning.
- “Silent replay”: apply events to reconstruct state without dispatching UI notifications or step animations; then render the final state once.

Architectural boundary:

- `engine/` contains infrastructure only and must not import from `game/`.
- `game/` contains the V1 experience rules and may import from `engine/`.

## Plan of Work

Implement V1 via shipable milestones. Each milestone should result in a runnable app that demonstrates a visible behavior.

Use the task list in `docs/v1/tasks/TRACKER.md` and the corresponding task documents in `docs/v1/tasks/` as the concrete work units. Keep the code small and direct; avoid adding features not listed in `docs/v1/SPEC.md`.

The codebase shape to converge on:

    index.html
    main.js
    scenarios/scenario.json
    engine/
      bus.js
      db.js
      eventlog.js
      map.js
      camera.js
      occupancy.js
      pathfinding.js
      renderer.js
      layers/
        terrain-layer.js
        entity-layer.js
        ui-layer.js
    game/
      load.js
      data/
        hero.json
        monsters.json
        resources.json
        towns.json
      systems/
        movement-system.js
        interaction-system.js
        turn-system.js
      ui/
        notifications.js

Notes:

- Keep rendering DOM-based (no canvas). Use `transform: translate(...)` for positioning.
- Keep pathfinding BFS-based (shortest path by steps). 8-direction neighbors; no diagonal corner cutting.
- Event log persistence lands once interactions exist, but ensure the event model is used consistently so retrofitting persistence does not require a rewrite.

## Concrete Steps

All commands below are run from the repository root.

1. Start a static file server.

   Use Node:

       node scripts/static-server.mjs 8080

2. Open the app in Chrome:

   - navigate to `http://localhost:8080/`

3. For each milestone:

   - verify the visible behavior described in the corresponding task doc
   - keep the milestone runnable before continuing to the next

## Validation and Acceptance

V1 is accepted when all success criteria in `docs/v1/SPEC.md` are demonstrably true by manual play:

- map renders from file
- hero click-to-move works with 8-dir pathfinding and no corner-cutting
- movement points (15) enforced + end turn resets
- interactions work (monster/resource removed, town persists) with ephemeral notifications
- reload persists state via event log replay (silent replay)
- reset clears the session

## Idempotence and Recovery

- Re-running the server and reloading the page should never require rebuilding.
- If IndexedDB state becomes inconsistent during development, use the Reset action to clear the event log and reload.
- If a milestone breaks the app, revert to the last milestone where the acceptance behavior was observable and re-apply changes in smaller increments.

## Artifacts and Notes

- Task tracker: `docs/v1/tasks/TRACKER.md`
- Tasks: `docs/v1/tasks/`
- V1 spec: `docs/v1/SPEC.md`
- Source reference: `initial_docs/SPEC.md`
- Static server: `scripts/static-server.mjs`

## Interfaces and Dependencies

External dependencies:

- None (no frameworks, no bundler, no runtime libraries).

Browser assumptions:

- Latest Chrome only.

### Concrete event + bus contracts (to prevent divergence)

Event entries (persisted facts) must have a stable shape so replay is deterministic and future changes can be versioned:

- Persisted entry shape (stored in IndexedDB):
  - `id: number` (auto-increment primary key assigned by IndexedDB)
  - `v: 1` (schema version for the entry)
  - `type: string` (event type)
  - `detail: object` (event payload; must be JSON-serializable)
  - `at: number` (milliseconds since epoch)

Bus contract:

- `bus.emit(type, detail, options?)`
  - `type` is a string
  - `detail` is a plain object (serializable)
  - `options.log` defaults to `true`
  - if `options.log === true`, the event is recorded to the `EventLog` before dispatch
- Commands must always be emitted with `{ log: false }`.
- The bus must support “silent replay”:
  - when `bus.silent === true`, `bus.emit(...)` still records facts (if `log === true`) but does not dispatch to listeners
  - replay applies events to state directly (or via reducers) and then re-enables dispatch

### V1 command vs fact event list (minimum set)

Commands (not persisted):

- `MOVE_COMMAND { tile: {x, y} }`
- `END_TURN_COMMAND {}`
- `RESET_COMMAND {}`

Facts (persisted):

- `HERO_MOVED { from: {x, y}, to: {x, y} }` (one per step)
- `HERO_MOVEMENT_POINTS_SET { value: number }`
- `TURN_ENDED { turnNumber: number }`
- `MONSTER_DEFEATED { entityId: string }`
- `RESOURCE_COLLECTED { entityId: string }`
- `TOWN_VISITED { entityId: string }`

Notes:

- Notifications are derived UI and must not be persisted.
- Persisted facts must be sufficient to reconstruct: hero tile, removed entities, current turn number, remaining movement points.

### Key module interfaces (must exist by end of V1)

- `engine/map.js` exports:
  - `tileToScreen(tile)`
  - `screenToTile(screenPoint)`
  - `inBounds(tile)`
  - `isPassable(tile)`

- `engine/bus.js` exports a bus with:
  - `emit(type, detail, options?)` (supports “logged vs not logged”)
  - `addEventListener(type, handler)` / `removeEventListener(...)`
  - a `silent` mode for replay

- `engine/eventlog.js` provides:
  - `init()`, `record(factEvent)`, `getAll()`, `reset()`, `hasExistingSession()`

- `game/systems/movement-system.js` handles `MOVE_COMMAND` and emits `HERO_MOVED` facts step-by-step when valid.

- `game/systems/interaction-system.js` handles arrival interactions and emits domain facts (`MONSTER_DEFEATED`, `RESOURCE_COLLECTED`, `TOWN_VISITED`) plus ephemeral UI.
