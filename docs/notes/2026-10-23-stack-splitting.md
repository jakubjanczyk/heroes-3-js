# Stack splitting (2026-10-23)

Roadmap 6.3.6: splitting a stack between two slots on the town screen, between the garrison and the visiting hero or within either.

## How Heroes 3 does it

- **Opening it.** With a stack framed, Shift+click an empty slot or a stack of the same creature. Or press the town screen's **Split** button (greyed out until a stack is framed), which frames every slot the stack can be split onto; the next click there splits. Pressing Split again leaves split mode. A click on a different creature swaps the two stacks, as usual.
- **The window.** "Split <plural>" as its title, the creature twice, a slider with arrows, and a box under each picture with the count on that side: left for the framed stack, right for the clicked slot. Both boxes can be typed into, and the other box takes the rest. OK and Cancel; Enter and Escape do the same.
- **Starting counts.** The framed stack whole on the left, and the clicked slot's count on the right (0 for an empty slot).
- **Limits.** Between two armies, the hero keeps at least one creature: when its only stack is split away, and when the split is onto its only stack.
- **The hero's last stack.** Moving it onto an empty slot of the garrison moves all but one creature. Moving it onto the same creature there opens the split window rather than merging.

## What we do

- `game/heroes/army-exchange.js`: `canSplitStack` says whether a slot can be split onto, `splitStackLimits` gives the window's starting counts and least counts, and `splitStack` returns the armies with the clicked slot holding the chosen count and the framed slot the rest (null when it isn't allowed or changes nothing). `moveStack` splits off all but one of the hero's last stack moved to an empty garrison slot.
- The town screen view keeps split mode (`aria-pressed` on the Split button, `army-slot--split-target` on the slots it frames) and opens the window from `app/heroes/presentation/split-window.js`. OK asks for the split with `command.town.stackSplit.requested` (`{ from, to, count }`, `count` being the right-hand stack's); the town module applies it as it does a move, so the armies are persisted the same way.
- The recruit and split windows share the `count-slider`, `creature-picture` and `window-title` styles.

## Not yet

- Creature pictures: both windows show stand-ins.
