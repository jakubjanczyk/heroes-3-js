# Info box: kingdom overview and the click views (2026-10-24)

Roadmap 2.4b: clicking the info box goes round its views.

## How Heroes 3 does it

- A click on the selected hero or town shows the kingdom overview, a click on the overview shows the date, and a click on the date brings the selection back. A click on a pickup brings the selection back too.
- The overview and the date go back to the selection by themselves after 3 seconds.
- The overview's top row has the Village Hall, Town Hall, City Hall and Capitol pictures, each with the number of the player's towns at that hall right under it (0 when there are none). Under them, a row of the allies' flags and a row of the enemies'.
- The date opened by a click is today's: "Day N", or "Week N" with that week's animation on the first day of a week. It plays the new day sound and music.
- A click on a unit in the hero's army or the town's garrison doesn't change the view. The units can be selected and rearranged there as on the hero and town screens, without splitting, and right-clicking one opens its creature info window.
- Right-clicking the box opens a "status window" popup in the middle of the screen explaining it.

## What we do

- The hero panel module shows the overview as the region "Kingdom overview" (`app/heroes/presentation/kingdom-overview-box.js`) and the date as the region "Date", sharing the 3-second message timer with the pickups and the date at the start of a turn. Moving the hero and selecting a town bring the selection back sooner, as for them.
- Towns are counted under their highest hall (`countTownsByHall` in `game/heroes/town-buildings.js`), only the ones the player owns, captured towns included.
- The Allies and Enemies rows are empty, as there are no other players yet.
- The hall pictures are the town box's stand-ins (`.hall-icon`).

## Not yet

- The allies' and enemies' flags (8.1).
- Selecting and rearranging units in the info box, and a unit's info window on right-click (4.3).
- The sound and music of the date (10.4, 10.5).
- The right-click "status window" popup and the hover text.
