# Town factions

Roadmap 6.5: the eight other town types, and the parts of the Castle town still missing. Only the Castle exists so far: its creatures, buildings, Hall, picture, moat and arrow towers are data (`monsters.json`, `towns.json`, `buildings.json`), its picture's art is `app/heroes/presentation/castle-town-art.js`, and its heroes are the Knights of `heroes.json` and `hero-classes.json`.

## Parts

Too large for one PR. Proposed split:

- **6.5.1 Castle's own buildings**: the town's Stables, and the Tavern's and Brotherhood of the Sword's morale for the town's defenders. The Lighthouse waits for water and boats (7.10), the Colossus for the Grail (7.11).
- **6.5.2 A second town type from the data alone**: whatever still assumes the Castle (the picture's art, a hero's class, the Hall, the town picked for the tavern's first hero of the week) read from the town type, so a new faction is its data, its art and the code for what no faction has yet. Proven with a small test town built by the builders.
- **6.5.3 Special buildings as data** (split from 6.5.2, which was too large for one PR with it). Most of the other factions' special buildings are of three kinds: a bonus to the town's defenders (Fountain of Fortune's luck, Brimstone Stormclouds' Spell Power, Glyphs of Fear's Defense, Blood Obelisk's Attack, like the Brotherhood's morale), a bonus once per visiting hero (Wall of Knowledge, Order of Fire, Hall of Valhalla, Cage of Warlords, Academy of Battle Scholars), and one that lasts the week (Mana Vortex, like the Stables). 6.5.1 has only `defenderMorale` and `weekBonus` (movement points). The plan: a building's `visit` in the map objects' reward format, run through their reward types and visit limits (now keyed by the object on the map, so once per hero needs a key for a town's building), and one `defenderBonuses` for every defenders' bonus. The buildings with their own screen or rule (Castle Gate, Skeleton Transformer, Magic University, Freelancer's Guild, Library, Lookout Tower, Cover of Darkness, Necromancy Amplifier) stay code.
- **Then each faction in three parts**, in the order Rampart, Tower, Inferno, Necropolis, Dungeon, Stronghold, Fortress, Conflux:
  - its creatures: stats, and each ability none of ours has yet;
  - its town: buildings, Hall, picture, special buildings, Mage Guild (highest level, odds, spells it never gets), walls (moat or land mines, arrow towers);
  - its heroes and hero classes, and its creature dwellings on the map.

## 6.5.1 Castle's own buildings

Checked against the Heroes 3 wiki's raw page source (Stables, Brotherhood of the Sword, Tavern, Morale, `Translation_Data/GENRLTXT.TXT`) and against the reference engine's Castle town data and its town code.

### The Stables in the town

