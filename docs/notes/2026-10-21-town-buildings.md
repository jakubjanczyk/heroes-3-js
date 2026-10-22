# Town buildings (2026-10-21)

Roadmap 6.1: the Hall, where a town builds. This change doesn't look at resources: costs are shown, but any building whose requirements are met can be built, and nothing is spent (3.4 comes next).

## How Heroes 3 does it

- **The Hall.** Clicking the Village Hall (or Town Hall...) on the town picture opens the Hall, a window over the darkened town screen. Its title is the hall building's name. Each faction lays its buildings out in five rows of slots; a slot shows the next building of its chain (Fort, then Citadel, then Castle; a dwelling, then its upgrade), and the last one once the chain is complete.
- **Slot bars.** Under each picture a bar with the building's name: gold with a tick when built, green when it can be built, red with a cross when requirements are missing, resources are short or the town has built today, grey with a cross when it can never be built here (a Shipyard away from water, a second Capitol).
- **Building window.** Clicking a slot opens the building's window: picture, description, the buildings still required, the cost, and the Build (tick) and Cancel buttons. Building closes the Hall.
- **Rules.** One building per town per day. A player can have one Capitol. Every town has its Village Hall from the start.

## What we do

- `game/data/buildings.json` holds the buildings every town has (halls, fortifications, Tavern, Marketplace, Resource Silo, Blacksmith, Mage Guild 1-5, Shipyard), with their names, costs (in resource types, as `startingResources`) and `requires`. A town type in `towns.json` adds its own buildings (and could change a shared one) under `buildings`, and lays out its Hall under `hall`: rows of chains. Only Castle has them so far. Costs come from the Heroes 3 wiki; requirements from VCMI's `config/factions/castle.json` and `config/buildingsLibrary.json`. `requiresWater` (Shipyard) and `onePerPlayer` (Capitol) mark the two special rules.
- A scenario can start a town with buildings: `"buildings": ["TAVERN", "FORT"]`. Loading fails on a building the town's type does not have.
- `game/heroes/town-buildings.js` keeps what stands in each town and which towns built today, works out each building's status, and describes the Hall for the view. "Water next to the town" is any water tile touching the town's tiles; Heroes 3 checks a particular tile by the town instead.
- The town module adds the Hall to `ui.town.updated`. Build is `command.town.build.requested`; the town module saves it as `fact.town.building.built` when the building can be built, so buildings come back after a reload. `fact.turn.ended` lets every town build again.
- `town-hall-view.module.js` draws the Hall (`#town-hall-template`), a window just big enough for its rows, over the darkened town screen and the building window (`#building-window-template`) over the Hall. The Hall's tick (Enter or Escape) and the window's Cancel (Escape) close them; Build is Enter. Opening the Hall is not saved: after a reload the town screen shows without it.
- The pictures are stand-ins: the same landscape with a tower for every building. On a phone the Hall icon sits beside the town's name.

## Not yet

- Checking and spending resources (3.4), and red bars for buildings the player can't afford.
- What buildings do: income from the halls (6.2), creature growth and recruiting (6.3), the Fort in town combat (5.10).
- Built buildings drawn on the town picture, building pictures and descriptions, status bar text on hover, right-click info.
- Other factions' buildings and Hall layouts.
