# T08 — Render resources + collect on arrival + HUD totals

## Goal (shipable milestone)

Resources render on the map.

When the hero finishes a move with the resource tile as the **destination**:

- the resource is collected
- the resource disappears
- an ephemeral notification is shown
- the HUD resource totals update immediately

## Depends on

- `docs/v1/tasks/T07-monsters.md`

## Scope

- Add resource placements to `scenarios/scenario.json` (at least one; prefer two different types for coverage).
- Load resource definitions from `game/data/resources.json`.
- Render resources in `EntityLayer`.
- Extend interaction system to handle resource collection.
- Add a resource totals section in HUD and update it when resources are collected.
- Keep totals data-driven so adding a new resource type is primarily data/config work.

## Out of scope

- Advanced economy UI (income breakdowns, tooltips, production sources)
- Persistence (resource totals become persistent in T10)

## Files to create / modify

- `game/data/resources.json`
- `game/systems/interaction-system.js`
- `app/modules/interaction.module.js`
- `app/modules/hud.module.js`
- `app/events.js`
- `engine/layers/entity-layer.js`
- `tests/behavior/behavior.resources.test.js`

## Acceptance

1. You can see resources placed on the map.
2. When the hero steps onto a resource tile, the resource disappears and an interaction modal/notification appears.
3. Collecting a resource increments the correct HUD total immediately.
4. At least two resource kinds can be collected and tracked independently.
5. Hero cannot path through resource tiles (unless the destination is the resource tile).