- Needs the Barracks; 10 wood and 2000 gold (both sources; already in `towns.json`).
- A hero who walks into a Castle town with the Stables gets +400 movement points now and at the start of each day until the end of the week, the same bonus as the map's Stables (both sources). Not cumulative: a hero who has a Stables bonus this week, from the town or the map, gets nothing more from another (wiki: "Visiting another Stables or Castle town with built Stables in the same week will not give any extra movement points"; the engine gives both bonuses one shared stacking).
- It doesn't upgrade Cavaliers; only the map's Stables do (wiki; the engine's town Stables have only the movement points).
- The message opens over the town screen as it opens (our choice; the sources don't say).
- Message: "The head groom approaches leading a fine looking war horse. "This steed will help speed you in your travels. Alas, his endurance will wane with a lot of heavy riding, and you must return for a fresh mount at the start of the week."" (`core.genrltxt.580`, the engine's Stables reward, the wiki's GENRLTXT copy).
- When: on walking into the town, and when the Stables are built while a hero is in the town (the engine). The engine shows no message when the hero already has the bonus; we show none either.
- Any owner's hero gets it in the engine, the computer's too. Here only the player's heroes do for now: a computer hero's walk into a town doesn't count as a visit yet (it doesn't learn the Mage Guild's spells either).

### The Tavern and the Brotherhood of the Sword

- The Tavern: +1 morale for the defenders of the town (wiki Tavern: "Increases morale of the defending hero's army by +1"; wiki Morale: "when defending against siege"; the engine: +1 morale on the town, for its garrison and the hero in it).
- The Brotherhood of the Sword (needs the Tavern; 5 wood and 500 gold): +2 morale for the defenders (both sources).
- They add up: +3 with both (agreed). The wiki's Morale page says the Brotherhood's +2 is "in addition to Tavern"; the engine instead makes the Brotherhood's bonus replace the Tavern's (+2 in all).
- In any battle for the town, walls or none (agreed; the engine adds it in any battle in the town, the wiki's Morale page says "when defending against siege").
- Morale stays within -3 and +3, and undead still have none (as now).
- It counts for a garrison without a hero too (the engine; the game's manual: "all garrisoned creatures during a siege").
- Not shown in the hero screen's morale popup, which shows the hero's morale outside battle.

### How it is built

- The Stables' data says what it gives: `weekBonus` in `towns.json` (400 movement points, the message, and `sharedWith: "STABLES"`, the map object whose bonus it shares). The hero's week bonus is saved with `fact.hero.weekBonus.gained` as the map's Stables' is, so the map's Stables see it and the next days add it.
- The Tavern's and the Brotherhood's `defenderMorale` in `buildings.json` and `towns.json` are added to the defending side's morale when the battle is for a town: a garrison or a hero in it, walls or none.

### Left for later (6.5.1)

- A computer hero walking into a town with the Stables (with computer heroes' town visits); a hero hired in a town with the Stables (the engine gives the bonus as the hired hero appears in the town; not checked against a second source).

- The Lighthouse's sea movement (7.10); the Colossus (with the Grail, 7.11); the Tavern's better troop estimates of enemy towns (with Visions and the Thieves' Guild, already in 8.1).

## 6.5.2 A second town type from the data alone

Checked against the Heroes 3 wiki's raw page source (Tavern, Hero class) and against the reference engine's hero classes and its tavern code.

### What already comes from the town type

- Its buildings, the Hall's rows, where the picture places each building (`picture`), its creatures and dwellings, its moat and arrow towers, its Mage Guild's spell odds (`mageGuildChances` by town type): all in `towns.json`, `buildings.json`, `monsters.json` and `spells.json`.
- Still the Castle's whatever the type: the town picture's backdrop and building art (`castle-town-art.js` is imported by the town screen), and the tavern, which offers any hero.

### The town picture

- The backdrop and each building's art are looked up by the town's type. Castle keeps its art.
- A type without art of its own (a new faction before its art, or a test town) shows a plain backdrop and each building as the plain block a building without art has now, at the place its type's `picture` gives. Never the Castle's backdrop (our choice).
- The Mage Guild's room stays the Castle's for every type until a faction's town part draws its own.

### Hero classes and their town

- Every hero class belongs to one town type, two per town (wiki Hero class: "two for every town"; the engine's hero classes each have a faction). `town` in `hero-classes.json`: the Knight's is Castle.
- Only the Knight is in the data so far; the Cleric and the other factions' classes come with each faction's heroes part.

### The tavern's first hero of the week

- At the start of each week (and of the game), the left-most hero in the tavern is of the town type the player started as, whatever the tavern (wiki Tavern: "At the beginning of each week, the left-most hero in the Tavern will belong to the faction the player started as, regardless of the Tavern they are hired from."; the engine picks that slot from the player's starting faction's classes).
- The other hero is any free hero, as now (both sources).
- A hero who takes a hired one's place may be of any town type, in either slot (the engine; the wiki speaks only of the week's start).
- With no free hero of that town type, the slot takes any free hero (the engine).
- The town type the player started as: the type of the player's town at the game's start; the first of them in the scenario if they own several types (our choice: our scenarios have no chosen faction per player). A player who starts with no town started as the town type of their first hero's class (agreed).

### Left for later

- The engine weighs each class's chance to be offered by the player's town type, and never offers two heroes of one class at once. Neither is on the wiki's Tavern page; left until the other factions' heroes exist (each faction's heroes part), when it would matter.
- Each faction's Mage Guild room (its town part).
