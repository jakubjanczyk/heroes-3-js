# Info box: hover text and help popup (2026-10-25)

Roadmap 2.4b: the info box says what it is, like every other part of the adventure screen.

## How Heroes 3 does it

- Hovering the box shows "Status Window" in the status bar (`zelp[292]`), the same text whatever the box shows: the hero, a town, a pickup, the kingdom overview or the date.
- Holding the right button on it opens a popup in the middle of the map (`allTexts[109]`): "{Status Window}" as a gold title, a blank line, then "This window provides information on the status of your hero or kingdom, and shows the date. Left click here to cycle through these windows." Releasing the button closes it.

## What we do

- The info box module shows the text while the mouse is over the box, except over an army slot (`2026-10-25-info-box-army.md`), and empties the bar when it leaves.
- The info box module opens the popup (`app/heroes/presentation/info-box-help-popup.js`), drawn as the map's right-click popup (`.info-popup.message-box`) but centred on the map, not on the whole screen. A right-click doesn't change the box's view, and the browser's context menu doesn't open.
- As on the map, a finger held still on the box for 500 ms opens the same popup, and lifting it closes it without the click going round the views.
