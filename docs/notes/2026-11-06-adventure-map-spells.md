# Adventure map spells

Roadmap 4.8.8. Six spells can be cast on the map now: View Air, View Earth, Visions, Dimension Door, Fly and Town Portal. Summon Boat, Scuttle Boat and Water Walk wait for boats (7.10), and Disguise for enemy heroes (8.1).

In five parts, one PR each:

- **4.8.8.1 Casting on the map, with Town Portal**: an adventure spell is cast from the spell book on the map; Town Portal needs no aiming.
- **4.8.8.2 Dimension Door**: aiming at a tile on the map, its range and casts a day.
- **4.8.8.3 Fly**: lasts the day; the hero moves over water and obstacles, with a penalty by skill level.
- **4.8.8.4 Visions**: the exact count of monsters within range, for the day. Whether they would join waits for monsters joining (5.2); enemy heroes at Advanced and towns at Expert wait for 8.1.
- **4.8.8.5 View World, with View Air and View Earth**: the View World screen, then what each spell adds to it.

Each part's rules are checked when it's planned; 4.8.8.1 and 4.8.8.2 are checked so far.

## Left for later parts

- 4.8.8.2 to 4.8.8.5, above. Until each is built, clicking its spell in the book shows its description.
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
- **Arriving**: the hero stands on the tile at once, without a walk, and the planned route is dropped. Landing next to a monster doesn't start a battle; walking next to it afterwards does, as usual (the wiki; the engine has the same off by default).

### Open questions

- Too tired: the engine casts with any movement left (more than 0); the wiki says it can't be cast when it would bring movement to zero or below, so more than 300 (200) is needed.
