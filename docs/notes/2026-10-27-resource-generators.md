# Resource generators (2026-10-27)

How these objects are built has changed since: see `2026-10-29-visitable-objects.md`. The game rules below still hold.

Roadmap 7.5: map objects that give resources once a week.

## How Heroes 3 does it

Checked against the Heroes 3 wiki (heroes.thelazy.net: Windmill, Water Wheel, Mystical Garden), Shadow of Death rules. These three are the only weekly ones: the wiki's other "resource generators" are one-time pickups (Campfire, Lean To, Wagon, the sea objects), creature banks, mines or the Trading Post.

| Object | Gives | Message |
|---|---|---|
| Windmill | 3-6 of one random resource: Ore, Mercury, Sulfur, Crystal or Gems | The keeper of the mill announces: "Milord, I have been working very hard to provide you with these resources, come back next week for more." |
| Water Wheel | 1000 gold; 500 in the first week of the first month | The keeper of the mill announces: "Milord, I have been working very hard to provide you with this gold, come back next week for more." |
| Mystical Garden | 500 gold or 5 gems, even chances | The sound of music brings you to a small garden, where you are able to sneak up on a leprechaun who is happily dancing about in the clearing. You capture him, and in exchange for his freedom he guides you to a small pot filled with precious things. |

- **Once a week per object.** The first hero to enter in a week takes it, whoever they are; every visit after that until the new week gets the second message and nothing: "…Milord, I am sorry, there are no resources currently available. Please try again next week." (Windmill), "…there is no gold currently available. Please try again next week." (Water Wheel), and for the garden "…where you attempt to sneak up on a leprechaun who is happily dancing about in the clearing. You try to capture him, but his nimbleness allows him to elude you."
- **No sign on the map** of whether an object was visited this week.
- **The message** has no title: the text, the picture of what it gives with the amount under it, and OK.

## What we do

- A scenario entity `{ "kind": "RESOURCE_GENERATOR", "type": "WINDMILL" }` (or `WATER_WHEEL`, `MYSTICAL_GARDEN`); `game/data/resource-generators.json` names them. The scenario tile is the entrance, which the hero steps onto. The rest follows the game's object table (`Objects.txt`, checked against homm3tools' copy of it); bottom row last, `E` the entrance, `#` blocked, `.` part of the picture that can be walked on:
  - Windmill `E.`: only the entrance blocks.
  - Water Wheel `###` / `##E`: two rows of three, the entrance bottom right.
  - Mystical Garden `#E#`.
- The reward is rolled when the hero enters (`config.random`, `Math.random` by default; `game/heroes/resource-generators.js`) and saved as `fact.resourceGenerator.visited` with the resources, which the kingdom adds. A reload replays it without rolling again.
- The `resourceGenerators` state slice marks an object visited and clears every mark on the first day of a week.
- No pictures yet: the object shows its name across its tiles, as the dwellings do (the Windmill across its entrance and the tile right of it).
