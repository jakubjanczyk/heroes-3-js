# Town screen (2026-10-20)

Roadmap 2.3, the first step of Phase 4: stepping onto a town's entrance opens the town screen instead of the "Castle visited" dialog.

## How Heroes 3 does it

- **Town picture.** The top of the screen is the town, its buildings drawn on the faction's background. Clicking a building opens it.
- **Panel.** Under the picture, left to right:
  - the town's picture and name
  - the Hall and Fort icons and the gold the town makes a day
  - the creatures there are to recruit, with their weekly growth
  - two rows of seven army slots: the garrison on top, the visiting hero's army below, each led by its hero's portrait
  - the town list with its scroll arrows, and the ✓ that leaves the town
- **Resource bar.** The adventure screen's resource bar and date stay along the bottom.
- **Names.** Every town on a map has a name (Whitemoon, Kirkwall...). The map editor picks one at random from the faction's list, or the map maker sets it.
- **Leaving.** The ✓ (Enter or Escape) returns to the map, the hero still on the entrance.

## What we do

- Reaching the entrance saves `fact.town.visited`, as before; the town screen opens on it and closes on `fact.town.left`, which the ✓ (`command.town.leave.requested`) saves. A town open when the page reloads is shown again; one left before stays closed.
- The markup is `#town-screen-template` in `index.html`. `app/heroes/modules/town.module.js` says what to show and `town-screen-view.module.js` draws it. `game/ui/town.css` styles it. It covers the map, the status bar and the adventure panel, not the resource bar. While it is open the map ignores clicks and arrow keys (`ui.adventureMap.covered`), and the adventure panel is hidden.
- The town's name is the scenario's `name` for the town (`"name": "Whitemoon"`), else its type's name from `towns.json` ("Castle"). There is no random name list yet.
- The visiting hero row shows the hero's initial as its portrait and the hero's army, as the hero box does. The garrison row is empty: towns have no garrison yet.
- The town picture is drawn in CSS: sky, hills, a white castle and the green in front of it.
- On a phone in portrait, the panel puts the armies first, and leaves out the empty places of the Hall, Fort, income and recruitment.

## Not yet

- Buildings, on the picture and in the panel (6.1, 6.2), and recruiting (6.3).
- The garrison and moving creatures between the rows (6.4).
- Capturing a neutral town, and the town list (both need town ownership).
- The map's status bar and right-click popup still show the type's name, not the town's own.
- Saves from before this change: a town visited and never left shows its town screen again after a reload, as there was no "left" fact then. Leaving it once fixes it.
