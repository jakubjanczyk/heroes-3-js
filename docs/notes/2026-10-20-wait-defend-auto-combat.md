# Wait, Defend, Auto combat and keyboard shortcuts (2026-10-20)

Roadmap 5.7 and 10.6: three buttons of the combat bar work, each with its Heroes 3 key. Follows `docs/notes/2026-10-20-combat-ai.md`.

## How Heroes 3 does it

- **Wait** (W). The stack gives up its turn for now. Once every stack that did not wait has acted, the stacks that waited act, the slowest first. A stack waits once a round.
- **Defend** (D or Space). The stack ends its turn and gets +20% Defense until its next turn starts, at least 1 point when 20% rounds down to nothing (VCMI `BattleActionProcessor::doDefendAction`). The roadmap had +25%.
- **Auto combat** (A). The computer plays the player's stacks too, with the same moves and attacks, until the battle ends. The battle can be lost that way, and the army keeps what it lost.

## What we do

- The rules are in `game/heroes/battle.js`: `waitStack` and `defendStack`, and `getActiveStack` picks the stacks that waited last, slowest first (on a speed tie the reverse of the usual order). A defending stack has its bonus added to its Defense (`defenseBonus`), taken off when its next turn starts, so the damage, the retaliation and the "Attack ... (damage ...)" range all use it.
- `battle.module.js` saves `fact.battle.stack.waited` and `fact.battle.stack.defended` for the player's commands (`command.battle.stackWait.requested`, `command.battle.stackDefend.requested`). They are ignored unless a hero stack is active, nothing moves and Auto combat is off; Wait also once the stack has waited this round.
- **Auto combat** is a toggle saved as `fact.battle.autoCombat.changed`. While it is on, the hero's stacks take their turns with `planComputerTurn`, as the monster's do, and clicks on the battlefield do nothing. Pressed again, the hero's next stack waits for the player; a stack already moving finishes its move. After a reload it plays on. Auto combat no longer wins outright.
- If a whole round's worth of turns pass with no stack able to move or attack, Auto combat turns itself off rather than passing turns forever. The game's data cannot get there yet (every creature can move on an open battlefield); obstacles might.
- `ui.battle.updated` carries `canWait`, `canDefend` and `autoCombat`. The battle view disables Wait and Defend from them and sets `aria-pressed` on Auto combat.

## Keyboard shortcuts

- A button lists its keys in `aria-keyshortcuts` in `index.html` (`W`, `D Space`, `A`), so screen readers announce them, and its title shows them.
- `app/modules/keyboard-shortcuts.module.js` has one `keydown` listener. On a key it looks, at that moment, for the screen on top (the last open dialog, such as System options or the battle, else the adventure panel), finds the button there that lists the key, and clicks it unless it is disabled. A shortcut does what a click does and only when a click would; a button that isn't on screen can't be pressed.
- Keys held with Ctrl, Alt or Meta and repeats are ignored, and so are Space and Enter on a focused button, which presses it already.
- Arrow keys (camera input) and Escape (the dialog's own) stay where they are; they press no button.

## Not yet

- Showing that a stack is defending (H3 shows it in the creature's info window).
- The combat AI waiting and defending (roadmap 5.7b, "Smarter combat AI").
- Retreat, Surrender and Cast spell, with their keys; adventure map shortcuts (roadmap 10.6).
