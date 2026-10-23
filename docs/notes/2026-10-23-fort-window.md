# Fort window (2026-10-23)

Roadmap 6.3.4: the town panel's Fort icon opens the Fort window, every creature tier of the town on one screen, and recruiting from it.

## How Heroes 3 does it

- **Fort icon.** Next to the Hall icon in the town panel; its picture shows the fort's level. A town without a Fort has none, and no Fort window.
- **Fort window.** Titled after the fort: Fort, Citadel or Castle. Tiers 1-6 in two columns and tier 7 centred below. Each card has the plural creature name over the dwelling's picture, the dwelling's name and "Available: N", the creature's picture, and Attack, Defense, Damage, Health, Speed and Growth. The ✓ closes it.
- **Upgraded dwellings.** Once the upgrade stands, the card shows it and the upgraded creature (Upg. Guardhouse, Halberdiers).
- **Recruiting.** Clicking a card opens the dwelling's recruit window over the Fort window; recruiting or cancelling goes back to it, with the new numbers.

## What we do

- `game/heroes/fort-window.js` (`describeFort`) works out the window: the fort's name and level, and a card per tier. The town module sends it with the rest of the town (`fort` on `ui.town.updated`), null without a Fort.
- A tier without a dwelling still has its card: the plain dwelling and creature, "Available: 0", and the growth it would have once built, the Citadel's or Castle's bonus included. Clicking it does nothing. Its dwelling picture is darkened.
- Damage is "min-max", or one number when they are the same (Angels: 50).
- `town-fort-view.module.js` draws the window. A built tier's card carries the same `data-recruit-tier` as the creature panel's buttons, so the recruit window (`town-recruit-view.module.js`) opens from it unchanged, on top of the Fort window. Escape closes the top window first, as with every dialog (`keyboard-shortcuts.module.js`).
- The Fort icon stays on narrow screens, next to the Hall icon, so the player can recruit there although the creature panel is hidden. The cards then stack in one column and scroll.
- Pictures are stand-ins: the Hall's tower landscape for dwellings, the creature's name on a landscape for creatures, text labels for the stat icons.

## Not yet

- Opening the Fort window from the fort on the town picture (6.3.5).
- Growth from external dwellings, the Grail and "Week of the X" (6.3 later).
