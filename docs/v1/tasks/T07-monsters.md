# T07 — Render monsters + defeat on arrival

## Goal (shipable milestone)

Monsters render on the map and block movement until defeated.

When the hero finishes a move with the monster tile as the **destination**:

- the monster is defeated
- the monster disappears (removed from occupancy and rendering)
- an ephemeral notification is shown

## Depends on

- `docs/v1/tasks/T06-movement-points-turn.md`

## Scope

- Add monster placements to `scenarios/scenario.json` (at least one).
- Load monster definitions from `game/data/monsters.json`.
- Render monsters in `EntityLayer`.
- On hero arrival, resolve monster interaction in `game/systems/interaction-system.js`.

## Out of scope

- Combat system (auto-resolve counts as “defeat instantly” in V1)
- Persistence

## Files to create / modify

- `game/data/monsters.json`
- `game/systems/interaction-system.js`
- `engine/layers/entity-layer.js`
- `main.js`

## Acceptance

1. You can see monsters placed on the map.
2. Hero cannot path through monster tiles (unless the destination is the monster tile).
3. When the hero steps onto a monster tile, the monster disappears and a notification appears.
