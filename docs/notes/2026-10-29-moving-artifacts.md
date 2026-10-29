# Moving artifacts on the hero screen (2026-10-29)

Roadmap 7.8.2, the second of seven parts of 7.8: taking artifacts off and putting them on, the backpack and its arrows, and each artifact's description. Builds on `2026-10-29-artifacts-on-the-map.md`.

## How Heroes 3 does it

The texts are checked against the game's own text files as the Heroes 3 wiki hosts them (`Translation Data/HeroScrn.txt`, `GENRLTXT.TXT` and `artraits.txt`). How moving works is checked against an open-source engine's hero screen and artifact code only: neither the wiki nor the manual describes it. Not yet checked in the game.

- **Taking.** Clicking an artifact, worn or in the backpack, takes it onto the pointer: the pointer shows its picture and its place empties. A held artifact counts for nothing. One taken from the backpack closes the gap: the ones after it move one place left.
- **Putting on.** Clicking a slot of the held artifact's kind puts it there. Either ring slot takes a ring, any of the five misc slots a misc artifact. A slot of another kind does nothing and the artifact stays held.
- **Swapping.** If that slot holds an artifact, the two swap: the held one goes on and the other is now held.
- **The backpack.** Clicking a backpack frame puts the held artifact in at that place, never swapping: the one there and those after it move one place right. A frame past the last artifact puts it at the end.
- **The arrows** move the whole backpack round by one: right sends the first artifact to the end, left brings the last to the front. They do nothing with five or fewer. The new order is kept.
- **Closing the screen** with an artifact held puts it where a picked-up artifact goes: the first free slot of its kind, otherwise the end of the backpack.
- **Status bar.** Over an artifact, "View <artifact> Info" (`core.heroscrn.1`); over an empty slot or frame, "Empty" (`core.genrltxt.507`).
- **Right-click** on an artifact shows its name and its description, e.g. Centaur's Axe: "This right handed weapon increases your Attack skill by +2." (`artraits.txt`, which writes the name in braces before it).

## What we do

- Each artifact in `game/data/artifacts.json` has its `description`, without the name.
- The held artifact is part of the hero's artifacts (`held`), saved with each change as `fact.hero.artifacts.changed`, so a reload keeps the order the player left. A reload while one is held shows it held when the hero screen opens.
- No pictures yet: the held artifact is the same name stand-in the slots show, following the pointer.
- The backpack's full limit (64) is 7.8.5.

## Not yet

- Artifact pictures and the pointer showing one (10.1).
- The exchange screen (7.8.6), combination artifacts (7.8.7).
