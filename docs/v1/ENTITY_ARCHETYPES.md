# Entity Archetypes and Content Types

This document describes the future-facing architecture for map entities and interactions.

The main goal is to avoid scattered `if (entity.kind === ...)` logic across systems and UI.
Instead, entity-specific rules live behind registries, while the engine stays generic.

## Layering and boundaries

The repo is intentionally split into three layers:

- `engine/` (infrastructure): generic rendering, input, camera, pathfinding, occupancy.
- `game/` (domain): gameplay rules, entity behaviors, systems, world-state.
- `app/` (runtime): bus-first modules, UI/presentation, translating outcomes to UX.

Hard boundaries (enforced by `tests/architecture/boundaries.test.js`):

- `engine/` must never import `game/` or `app/`.
- `game/` must never import `app/`.
- `app/modules/*` runtime modules must not import each other directly (only `app/modules/shared/*`).

## Entity model: `kind` vs `type`

Entities are plain JSON records.

- `kind` = interaction archetype (rules + UX shape).
- `type` = content variation within an archetype (data-driven definitions).

Example:

```js
{
  id: 'monster-1',
  kind: 'MONSTER',
  type: 'SKELETON',
  tile: { x: 10, y: 8 }
}
```

Definitions are keyed by `type` under a per-archetype namespace (today: `definitions.monsters`,
`definitions.resources`, `definitions.towns`, etc).

Rule of thumb:

- Prefer adding new `type`s before adding new `kind`s.
- Add a new `kind` only when the interaction rules/UX are genuinely different (HoMM3-style:
  many content types, few interaction archetypes).

## Domain rules live in `game/domain/entity-behaviors/*`

Archetype rules are expressed as behavior modules and discovered through a registry.

Key entry points:

- `game/domain/entity-behaviors/registry.js`
  - `getArrivalInteraction(entity)` -> archetype-specific arrival interaction contract.
- `game/domain/entity-behaviors/*.js`
  - one module per archetype (e.g. monster/resource/town).

Core value objects used by domain services live in `game/domain/value-objects/*`
(`tile`, `entity-id`, `movement-points`) so validation/normalization rules stay centralized.

Arrival interaction contract (shape):

- `movementInteractionKind` (string): what movement should report when it triggers this interaction
- `requiresSteppingIntoTarget` (boolean): whether the hero steps into the target tile before stopping
- `resolveArrivalOutcome({ entity, definitions, tile })` -> outcome payload

Why this is important:

- `game/systems/*` can stay generic and ask the registry for behavior.
- Adding a new archetype is done by adding a new behavior module + registering it.

### Movement and interactions

- `game/domain/movement/arrival-plan.js`
  - inspects destination occupancy + archetype behavior (`getArrivalInteraction`) and returns
    a movement `arrivalPlan` (`entityId`, `movementInteractionKind`, `stopBeforeTarget`).
- `game/systems/movement-system.js`
  - executes steps only; it does not query archetype behavior directly.
  - consumes the precomputed `arrivalPlan` and emits `fact.move.finished` with
    `interaction.kind = movementInteractionKind` when triggered.
- `game/systems/interaction-system.js`
  - resolves an arrival outcome for a destination tile.
  - takes `arrivingEntityId` so it can ignore the moving entity (no special-case "HERO" checks).

## App: translating outcomes into UX (without kind switches)

The app runtime should not need to know about every archetype in-line.

- `app/modules/interaction.module.js` listens for `fact.move.finished`, asks the domain interaction
  system for an `outcome`, then delegates to a handler registry and owns all event emission.
- `app/modules/shared/interaction-outcomes.js` maps `outcome.kind` to declarative effect plans:
  - pre-events to emit immediately
  - optional fade-out request
  - finalize method name for the domain interaction system
  - post-events emitted only when finalization succeeds
  - optional `pendingModalOutcome` for modal close flows

Fade-outs are requested by `ui.entity.fadeOut.requested`, and applied by views based on presentation
metadata rather than `if (kind === ...)`.

## Rendering: engine stays generic, app owns presentation

The engine entity layer does not know about HERO/MONSTER/RESOURCE/TOWN.

- `engine/layers/entity-layer.js` renders entities using an injected style resolver:
  - `getEntityStyle({ entity, map }) -> { className, width, height, offsetX, offsetY, ... }`
- `app/presentation/entities/registry.js` maps `entity.kind` to:
  - entity-layer style
  - optional fade-out behavior metadata
- `app/presentation/entity-style.js` is the default style provider used by runtime modules.

This keeps all visuals (sprite selection, sizes, CSS class conventions) in the app layer.

## World construction: one place to assemble derived entities

World assembly is centralized in:

- `game/build-world.js`

Responsibilities:

- build `map`
- create derived occupancy-only entities (e.g. town footprint blockers)
- build `occupancy`
- create `worldState`

Rule of thumb:

- Derived entities (like `TOWN_BLOCKER`) are domain/infra helpers; they should not leak into UI
  logic unless we explicitly decide to render them.

## Playbook: adding a new archetype (e.g. MINE or TREASURE_CHEST)

1. Pick a new `kind` (archetype) and decide the definitions namespace key.
2. Add domain behavior:
   - create `game/domain/entity-behaviors/<kind>.js` implementing the arrival interaction contract
   - register it in `game/domain/entity-behaviors/registry.js`
3. Load definitions (if needed): extend `game/load.js` to load a new `game/data/*.json` file.
4. Add presentation:
   - `app/presentation/entities/<kind>.js`
   - register it in `app/presentation/entities/registry.js`
5. Add/extend outcome handling:
   - add a handler entry in `app/modules/shared/interaction-outcomes.js` for the new `outcome.kind`
   - return an effect plan (pre-events / optional fade-out / finalize method / post-events)
   - decide: modal vs non-modal flow (`pendingModalOutcome` for modal close finalization)
6. Add tests:
   - unit tests for behavior outcome shape (`game/domain/entity-behaviors.test.js` patterns)
   - unit tests for module behavior if new bus flow is introduced
   - behavior tests under `tests/behavior/` for the user-visible scenario

If you find yourself adding a `switch (kind)` in a system/module, it usually means the behavior
belongs in:

- `game/domain/entity-behaviors/*` (domain rules), or
- `app/presentation/entities/*` (visuals / CSS hooks), or
- `app/modules/shared/*` registries (runtime outcome dispatch).
