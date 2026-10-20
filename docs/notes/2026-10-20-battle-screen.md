# Battle screen (2026-10-20)

Roadmap 5.3, first step of combat: attacking a monster opens the battle screen instead of the "Monster defeated" dialog. Nothing moves yet; Auto combat stands in for the whole fight.

## How Heroes 3 does it

- **Battlefield.** 15 columns by 11 rows of pointy-top hexes (VCMI counts 17 columns: the two edge columns take no stacks). The top row and every second row under it sit half a hex to the right. The backdrop depends on the terrain of the tile the battle is on, which for a hero attacking a monster is the monster's tile.
- **Heroes.** The attacking hero stands in the top-left corner, the defending hero in the top-right. A neutral monster has no hero.
- **Start formation.** The attacker's stacks start in the first column, the defender's in the last, on rows set by how many stacks the army has (VCMI `config/battleStartpos.json`, rows counted from 1): one stack on row 6; two on 3 and 9; three on 3, 6 and 9; four on 1, 5, 7 and 11; five on 1, 3, 6, 9 and 11; six on 1, 3, 5, 7, 9 and 11; seven on 1, 3, 5, 6, 7, 9 and 11. Empty army slots take no place.
- **Counts.** In battle every stack shows its exact count in a small box at its feet, not the map's size words.
- **Combat bar.** Along the bottom, left to right: System options, Surrender, Retreat, Auto combat, the message log with its scroll arrows, Cast spell, Wait and Defend. The status bar sits under it.
- **Monster stacks.** A neutral monster splits into several stacks in battle.

## What we do

- When the hero reaches a monster, `fact.battle.started` is saved with the monster's id, type, count and tile, and the battle screen covers the whole adventure screen. Its markup is the `#battle-screen-template` in `index.html`; `app/heroes/modules/battle-view.module.js` adds the 165 hexes and the stacks for each battle, and `game/ui/battle.css` styles it.
- The ground takes the colour of the monster's tile on the map (it reuses the terrain's CSS class), under a sky and a treeline drawn in CSS.
- The hero is a placeholder figure with a banner in the player's colour; stacks are drawn as monsters are on the map, with their count in the purple box. Each hex is a cell of an ARIA grid, so players with a screen reader, and the tests, can tell which stack stands where.
- The start formation is in `game/heroes/battlefield.js`. The monster is one stack for now, on row 6 of the last column.
- Only Auto combat works: it ends the battle as a win (`fact.battle.ended`), the monster is defeated and fades off the map as before. The other buttons are disabled and say they are not available yet.
- While the battle is open the adventure map ignores clicks and arrow keys (`ui.adventureMap.covered` / `ui.adventureMap.uncovered`, which the camera and selection modules honour as they do the System options popup).
- A battle open when the page reloads is shown again; one won before the reload stays won.

## Not yet

- Stacks acting: turn order, movement, attacks, the enemy's AI, Wait, Defend, Retreat, Surrender, spells.
- Splitting a monster into several stacks, double-wide creatures taking two hexes, obstacles.
- Creature pictures, the battle results window, experience from battles, losses.
