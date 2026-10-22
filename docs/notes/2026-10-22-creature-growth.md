# Creature growth (2026-10-22)

Roadmap 6.3.2: the town screen's panel shows the creatures a town's dwellings make and how many arrive a week.

## How Heroes 3 does it

- Each dwelling makes one creature tier. Once its upgrade stands, the panel shows the upgraded creature; both share one pool.
- The panel (bottom left of the town screen) has a slot per tier, a row of 4 and a row of 3, each with the creature and its weekly growth ("+14"). A tier without a dwelling leaves its slot empty.
- A Citadel adds 50% of the dwelling's growth, a Castle 100%, rounded down; the Fort adds nothing. A horde building adds a flat number (Griffin Bastion: +3 Griffins), not doubled by the Castle (VCMI).

## What we do

- A dwelling in `game/data/towns.json` names its `creature`; its upgrade also names the dwelling it `upgrades`, as the halls do. The tier comes from the creature in `monsters.json`.
- A horde building has `"horde": { "tier": 3, "amount": 3 }`.
- The Citadel and Castle in `buildings.json` have `creatureGrowthPercent` (50, 100), and each upgrades the one before, so only the highest counts.
- `describeCreatureGrowth` in `game/heroes/creature-growth.js` works out the seven slots.

## Not yet

- Nothing left here: the creatures available to buy and growth piling up came with the recruit window (`docs/notes/2026-10-22-creature-recruitment.md`).
