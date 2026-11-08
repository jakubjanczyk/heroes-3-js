# Adventure map spells

Roadmap 4.8.8. Six spells can be cast on the map now: View Air, View Earth, Visions, Dimension Door, Fly and Town Portal. Summon Boat, Scuttle Boat and Water Walk wait for boats (7.10), and Disguise for enemy heroes (8.1).

In five parts, one PR each:

- **4.8.8.1 Casting on the map, with Town Portal**: an adventure spell is cast from the spell book on the map; Town Portal needs no aiming.
- **4.8.8.2 Dimension Door**: aiming at a tile on the map, its range and casts a day.
- **4.8.8.3 Fly**: lasts the day; the hero moves over water and obstacles, with a penalty by skill level.
- **4.8.8.4 Visions**: the exact count of monsters within range, for the day. Whether they would join waits for monsters joining (5.2); enemy heroes at Advanced and towns at Expert wait for 8.1.
- **4.8.8.5 View World, with View Air and View Earth**: the View World screen, then what each spell adds to it.

Each part's rules are checked when it's planned; 4.8.8.1 to 4.8.8.4 are checked so far.

## Left for later parts

- 4.8.8.5, above. Until each is built, clicking its spell in the book shows its description.
- Dimension Door from a boat, and onto land from one (7.10).
- Town Portal underground, from a boat ("must be on land", `core.genrltxt.135`) and to allies' towns, with their features (7.10, 8.1).

## Casting on the map — 4.8.8.1

Checked against an open-source engine's spell book window and adventure spell code.

- Clicking an adventure spell the hero can afford in the book on the map casts it: the book closes and the spell takes effect. The spell points are spent only when it works; a spell that fails with a message spends nothing.
- A spell the hero can't afford says so, as now (`core.genrltxt.206`).
- Adventure spells not built yet keep showing their description when clicked.
- The book casts whether it was opened from the map or from the hero screen; from the hero screen, the hero screen closes as the spell is cast (decided with the user; the engine leaves it open).
- Opened from the town screen, the book shows the description and casts nothing. Checked against the engine.
- With no school skill the spell is cast as Basic, as in battle (4.8.3.5).

## Town Portal (Earth, level 4, 16 / 12 / 12 / 12 spell points)

Checked against the wiki (Town Portal, and its copy of `GENRLTXT.TXT`), the descriptions in `game/data/spells.json`, and an open-source engine's spell config (`spells/adventure.json`) and town portal code.

- **Basic (and no skill)**: the hero goes to the nearest town the player owns. Nearest is measured in a straight line between the hero's tile and the town's entrance (the engine); the wiki only says "nearest". On a tie, the town listed first.
- If that nearest town has a hero standing in its entrance, the spell fails: "Nearest town occupied.  Spell Failed!" (`core.genrltxt.123`). It doesn't go to the next nearest. Checked against the wiki ("if the nearest town is occupied, the spell cannot be cast") and the engine. The hero casting it while standing in that nearest town gets the same message (the engine).
- **Advanced and Expert**: the player picks any of their towns with no hero in its entrance, in a window titled "Town Portal" listing them by name, with OK and Cancel. Its prompt, "Select the town to teleport to.", is our own wording (decided with the user): no source shows the game's window for the spell; the engine reuses the Castle Gate's ("Town Gate", "Select a town through the gate.", `JKTEXT.TXT`), an Inferno building's texts. Cancelling casts nothing.
- **No town to go to** (the player owns none, or at Advanced every town has a hero in it): "No available town.  Spell Failed!" (`core.genrltxt.124`).
- **Movement**: casting it needs 300 movement points (200 at Expert) and takes them; with fewer: "Your hero is too tired to cast this spell today.  Try again tomorrow." (`core.genrltxt.125`). Checked against the wiki (300 / 300 / 200 spent) and the engine (needs and takes the same amount). The engine checks this first, before the town.
- **Arriving**: the hero stands on the town's entrance at once, without a walk, and visits the town as if they had walked in: the town screen opens and the hero learns the Mage Guild's spells. Checked against the engine (it moves the hero as a teleport, then visits the town; the player's town screen opens on a visit). The wiki says nothing on it.
- Only towns of the player (and allies, once there are teams, 8.1); never an enemy town.
- Built: `townPortal` in the spell's data, by skill level (`choosesTown`, `movementPoints`). The cast is one fact for the spell points, then the movement points, the move (marked as a teleport, so the hero doesn't walk and their planned route is dropped) and the town visit.

