# Terrain movement costs (2026-10-17)

Roadmap 1.1 and 4.6. Movement now follows Heroes 3, checked against VCMI's pathfinder (`config/terrains.json`, `lib/pathfinder/CPathfinder.cpp`).

## Behaviour

- The hero has 1500 movement points a day (Heroes 3 gives 1300-2000 from the army's slowest creature; there are no armies yet). End turn refills them; unused points don't carry over.
- A step costs the terrain of the tile the hero leaves: 100 for grass, dirt, lava and subterranean, 125 for rough, 150 for sand and snow, 175 for swamp.
- A diagonal step costs that times √2, rounded down: 141, 176, 212, 247.
- A diagonal step that no longer fits is still allowed when a straight step would, and takes all points left.
- When what is left after a step can't pay a straight step from the new tile, the points drop to 0, so the hero never ends a day with points it can't use.
- The route is the cheapest one by points, not the one with fewest steps, so the hero walks around a swamp when that is cheaper.
- Diagonal steps may pass between two blocked tiles, as in Heroes 3. The V1 no-corner-cutting rule is gone.
- The path preview marks the steps past today's points in red, as before.
- Stepping onto a monster, resource, mine or town costs a normal step from the tile before it.

## How it works

- `movementCost` per terrain lives in `game/heroes/terrain-types.js`.
- `game/heroes/movement-rules.js` has the Heroes rules: `stepCost` (what the route search minimises) and `chargeSteps` (what each step the hero can still take today costs). They reach the app as `content.movementRules`; without them every step costs 1 (`game/domain/movement/movement-rules.js`).
- `engine/pathfinding.js` takes a `getStepCost(from, to)` and finds the cheapest route.
- The movement system spends each step's charge; the selection module uses the same charges to mark the preview's over-limit part and to enable Move.

## Saved games

Saves from before this change replay at 1 point per step and would put the hero somewhere else. The session database is now `heroes-3-js-v2` (`app/session-db-name.js`), so the game starts fresh and old saves are left behind.

## Not yet

- Roads, the Pathfinding and Logistics skills, native terrain, and movement points from the army's speed.
