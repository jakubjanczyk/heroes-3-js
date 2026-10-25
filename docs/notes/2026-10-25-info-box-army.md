# Info box: rearranging the army (2026-10-25)

Roadmap 2.4b: the hero's army and the town's garrison can be rearranged in the info box, without opening the hero or town screen.

## How Heroes 3 does it

- The same two clicks as on the hero and town screens (`2026-10-23-garrison-exchange.md`): click a stack to frame it in yellow, then click another slot to move it there, swap the two or merge them. Clicking the framed stack again unframes it.
- Only within the one army the box shows: the hero's army, or the selected town's garrison.
- No splitting: there is no Split button, and Shift+click acts as a plain click.
- A click on a slot doesn't go round the views; a click anywhere else in the box still does.
- Hovering a slot puts the hero screen's texts in the status bar: "Select Pikeman", "Empty", "Move Pikeman", "Exchange Pikeman with Archer", "Combine Pikeman armies". The rest of the box says "Status Window".
- Right-click on a slot still opens the box's help popup until creatures have an info window.

## What we do

- The info box module draws the box anew for every change and starts `army-rearranging` over its slots each time, with splitting turned off, so anything that redraws it (another selection, the hero starting to move, a pickup, going round the views) unframes the stack.
- The hero's moves go through `command.hero.stackMove.requested`, as on the hero screen. The garrison's go through `command.town.garrisonStackMove.requested` with the town's id, since the town screen's `command.town.stackMove.requested` works on the open town only. Both end in persisted facts (`fact.hero.army.changed`, `fact.town.garrison.changed`), so a reload keeps the new order.
- The "Status Window" text moved from the status bar module to the info box module, which owns all of the box's hover texts now.
