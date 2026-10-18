# Starting resources (2026-10-18)

Roadmap 3.5.

## Behaviour

- The resource bar shows the player's starting resources when the game starts, instead of 0 of everything.
- A scenario sets them with a top-level `startingResources` object keyed by the `resources.json` keys, e.g. `{ "GOLD_PILE": 7500, "WOOD_PILE": 5 }`. Types it leaves out start at 0.
- A scenario without `startingResources` starts with the Heroes 3 Normal difficulty amounts: 20000 gold, 20 wood, 20 ore and 10 each of mercury, sulfur, crystal and gems. The demo map uses these.
- Picked-up resources and mine income are added on top. After a reload the totals are the starting amounts plus what the replayed log adds.
- Loading rejects a starting amount that is not a whole number of at least 0.

## How it works

- `game/heroes/starting-resources.js` picks the scenario's amounts or the Normal defaults; the HUD seeds its totals from it on `fact.world.ready`.
- Nothing is persisted: the amounts come from the scenario, so a reload starts from the same numbers.
- The behavior-test `aScenario()` builder defaults to `startingResources: {}` (all 0), so existing tests keep their totals; `withoutStartingResources()` gets the defaults.

## Not yet

- Starting resources per player and per difficulty (one player and no difficulty choice for now).
- The resource spending framework (3.4): no feature spends resources yet.
