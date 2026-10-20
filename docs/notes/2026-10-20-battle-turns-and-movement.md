# Battle turns and movement (2026-10-20)

Roadmap 5.4 and 5.5: stacks take turns and the player moves them on the hex grid. Follows `docs/notes/2026-10-20-battle-screen.md`.

## How Heroes 3 does it

- **Turn order.** Each round every stack acts once, fastest first. On a tie the attacker's stack goes first, and within one army the earlier army slot. When every stack has acted, a new round starts.
- **Active stack.** The stack whose turn it is has a pulsing yellow outline. The hexes it can move to this turn are shaded darker.
- **Walking.** A walking stack goes up to its speed in hex steps, around the other stacks, and walks the path hex by hex.
- **Flying.** A flying stack reaches any free hex within its speed counted as the crow flies, over other stacks, and flies there in a straight line.
- **Status bar.** Over a hex the stack can move to it reads "Move Skeletons here", or "Fly Angels here" for flyers (`GENRLTXT`), with the creature's plural name. Over a hex out of reach it stays empty.

## What we do

- The rules are plain functions: hex neighbours, walking paths and the reach of a stack in `game/heroes/battlefield.js`, whose turn it is in `game/heroes/battle.js`. The top row and every second row under it sit half a hex to the right, so a hex on such a row touches the hexes above and below it and the ones to their right.
- `app/heroes/modules/battle.module.js` keeps the battle. Clicking a shaded hex asks it to move the active stack (`command.battle.stackMove.requested`); it saves one `fact.battle.stack.moved` with the whole path, which also ends the stack's turn, so a reload mid-move finds it where it was going. It then shows the stack walking hex by hex, `battleStepDelayMs` (180 ms) per hex; a flyer takes as long as walking that far in a straight line would. Once the move has been shown, the next stack gets the turn. Clicks while a stack moves are ignored.
- The monster has no AI yet: when its turn comes it stays where it is and its turn ends at once (also when it is the fastest at the start, or is next after a reload).
- After each change the battle module reports the battle as the player sees it (`ui.battle.updated`: the stacks and their hexes, the active stack, the hexes it can reach). `battle-view.module.js` draws that: the active stack's creature has `aria-current`, hexes out of reach are `aria-disabled`, and a stack that changes hex slides there with the Web Animations API (not while the session is restored).
- A battle open at reload comes back with the stacks where they were and the same stack active, from the saved facts.
- Auto combat still wins the battle at any moment.

## Not yet

- Double-wide creatures (Griffins, Cavaliers...) take one hex for now.
- Attacks, Wait, Defend, the enemy's AI, the turn-order queue (not in the original game).
- Battle cursors (walk, fly, forbidden).
- Obstacles.
