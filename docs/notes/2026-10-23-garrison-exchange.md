# Garrison exchange (2026-10-23)

Roadmap 6.3.6: moving creatures between a town's garrison and its visiting hero on the town screen.

## How Heroes 3 does it

- **Two clicks.** Clicking a stack frames it in yellow. Clicking another slot moves the framed stack there: onto an empty slot it moves, onto a stack of the same creature the two merge, onto another creature the two swap places. Clicking the framed stack again unframes it.
- **Both rows.** It works between the garrison row and the visiting hero row, and within either row.
- **A hero always has an army.** The hero's last stack can't be moved or merged away; it can only swap with another stack.
- **Status bar.** Hovering a slot says what clicking it does, with the creature's singular name (VCMI's `CGarrisonSlot::hover`): "Select Pikeman (in garrison)" or "(visiting)", "Empty"; with a stack framed, "Exchange Archer with Pikeman", "Combine Pikeman armies", "Move Pikeman", "Cannot move last army to garrison", and "View Pikeman" on the framed stack itself.
- **Splitting.** Shift+click or the split button divides a stack between two slots.

## What we do

- `game/heroes/army-exchange.js` (`moveStack`) is the rule: it takes the armies by name (`garrison`, `hero`) and a `{ army, slot }` to move from and to, and returns the armies after the move, or null when the move isn't allowed (an empty slot to move, an army that isn't there, a hero left without creatures).
- The town screen view keeps which stack is framed (`aria-current` on its slot) and asks for the move with `command.town.stackMove.requested`. The town module applies it to the open town and emits `fact.hero.army.changed` and `fact.town.garrison.changed` for the armies that changed; both are persisted, so a reload shows the same armies.
- Any town screen update unframes the stack; a refused move changes nothing, so the stack stays framed.
- With no hero in town, the garrison can still be rearranged.
- `describeSlotHover` in the same file words the status bar text; the view refreshes it when the framed stack changes under the mouse. The framed stack itself shows nothing, not "View", until creatures have a window.

## Not yet

- Splitting stacks.
- Opening a creature's window by clicking the framed stack, as Heroes 3 does; it unframes it until creatures have a window.
