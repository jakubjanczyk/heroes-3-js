---
name: new-map-object
description: Use before planning or building a new adventure map object (a mine, dwelling, bonus object, building on the map, ...). Reads which tiles the object blocks from the game's object table and ports them into the repo; its rules and texts are checked with the game-sources skill.
---

# New map object

Don't guess an object's size from memory, a picture or a wiki page. Look it up as below, without waiting to be asked. Do it when the object is planned (the note in `docs/notes/`), before the test scenarios are written. Its rules and texts follow the `game-sources` skill.

## Size: which tiles it blocks

Take it from the game's object table, as homm3tools (a map tool) ships it, and port it into the repo. The game's own `Objects.txt` sits inside its data archive and isn't online.

1. Clone it into the scratchpad: `git clone --depth 1 https://github.com/potmdehex/homm3tools.git`.
2. Find the object in `h3m/h3mlib/gen/object_names_hash.in`, which maps a name to an index (`School of War0=1027`). Several lines for one object are terrain variants (`Water Wheel_Snow0`) or different pictures (`Gold Mine_Grass1`), and they can differ. Use the one without a terrain suffix, or say in the note which one and why. Nothing found: try other spellings (`Archer's Tower`), then ask instead of guessing.
3. Read its record from `h3m/h3mlib/gen/def_bodies_hex.h`: 42 bytes per index, laid out as in `h3m/h3mlib/h3m_structures/object_attributes/h3m_oa_body.h`.
   - Bytes 0-5 are the passable mask and bytes 6-11 the action mask: one byte per row, top row first, of an 8×6 grid anchored at the object's bottom-right corner.
   - Bit 7 of each byte is the rightmost column, bit 0 the leftmost.
   - A clear passable bit blocks the tile. A set action bit is the entrance, which is blocked too and visited by stepping onto it. Tiles of the grid with neither are walkable.
4. Decode it with a throwaway script in the scratchpad, not in the repo. Before trusting the output, decode an object the repo already has and compare: Marletto Tower must come out `#E`, the Water Wheel `###` over `##E`.
5. Port it:
   - Write the blocked tiles into the object's footprint as offsets from the entrance, `y` negative upwards. The scenario tile is the entrance. For a bonus object or resource generator that is its `footprint` in `game/data/bonus-objects.json` or `game/data/resource-generators.json`; other kinds keep a footprint table in their entity behaviour.
   - Put the grid in the note (`E` the entrance, `#` blocked, `.` part of the picture that can be walked on, bottom row last), saying it's from the game's object table (homm3tools' copy).
   - An object with more than one entrance tile, or none, is unusual: say so in the note and ask how to handle it.

## Rules and texts

Follow the `game-sources` skill. For a map object, VCMI's `config/objects/<file>.json` also shows (`<file>` is e.g. `rewardableOncePerHero`, `rewardableOncePerWeek`, `rewardablePickable`, `rewardableBonusing` or `rewardableOnceVisitable`):

- what each reward gives, its limiters (cost, level) and whether the player can refuse (`canRefuse`);
- which message number is which: `onSelectMessage`, `onVisitedMessage`, `onEmptyMessage` (the case where nothing can be given, e.g. too little gold), as `core.advevent.<n>`;
- whether the right-click popup has a line on the bonus: `description` (`core.xtrainfo.<n>`). No `description` means the popup has none.
- the visit rules: `visitMode`, `selectMode` and `resetParameters`.

On the wiki, an object's `{{AMLocation}}` template lists the visit message first, then the visited-again message. Several messages in one field are separated by `* * *`.

## Bonus objects and resource generators

These are data only: name, footprint, visit limit, requirements, cost, rewards, rolled values and messages all go in the object's entry in `game/data/bonus-objects.json` or `game/data/resource-generators.json`. `docs/notes/2026-10-29-visitable-objects.md` lists the fields and reward types. Map what the game's rules say onto them:

- the visit rules (`visitMode`, `resetParameters`) onto `visits`;
- the limiters onto `requires` and `cost`, and `canRefuse` onto `choices` or `asksFirst`;
- the rewards onto reward types; the messages onto `gives`, `visited`, `offer`, `tooPoor` and the `requires` keys.

Write code only for a part the list doesn't have (a new reward type, say): add it once, then the object stays data. `game/heroes/visitable-objects/check-definition.test.js` checks the entry.

## Writing it down

- In the note, say the footprint is from the game's object table (homm3tools' copy), alongside what `game-sources` asks for.
