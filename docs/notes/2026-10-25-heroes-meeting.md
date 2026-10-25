# Heroes meeting (2026-10-25)

Roadmap 4.5.3: two of the player's heroes meet on the map and trade creatures on the exchange screen.

## How Heroes 3 does it

- **Meeting.** Over another of the player's heroes the selected hero can reach, the cursor is the exchange cursor, numbered with the day it gets there like the others. The route is planned with the usual two clicks; the hero stops on the tile next to the other hero and the exchange screen opens. As with any visit from the next tile, the step onto the other hero's tile is paid for.
- **The screen** (800 × 600): each hero's banner ("Rosic, Level 4 Witch") and portrait at the top, the four primary skills between them (left hero's value, icon, right hero's value), then each hero's specialty, experience, spell points, morale and luck, and eight secondary skills. Under them the two armies of seven slots with an arrow under each slot, and between the armies the move all left, swap and move all right buttons. Lower down the artifact swap buttons, the two paper dolls with four double-arrow buttons between them, the backpacks, and along the bottom the status bar and the ✓.
- **The visiting hero is on the left.**

## What we do

- **Meeting.** `game/heroes/entity-behaviors/hero.js` makes a hero something to visit from the next tile (`HERO_MEET`). Its outcome opens the screen with `ui.heroExchange.openRequested` (`{ heroId, otherHeroId }`). A click on another hero plans a route to them; the selection module selects that hero only when there is no route. Any hero counts as the player's own until there are other players.
- **Cursor.** `exchange` and `exchange-2` to `exchange-4` (`scripts/build-cursors.mjs`); the helmet over the selected hero, and over another hero with no route to them.
- **Moving creatures**, all in `game/heroes/army-exchange.js` on the armies `left` and `right`:
  - Click a stack, then a slot: move, merge or swap, between both armies and within one, and Shift+click to split, as on the town and hero screens (`createArmyRearranging`). Every army but a town's garrison is a hero's, so a hero always keeps a creature: a hero's last stack moved to the other hero leaves one behind.
  - The arrow under a slot (`sendStack`) sends the stack onto the same creature in the other army, else into its first empty slot; nothing happens without room. A last stack leaves one creature.
  - Move all (`sendAllStacks`) sends every stack in slot order; one creature stays in the giving hero's first stack, and stacks without room stay.
  - Swap (`swapArmies`) trades the armies slot for slot.
- The screen asks with `command.heroes.*` (`stackMove`, `stackSplit`, `stackSend`, `armySend`, `armiesSwap`), each naming `heroIds: { left, right }`. `hero-army.module.js` applies them and emits `fact.hero.army.changed` for each hero whose army changed, which is saved, so a reload keeps the armies. The screen isn't saved.
- `app/heroes/modules/hero-exchange-view.module.js` draws it from `#hero-exchange-template` in `index.html`, styled in `game/ui/hero-exchange.css` the way the hero screen is: every part placed in the game's pixels and the window scaled as a whole.
- What the game has no data for yet is an empty frame: specialty, spell points, morale, luck, secondary skills, the artifact swap buttons, the paper dolls and their slots, the double arrows, the backpacks and the two buttons beside the status bar.

## Not yet

- Status bar texts and right-click popups over the banners, portraits, primary skills and buttons.
- Dragging stacks between heroes.
- Meeting another player's hero starts a battle (needs players, 8.1).
