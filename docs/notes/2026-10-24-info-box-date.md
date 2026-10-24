# Info box: the date at the start of a day (2026-10-24)

Roadmap 2.4b: ending the turn shows the new date in the info box.

## How Heroes 3 does it

- At the start of every turn but the game's first, the info box shows the date for 3 seconds, then the selection.
- The text is "Day N", the day of the week (`allTexts[64]`); on the first day of a week "Week N" instead (`allTexts[63]`), the week of the month, so day 29 says "Week 1".
- The picture is the new day animation (`NEWDAY`), or on the first day of a week that week's animation (`NEWWEEK1`-`NEWWEEK4`). It plays once, in 1.5 seconds of frames about 180 ms long.
- A click on it brings the selection back. So do the hero starting to move and a new selection, as for a pickup.
- When the 3 seconds run out while a window is open (the "New week" popup), the date stays until something replaces it.
- The new day, week or month sound plays with it.

## What we do

- The hero panel module shows `fact.turn.ended` in the info box as the region "Date" (`app/heroes/presentation/date-box.js`), sharing the 3-second message and its timer with the resource pickup.
- The picture is a stand-in drawn as SVG: the sun rising from behind the hills while the sky brightens, in eight steps over 1.5 seconds. Each week of the month has its own sky and sun ("Sunrise of week N"); other days show "Sunrise".
- A date replayed on a reload is not shown again.

## Not yet

- The sounds, with sound effects (10.4).
- Clicking the box to show the kingdom overview and then the date.
