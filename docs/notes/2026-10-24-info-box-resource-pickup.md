# Info box: resource pickup (2026-10-24)

Roadmap 2.4 and 2.4b: picking up a resource pile tells the player what they found in the info box, not in a dialog.

## How Heroes 3 does it

From VCMI's `CGResource::collectRes`, `CPlayerInterface::showInfoDialog`, `CInfoBar` and `AdventureMapInterface`:

- A pile without a message of its own is shown in the info box (`EInfoWindowMode::INFO`): the resource's picture with the amount under it, in place of the selected hero or town. VCMI adds a short text over it; we show the picture and amount only.
- It stays for 3 seconds, then the selection comes back. Clicking the box brings the selection back sooner.
- The hero starting to move (`onHeroMovementStarted`) or a new selection, such as a town from the town list (`onSelectionChanged`), drops the message and shows the selection straight away.
- A pile the map gives its own message opens a dialog instead (`EInfoWindowMode::AUTO`); our scenarios have no such piles yet.

## What we do

- The hero panel module shows `fact.resource.collected` in the info box (`app/heroes/presentation/found-resources-box.js`), as the region "Resources found" with a list of pictures and amounts, ready for pickups that give more than one thing. A timer, a click on the box, `fact.move.started` and any selection bring the hero or town back.
- Pickups replayed on a reload are not shown again (`ui.restore.started` / `ui.restore.completed`).
- The resource bar and the info box share the `resource-icon` stand-ins.

## Not yet

- The pickup sound.
- Queueing several messages, which needs pickups that give several things at once (7.5-7.8).
- The other info box views: kingdom overview and date (2.4b).
