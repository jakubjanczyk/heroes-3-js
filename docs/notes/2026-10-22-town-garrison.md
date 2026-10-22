# Town garrison (2026-10-22)

Roadmap 6.3.1: a town holds creatures of its own, apart from the visiting hero's army.

## How Heroes 3 does it

- A town has a garrison of up to seven creature stacks. A map can give a town a garrison at the start, neutral towns included.
- The town screen shows the garrison in the top row of the panel, above the visiting hero's army. The town box and the right-click popup of the player's own town show it too.
- A hero who walks into a town with a garrison has to beat it in a siege before taking the town.

## What we do

- A town in the scenario can have `"garrison": [...]`, written like a hero's `army`: up to seven `{ creature, count }` stacks, with `null` for an empty slot. The demo scenario gives Whitemoon 12 Pikemen and 6 Archers.
- The town screen, the town box in the info box and the right-click popup show the garrison's stacks in their slots (`getTownGarrison` in `game/heroes/hero-army.js`).
- There are no sieges yet (5.10), so nothing could take a garrisoned town. Loading a scenario fails when a town the player does not own has a garrison, or when a garrison has more than seven stacks.

## Not yet

- Neutral towns with a garrison that defends them, once sieges exist (6.4, 5.10).
- Recruits joining the garrison (6.3.3) and moving creatures between the garrison and the visiting hero (6.3.6).
