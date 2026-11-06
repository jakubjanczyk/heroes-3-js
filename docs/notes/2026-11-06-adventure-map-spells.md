# Adventure map spells

Roadmap 4.8.8. Six spells can be cast on the map now: View Air, View Earth, Visions, Dimension Door, Fly and Town Portal. Summon Boat, Scuttle Boat and Water Walk wait for boats (7.10), and Disguise for enemy heroes (8.1).

Proposed parts, one PR each:

- **4.8.8.1 Casting on the map, with Town Portal**: an adventure spell is cast from the spell book on the map; Town Portal needs no aiming.
- **4.8.8.2 Dimension Door**: aiming at a tile on the map, its range and casts a day.
- **4.8.8.3 Fly**: lasts the day; the hero moves over water and obstacles, with a penalty by skill level.
- **4.8.8.4 Visions**: the exact count of monsters within range, for the day. Whether they would join waits for monsters joining (5.2); enemy heroes at Advanced and towns at Expert wait for 8.1.
- **4.8.8.5 View World, with View Air and View Earth**: the View World screen, then what each spell adds to it.

Each part's rules are checked when it's planned; only 4.8.8.1 is checked so far.

## Casting on the map — 4.8.8.1

Checked against an open-source engine's spell book window and adventure spell code.

- Clicking an adventure spell the hero can afford in the book on the map casts it: the book closes and the spell takes effect. The spell points are spent only when it works; a spell that fails with a message spends nothing.
- A spell the hero can't afford says so, as now (`core.genrltxt.206`).
- Adventure spells not built yet keep showing their description when clicked.
- Opened from the town screen, the book shows the description and casts nothing. Checked against the engine.
- With no school skill the spell is cast as Basic, as in battle (4.8.3.5).

## Town Portal (Earth, level 4, 16 / 12 / 12 / 12 spell points)

Checked against the wiki (Town Portal, and its copy of `GENRLTXT.TXT`), the descriptions in `game/data/spells.json`, and an open-source engine's spell config (`spells/adventure.json`) and town portal code.

- **Basic (and no skill)**: the hero goes to the nearest town the player owns. Nearest is measured in a straight line between the hero's tile and the town's entrance (the engine); the wiki only says "nearest". On a tie, the town listed first.
- If that nearest town has a hero standing in its entrance, the spell fails: "Nearest town occupied.  Spell Failed!" (`core.genrltxt.123`). It doesn't go to the next nearest. Checked against the wiki ("if the nearest town is occupied, the spell cannot be cast") and the engine. The hero casting it while standing in that nearest town gets the same message (the engine).
- **Advanced and Expert**: the player picks any of their towns with no hero in its entrance, in a window listing them (see the open question). Cancelling it casts nothing.
- **No town to go to** (the player owns none, or at Advanced every town has a hero in it): "No available town.  Spell Failed!" (`core.genrltxt.124`).
- **Movement**: casting it needs 300 movement points (200 at Expert) and takes them; with fewer: "Your hero is too tired to cast this spell today.  Try again tomorrow." (`core.genrltxt.125`). Checked against the wiki (300 / 300 / 200 spent) and the engine (needs and takes the same amount). The engine checks this first, before the town.
- **Arriving**: the hero stands on the town's entrance at once, without a walk, and visits the town as if they had walked in: the town screen opens and the hero learns the Mage Guild's spells. Checked against the engine (it moves the hero as a teleport, then visits the town; the player's town screen opens on a visit). The wiki says nothing on it.
- Only towns of the player (and allies, once there are teams, 8.1); never an enemy town.
- Underground, boats ("must be on land", `core.genrltxt.135`) and allies come with their features.

### Open questions

- The Advanced window: the engine reuses its town list window with the Castle Gate's texts ("Town Gate", "Select a town through the gate.", `JKTEXT.TXT`), which are an Inferno building's, not the spell's. No source shows the game's own window for Town Portal.
