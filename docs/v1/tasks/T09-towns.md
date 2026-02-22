# T09 — Render towns + visit on arrival (town persists)

## Goal (shipable milestone)

Towns render on the map.

When the hero finishes a move with the town tile as the **destination**:

- a “visited town” ephemeral notification is shown
- the town remains on the map

## Depends on

- `docs/v1/tasks/T08-resources.md`

## Scope

- Add town placements to `scenarios/scenario.json` (at least one).
- Load town definitions from `game/data/towns.json`.
- Render towns in `EntityLayer`.
- Extend interaction system to handle town visits.

## Out of scope

- Town screen
- Buildings
- Recruitment
- Persistence

## Files to create / modify

- `game/data/towns.json`
- `game/systems/interaction-system.js`
- `engine/layers/entity-layer.js`
- `main.js`

## Acceptance

1. You can see towns placed on the map.
2. When the hero steps onto a town tile, a notification appears and the town remains.
3. Hero cannot path through town tiles (unless the destination is the town tile).
