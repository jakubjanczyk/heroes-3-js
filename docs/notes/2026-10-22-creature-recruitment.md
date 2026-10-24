# Creature recruitment (2026-10-22)

Roadmap 6.3.3: a town's dwellings keep creatures to buy, and the recruit window, opened from the town screen's creature panel, buys them into the garrison.

## How Heroes 3 does it

- **Creatures to buy.** Each dwelling has a pool. A dwelling standing at the start of the game has a week of creatures, Citadel or Castle bonus included. Each new week adds the week's growth on top of what was left unbought, in every town, neutral ones too, so a captured town keeps what built up.
- **A dwelling just built** has a week of its creature's own growth straight away, without the Citadel's or Castle's bonus, which counts from the next week. Building its upgrade keeps the pool; both creatures are bought from it.
- **Recruit window.** "Recruit <plural>"; the dwelling's creatures, the upgraded one chosen first and framed in red; Cost Per Troop, Available, Recruit and Total Cost; a slider with arrows that goes no higher than the player can afford or is available; Max, Recruit and Cancel. It starts at 1 when one can be bought, else at 0, with Recruit greyed out. Enter recruits, Escape cancels. Recruiting closes the window.
- **Where recruits go.** Only to the town's garrison (`getUpperArmy`): a stack of the same creature, else the first empty slot. The visiting hero is never used. With no room, Recruit shows "There is no room in the garrison for this army." and the window stays open.

## What we do

- `game/heroes/creature-recruitment.js` works out what the panel and the recruit window show (`describeTownCreatures`: growth, available, and each creature's cost and the most the player can recruit), the week's growth by tier, and where recruits join the garrison (`addToGarrison`).
- The town module keeps each town's pool and garrison. The pools follow from the persisted facts, as income does: a week of creatures at world ready, more at each turn end that starts a week, a newly built dwelling stocked, and `fact.town.creatures.recruited` taking some away.
- Recruiting emits `fact.resources.spent` (reason `town.recruit`), `fact.town.creatures.recruited` and `fact.town.garrison.changed` with the whole garrison, all persisted. The town box (hero panel) and the right-click popup redraw the garrison from the last.
- With no room in the garrison, the town module emits `ui.town.message.opened`; the recruit view shows it as a message box over the town screen.
- The creature panel's slots are buttons ("Recruit Pikemen"); the window is `town-recruit-view.module.js`.

## Not yet

- Clicking dwellings on the town picture (6.3.5). The Fort window came in 6.3.4 (`2026-10-23-fort-window.md`).
- Moving creatures between the garrison and the visiting hero (6.3.6).
- A `fact.week_started` event (3.1); the town module tells a new week from the turn number.
- The creature panel is hidden on narrow screens; there the player recruits from the Fort window.