## Dimension Door (Air, level 5, 25 / 20 / 20 / 20 spell points) — 4.8.8.2

Checked against the wiki (Dimension Door, raw source, and its copy of `GENRLTXT.TXT`), the descriptions in `game/data/spells.json`, and an open-source engine's spell config (`spells/adventure.json`) and Dimension Door code.

- **Aiming**: clicking the spell in the book closes it and the map waits for a tile, with the Dimension Door cursor. Clicking a valid tile casts it there; right-click or Escape cancels and casts nothing.
- **Range**: up to 9 tiles left or right and 8 up or down from the hero's tile, diagonals included (a 19 × 17 box). Checked against the wiki and the engine.
- **Casts a day**: no skill 1, Basic 2, Advanced 3, Expert 4 (the book's descriptions, the engine). One more after that: "%s is not skilled enough to cast this spell again today." with the hero's name (`core.genrltxt.338`), checked in the engine; the wiki only gives the counts. The count resets on the next day.
- **Movement**: each cast takes 300 movement points (200 at Expert), down to 0 if the hero has fewer. With none left: "Your hero is too tired to cast this spell today.  Try again tomorrow." (`core.genrltxt.125`).
- **Where it can land**: an empty, passable tile: not one an object, monster or hero stands on or blocks. On such a tile the cursor stays the plain arrow and clicking does nothing (the wiki, the engine).
- **Fog**: the tile may be under the fog (the wiki's note: the manual's "visible" is wrong; the engine ignores the fog for it). Landing reveals the hero's sight around the new tile, as walking does.
- **Water**: landing on water fails with "Dimension Door failed!" (`core.genrltxt.70`), and the spell points, movement and the day's cast are still spent (the wiki, the engine's "waterLandFailureTakesPoints"). From a boat waits for 7.10.
- **Arriving**: the hero stands on the tile at once, without a walk, and the planned route is dropped. Landing on a tile a monster guards (next to it) starts the battle, as stepping there does (decided with the user; the wiki says landing there starts none, and the engine has that off by default).

- **Too tired**: cast with any movement left (more than 0), ending at 0, as the engine does (decided with the user); the wiki says more than 300 (200) is needed.
- **Cursor**: the same Dimension Door cursor over a guarded tile (the engine's default).
- Right-click on the map or Escape stops aiming.
- Built: `dimensionDoor` in the spell's data, by skill level (`castsPerDay`, `movementPoints`) and its `range`. The cast is one fact for the spell points (counting the day's casts), then the movement points, then the move, marked as a teleport.

## Fly (Air, level 5, 20 / 15 / 15 / 15 spell points) — 4.8.8.3

Checked against the wiki (Fly, raw source, and its flying movement points table, `Template:Flying_movepoints_consumption_table`), the descriptions in `game/data/spells.json`, and an open-source engine's spell config (`spells/adventure.json`) and pathfinder code.

