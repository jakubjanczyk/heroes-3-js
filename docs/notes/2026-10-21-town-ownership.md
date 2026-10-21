# Town ownership and the town list (2026-10-21)

Roadmap 2.3b: the player owns towns, sees them in the town list and opens them without a hero.

## How Heroes 3 does it

- **Owning a town.** A map can give each player towns at the start. A hero who walks into an enemy or neutral town captures it, after beating its garrison. The town then flies its new owner's flag, and the minimap shows it in that colour.
- **Town list.** The adventure panel lists the player's towns beside the hero list. Clicking a town selects it: the map centres on it and the info box at the bottom right shows the town instead of the hero. Clicking the selected town again, or double-clicking one, opens its town screen. Clicking a hero in the hero list selects the hero again.
- **On the map.** Over your own town the mouse shows a castle, and clicking opens the town screen. With a hero selected, the town's entrance shows the rearing horse instead, and clicking it walks the hero in. While a town is selected the hero does not move.
- **Town screen.** A town opened with no hero in it has an empty visiting hero row. The town list on the panel's right side shows the player's towns, and clicking one switches the screen to it.
- **Town box.** The info box and the right-click popup of your own town show the town's picture, name, Fort and Hall, income and garrison. Right-clicking someone else's town shows less.

## What we do

- `"owner": "red"` on a town in the scenario gives it to the player, the only player so far. The demo scenario gives the player Whitemoon (`town-1`, at (10, 10)), the town nearest the hero.
- A hero reaching a town the player does not own saves `fact.town.captured`. The town is taken straight away: there is no town combat yet.
- `game/heroes/town-ownership.js` keeps the owned towns in town-list order: the scenario's first, then each captured one after the last. Each module that shows ownership keeps its own copy from `fact.world.ready` and `fact.town.captured`, as they do for mines.
- `town-list.module.js` draws the adventure panel's town list. Selecting a town or the hero is a UI event (`ui.town.selected`, `ui.hero.selected`), not saved: after a reload the hero is selected. The hero panel puts the town box in the info box, and the selection module ignores map clicks while a town is selected.
- Opening a town without walking in (from either town list, or by clicking it on the map) is `command.town.open.requested`. The town module saves it as `fact.town.opened` when the player owns the town, so a town screen opened this way comes back after a reload. The visiting hero row shows the hero only when the hero stands on the town's entrance.
- The town box (`#town-box-template`, `presentation/town-box.js`) has the town's name and the garrison's seven slots, empty as towns have no garrison yet. The picture, Fort, Hall and income come with buildings.
- The flag is drawn by `owner-flag-view.module.js` (before this, `mine-flag-view`) for both mines and towns. The castle cursor is drawn in `scripts/build-cursors.mjs`.
- A town the scenario names shows that name in the status bar and the popup, not only on the town screen.

## Not yet

- Town combat: entering a town with defenders should start a battle, with walls once there are Fort buildings (5.10).
- Income from towns (the Village Hall, 6.2) and the town box's Fort, Hall and income.
- Clicking the hero on the map to select it again; for now the hero list and Next hero do that.
- Enemy players owning or taking towns.
