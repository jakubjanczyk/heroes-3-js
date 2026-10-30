# Chest artifacts and a full backpack (2026-10-30)

Roadmap 7.8.5, the fifth of seven parts of 7.8, and the random Treasure Chest left open in 7.7. Builds on `2026-10-29-artifacts-on-the-map.md` and `2026-10-19-treasure-chests-and-hero-levels.md`.

## How Heroes 3 does it

Checked against the Heroes 3 wiki's raw page source (Treasure Chest, Artifact, and the `advevent.txt` page of Translation Data) and against an open-source engine's chest data and artifact object code.

- **The backpack holds 64** (wiki, twice). With it full, no artifact can be picked up, even one whose slot is free (wiki). The open-source engine sets no limit by default but has a setting for one; we follow the wiki.
- **Full backpack message**: "You cannot pick up this artifact, you already have a full load!" (`core.advevent.2`, checked against both). The artifact stays on the map. A guarded artifact still asks about its guards first (open-source engine); won with a full backpack, it stays on the map with no guards left.
- **What a chest holds**: 1000 gold or 500 experience (32%), 1500 or 1000 (32%), 2000 or 1500 (31%), or an artifact (5%), checked against both. The artifact is a random one of the Treasure class, given with no choice.
- **The artifact chest's message**, under the "Chest" title: "After scouring the area, you fall upon a hidden chest, containing the ancient artifact '%s'." (`core.advevent.145`, checked against both).
- **Where the artifact goes**: the wiki says the backpack; the open-source engine puts it in the first free slot of its kind, else the backpack. Decided with the user: the first free slot, as for any artifact picked up.
- **A full backpack**: the wiki says the chest then offers gold or experience, without saying how much. Decided with the user: one of the three gold-or-experience choices, at random.
- **No window showing the whole backpack** in the game itself: it shows five at a time with the arrows (7.8.2). Some remakes add one; it is an optional extra for later.

## What we do

- A chest's `tier` in the scenario is 1, 2, 3 or `"artifact"`; without one, the game rolls it (32 / 32 / 31 / 5). An artifact chest also rolls its artifact and the tier it offers a hero with a full backpack. Everything is rolled once when the game starts and saved as `fact.treasureChests.rolled`, so a reload keeps what each chest holds.
- Opening an artifact chest shows the "Chest" message with OK; closing it saves `fact.treasureChest.opened` with the artifact, which goes on as a picked-up one does, and the chest leaves the map.
- `BACKPACK_CAPACITY` in `game/heroes/artifacts.js`.

## Not yet

- The tavern's "… with N artifacts" (`core.genrltxt.215`): no hero in the tavern has artifacts until a retreating or surrendering hero keeps theirs (4.5.5).
- A picture of the artifact under the chest's message (10.1).
- Other things that give artifacts (creature banks, the Grail, enemy heroes) checking the full backpack as they come.
