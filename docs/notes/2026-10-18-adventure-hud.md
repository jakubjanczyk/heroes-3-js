# Adventure HUD (2026-10-18)

Roadmap 1.3. The screen now follows the Heroes 3 adventure screen, drawn with CSS only (no sprites yet).

## Behaviour

- The map sits in a frame on the left. The right panel holds, top to bottom: the minimap; the hero list, the ten adventure buttons in two columns and the town list side by side; and the info box. As in H3 the lists stop at five slots and the info box sits at the bottom of the panel, so on tall screens the space left over stays empty between them.
- The resource bar runs along the bottom: Wood, Mercury, Ore, Sulfur, Crystal, Gems and Gold, each with an icon and its amount, then the date. Resource names come from `game/data/resources.json`, which now uses the H3 names ("Gold", not "Gold pile") in H3 order.
- The hero list shows the hero's portrait (their initial for now) with a green movement bar beside it. As in H3 there is no number; screen readers get it from the bar (`progressbar`, "Movement points"). Clicking the portrait centres the map on the hero.
- Buttons, as in H3: Kingdom overview, Underground, Quest log, Sleep hero, Move hero, Cast spell, Adventure options, System options, Next hero, End turn. Those with no feature behind them are disabled with a "not available yet" tooltip.
- Next hero centres the map on the hero and is disabled once the hero has no movement points left. With more heroes it will cycle through them.
- System options (gear) opens a popup with Music On/Off, Reset and Return to game. Escape also closes it. While it is open, map clicks do nothing.
- The info box is nearly square, as in H3: the hero's name over seven big army slots, four on top and three centred below (armies come with 4.3).
- The town list shows five empty slots until towns can be owned.
- The whole screen, map and HUD, always fits the viewport with no page scroll:
  - Short screens (a laptop window, a landscape phone): the minimap gives up height first, the button rows shrink, and the army slots go into one row.
  - Portrait phones (under 48rem wide): the map is on top, then the resource bar, then a compact panel with the ten buttons in one row over the minimap, hero list, town list and info box.
  - Landscape phones keep the side panel.

## Player colour

In H3 the whole interface frame is tinted in the colour of the player whose turn it is. Every frame colour in `game/ui/hud.css` is derived from `--interface-color`, which `data-player-color` on `.game-shell` picks from the eight H3 player colours in `styles/base.css` (`red`, `blue`, `tan`, `green`, `orange`, `purple`, `teal`, `pink`). There is one player for now, so `index.html` sets `red`.

## How it works

- `app/heroes/modules/hud.module.js`: resource bar, date, Move hero and End turn.
- `app/heroes/modules/hero-panel.module.js`: hero list, movement bar, info box and Next hero.
- `app/heroes/modules/system-options.module.js`: the popup. It emits `ui.systemOptions.opened` / `ui.systemOptions.closed`, and the selection module ignores tile clicks in between.
- Behavior tests now mount the real `index.html` body instead of a copy of it.

## Not yet

- The bottom status bar with hover info (2.5) and income tooltips on the resources (3.2).
- Hero portraits, mana bar, towns in the town list, and the army in the info box.
