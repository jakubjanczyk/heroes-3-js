# Monster stacks, double-wide creatures and battle cursors (2026-10-20)

Roadmap 5.3 and 5.5: a neutral monster splits into several stacks, double-wide creatures stand on two hexes, and the battlefield shows Heroes 3's battle cursors. Follows `docs/notes/2026-10-20-battle-attacks.md`.

## How Heroes 3 does it

- **How many stacks.** The hero's army strength against the monster's, each the creatures' AI value times their count: under half as strong, 7 stacks; under 0.67, 6; under as strong, 5; under 1.5 times, 4; under twice, 3; else 2. A number made from the monster's tile then takes one away on about a fifth of tiles and adds one on another fifth: the same monster always splits the same way. Never more stacks than creatures, nor more than 7. A HotA map can set the number for a monster instead.
- **Sharing out.** The creatures are shared out evenly; when they don't divide, the first stacks get one more.
- **Upgraded stack.** Sometimes the middle stack is the upgraded creature (Pikemen with Halberdiers in the middle).
- **Double-wide.** Griffins, Royal Griffins, Cavaliers, Champions and Archangels stand on their hex and the one behind it: the attacker's back half on its left, the defender's on its right. They never turn round. Past each side of the battlefield is an edge column where only a back half can stand, so an attacker's Cavalier starts in the first column with its back half in the edge.
- **Moving a double-wide creature.** The front half moves; the hexes it can reach are where both halves fit. The shaded hexes are those and the hexes their back halves would take. Clicking a hex only the back half fits on moves it so its back half is there.
- **Attacking with or against one.** Either half of a double-wide enemy can be attacked. A double-wide attacker stays where it is when a half of it is already on the hex next to the enemy, else puts its front half there, else its back half.
- **Cursors.** Over a hex the active stack can reach: walk, or fly for flyers. Over an enemy it can attack: a sword pointing in from the side it will attack from. Over anything else on the battlefield: blocked. Over your own stacks a question mark and over the hero the helmet, both opening an info window on a click. The arrow while a stack moves.

## What we do

- `game/heroes/monster-stacks.js` splits the monster when the battle starts, from the hero's army, the monster's count and its tile (`fact.battle.started` carries the tile, so a reload splits it the same way). A scenario may give a monster `stacks` (1 to 7), as a HotA map can; the loader rejects anything else. The monster's stacks stand in the start formation for that many stacks and take turns in slot order. The battle ends when the last one dies, with experience for all of them.
- `game/heroes/battlefield.js` has the edge columns (-1 and 15) and the hexes a stack stands on. `game/heroes/battle.js` checks both halves wherever a stack moves or attacks from, and plans the move or attack position as above. Stacks are sent to the view with their `hexes`.
- `battle-view.module.js` adds the edge columns as unmarked cells at each end of every row. A double-wide creature is drawn over both its hexes; its back half is marked "Cavaliers (back half)" in the hex behind it, for screen readers and the tests. Pointing at either half of an enemy attacks it.
- The view sets `data-cursor` on the battlefield (`walk`, `fly`, `blocked`, `query`, `attack-from-<side>`); `game/ui/cursors.css` maps them to pictures drawn by `scripts/build-cursors.mjs`. The sword's tip is its hotspot. The pictures are our own pixel art, not the game's. The hero figure always shows the helmet.

## Not yet

- The upgraded middle stack of a split monster.
- Clicking your own stack or the hero shows nothing yet, though the cursor already says it would.
- The game's extra swords for a double-wide attacker striking from straight above or below.
- Obstacles.
