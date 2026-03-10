# Architecture Review — SRP and Event Ownership

Review of current architecture against stated principles:
- Single responsibility per module/handler/system.
- Communication happens via events/commands only.
- The same action must not live in two files.
- No module changes what another module is responsible for.

## Problem 1: Outcome handlers emit events directly

`interaction-outcomes.js` receives `bus` and calls `bus.emit(APP_FACT_MONSTER_DEFEATED, ...)`, `bus.emit(APP_UI_RESOURCE_COLLECTION_STARTED, ...)`, etc. But it is called from `interaction.module.js`. This makes event ownership ambiguous — you cannot tell who owns a given emission by reading the module file alone.

### Proposed fix

Outcome handlers return structured result objects instead of emitting events. `interaction.module` interprets the results and owns all bus emissions.

Handler return shape:

```js
{
  preEmit: { type, detail },     // event to emit before fade-out (optional)
  fadeOut: { entityId, entityKind, durationMs },  // fade-out request (optional)
  finalizeMethod: 'finalizeResourceCollection',   // method to call on interactions (optional)
  postEmit: { type, detail },    // event to emit after finalization (optional)
  pendingModalOutcome: outcome   // for modal-based flows (optional)
}
```

`interactions` and `bus` stop being passed into handlers. Handlers become pure data transforms with no side effects.

Files: `interaction-outcomes.js`, `interaction.module.js`, their tests.

## Problem 2: `collectingResourceEntityIds` duplicated across modules

Both `preview.module.js` and `movement.module.js` independently maintain a `collectingResourceEntityIds` Set. Both listen to the same two events (`APP_UI_RESOURCE_COLLECTION_STARTED`, `APP_FACT_RESOURCE_COLLECTED`) and use identical logic. This is the same concern copy-pasted into two files.

### Proposed fix

Move entity blocking state to the game layer. `world.module` already owns world state mutations (it handles `fact.monster.defeated` and `fact.resource.collected` to remove entities), so it should also own blocking state.

New file `game/domain/entity-status.js`:

```js
export function createEntityStatusIndex() {
  const blocked = new Set();
  return {
    markBlocked(entityId) { blocked.add(entityId); },
    clearBlocked(entityId) { blocked.delete(entityId); },
    isBlocked(entityId) { return blocked.has(entityId); }
  };
}
```

- `world.module` creates it, passes it through `fact.world.ready`.
- `world.module` listens to `APP_UI_RESOURCE_COLLECTION_STARTED` -> `markBlocked`, and `APP_FACT_RESOURCE_COLLECTED` -> `clearBlocked`.
- `preview.module` and `movement.module` read `entityStatus.isBlocked()` instead of maintaining their own Sets.

Follows the existing pattern: `occupancy` is also created once, passed via `fact.world.ready`, mutated by `world.module`, and read by others.

Files: new `game/domain/entity-status.js`, `world.module.js`, `preview.module.js`, `movement.module.js`, `build-world.js`, their tests.

## Problem 3: Preview module owns movement dispatch

`preview.module.js:135` emits `command.move.requested` when the user confirms a target (second click on same tile). Preview's responsibility should be: compute path, show path, track preview state. The decision "user confirmed, now move" is an input/command concern.

Consequence: if minimap, keyboard shortcuts, or AI want to trigger movement, they either route through preview (wrong) or duplicate the confirm-and-dispatch logic.

### Proposed fix

Extract the click-to-confirm-to-dispatch cycle into a `selection.module.js`:

- `selection.module` — owns the click state machine: first click on tile -> emit `fact.preview.target.selected`, second click on same tile -> emit `command.move.requested`. Listens to `ui.preview.updated` to get the computed path. Gates commands on `isMoving`, `isInteractionModalOpen`, `remainingMovementPoints`.
- `preview.module` — shrinks to: listen to `fact.preview.target.selected`, compute path, emit `ui.preview.updated`. Listen to move events to trim path during movement. Pure preview projection.

Keyboard/minimap/AI movement can emit `command.move.requested` directly without going through preview.

Files: `preview.module.js` (shrinks), new `selection.module.js`, `register-modules.js`, tests.

## Problem 4: Movement system decides interaction behavior

`movement-system.js` calls `getArrivalInteraction()` to decide: should the hero stop one tile before the target or step into it? Should it spend an extra movement point? What `movementInteractionKind` to attach? Then `interaction-system.js` calls `getArrivalInteraction()` again to resolve the outcome.

Two files own the same decision. If a new entity type is added and its `requiresSteppingIntoTarget` is wrong, you debug it in the movement system — which should not know about interactions at all.

### Proposed fix

The caller (`movement.module`) resolves interaction behavior before calling `moveHeroTo`, and passes a movement plan:

```js
// movement.module.js — before calling moveHeroTo
const occupant = occupancy.getAt(targetTile);
const interaction = occupant ? getArrivalInteraction(occupant) : null;

await movement.moveHeroTo(targetTile, {
  path,
  arrivalPlan: interaction ? {
    stopBeforeTarget: !interaction.requiresSteppingIntoTarget,
    movementInteractionKind: interaction.movementInteractionKind,
    entityId: occupant.id
  } : null
});
```

`movement-system.js` becomes a pure step executor. It receives `arrivalPlan` and follows it without importing or querying entity behaviors. It no longer imports `getArrivalInteraction`.

Files: `movement-system.js` (simplifies, loses entity-behavior import), `movement.module.js` (gains pre-move planning), their tests.

## Problem 5: bootApp accumulates feature logic

`bootApp` is documented as "composition + startup only" but now also handles: persisted fact replay, viewport visibility toggling during restore, camera centering after replay, and paint-frame synchronization. This is session restoration logic mixed into the composition root.

### Proposed fix

Create `session-restore.module.js` that owns the full restoration sequence:

- Listens to `fact.world.ready`.
- If persisted facts exist (passed via `config.persistedFacts`), handles viewport hiding, fact replay, camera centering, viewport reveal, and paint synchronization.

`bootApp` shrinks to: create bus, create event log, read persisted facts, pass them as `config.persistedFacts`, register modules, emit `command.app.start`, await `fact.world.ready`.

Files: new `session-restore.module.js`, `boot-app.js` (shrinks), `register-modules.js`, tests.

## Implementation order

1. Problem 1 (outcome handlers) — smallest scope, pure refactor, no event contract changes.
2. Problem 2 (entity status) — removes real duplication, small new file.
3. Problem 4 (movement plan) — clears the biggest SRP violation in the game layer.
4. Problem 3 (selection split) — most design work, makes preview clean.
5. Problem 5 (session restore) — low urgency, bootApp works fine today.

Problems 1 and 2 are independent. Problems 3 and 4 are independent of each other but both benefit from 2 being done first. Problem 5 is standalone.
