# Mine capture and daily income (2026-10-17)

Roadmap 3.2 and 3.3.

## Behaviour

- A hero entering a neutral mine captures it. No message is shown, and entering a mine you already own does nothing.
- A captured mine gets a small flag in the player's colour on the map, and its tiles turn the player's colour on the minimap.
- At the start of each new day (after End Turn), every owned mine adds its income to the resource totals. Nothing is paid on the day of the capture.
- Daily amounts follow Heroes 3 and live in `game/data/mines.json` (`income.resource` is a key from `resources.json`): Gold mine 1000 gold, Sawmill 2 wood, Ore pit 2 ore, and 1 each for Alchemist lab (mercury), Sulfur dune, Crystal cavern and Gem pond.

## How it works

- `app/heroes/modules/mines.module.js` owns the state: it emits `fact.mine.captured` (persisted) when a move ends on a mine not owned yet, and on each `fact.turn.ended` emits `fact.income.collected` with the total per resource type.
- `fact.income.collected` is not persisted. It follows from the persisted captures and turn ends, so replaying the log on reload pays the same income in the same order.
- The flag is added by `owner-flag-view.module.js` (`mine-flag-view` before towns could be owned). The mine-type tint moved from the mine element to its `::before` layer, so the CSS `filter` does not tint the flag too.
- The player red and neutral grey are now shared `:root` variables (`--player-red`, `--neutral-grey`).

## Not yet

- Enemy players capturing mines, and income from towns.
- Starting resources (3.5) and income tooltips in the HUD.
