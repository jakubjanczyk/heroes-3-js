# Info box: mine capture (2026-10-25)

Roadmap 2.4 and 2.4b: capturing a mine tells the player what it gives in the info box, not in a dialog.

## What we do

- The hero panel module shows `fact.mine.captured` in the info box (`app/heroes/presentation/captured-mine-box.js`), as the region "Mine captured": the mine's name over the resource's picture and its daily income ("1000 per day"), from `game/data/mines.json`.
- It is one more info box view (`mine` in `info-box-states.js`) and leaves like the resource pickup: after 3 seconds, on a click on the box, when the hero starts moving or on any selection.
- Entering a mine the player already owns captures nothing, so nothing is shown.
- Captures replayed on a reload are not shown again.

## Not yet

- The capture sound (10.4).
- Capturing an enemy's mine (3.3, 8.1).
