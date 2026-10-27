---
name: new-map-object
description: Use before planning or building a new adventure map object (a mine, dwelling, bonus object, building on the map, ...), or a game rule or message text not yet in the repo. Reads the object's real size from the game's object table and checks its rules and texts against outside sources.
---

# New map object

Don't guess an object's size, rules or texts from memory, a picture or one wiki page. Look each one up as below, without waiting to be asked. Do it when the object is planned (the note in `docs/notes/`), before the test scenarios are written.

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
   - Write the blocked tiles into the object's footprint table as offsets from the entrance, `y` negative upwards. The scenario tile is the entrance.
   - Put the grid in the note (`E` the entrance, `#` blocked, `.` part of the picture that can be walked on, bottom row last), saying it's from the game's object table (homm3tools' copy).
   - An object with more than one entrance tile, or none, is unusual: say so in the note and ask how to handle it.

## Rules and texts

Check every rule and message against at least two of these before writing it down:

1. **The Heroes 3 wiki, raw page source.** Get exact message texts from `https://heroes.thelazy.net/index.php?title=<Page_Name>&action=raw`. The rendered page, or a summary of it, splits and rewords texts. The `{{AMLocation}}` template lists the visit message first, then the visited-again message. Several messages in one field are separated by `* * *`.
2. **VCMI's object config.** Fetch it with `curl -sSfL https://raw.githubusercontent.com/vcmi/vcmi/develop/config/objects/<file>.json`, where `<file>` is one of `rewardableOncePerHero`, `rewardableOncePerWeek`, `rewardablePickable`, `rewardableBonusing`, `rewardableOnceVisitable` or another file in that folder. It doesn't contain the game texts, but it does show:
   - what each reward gives, its limiters (cost, level) and whether the player can refuse (`canRefuse`);
   - which message number is which: `onSelectMessage`, `onVisitedMessage`, `onEmptyMessage` (the case where nothing can be given, e.g. too little gold), as `core.advevent.<n>`;
   - whether the right-click popup has a line on the bonus: `description` (`core.xtrainfo.<n>`). No `description` means the popup has none.
   - the visit rules: `visitMode`, `selectMode` and `resetParameters`.
   For game mechanics outside the object configs (battles, skills, spells), search its source on GitHub.
3. **A web search** for anything still unclear, or where the two above disagree.

Where the sources disagree, or none of them says, write that down and ask instead of picking one. Texts nobody can confirm, such as the bonus line in the popup, are written in our own wording and marked as such in the note.

## Writing it down

- In the note, say what each fact was checked against ("checked against the Heroes 3 wiki", "from the game's object table"), and list what couldn't be checked.
- Never mention VCMI in code, tests or docs (AGENTS.md): describe the rule itself. VCMI is only for checking.
- When reporting the plan to the user, say what was verified and against which source.
