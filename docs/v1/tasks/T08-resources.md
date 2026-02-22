# T08 — Render resources + collect on arrival

## Goal (shipable milestone)

Resources render on the map.

When the hero finishes a move with the resource tile as the **destination**:

- the resource is collected
- the resource disappears
- an ephemeral notification is shown

## Depends on

- `docs/v1/tasks/T07-monsters.md`

## Scope

- Add resource placements to `scenarios/v1.json` (at least one).
- Load resource definitions from `game/data/resources.json`.
- Render resources in `EntityLayer`.
- Extend interaction system to handle resource collection.

## Out of scope

- Resource inventory UI (beyond a notification)
- Persistence

## Files to create / modify

- `game/data/resources.json`
- `game/systems/interaction-system.js`
- `engine/layers/entity-layer.js`
- `main.js`

## Acceptance

1. You can see resources placed on the map.
2. When the hero steps onto a resource tile, the resource disappears and a notification appears.
3. Hero cannot path through resource tiles (unless the destination is the resource tile).
