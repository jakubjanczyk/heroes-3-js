# Spending resources (2026-10-22)

Roadmap 3.4, and the last rule of 6.1: a building costs resources, the player must have them, and building takes them off the resource bar.

## How Heroes 3 does it

- **Affording.** A building can be built only if the player has at least its whole cost, every resource of it. Having exactly the cost is enough.
- **The Hall.** A building the player can't afford has a red bar with a cross, like one whose required buildings are missing. It shows as short of resources only once nothing else stops it: a building that also misses a required building says that instead.
- **Building window.** The cost lists every resource the building needs; Build stays disabled while the player can't pay. Building takes the cost off the player's resources straight away.
- **One treasury.** Resources belong to the player, not to a town: what one town spends, another can no longer spend.

## What we do

- `game/heroes/treasury.js` keeps the player's resources by type (`createTreasury`: starting resources, `add`, `spend`), and says whether a cost can be paid (`canAfford`) and which resources fall short (`isShortOf`). Costs are objects by resource type, as `startingResources`.
- Spending is `fact.resources.spent` with `{ resources, reason }`; the town module adds `entityId` and `buildingId` for a building. It is persisted, unlike income: income comes back by replaying turn ends, a spend has nothing else to come back from. The town module emits it just before `fact.town.building.built`, so the Hall already shows the new totals when it redraws.
- The town module and the HUD each keep a treasury from the same facts (starting resources, resources picked up, income, treasure chests, spending): the town module to decide what can be built, the HUD to draw the resource bar.
- The Hall gives a building the player can't afford the `notEnoughResources` status ("Not enough resources") and a red bar. The building window draws the resources the player is short of in red, with a hidden " (not enough)" for screen readers.

## Not yet

- Hero recruitment (4.5) paying through the same treasury. Creature recruitment does (`docs/notes/2026-10-22-creature-recruitment.md`).
