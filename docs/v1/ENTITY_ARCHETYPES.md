# Entity Archetypes and Content Types

This document describes the future-facing architecture for map entities and interactions.

The main goal is to avoid scattered `if (entity.kind === ...)` logic across systems and UI.
Instead, entity-specific rules live behind registries, while the engine stays generic.

## Layering and boundaries

The repo is intentionally split into three layers:

- `engine/` (infrastructure): generic rendering, input, camera, pathfinding, occupancy.
- `game/` (domain): gameplay rules, entity behaviors, systems, removed entities, tile occupant lookup.
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

## Domain rules: core lookup, game-specific behaviors

Archetype rules are behavior modules that belong to a game's content. The core never imports them;
the app picks the content at boot and passes it in, so another game can reuse the core with its own kinds.

Key entry points:

- `game/heroes/content.js`
  - `heroesContent.entityBehaviors`: the list of Heroes behaviors (mine, monster, resource, town).
  - chosen as `config.content` in `app/boot-app.js`.
- `game/heroes/entity-behaviors/*.js`
  - one module per archetype, each `{ kind, arrivalInteraction }`.
- `game/domain/entity-behaviors.js`
  - `createEntityBehaviors(behaviors)` builds the lookup core code uses:
    `getArrivalInteraction(entity)`, `isArrivalInteractionEntity(entity)`, `resolveArrivalOutcome(...)`.
- `tests/architecture/boundaries.test.js` fails if core `game/` code imports `game/heroes/`.

Core value objects used by domain services live in `game/domain/value-objects/*`
(`tile`, `entity-id`, `movement-points`) so validation/normalization rules stay centralized.

Arrival interaction contract (shape):

- `movementInteractionKind` (string): what movement should report when it triggers this interaction
- `requiresSteppingIntoTarget` (boolean): whether the hero steps into the target tile before stopping
- `resolveArrivalOutcome({ entity, definitions, tile })` -> outcome payload

Why this is important:

- `game/systems/*` can stay generic and ask the lookup it was given for behavior.
- Adding a new archetype is done by adding a new behavior module + listing it in the game's content.

### Movement and interactions

- `game/domain/movement/arrival-plan.js`
  - inspects destination occupancy + archetype behavior (`getArrivalInteraction`) and returns
    a movement `arrivalPlan` (`entityId`, `movementInteractionKind`, `stopBeforeTarget`).
- `game/systems/movement-system.js`
  - executes steps only; it does not query archetype behavior directly.
  - consumes the precomputed `arrivalPlan` and emits `fact.move.finished` with
    `interaction.kind = movementInteractionKind` when triggered.
- `interaction.module`
  - resolves the outcome with `entityBehaviors.resolveArrivalOutcome` for the entity
    named in `fact.move.finished` (`interaction.entityId`); no tile lookup needed.

## App: translating outcomes into UX (without kind switches)

The app runtime should not need to know about every archetype in-line.

- `app/modules/interaction.module.js` listens for `fact.move.finished`, asks the domain interaction
  system for an `outcome`, then delegates to a handler registry and owns all event emission.
- `app/heroes/interaction-outcomes.js` (`heroesOutcomeEffects`) maps `outcome.kind` to declarative effects:
  - `facts` emitted immediately when the interaction resolves
  - optional `modal` payload
  - optional `factsOnModalClosed`, emitted once the player acknowledges the modal

Domain facts never wait for animations. Views animate removals themselves: `entity-view` reacts to
the generic `fact.entity.removed` by applying the kind's fade-out class (`getFadeOutSpec` from the content's
`entityPresentation`) and removing the element after its duration (immediately during restore).

## Rendering: engine stays generic, app owns presentation

The engine entity layer does not know about HERO/MONSTER/RESOURCE/TOWN.

- `engine/layers/entity-layer.js` renders entities using an injected style resolver:
  - `getEntityStyle({ entity, map }) -> { className, width, height, offsetX, offsetY, ... }`
- `app/heroes/presentation/entities/registry.js` maps `entity.kind` to:
  - entity-layer style
  - optional fade-out (`className`, `durationMs`; tests can override durations with `config.fadeOutMsByKind`)
- `app/heroes/content.js` passes it to `entity-view` as `config.content.entityPresentation`.
- the Heroes resource sprites (`resource-sprites.js`, `homm3-resource-atlas.js`) live in `app/heroes/presentation/`.

This keeps all visuals (sprite selection, sizes, CSS class conventions) in the game's content, out of `engine/`.

## World construction: one place to assemble derived entities

World assembly is centralized in:

- `game/build-world.js`

Responsibilities:

- build `map`
- create footprint blockers from each behavior's `footprintOffsets` (e.g. the tiles a town or mine building covers)
- build `staticOccupancy` (everything except heroes; read-only `getAt`)
- an outcome that takes its entity off the map sets `removesEntity: true`; the app turns that into `fact.entity.removed`

Rule of thumb:

- Footprint blockers (`FOOTPRINT_BLOCKER`) only block tiles; they should not leak into UI
  logic unless we explicitly decide to render them.

## Playbook: adding a new archetype (e.g. MINE or TREASURE_CHEST)

1. Pick a new `kind` (archetype) and decide the definitions namespace key.
2. Add domain behavior:
   - create `game/heroes/entity-behaviors/<kind>.js` implementing the arrival interaction contract
   - add it to `entityBehaviors` in `game/heroes/content.js`
3. Load definitions (if needed): extend `game/load.js` to load a new `game/data/*.json` file.
4. Add presentation:
   - `app/heroes/presentation/entities/<kind>.js`
   - register it in `app/heroes/presentation/entities/registry.js`
5. Add/extend outcome handling:
   - add a handler entry in `app/heroes/interaction-outcomes.js` for the new `outcome.kind`
   - return `{ facts, modal, factsOnModalClosed }`
   - decide: which facts are committed immediately vs only after the modal is acknowledged
6. Add tests:
   - behavior tests under `tests/behavior/` for the user-visible scenario (no unit tests for outcome shapes or module wiring)

If you find yourself adding a `switch (kind)` in a system/module, it usually means the behavior
belongs in:

- `game/heroes/entity-behaviors/*` (domain rules), or
- `app/heroes/presentation/entities/*` (visuals / CSS hooks), or
- `app/heroes/interaction-outcomes.js` (runtime outcome dispatch).