- **Casting**: clicking Fly in the book on the map (or the hero screen, which closes) casts it at once: no aiming, no movement points taken, no limit of casts a day (the engine). The castle's Mage Guild never has it (level 5), so only a scenario hero who starts with it can cast it for now; the demo map's first hero does.
- A route planned before the cast is dropped, so the next click plans it in the air (our own choice).
- **Lasts the day**: until the hero's next day starts (the wiki, the engine's one-day bonus).
- **Penalty**: no skill and Basic 40%, Advanced 20%, Expert none (the wiki: "without Air Magic equivalent to the basic level"; the engine's config).
- **Where the hero flies**: over water and over any tile a map object blocks (obstacles, the blocked tiles of mines, towns, dwellings), never over rock (the wiki: "except rock"). Never over tiles not explored yet, as walking. Flying over an object's tile visits nothing.
- **Guards**: passing over a tile a monster guards starts no battle (the engine: a guard's zone is ignored while flying; the wiki's note that HotA, a fan expansion, changed exactly this). Landing on a guarded tile, or on an object a monster guards, starts the battle as walking there does (decided with the user; the original game lets a flying hero take a guarded object without the fight, HotA doesn't).
- **Over what**: water, objects' blocked tiles, and the tiles monsters, heroes and towns stand on (the engine; decided with the user, the wiki only says "any obstacles").
- **Landing**: a route ends only where a walking route could (a free tile, or an object or monster it visits or fights). "You must land at the end of the turn" (the spell's text): the flying part of a route is paid out of today's movement points, so a crossing longer than what is left today has no route (the engine's one-turn limit for flying). Steps on later days are walked, without the spell.
- **Step costs while flying**: a step costs the lesser of its usual cost and 100 + penalty (140 / 120 / 100); a step off water or a tile an object stands on costs 100 + penalty; diagonals × √2 as usual (197 / 169 / 141). Roads and grass keep their own, cheaper costs. Checked against the wiki's table and the engine's pathfinder. The engine counts water's own cost (100) as the usual cost, so flying off water would cost 100 there; we follow the wiki's 140 / 120 / 100 (decided with the user). The drop to 0 when what is left can't pay a step is checked against the cheapest step flying.
- No message on casting, and nothing on the hero screen shows the spell.
- Built: `fly.penalty` in the spell's data, by skill level, and `flyable` on water's terrain. The cast fact holds the hero's flight for the day (its penalty, kept at the level it was cast at); the new day drops it. The route search flies only while the route's cost fits the movement points left today, and later days are walked at their usual costs.

## Left after 4.8.8.3

- Angel Wings (Expert Fly while worn) with the artifacts (7.8). Pathfinding's lower costs with the skill's effects (4.7).

## Visions (all four schools, level 2, 4 / 2 / 2 / 2 spell points) — 4.8.8.4

Checked against the wiki (Visions, raw source, and its copy of `GENRLTXT.TXT`), the descriptions in `game/data/spells.json`, an open-source engine's spell config (`spells/adventure.json`) and its monster and hero code, and a web search (the game's manual pages and guides give the same ranges).

- **Casting**: clicking Visions in the book on the map (or the hero screen, which closes) casts it at once, like Fly: no aiming, no movement points, no limit of casts a day, no message (the engine). The castle's Mage Guild can roll it (level 2), and the demo map's first hero knows it.
- **Skill level**: it belongs to every school, so the hero's best magic school skill sets the level; with none it's cast as Basic, as the other spells (4.8.8.1). The book's no-skill text promises less ("a basic idea of the strength"), but the engine gives no skill the Basic effect.
- **Lasts the day**: until the hero's next day starts (the wiki, the engine's one-day bonus). Cast again the same day, the better level of the two is kept (the engine).
- **Range**: Power × 1 / 2 / 3 at Basic / Advanced / Expert, and never under 3 tiles (the wiki, the manual, the engine). Power is the hero's at the moment the monster is looked at (artifacts included), and the distance is from the hero's tile at that moment, not where they cast it: the hero carries the effect around all day (the engine).
- **Distance**: a straight line from the hero's tile to the monster's (the engine; the wiki only says "range"). The engine counts a monster in range when the distance is less than the range, so at range 3 a monster 3 tiles straight across is out and one 2 across and 2 down (2.8) is in. Strictly less, as the engine (decided with the user; the wiki doesn't say).
- **What it shows**: for a monster in range of the selected hero, the status bar and the right-click popup show the exact count and the creature's name instead of the size word: "12 Skeletons", "1 Skeleton" (the engine). The popup then has a second paragraph saying whether they join, pay to join, flee or fight (`core.genrltxt.243` to `246`), which waits for monsters joining and fleeing (5.2).
- Only the selected hero's Visions count; selecting another hero of the player who hasn't cast it shows the size words again (the engine reads the current hero). Monsters out of range, or under the fog, show what they show now.
- Nothing else changes: the guard texts of dwellings and artifacts ("guarded by a pack of …") keep the words, and the battle shows its stacks as now (the engine reads Visions only for wandering monsters' hover and popup).

- Built: `visions` in the spell's data (`rangePerPower` by skill level, `minimumRange`). The cast fact holds the hero's Visions for the day; the new day drops it. The status bar and the popup ask whether the selected hero's Visions reach the monster.

## Left after 4.8.8.4

- Whether the monsters would join, pay, flee or fight, in the popup (5.2).
- Enemy heroes at Advanced, enemy towns at Expert (8.1).
- A Rogue in the army acting as Expert Visions all the time, with Rogues (5.1, the other factions).
