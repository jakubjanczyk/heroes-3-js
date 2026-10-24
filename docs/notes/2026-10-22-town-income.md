# Town income and the town box (2026-10-22)

Roadmap 3.2 (income from owned towns), the hall chain of 6.2, and the town box of 2.1.

## How Heroes 3 does it

- **Income.** At the start of each day, every town the player owns pays gold from its hall: Village Hall 500, Town Hall 1000, City Hall 2000, Capitol 4000. Only the highest hall pays: a Town Hall replaces the Village Hall, it doesn't add to it. A town captured or a hall built today pays from the next day, like a mine.
- **Town screen.** The panel shows the gold the town earns a day beside its Hall and Fort icons.
- **Town box.** The info box and the right-click popup of your own town show the town's picture and name, a Hall icon and a Fort icon showing their level (the Fort icon is there even with no fort), the daily gold, and the garrison.

## What we do

- The halls in `game/data/buildings.json` have an `income` by resource type and say which building they `upgrade`. `game/heroes/town-income.js` sums the income of the buildings standing in a town, leaving out any building another standing building upgrades. Any building with an `income` pays the same way, for when the Resource Silo gets one.
- The town module emits `fact.income.collected` for the owned towns on each `fact.turn.ended`, alongside the mines module's own. Like mine income it is not persisted: replaying the captures, buildings and turn ends pays it again.
- `describeTownBox` (`game/heroes/town-buildings.js`) gives the highest hall and fort, each with its level in its chain (fort level 0 for none), and the gold a day. The hero panel and the info popup each keep the town's buildings from `fact.world.ready` and `fact.town.building.built`, as they do for ownership, and the info box redraws when the selected town builds.
- No pictures yet: the hall's roof colour and the fort's towers show the level. The fort icon is greyed out with no fort, and its name is "No fort".

## Not yet

- Hall and Fort icons showing the level on the town screen's panel.
- Income from the Resource Silo and other buildings; the town box's silo resource.
- A town box for towns the player doesn't own (name only, as now).
