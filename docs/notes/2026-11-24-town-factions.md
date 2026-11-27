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

## Adding a town

A town type is data and art. Code is only for a rule no town has yet. Follow the `game-sources` skill for every number and text, and write them in this note under the faction's parts.

1. **Creatures**: each one in `monsters.json` with `faction` set to the town type. An ability that no creature has yet is code, with its own part (as 6.5.4b to 6.5.4f).
2. **The town**: an entry in `towns.json`, keyed by the type the scenario's town uses (`"type": "RAMPART"`):
   - `buildings`: the town's own buildings, on top of those every town has (`buildings.json`). An entry here with a shared building's id replaces the shared data. A dwelling names its `creature` and a horde building its `horde`. A building that replaces another names it in `upgrades`. A building that upgrades another doesn't count toward the town's structures. Set `structure` only to change that, either way.
   - What special buildings give is data, in fields the code already reads: `visit` (a once-per-hero or weekly bonus, in the map objects' reward format), `defenderBonuses`, `income`, `creatureGrowthPercent`, `weeklyResources`, `weeklyInterest`. See 6.5.3 and 6.5.5.
   - `hall`: the Hall's rows. Each row is a list of chains, and a chain is the buildings one slot shows in turn. The highest Mage Guild level in the rows is the town's highest level. Leave out a building the town lacks, as Rampart leaves out the Shipyard.
   - `picture`: `{ x, y, z }` on the 800x374 picture for every building drawn.
   - `moat` and `arrowTowers`, with the town's own names and damage.
3. **Mage Guild odds**: `mageGuildChances.<TYPE>` on every spell the town's Mage Guild can offer, in `spells.json`. A spell without one is never offered there.
4. **Heroes**: the town's two classes in `hero-classes.json` (`town` set to the type) and its heroes in `heroes.json`. A hero's own `startingArmy`, `spellBook` and `spells` override their class's.
5. **Map dwellings**: one entry in `dwellings.json` per creature tier, with a `footprint` when it blocks more than the tile left of its entrance (the `new-map-object` skill).
6. **Art**: `app/heroes/presentation/<town>-town-art.js` exports one `<TOWN>_TOWN_ART` object: `backdropName`, `backdrop`, `buildings` (art keyed by building id), `houses` when village houses come with the hall, and `guildWindow`. Add it to `TOWN_ART` in `town-art.js`. Shapes shared by every town go in `town-art-shapes.js`. Until its art exists, a town is drawn with the plain backdrop and plain blocks, so the art can be its own part.
7. **Demo map**: turn one of the neutral towns in `scenarios/scenario.json` into the new type, and place its creatures and map dwellings where the first hero can reach them.
8. **Tests**: behavior tests build their own test town with the builders (`tests/behavior/builders.js`). Test only rules that are new: a town that is all data needs no new tests.

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

- The Stables' data says what it gives: its `visit` in `towns.json` (since 6.5.3; a `weekMovementPoints` reward of 400, the message, and `sharesBonusWith: "STABLES"`, the map object whose bonus it shares). The hero's week bonus is saved with `fact.hero.weekBonus.gained` as the map's Stables' is, so the map's Stables see it and the next days add it.
- The Tavern's and the Brotherhood's morale (`defenderBonuses` since 6.5.3) in `buildings.json` and `towns.json` are added to the defending side's morale when the battle is for a town: a garrison or a hero in it, walls or none.

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

### How it is built

- `app/heroes/presentation/town-art.js` holds each town type's backdrop and building art; the town screen picks it by the town's type and draws it anew when a town of another type opens. A type missing from it gets the plain backdrop and plain building blocks.
- The tavern works out each player's starting town type when the world is ready, from the scenario's entities (the town's owner and type, the hero's owner and class), so a reload gives the same answer whatever was captured since.

### Left for later (6.5.2)

- The engine weighs each class's chance to be offered by the player's town type, and never offers two heroes of one class at once. Neither is on the wiki's Tavern page; left until the other factions' heroes exist (each faction's heroes part), when it would matter.
- Each faction's Mage Guild room (its town part).

## 6.5.3 Special buildings as data

Checked against the Heroes 3 wiki's raw page source (Wall of Knowledge, Order of Fire, Hall of Valhalla, Cage of Warlords, Mana Vortex, Fountain of Fortune, Brimstone Stormclouds, Glyphs of Fear, Blood Obelisk, `Translation_Data/GENRLTXT.TXT`), the game's manual (quoted in a web search) and the reference engine's town data.

### The kinds of special building

- **A bonus once per visiting hero**: Wall of Knowledge (Tower, +1 Knowledge), Order of Fire (Inferno, +1 Power), Hall of Valhalla (Stronghold, +1 Attack), Cage of Warlords (Fortress, +1 Defense), Academy of Battle Scholars (Dungeon, +1000 experience). Their messages are `core.genrltxt.581` to `585`. All five agree in both sources; the Academy has no wiki page of its own, only its text.
  - Once per hero for each town: a hero who used one town's Wall of Knowledge still gets +1 from another town's (the manual: "once per hero per scenario for each Wall of Knowledge visited"; the engine keeps each town's building's visitors).
  - Given on walking into the town, and on building it while a hero is in the town, as the Stables (the engine runs a town building's visit both times).
  - A hero who already used it gets no message (the engine shows nothing then; as the Stables).
- **A bonus that lasts the week**: the Stables (6.5.1); the Mana Vortex (Dungeon) is once a week for the first hero, not once per hero (wiki: "Only one hero per week can use this effect"; the engine resets its visitors each week). Its reward, spell points to twice the maximum (`core.genrltxt.579`), is a new reward type and comes with Dungeon's town part; this part only brings the once-a-week limit for a town building.
- **A bonus to the town's defenders**: the Tavern (+1 morale) and the Brotherhood of the Sword (+2 morale, 6.5.1), Fountain of Fortune (Rampart, +2 luck), Brimstone Stormclouds (Inferno, +2 Power), Glyphs of Fear and Blood Obelisk (Fortress, +2 Attack and +2 Defense; the wiki and the engine swap which gives which, settled in Fortress's town part).
- **Their own screen or rule**, staying code: Castle Gate, Skeleton Transformer, Magic University, Freelancer's Guild, Library, Lookout Tower, Cover of Darkness, Necromancy Amplifier, Mystic Pond, Treasury, Portal of Summoning, Escape Tunnel, the Grail buildings.

### What we decided

- A building's `visit` in its data has the map objects' fields: `visits` (`oncePerHero`, `whileBonusLasts`, `oncePerWeek`), `rewards` (the map objects' reward types: `primarySkills`, `experience`, `weekMovementPoints`, ...) and `messages.gives`. The Stables become `"visits": "whileBonusLasts"` with a `weekMovementPoints` reward and `sharesBonusWith: "STABLES"`, so the map's Stables and the town's still share one bonus.
- `oncePerHero` and `oncePerWeek` are kept for each town's building, not for the building type.
- `defenderMorale` becomes `defenderBonuses`: `{ morale, luck, attack, defense, power }`, any of them. They count in any battle for the town, as the morale does (6.5.1): for the garrison and for a hero in the town. Morale and luck stay within -3 and +3. Not shown on the hero screen, as the morale isn't.
- Proven with a test town type built by the builders: no real faction's building is added in this part (each comes with its faction's town part).

- A garrison without a hero gets them too, as it gets the morale (agreed). The wiki gives Attack, Defense, Power and luck to "defending heroes" ("the hero defending the town" for luck); the engine puts them on the town, which its garrison's creatures take too.

### How it is built

- A building's `visit` (`towns.json` or `buildings.json`) is read as a map object's data. Each town's building is a visitable object of its own, `<town id>/<building id>` (kind `TOWN_BUILDING`), kept in the `visitableObjects` slice from the start for every building of the town's type with a `visit`, so `oncePerWeek` and `oncePerHero` count it apart from the same building in another town. Its type is its `sharesBonusWith`, or the building's id.
- The `town-visit-bonuses` module asks for a visit (`command.townBuilding.visit.requested`) of each such building when a hero walks into the town, and of the one just built while a hero is there; the `visitable-objects` module decides and gives it as for a map object, with the same facts.
- `defenderBonuses` are worked out as the battle for the town starts: morale and luck join the defending side's, Attack and Defense its skills, and Power the player's defending hero's as they cast.

### Left for later (6.5.3)

- The Mana Vortex's reward (Dungeon's town part); which hero gets it with two in the town (the garrisoned one, wiki) waits for a garrisoned hero.
- A hero hired in a town with one of these buildings (the engine gives nothing until the hero walks in again; not checked against a second source).
- A computer hero's town visit (as 6.5.1).

## 6.5.4 Rampart's creatures

The first of Rampart's three parts. Too large for one PR with every ability, so in six:

- **6.5.4a The creatures**: the thirteen creatures not yet in `monsters.json` (the Centaur is), the Dragons' spell immunity, and the Dragons as kings for Slayer: data the battle already reads.
- **6.5.4b Magic resistance**: the Dwarves' own, and the Unicorns' aura.
- **6.5.4c Magic damper**: the Pegasi.
- **6.5.4d Binding**: the Dendroids.
- **6.5.4e Blinding attack**: the Unicorns.
- **6.5.4f Breath**: the Dragons.

Until its part, a creature fights without that ability.

The demo map gets a few stacks of Rampart's creatures as map monsters (agreed), so they can be met and seen.

Rampart's creatures meet the player as map monsters and in a scenario's armies; recruiting them comes with Rampart's town (6.5.5) and its map dwellings (6.5.6).

### The creatures

Checked against the Heroes 3 wiki's raw page source (each creature's `Template:Creature/<name>`, the creature pages and `Translation_Data/CRTRAITS.TXT` for names and plurals) and the reference engine's Rampart creature data (levels, upgrades, double-wide, shots and abilities). The engine's data holds no stats, so attack, defense, damage, health, speed, growth, cost and AI value are checked against the wiki only, as the Castle's were; the Dragons' also against the wiki's Dragon page's own table.

| Creature | Tier | Att | Def | Damage | HP | Speed | Growth | Cost | AI value | Abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| Centaur (have) | 1 | 5 | 3 | 2–3 | 8 | 6 | 14 | 70 | 100 | double-wide |
| Centaur Captain | 1 | 6 | 3 | 2–3 | 10 | 8 | 14 | 90 | 138 | double-wide |
| Dwarf | 2 | 6 | 7 | 2–4 | 20 | 3 | 8 | 120 | 138 | 20% magic resistance |
| Battle Dwarf | 2 | 7 | 7 | 2–4 | 20 | 5 | 8 | 150 | 209 | 40% magic resistance |
| Wood Elf | 3 | 9 | 5 | 3–5 | 15 | 6 | 7 | 200 | 234 | shoots, 24 shots |
| Grand Elf | 3 | 9 | 5 | 3–5 | 15 | 7 | 7 | 225 | 331 | shoots twice, 24 shots |
| Pegasus | 4 | 9 | 8 | 5–9 | 30 | 8 | 5 | 250 | 518 | flies, double-wide, magic damper |
| Silver Pegasus | 4 | 9 | 10 | 5–9 | 30 | 12 | 5 | 275 | 532 | flies, double-wide, magic damper |
| Dendroid Guard | 5 | 9 | 12 | 10–14 | 55 | 3 | 3 | 350 | 517 | binds (6.5.4d) |
| Dendroid Soldier | 5 | 9 | 12 | 10–14 | 65 | 4 | 3 | 425 | 803 | binds (6.5.4d) |
| Unicorn | 6 | 15 | 14 | 18–22 | 90 | 7 | 2 | 850 | 1806 | double-wide, aura of magic resistance, blinding attack (6.5.4e) |
| War Unicorn | 6 | 15 | 14 | 18–22 | 110 | 9 | 2 | 950 | 2030 | double-wide, aura of magic resistance, blinding attack (6.5.4e) |
| Green Dragon | 7 | 18 | 18 | 40–50 | 180 | 10 | 1 | 2400 + 1 crystal | 4872 | flies, double-wide, immune to spells of level 1–3, breath (6.5.4f) |
| Gold Dragon | 7 | 27 | 27 | 40–50 | 250 | 16 | 1 | 4000 + 2 crystal | 8613 | flies, double-wide, immune to spells of level 1–4, breath (6.5.4f) |

- The Centaur gets `upgradesTo: CENTAUR_CAPTAIN`, and each basic creature its upgrade.
- Growth bonuses from the Miners' Guild and the Dendroid Saplings come with Rampart's town.

### Magic resistance (Dwarves, 6.5.4b)

- A Dwarf stack resists a hostile spell with a 20% chance, a Battle Dwarf stack 40%, rolled as the Resistance skill's chance is now: the same log line, the same "resisted" sign on the stack, each stack in an area spell rolling on its own (wiki Magic resistance; the engine's creature data).
- It is the creature's own, so it counts with no hero too: map monsters resist the player's spells.
- With a hero's Resistance the two add up (a Battle Dwarf under Expert Resistance: 60%), at most 100% (the engine sums them; the wiki doesn't say how they combine).

### Aura of magic resistance (Unicorns, 6.5.4b)

- A stack standing next to one of the side's Unicorns or War Unicorns (next to either of its two hexes) gets a 20% chance to resist hostile spells; not the Unicorn itself (wiki: "does not apply to the creature itself"). Several Unicorns next to a stack still give 20% (wiki: "does not stack with multiple units of Unicorns"; the engine takes the highest).
- Only the Unicorns' own side's stacks (the engine; the wiki says "nearby units"). A hypnotized Unicorn protects the side that controls it (the engine).
- With the stack's own resistance, the aura is a second roll: a Dwarf next to a Unicorn resists 1 − 0.8 × 0.8 = 36% (the engine; the wiki doesn't say).
- It follows where the stacks stand when the spell is cast.

### How it is built (6.5.4b)

- A creature's `magicResistance` in `monsters.json` (20 for the Dwarf, 40 for the Battle Dwarf) is added to its hero's Resistance as its stacks are made, at most 100: one roll, as the hero's Resistance is now.
- A creature's `magicResistanceAura` (20 for both Unicorns) is a second roll for each stack of the same side standing next to one of its hexes, worked out where the stacks stand as the spell is cast; the highest aura counts when several touch a stack. The side is the one the Unicorn fights for now, so a hypnotized Unicorn protects its new side.
- Both only against hostile spells, as Resistance now (`isResistible`): Bless, Dispel and the other spells on one's own side never fail.
- The creature popup shows no abilities yet, so it doesn't list the resistance (as with the Dragons' immunity).

### Magic damper (Pegasi, 6.5.4c)

- A hero facing an army that had Pegasi or Silver Pegasi at the start of the battle pays 2 more spell points for each spell, until the battle ends, even after the Pegasi die (wiki; the engine counts dead stacks too).
- 2 in all, however many Pegasus stacks (the engine takes the highest; the wiki: "2 extra spell points").
- Only the other side's hero: the Pegasi's own hero pays the normal cost (both sources).
- The battle's spell book shows and checks the raised cost: a hero with 5 points can't cast a 5-point spell against Pegasi ("not enough spell points", as now).
- A hypnotized Pegasus still raises the costs of the side it came with, not of its new side's enemy: the engine compares the stack's owner, which Hypnotize doesn't change (the wiki doesn't say).
- Outside battle the spell book shows the hero's usual costs.

### How it is built (6.5.4c)

- A creature's `magicDamper` in `monsters.json` (2 for both Pegasi) is copied onto its battle stacks, as `magicResistanceAura` is.
- A spell's cost in battle is its cost for the hero plus the highest `magicDamper` among the other side's stacks, by the side each stack came with (`side`, not who it fights for now), dead stacks included: a battle keeps its dead stacks with a count of 0, so "at the start of the battle" needs nothing more. A clone is the caster's own side, so it never counts.
- The battle module checks and saves that cost in the spell-cast fact, as it saves the cost now, so a reload spends the same points; the battle's spell book shows it on each spell and in "That spell costs …".

### Spell immunity (Dragons, 6.5.4a)

- Green Dragons can't be the target of spells of level 1–3, Gold Dragons of level 1–4, either side's spells, helpful ones too, as the Power of the Dragon Father's immunity works now (wiki Spell immunity and the creature texts "Immune to spell levels 1-3." / "1-4."; the engine's creature data).
- Area spells of those levels leave them out; Armageddon (level 4) hits Green Dragons, not Gold.

### Kings (Slayer, 6.5.4a)

- Both Dragons are kings of the first group: Slayer's +8 Attack reaches them from no skill up (wiki King and Slayer pages, the engine's creature data), where the Angels need Advanced.

### How it is built (6.5.4a)

- The creatures are entries in `monsters.json`, with the abilities the battle already reads (`flying`, `doubleWide`, `ranged`, `shootsTwice`); an ability that comes in a later part is added to the data with that part.
- A creature's `spellLevelImmunity` (3 for Green Dragons, 4 for Gold) is its stacks' immunity to spells of that level and below, the higher of it and an artifact's (the Power of the Dragon Father's 4), so targeting, Expert's all-stacks spells and Armageddon treat it as they treat the artifact's.
- The Dragons' `king: 1` is the first group, which Slayer already reaches from no skill.
- The demo map has Dwarves, Wood Elves, Unicorns, Pegasi and Green Dragons east of the first hero.

### Left for later (6.5.4a to 6.5.4c)

- The binding, blinding attack and breath: 6.5.4d to 6.5.4f.
- The player's Pegasi raising a computer hero's spell costs: computer heroes don't cast yet (5.8 later).
- Growth bonuses, recruiting: Rampart's town (6.5.5) and dwellings (6.5.6).
- The Orb of Vulnerability cancelling magic resistance (7.8, with the artifact).
- The player's stacks of Dwarves, or next to Unicorns, resisting a computer hero's spells: computer heroes don't cast yet (5.8 later). The Unicorns' blinding attack meeting magic resistance comes with it (6.5.4e).

## 6.5.4d The Dendroids' binding

Checked against the Heroes 3 wiki's raw page source (Dendroid Guard and Dendroid Soldier, Teleport, Cure, Dispel, Anti-Magic, `GENRLTXT.TXT`) and an open-source engine's creature and spell config (`creatures/rampart.json`, `spells/ability.json`, `spells/timed.json`) and its battle code (casting after an attack, when a binding breaks, a bound stack's movement).

### The rules

- **What binds**: a Dendroid Guards' or Dendroid Soldiers' hit, by their attack or their strike back (wiki: "Dendroids' attacks"; the engine casts the binding after every one of their strikes, a strike back too). A stack the hit kills isn't bound. Any stack they hit, their own side's too when they are berserk (wiki fan opinion; the engine binds whatever they hit).
- **What it does**: the bound stack can't move: no hex to walk or fly to (the engine gives it no movement). It can still attack a stack next to it from where it stands, shoot, wait and defend.
- **When it ends**: once the Dendroids that bound it are no longer next to it: they moved away, were killed or were teleported (wiki: "until the stack of Dendroids that entangled them moves or perishes"; the engine checks after every action and as the bound stack's turn starts). Coming back next to it doesn't bind it again; only a new hit does. Bound by two stacks of Dendroids, it stays bound while either is next to it (engine).
- **Spells**: Dispel takes it off (wiki, engine), and a bound stack with no other spell can be Dispelled. Teleport frees it (wiki), as the Dendroids are then no longer next to it. Cure doesn't (wiki, engine). Anti-Magic on the stack doesn't keep it from being bound (wiki); immunities don't either (the engine's binding ignores them). Anti-Magic cast on a stack already bound frees it, as it takes off every spell that isn't helpful (the engine; the wiki says nothing, agreed to follow the engine).
- **Combat log**: "Roots and vines bind the %s to the ground!" (`core.genrltxt.560`, wiki copy), with the stack's plural name, after the hit's damage line; written each time they bind, a stack already bound too (engine).
- Nothing else shows it: the battle has no creature window yet; the bound stack's turn shades no hex to move to.
- A bound shooter has the Dendroids next to it, which already keeps it from shooting; it shoots while bound only when its own berserk Dendroids bound it, and a bound computer stack always has the Dendroids to attack. Neither gets a test of its own.

### What we decided

- A creature's `binds: true` in `monsters.json`, on both Dendroids.
- A bound stack carries the binding as a spell with no rounds, harmful and removable, naming the stacks that bound it, so Dispel takes it off as it takes off the others; Teleport takes it off too.
- A bound computer stack attacks a stack next to it or else lets its turn pass, as a computer stack with nowhere to go does now.
- A binding is checked as each action ends (a walk, an attack, a shot, a spell, the moat) and as each turn ends, and dropped for good once broken.
- The demo map gets a stack of Dendroid Guards near the others of Rampart, so binding can be met and seen.

### Left for later (6.5.4d)

- The count box of a stack that is only bound shows the harmful spells' colour; the engine has a neutral picture for it, not checked against the game.

- Harpies (Stronghold) striking Dendroids and flying back: a bound Harpy doesn't fly back (engine), with Stronghold's creatures.
- A creature window in battle showing the binding: not built for any spell yet.

## 6.5.4e and 6.5.4f Rampart's attack abilities (planned)

Checked so far against the wiki and the engine; planned in full when it is next.

- **Blinding attack** (6.5.4e, Unicorns): after an attack or retaliation, a 20% chance to Blind the target for 3 rounds; dragons, undead and other creatures immune to Blind aren't blinded, and magic resistance can stop it (the engine). The wiki says Basic Blind (the target strikes back at 50%), the engine casts it at Expert (no retaliation): to be asked.
- **Breath** (6.5.4f, Green and Gold Dragons): planned in full below.

## 6.5.4e The Unicorns' blinding attack

Checked against the Heroes 3 wiki's raw page source (Unicorn and War Unicorn, Blind, Damage, Retaliation, Magic resistance, `GENRLTXT.TXT`), the game's manual as the wiki quotes it ("This attack has a 20% chance of blinding an opponent"), a web search, and an open-source engine's creature and spell config (`creatures/rampart.json`, `spells/timed.json`) and its battle code (spells cast after an attack, the caster's spell level, the duration of a creature's spell, magic resistance).

### The rules

- **When**: after a Unicorns' or War Unicorns' hit, a 20% chance to cast Blind on the stack they hit (wiki, manual, engine). A stack the hit kills isn't blinded (engine). Their strike back counts too: the engine casts after every strike, the wiki says "after attacking them".
- **How long**: 3 rounds (wiki: "for 3 rounds"; the engine gives a creature's spells a power of 3), unless the stack is attacked or Dispelled or Cured first, as the hero's Blind (4.8.7.1a).
- **Its strength**: the wiki gives Basic Blind (Unicorn page; Damage page: "Unicorns and War Unicorns cast Blind with basic proficiency, unless the battle takes place on Magic Plains"): the stack strikes back at 50% when attacked and woken. The engine casts it at Expert (spell level 3 in its data): no strike back at all. Agreed to follow the wiki: Basic.
- **The strike back to the Unicorns' own attack**: the engine casts the Blind right after the Unicorns' hit, before the stack strikes back; it then strikes back as a blind stack does (none at Expert, 50% at Basic) and stays blind, since striking back isn't being attacked. The wiki's Retaliation page: "can Blind on attack which prevents creatures from acting and decreases damage of their first retaliation by 50%". Agreed: the stack is blinded before it strikes back, strikes back at 50% and stays blind.
- **Who can't be blinded**: whoever the hero's Blind can't reach: the undead and creatures immune to mind spells, Dragons' level immunity (Blind is level 2), the Pendant of Second Sight; no roll is made then (engine: it checks the spell can be cast before rolling).
- **Resistance**: the target's magic resistance (the Dwarves', the hero's Resistance skill, a Unicorn aura next to it) can resist it, as a hostile spell (engine: a creature's spell is resisted as a hero's). The wiki says nothing. Neither source gives a combat log line for it, so a resisted blinding leaves no line (our choice).
- **Combat log**: "The %s cannot see!" (`core.genrltxt.556`, the Blind spell's line, wiki copy), with the stack's plural name, after the hit's damage line (engine).
- Magic Plains and the Fiery Fields don't exist yet (battlefield terrain later).

### What we decided

- A creature's `spellAfterAttack` in `monsters.json`: `{ spell: "BLIND", chance: 20, rounds: 3, skill: 1 }` (Basic), on both Unicorns, so the next creature that casts a spell after its hit (Medusas' Stone Gaze, Scorpicores' Paralyze, ...) is only data if its spell is a lasting one. The spell's effects are its data's at that skill, for that many rounds.
- The roll is planned with the strikes, as the damage rolls are, and saved with the attack (`castsSpell` on the strike), so a reload shows the same battle. The stack's strike back is worked out with the spell already on it.
- The demo map's Unicorns already stand east of the first hero; no change.

### Left for later (6.5.4e)

- Magic Plains (expert) and Fiery Fields, with battlefield terrain.
- A creature window listing the ability.

## 6.5.4f The Dragons' breath

Checked against the Heroes 3 wiki's raw page source (Breath attack, Green Dragon and Gold Dragon, Blind, `GENRLTXT.TXT`), a web search (nothing more on luck or the log), and an open-source engine's creature config (`creatures/rampart.json`) and its battle code (which hexes an attack reaches, the secondary targets' damage, luck and log).

### The rules

- **What it hits**: a Green or Gold Dragons' melee hit also hits the stack on the hex behind the struck hex, in the direction of the attack: from the Dragons' hex the attack is made from, through the struck hex, one hex further (wiki: "also attacks the hex behind, in the direction of the attack"; the engine steps twice in that direction).
- **Friend or foe**: whatever living stack stands there, the Dragons' own side's too (wiki: "will also damage the hero's own troops if they are standing directly behind the attacked hex"; the engine's breath reaches friendly hexes). Nothing when the hex is empty, off the battlefield or holds only a corpse.
- **A double-wide target isn't hit twice**: struck along its length, the hex behind is its own other half and nothing further burns (wiki: "Creatures that are two hexes wide do not suffer double damage"; the engine never hits the struck stack again). A double-wide stack behind is hit once.
- **Its strike back breathes too** (the engine runs the same attack for a strike back; the Green and Gold Dragon page's advice of making them hit their own troops by retaliation).
- **Even when the hit kills the target** the hex behind is burnt (the engine works out both targets before the hit).
- **Damage**: worked out on its own for the stack behind: its own damage roll, against its Defense and its spells (wiki: "Damage for each attacked stack is calculated separately"; the engine rolls each target). The stack behind doesn't strike back.
- **Luck**: a lucky strike doubles only the target's damage, not the breath's (the engine, which says so of the original game and offers the other as an option). The wiki says nothing; agreed to follow the engine.
- **What being hit does to the stack behind**: it is woken from Blind (or Stone Gaze, Paralyze later) as any damage wakes it (the engine takes those spells off on any loss of health; wiki Blind: until attacked). Its Fire Shield doesn't burn the Dragons, which never struck it (the engine's Fire Shield answers only a stack that could strike it from where it stands).
- **Combat log**: one line for the attack's whole damage, "The Green Dragons do 450 damage." (`core.genrltxt.377`), then, when the breath hit a stack, the deaths of both counted together as creatures: "12 creatures perish." / "One creature perishes." (`core.genrltxt.379`, `378`, with `42`/`43` "creature(s)"), as an area spell's line now. Without a stack behind, the line names the target as now. The texts are the wiki's copy; how they combine is the engine's only.

### The Dragons above or below a target

- A double-wide Dragon right above or below a target can touch it with both its hexes. The wiki: the hex behind is on the side the Dragons came from, or by the army's facing when they came straight down. The engine: the Dragons' front hex.
- Agreed: the hex the attack is made from is the one the sword cursor shows (`fromHex`, as now), and the breath goes on through the target from there. It agrees with the wiki when the Dragons come from the left of an attacker's army, and with the engine when they stand still; it differs from the wiki for Dragons coming from the right.
- A strike back has no cursor: the Dragons breathe from their front hex when both touch the attacker (the engine).
- A double-wide target touched by one Dragon hex at both its halves (the Dragon right above its middle): the struck hex is its back half (the engine prefers it; the wiki doesn't say).

### What we decided

- A creature's `breath: true` in `monsters.json`, on both Dragons.
- The breath's hit is saved with the strike it comes from (`breath: { defenderId, damage }` on the strike), so a reload shows the same battle.

### How it is built

- `getHexBeyond(from, through)` in `battlefield.js` gives the hex on the other side of `through`, seen from `from`.
- `battle-breath.js` finds the stack beyond: from the hex the attack is made from, or the striking-back stack's front hex that touches the attacker, through the struck stack's hex next to it (its back half when both touch).
- The strike sequence rolls the breath's damage right after the strike's, without luck, and keeps the stack beyond as it is hurt, so a second breath in the same attack (two breathing stacks fighting) counts what the first did.
- The combat log puts both hits in one line, as an area spell's.

### Left for later (6.5.4f)

- The computer weighing the breath when it picks a target (smarter combat AI, 5.7b); its Dragons breathe already.
- The other breathing creatures (Red and Black Dragons, Firebirds and Phoenixes) with their factions: data only.
- The hover's damage estimate shows only the target's, as now.
- A creature window listing the ability.

## 6.5.5 Rampart's town

The second of Rampart's three parts, in two:

- **6.5.5a Rampart's town and its buildings**: the town type in `towns.json` (its buildings, Hall, where the picture places each building, Mage Guild to level 5 with Rampart's spell odds, moat and arrow towers), so a Rampart town can be built up and its creatures recruited; and the two buildings no town has yet: the Mystic Pond and the Treasury. Drawn with the plain backdrop and plain building blocks a type without art gets (6.5.2).
- **6.5.5b Rampart's town picture**: its backdrop, its buildings' art and its Mage Guild room.

Checked against the Heroes 3 wiki's raw page source (Rampart, the `RampartBuildingsDwellings` template, Mystic Pond, Fountain of Fortune, Treasury, Miners' Guild, Dendroid Saplings, Moat, Arrow tower, Mage Guild and its Spell probability table, `Translation_Data/BldgSpec.txt`, `Walls.txt` and `GENRLTXT.TXT`), the reference engine's Rampart town data, moat data, new-week income code and town screen code, and web search results quoting other fan sites (the fan sites themselves can't be fetched from here).

### The buildings

The buildings every town has keep their data (`buildings.json`). Rampart has no Shipyard (both sources).

| Building | Cost | Requires | Gives |
|---|---|---|---|
| Centaur Stables | 5 wood, 500 gold | Fort | Centaurs |
| Upg. Centaur Stables | 5 wood, 1000 gold | Centaur Stables | Centaur Captains |
| Dwarf Cottage | 5 wood, 1000 gold | Centaur Stables | Dwarves |
| Upg. Dwarf Cottage | 5 wood, 1000 gold | Dwarf Cottage | Battle Dwarves |
| Homestead | 10 wood, 1500 gold | Centaur Stables | Wood Elves |
| Upg. Homestead | 10 wood, 1500 gold | Homestead | Grand Elves |
| Enchanted Spring | 10 crystal, 2000 gold | Homestead | Pegasi |
| Upg. Enchanted Spring | 5 crystal, 2000 gold | Enchanted Spring | Silver Pegasi |
| Dendroid Arches | 2500 gold | Homestead | Dendroid Guards |
| Upg. Dendroid Arches | 1500 gold | Dendroid Arches | Dendroid Soldiers |
| Unicorn Glade | 5 wood, 5 ore, 10 gems, 4000 gold | Enchanted Spring, Dendroid Arches | Unicorns |
| Upg. Unicorn Glade | 5 gems, 3000 gold | Unicorn Glade | War Unicorns |
| Dragon Cliffs | 30 ore, 20 crystal, 10000 gold | Unicorn Glade, Mage Guild Level 2 | Green Dragons |
| Upg. Dragon Cliffs | 30 ore, 20 crystal, 20000 gold | Dragon Cliffs, Mage Guild Level 3 | Gold Dragons |
| Miners' Guild | 1000 gold | Dwarf Cottage | +4 Dwarves a week (horde) |
| Dendroid Saplings | 2000 gold | Dendroid Arches | +2 Dendroids a week (horde) |
| Mystic Pond | 2 of each resource but gold, 2000 gold | — | 1–4 of a rare resource each week |
| Fountain of Fortune | 10 crystal, 1500 gold | Mystic Pond (upgrades it) | +2 luck for the town's defenders |
| Treasury | 5 wood, 10 ore, 5000 gold | Miners' Guild | 10% interest on gold each week |

- Costs: the wiki (its dwelling template and building pages; the totals on its Rampart page add up to them) and web search results quoting two other fan wikis. They differ on two: one search result gives the Centaur Stables 10 wood, and one gives the Upg. Dwarf Cottage 1500 gold; we take the wiki's, which the other results share. The upgraded Unicorn Glade's and the special buildings' costs are in the wiki only.
- Requirements: the engine's town data, and the web search results for the dwellings (the wiki's dwelling template has none). The special buildings' requirements are on their wiki pages too, and agree.
- Hall, five rows (the engine's town data): Village Hall to Capitol, Fort to Castle, Tavern, Blacksmith; Marketplace and Resource Silo, Mage Guild 1–5, Mystic Pond and Fountain of Fortune; Treasury, Dendroid Saplings, Miners' Guild; dwellings 1–4; dwellings 5–7.
- Structures for the arrow towers: the Mystic Pond and the Treasury are, the Fountain of Fortune, Miners' Guild and Dendroid Saplings aren't (wiki Arrow tower; our rule already says a building that upgrades another isn't, and the horde buildings say `structure: false` as the Griffin Bastion does).
- Where the picture places each building is ours, as the Castle's is; the engine's positions are the starting point. The art comes in 6.5.5b.
- The Resource Silo's crystal (6.2, which brings the Silo) waits for that feature; the Blacksmith sells the First Aid Tent (5.11.6).

### Mage Guild

- Up to level 5 (both sources).
- The spells' weights per slot are the wiki's Spell Slot Probabilities table, Rampart's column; each level adds up to 100. Never: Bloodlust, Curse, Death Ripple, Animate Dead, Armageddon, Summon Air Elemental, Summon Fire Elemental, Sacrifice (the table's zeros, and the wiki's Rampart page lists the same). The weights are in the wiki only (the engine reads them from the game's files, which aren't online).
- Level 5 offers the Earth and Water Elementals and Magic Mirror, which can't be cast yet (5.8), as Castle's guild offers Resurrection now.
- The Mage Guild room stays the Castle's until 6.5.5b.

### Walls

- The moat: brambles, 70 damage, Defense -3, the Castle's hexes and rules (wiki Moat; the engine's Rampart moat has the Castle's damage, Defense loss and hexes). Its name in the game's text is "Moat", as the Castle's (`Walls.txt`).
- The arrow towers as the Castle's (wiki Arrow tower: the same for every town). The Keep is called "Main Building" in Rampart's walls text (`Walls.txt`; one source, as the engine has no texts); we use that name (agreed).

### The Mystic Pond

- At the start of each week, each Rampart town with a Mystic Pond gives its owner 1–4 of one of mercury, sulfur, crystal or gems, picked at random each week (wiki: "Produces 1–4 Mercury, Sulfur, Crystal, or Gems on the first day of every week"; the engine rolls the resource, then 1–4, at the new week and adds it to the owner's income).
- A pond built during a week gives nothing until the next week starts. A neutral town's pond gives nothing (the engine pays only players' towns).
- It keeps producing once the Fountain of Fortune is built over it (the engine checks the pond is built, which it still is).
- Clicking the pond (or the Fountain) on the town picture shows its description and what it made: "The pond produced 3 Gems this week." (`core.genrltxt.678`, "The pond produced %d %s this week."), or "The pond has not produced anything yet." (`core.genrltxt.677`) before its first week (the engine's town screen; the texts from the wiki's `GENRLTXT.TXT`). With the Fountain, the Fountain's description comes first, then the pond's (the engine). Descriptions from `BldgSpec.txt`: "The Mystic Pond produces a small random number of resources each week." and "The Fountain of Fortune increases the luck of the garrison hero by +2 when defending against a siege."

### The Treasury

- At the start of each week, each Treasury gives its owner 10% of the gold they had at the end of the last day, rounded down; two Treasuries give 20% (wiki: "extra gold equal to 10% of the player's total gold they had on the seventh day of the last week", "cumulative"; the engine adds gold / 10 per Treasury before the day's income).
- Counted before the new day's income is added (both sources).

### The Fountain of Fortune

- +2 luck for the town's defenders: data only (`defenderBonuses`, 6.5.3). The wiki says "the hero defending the town"; a garrison without a hero gets it too, as decided for every defenders' bonus in 6.5.3.

### What we decided

- A Rampart town in the demo map: the neutral town south-east of the first hero (`town-2`) becomes a Rampart, so it can be taken and built up (agreed).
- The Mystic Pond's data says what it makes (`weeklyResources`, with the map objects' `anyOf` and `amount`); the Treasury's says its interest (`weeklyInterest: { "GOLD_PILE": 10 }`). Another town's building of the same kind is then data.
- The pond's roll is saved as a fact at the week's start, so a reload gives the same resources and the same message.

### How it is built (6.5.5a)

- Rampart is an entry in `towns.json`; its dwellings, hordes, Fountain and Mage Guild levels use what the town code already reads. Its spells' weights are `mageGuildChances.RAMPART` in `spells.json`.
- A building's `weeklyResources` (the map objects' `anyOf` and `amount`) is rolled for each owned town as the week starts, by the `town-weekly-resources` module, and saved as `fact.town.resources.produced` (the town, its owner, the resources). The kingdoms slice adds them to the owner, the towns slice keeps them for the pond's message until the next week starts.
- A building's `weeklyInterest` (`{ "GOLD_PILE": 10 }`, in percent) is paid by the kingdoms slice as the new week's first day comes, on the resources the player held, before the day's income; rounded down for each building.
- Clicking a building with weekly resources, or one built over it, opens the town's message with the descriptions (a building's `description`) of the building and those under it, then what the pond made.

### Left for later (6.5.5a)

- The computer weighing the Mystic Pond and the Treasury when it picks what to build (8.4): until then it sees them as buildings with no income.
- The Resource Silo's crystal (6.2), the Grail's Spirit Guardian (7.11).
- Rampart's heroes, hero classes and map dwellings: 6.5.6.

## 6.5.5b Rampart's town picture

Stand-ins drawn in SVG, as the Castle's are, laid out after the game's Rampart: its backdrop, each of its buildings' art at the places 6.5.5a gave them, the village houses that come with the hall, and the view from its Mage Guild's window.

Checked against the Heroes 3 wiki's raw page source (Rampart: its gallery's town background and building renders) and the reference engine's Rampart and Castle town data (the backdrop, the structures and their places, the Mage Guild room, window and scroll places) and its Mage Guild screen code. A web search found nothing more on the town screen.

### What the game shows

- **The backdrop**: a wide green meadow in a valley, forested hills on both sides, mist over the far end of the valley, a few rocks in the grass on the left and on the right (the wiki's town background, 800 x 374, the size of ours). No houses in it, unlike the Castle's.
- **The buildings**: timber and thatch, with stone at the base of the bigger ones (the wiki's renders): the castle a stone keep with timber upper floors, the halls and the Tavern thatched timber houses, the Marketplace tents and stalls, the Resource Silo a wooden cart, the Homestead an elven house with stone chimneys. The Mage Guild is a pagoda standing in a lake, one storey per level (the wiki's render; the engine gives each level its own picture at a place a little higher and further left, 454,200 to 384,104, as our data already has). The other buildings have no render on the wiki; they are drawn after their names (the Dragon Cliffs a rock face, the Unicorn Glade a glade, the Enchanted Spring a spring, the Dendroid Arches trees bent into arches, the Mystic Pond a pond, the Fountain of Fortune a fountain in it).
- **The village houses**: Rampart's houses aren't in the backdrop; small thatched houses are added as the hall grows: a group with the Town Hall (at 293,235), more with the City Hall (295,191) and with the Capitol (260,171) (the engine's town data; the wiki's "Houses" render). They can't be clicked or hovered (the engine gives them no outline or area). The Castle has none: its houses are in its backdrop.
- **The Mage Guild room is the same for every town** (the engine: one room picture, `guildBackground`, for all, and the same scroll places for all): only the window's view of the land outside is the town's own, at the same place (332,76). So Rampart's Mage Guild is the Castle's room with Rampart's view through the window. What that view shows isn't online; ours is a small copy of Rampart's backdrop, the misty valley between its forested hills, so the window shows the land the player saw on the town screen (agreed).

### What we decided

- The backdrop is named "Rampart's misty valley" for the player who can't see it, as the Castle's is "The Castle by the sea" (our wording, agreed).
- The houses come in this part (agreed). They are part of the town type's art, drawn with the hall level that brings them and kept with every hall above it (our reading of the engine's data: each group stays once built).
- The Mage Guild window's view is named too ("View of Rampart's valley", "View of the Castle's land"); a type without art gets a plain sky and grass view.

### How it is built

- `rampart-town-art.js` next to `castle-town-art.js`, the SVG shapes both use in `town-art-shapes.js`. `town-art.js` gives each town type its backdrop, buildings, `houses` (each group's place, its drawing and the halls it stands with, `hallsShowingThem`, drawn behind the buildings and not clickable) and `guildWindow` (its view's name and drawing).
- The Mage Guild's update carries the town's type, and the view draws that type's window.

### Left for later (6.5.5b)

- Animation (10.3): the engine has an animated detail on Rampart's picture (`extraAnimation`, 327,236), as the Castle's waterfall; not drawn.
- The Grail's building (7.11), as for the Castle.

## 6.5.6 Rampart's heroes and map dwellings

Rampart's two hero classes, its sixteen heroes, and its seven creature dwellings on the adventure map. One PR: both halves are mostly data.

Checked against the Heroes 3 wiki's raw page source (Ranger, Druid, Hero class, and each hero's page), the game's hero class and hero tables (`HCTRAITS.TXT` and `HOTRAITS.TXT`, an English copy of the original files on GitHub), the reference engine's hero class, hero and dwelling configs, and the game's object table (homm3tools' copy) for the dwellings' footprints.

### The hero classes

| | Ranger | Druid |
|---|---|---|
| Kind | Might | Magic |
| Attack / Defense / Power / Knowledge at the start | 1 / 3 / 1 / 1 | 0 / 2 / 1 / 2 |
| A level up to 9 (Attack / Defense / Power / Knowledge, %) | 35 / 45 / 10 / 10 | 10 / 20 / 35 / 35 |
| From level 10 | 30 / 30 / 20 / 20 | 20 / 20 / 30 / 30 |

- Secondary skill weights (Ranger / Druid): Pathfinding 7 / 5, Archery 8 / 5, Logistics 5 / 5, Scouting 7 / 2, Diplomacy 4 / 4, Navigation 3 / 2, Leadership 6 / 2, Wisdom 3 / 8, Mysticism 3 / 6, Luck 6 / 9, Ballistics 4 / 4, Eagle Eye 2 / 7, Necromancy 0 / 0, Estates 2 / 3, Fire Magic 0 / 1, Air Magic 1 / 2, Water Magic 3 / 4, Earth Magic 3 / 4, Scholar 1 / 8, Tactics 5 / 1, Artillery 6 / 1, Learning 4 / 4, Offense 5 / 1, Armorer 8 / 3, Intelligence 2 / 7, Sorcery 2 / 6, Resistance 9 / 1, First Aid 3 / 7. The wiki and the game's table agree on every number (the wiki's Interference is Horn of the Abyss's and is left out).
- The Druid is a magic class, so Wisdom and the magic schools are offered on level-up as for magic heroes already (every 3 levels).
- The tavern's odds for each class differ by the town the tavern is in (the game's class table, out of 100). For the Knight, Cleric, Ranger and Druid they are 6 in a Castle and in a Rampart alike, so nothing changes yet; they matter once Tower, Inferno and the rest have heroes.

### The heroes

| Hero | Class | Skills | Spell | Starting army |
|---|---|---|---|---|
| Mephala | Ranger | Basic Leadership, Basic Armorer | – | Centaurs 12–24, Dwarves 3–5, Wood Elves 3–6 |
| Ufretin | Ranger | Basic Luck, Basic Resistance (order: see below) | – | Dwarves 3–5, Dwarves 3–5, Dwarves 3–5 |
| Jenova | Ranger | Advanced Archery | – | Centaurs, Dwarves, Wood Elves |
| Ryland | Ranger | Basic Leadership, Basic Diplomacy | – | Centaurs, Dwarves, Wood Elves |
| Thorgrim | Ranger | Advanced Resistance | – | Centaurs, Dwarves, Wood Elves |
| Ivor | Ranger | Basic Archery, Basic Offense | – | Centaurs 12–24, Wood Elves 3–6, Wood Elves 3–6 |
| Clancy | Ranger | Basic Resistance, Basic Pathfinding | – | Centaurs, Dwarves, Wood Elves |
| Kyrre | Ranger | Basic Logistics, Basic Archery | – | Centaurs, Dwarves, Wood Elves |
| Coronius | Druid | Basic Wisdom, Basic Scholar | Slayer | Centaurs, Dwarves, Wood Elves |
| Uland | Druid | Advanced Wisdom, Basic Ballistics | Cure | Centaurs, Dwarves, Wood Elves |
| Elleshar | Druid | Basic Wisdom, Basic Intelligence | Curse | Centaurs, Dwarves, Wood Elves |
| Gem | Druid | Basic Wisdom, Basic First Aid (order: see below) | Summon Boat | Centaurs 12–24, First Aid Tent, Wood Elves 3–6 |
| Malcom | Druid | Basic Wisdom, Basic Eagle Eye | Magic Arrow | Centaurs, Dwarves, Wood Elves |
| Melodia | Druid | Basic Wisdom, Basic Luck | Fortune | Centaurs, Dwarves, Wood Elves |
| Alagar | Druid | Basic Wisdom, Basic Sorcery | Ice Bolt | Centaurs, Dwarves, Wood Elves |
| Aeris | Druid | Basic Wisdom, Basic Scouting | Protection from Air | Centaurs, Dwarves, Wood Elves |

- Skills and spells: each hero's wiki page and the reference engine's hero config agree, except the order of two heroes' skills: the wiki lists Ufretin's Resistance before Luck and Gem's First Aid before Wisdom, the engine the other way round.
- Starting army: the game's hero table (Centaurs 12–24, Dwarves 3–5, Wood Elves 3–6 unless the table says otherwise), and the wiki's Shadow of Death numbers on each hero's page agree. Horn of the Abyss's (Dwarves 5–7, Wood Elves 2–4) are left out.
- **The starting army belongs to the hero, not the class.** The game's table gives each hero their own three stacks: Ufretin three of Dwarves, Ivor two of Wood Elves, Gem a First Aid Tent in the second, and among the Knights Valeska three of Archers 4–7 (Orrin's, Tyris's and the rest's are the class's). We kept one army per class (`startingArmy` in `hero-classes.json`); it moves to each hero, the class's staying as the default for a hero without one.
- Gelu, a Ranger of the campaigns, isn't offered in taverns; left out.
- Every Druid starts with a spell book holding their spell (the wiki: magic heroes start with one; a hero's `spellBook` and `spells` in `heroes.json`, which the hero's details already read by name). Summon Boat can't be cast until water and boats (7.10); it shows in the book.

### The map dwellings

Growth and price are the creature's; levels 5–7 are guarded by three weeks of their creature, level 1 is free (the rules of 7.4, which read the creature's level and the dwelling's `guards`).

| Dwelling | Creature | Guards | Footprint (bottom row last) |
|---|---|---|---|
| Centaur Stables | Centaur | – | `#E` |
| Dwarf Cottage | Dwarf | – | `E#` |
| Homestead | Wood Elf | – | `E#` |
| Enchanted Spring | Pegasus | – | `#E` |
| Dendroid Arches | Dendroid Guard | 9 | `#E` |
| Unicorn Glade | Unicorn | 6 | `#E` |
| Dragon Cliffs | Green Dragon | 3 | `#E` |

- Footprints from the game's object table (homm3tools' copy), decoded as the Castle's were (the Guardhouse came out `#.` over `#E` and the Archers' Tower `E#`, as we have them). The Unicorn Glade has a second, larger picture (`##` over `#E#`) that random maps never place; we take the usual one.
- Names: the game's object names, as on the wiki's Rampart page and the engine's dwelling config.
- A footprint other than `#E` is a table in the dwelling's code (`GUARDHOUSE`, `ARCHERS_TOWER`); it moves to `footprint` in `dwellings.json`, as bonus objects have it, so the Dwarf Cottage and Homestead are data.

### Castle's missing heroes (agreed to come in this part)

- Tyris, a Knight: Basic Leadership, Basic Tactics.
- The Cleric, a magic class: Attack / Defense / Power / Knowledge 1 / 0 / 2 / 2 at the start; a level up to 9 20 / 15 / 30 / 35 %, from level 10 20 / 20 / 30 / 30; skill weights Pathfinding 2, Archery 3, Logistics 4, Scouting 3, Diplomacy 7, Navigation 5, Leadership 2, Wisdom 7, Mysticism 4, Luck 5, Ballistics 4, Eagle Eye 6, Necromancy 0, Estates 3, Fire Magic 2, Air Magic 4, Water Magic 4, Earth Magic 3, Scholar 6, Tactics 2, Artillery 2, Learning 4, Offense 4, Armorer 3, Intelligence 6, Sorcery 5, Resistance 2, First Aid 10 (the wiki and the game's class table agree).
- The eight Clerics (wiki pages and the engine's hero config agree): Rion (Basic Wisdom, Basic First Aid; Stone Skin), Adela (Basic Wisdom, Basic Diplomacy; Bless), Cuthbert (Basic Wisdom, Basic Estates; Weakness), Adelaide (Advanced Wisdom; Frost Ring), Ingham (Basic Wisdom, Basic Mysticism; Curse), Sanya (Basic Wisdom, Basic Eagle Eye; Dispel), Loynis (Basic Wisdom, Basic Learning; Prayer), Caitlin (Basic Wisdom, Basic Intelligence; Cure).
- Their armies are the Knights' (Pikemen 10–20, Archers 4–7, Griffins 2–3), except in the game's table Rion's second stack is a First Aid Tent; among the Knights Edric's is Pikemen, Griffins 2–3, Griffins 2–3 and Christian's second stack is a Ballista.

### What we decided

- The Clerics and Tyris come with this part, as data (agreed).
- Ufretin's and Gem's skills in the wiki's order: Resistance then Luck, First Aid then Wisdom (our pick where the two sources differ).
- The demo map gets the Centaur Stables, the Dwarf Cottage and the Dendroid Arches near Elfwind; no Rampart hero, as the tavern offers them (agreed).
- A war machine in a starting army is in the data (`warMachine` in place of `creature`) and left out until war machines (5.11).

### How it is built

- `hero-classes.json` has the Cleric, Ranger and Druid; `heroes.json` the Clerics, Tyris, the Rangers and the Druids, a Druid's or Cleric's spell as `spellBook` and `spells`.
- A hero's `startingArmy` in `heroes.json` takes the place of the class's. A stack with `warMachine` in place of `creature` keeps its place in the roll (the second stack on 88 or less, the third on 25 or less) and is left out of the army. A hero taking a hired one's place, or back after retreating, brings one creature of the first creature stack of their own starting army.
- A dwelling's `footprint` in `dwellings.json` (offsets from the entrance, as the bonus objects' are); without one it blocks the tile left of the entrance.
- The demo map has the Centaur Stables, the Dwarf Cottage and the Dendroid Arches south of Elfwind.

### Left for later (6.5.6)

- Specialties and portraits (4.4), war machines in a starting army (5.11: Gem's First Aid Tent until then is left out, her Wood Elves still coming on the third stack's roll).
- The tavern's class odds by town, and never offering two heroes of one class at once (the engine's rule, not on the wiki): with the next faction's heroes.

## 6.5.7 Tower's creatures

The first of Tower's three parts. Like Rampart's creatures, too large for one PR with every ability, so in four:

- **6.5.7a The creatures**: the fourteen creatures, with the abilities the battle already reads (flying, shooting, shots, double-wide, no melee penalty) and four small rules that are new: the Giants' and Titans' immunity to mind spells, Giants and Titans as kings for Slayer, the Nagas' attacks that get no retaliation, and the Magi's shots that the walls don't halve.
- **6.5.7b Golems and Gargoyles**: the Golems' spell damage reduction, and what being non-living means (below).
- **6.5.7c Magic channeler**: the Magi lower their own hero's spell costs by 2.
- **6.5.7d The Master Genies' spells**: a random helpful spell on a stack of their side, three times a battle.

Hate (Genies and Efreet, Titans and Black Dragons, and the Angels and Devils already in the data) does nothing until a hated creature exists: it comes with Inferno's creatures, the first faction to have one, and Dungeon's Black Dragons add the Titans' to it.

Until its part, a creature fights without that ability. The demo map gets a few stacks of Tower's creatures as map monsters, as it got Rampart's. Recruiting them comes with Tower's town and its map dwellings.

### The creatures (6.5.7a)

Checked against the Heroes 3 wiki's raw page source (each creature's `Template:Creature/<name>`, the creature pages and `Translation_Data/CRTRAITS.TXT` for names, plurals and ability texts) and the reference engine's Tower creature data (levels, upgrades, double-wide, shots and abilities). The engine's data holds no stats, so attack, defense, damage, health, speed, growth, cost and AI value are checked against the wiki only, as the Castle's and Rampart's were. Where the wiki gives a Horn of the Abyss value beside the original's, the original's is used (the Nagas' AI value: 2016, not 1814).

| Creature | Tier | Att | Def | Damage | HP | Speed | Growth | Cost | AI value | Abilities |
|---|---|---|---|---|---|---|---|---|---|---|
| Gremlin | 1 | 3 | 3 | 1–2 | 4 | 4 | 16 | 30 | 44 | |
| Master Gremlin | 1 | 4 | 4 | 1–2 | 4 | 5 | 16 | 40 | 66 | shoots, 8 shots |
| Stone Gargoyle | 2 | 6 | 6 | 2–3 | 16 | 6 | 9 | 130 | 165 | flies, non-living (6.5.7b) |
| Obsidian Gargoyle | 2 | 7 | 7 | 2–3 | 16 | 9 | 9 | 160 | 201 | flies, non-living (6.5.7b) |
| Stone Golem | 3 | 7 | 10 | 4–5 | 30 | 3 | 6 | 150 | 260 | non-living, spell damage −50% (6.5.7b) |
| Iron Golem | 3 | 9 | 10 | 4–5 | 35 | 5 | 6 | 200 | 412 | non-living, spell damage −75% (6.5.7b) |
| Mage | 4 | 11 | 8 | 7–9 | 25 | 5 | 4 | 350 | 570 | shoots, 24 shots, no melee penalty, no wall penalty, hero's spells cost 2 less (6.5.7c) |
| Arch Mage | 4 | 12 | 9 | 7–9 | 30 | 7 | 4 | 450 | 680 | as the Mage |
| Genie | 5 | 12 | 12 | 13–16 | 40 | 7 | 3 | 550 | 884 | flies, hates Efreet (later) |
| Master Genie | 5 | 12 | 12 | 13–16 | 40 | 11 | 3 | 600 | 942 | flies, hates Efreet (later), casts helpful spells (6.5.7d) |
| Naga | 6 | 16 | 13 | 20–20 | 110 | 5 | 2 | 1100 | 2016 | double-wide, no enemy retaliation |
| Naga Queen | 6 | 16 | 13 | 30–30 | 110 | 7 | 2 | 1600 | 2840 | double-wide, no enemy retaliation |
| Giant | 7 | 19 | 16 | 40–60 | 150 | 7 | 1 | 2000 + 1 gem | 3718 | immune to mind spells, king of the third group |
| Titan | 7 | 24 | 24 | 40–60 | 300 | 11 | 1 | 5000 + 2 gems | 7500 | shoots, 24 shots, no melee penalty, immune to mind spells, king of the third group, hates Black Dragons (later) |

- Each basic creature gets `upgradesTo` its upgrade.
- The Sculptor's Wings' +4 Gargoyles a week comes with Tower's town.

### Immunity to mind spells (Giants and Titans, 6.5.7a)

- Giants and Titans can't be the target of mind spells (Berserk, Blind, Forgetfulness, Frenzy, Hypnotize, Mirth, Sorrow), either side's, helpful ones too (wiki Mind spell page and the creature texts "Mind spell immunity"; the engine's creature data). That is how the undead and an artifact's immunity to mind spells work now, so a Giant is treated as a Skeleton is: the cursor is blocked over it, a click cancels the spell, and Expert's all-stacks Mirth or Sorrow leaves it out.
- The Unicorns' blinding attack is a mind spell: it doesn't blind a Giant or a Titan (the blinding attack already checks the target's immunities, 6.5.4e).

### Kings of the third group (Giants and Titans, 6.5.7a)

- Slayer's +8 Attack reaches them only at Expert (wiki Slayer page: Expert "also affects Giants"; the engine's creature data `KING_3`). Slayer already reaches the third group at Expert.

### No enemy retaliation (Nagas, 6.5.7a)

- A stack the Nagas or Naga Queens attack doesn't strike back (wiki "No enemy retaliation", both creature texts; the engine's `BLOCKS_RETALIATION`, which skips the defender's retaliation when the attacker has it). Its retaliation isn't used up: it can still strike back at the next stack that attacks it this round (the engine never counts a retaliation that didn't happen).
- The Nagas themselves strike back as any stack does.
- A Fire Shield on the stack they attack still burns them: the burn isn't a retaliation (the wiki's Fire Shield page; it comes with any melee hit now).

### No wall penalty (Magi, 6.5.7a)

- In a siege, a Mage's or Arch Mage's shot at a stack behind the walls does full damage (wiki Obstacle penalty page, both creature templates "No barrier penalty"; the engine's `NO_WALL_PENALTY` on both). The RoE manual names only the Arch Magi; the creature data of both sources gives it to both, so both have it.
- A shot from far away is still halved by the distance penalty (both sources: the wall penalty is the only one they lose).

### How it is built (6.5.7a)

- The creatures are entries in `monsters.json`, with the abilities the battle already reads (`flying`, `doubleWide`, `ranged`, `noMeleePenalty`, `shots`); an ability that comes in a later part is added to the data with that part.
- `immuneToMindSpells` in a creature's abilities makes its stacks immune to mind spells, as the undead and the artifact's immunity are.
- The Giants' and Titans' `king: 3`.
- `noRetaliation` in the attacker's abilities: the attacked stack doesn't strike back.
- `noWallPenalty` in a shooter's abilities: its shots aren't halved by the walls.
- The demo map has Master Gremlins, Stone Gargoyles, Stone Golems, Magi, Nagas and Giants east of the first hero, beyond Rampart's.

### Non-living (Golems and Gargoyles, 6.5.7b)

Checked against the wiki's Non-living, Undead vs Unliving, Spell damage reduction, Sacrifice, Resurrection, Death Ripple and Fire Shield pages and the engine's creature data (`NON_LIVING` on the Golems, `GARGOYLE` on the Gargoyles, `SPELL_DAMAGE_REDUCTION` 50 and 75) and spell data (Sacrifice's and Resurrection's targets leave out `NON_LIVING` and `GARGOYLE`; the mind spells leave out `NON_LIVING`; neutral morale is for `NON_LIVING`, war machines and the undead, not `GARGOYLE`; Death Ripple leaves out only the undead and war machines; Cure leaves out no one).

- Golems take 50% (Stone) or 75% (Iron) less damage from spells: every damage spell, Armageddon, Death Ripple, Chain Lightning's jump and the Titan's Lightning Bolt included, and a Fire Shield's burn when a Golem strikes a shielded stack (wiki; the engine applies it to every spell, none being marked as non-magical, and its Fire Shield test has a Golem taking less burn). The Tower's land mines too, once siege land mines exist.
- Rounding: the damage after a Protection from Fire, Water, Air or Earth is taken first, rounded down, then the Golems' reduction, rounded down again (the engine; the wiki doesn't say). A Stone Golem hit for 25 takes 12; under Expert Protection from Fire (50% less) a Fireball of 60 is 30, then 15.
- Golems have neither good nor bad morale and are immune to mind spells. Gargoyles have morale and mind spells work on them (wiki; the engine).
- Neither can be sacrificed, nor raised by Sacrifice (wiki Sacrifice page: "non-undead, non-bloodless"; the engine). Resurrection, Animate Dead and the Archangels' resurrection don't raise them either, once those exist.
- Death Ripple, Bless and Curse work on both (only the undead are immune), the Golems taking less Death Ripple damage.
- Cure and the First Aid Tent heal both, as they heal the undead now (the engine; 5.11 decided the tent heals every creature).
- Golems don't count as undead: no "Undead in army" morale penalty.

### What we decided (6.5.7b)

- The rounding order and the Golems taking less Fire Shield burn follow the engine (decided with the user).
- The Golems' and Gargoyles' own abilities are data a later faction reuses: the elementals are non-living with neutral morale and immune to mind spells, as the Golems are.

### How it is built (6.5.7b)

- `nonLiving` in a creature's abilities (all four): its stacks can't be sacrificed or raised by Sacrifice. Sacrifice's `notOnUndead` becomes `livingOnly`, which leaves out undead and non-living stacks; Bless, Curse and Death Ripple keep `notOnUndead`.
- `neutralMorale` in a creature's abilities (both Golems): its stacks' morale is 0, as the undead's and the war machines' is now.
- The Golems also get `immuneToMindSpells`, which the Giants already have.
- A creature's `spellDamageReduction` in `monsters.json` (50 for the Stone Golem, 75 for the Iron Golem) is copied onto its stacks, and every spell's damage to the stack and a Fire Shield's burn on it is lowered by it, after a school protection.
- The creature popup shows no abilities yet, so it doesn't list them (as with the Dragons' immunity).

### Left for later (6.5.7b)

- Resurrection, Animate Dead and the Archangels' resurrection leaving them out: when those come (5.8 later, Castle's Archangels).
- The Tower's land mines and the Golems taking less from them: Tower's town.
- The Orb of Vulnerability cancelling the Golems' reduction (7.8, with the artifact).

### Magic channeler (Magi, 6.5.7c)

Checked against the wiki's raw page source (Mage and Arch Mage, both creature templates "Hero's spells cost 2 spell points less in combat", Pegasus and Silver Pegasus, Spell Point) and the engine's Tower creature data (`CHANGES_SPELL_COST_FOR_ALLY` 2 on both) and its battle code (the spell's cost in battle).

- A hero whose army had Magi or Arch Magi at the start of the battle pays 2 spell points less for each spell until the battle ends, even after they die (wiki: "Even if all the Mages die during the battle, the spells will cost 2 less points until the end of combat"; the engine counts dead stacks).
- 2 in all, however many stacks or creatures (wiki: "does not depend on number stacks in army or number of troops in stack"; the engine takes the highest).
- Only the Magi's own hero: the enemy hero pays the normal cost (both sources). A hypnotized Mage still lowers the costs of the side it came with (the engine compares the stack's owner, which Hypnotize doesn't change; the wiki doesn't say), as with the Pegasi.
- It adds up with the school skills' lower costs (wiki: "cumulative with other cost reductions, like from Basic X Magic"), and the enemy's Pegasi cancel it out (wiki: "-2 and +2 adjustments equal 0"; the engine adds both).
- Never below 0 (the engine: the cost is at least 0; the wiki doesn't say; agreed with the user).
- Not on the adventure map (wiki: "Mages cannot reduce the hero's mana cost when casting adventure map spells"; the engine changes the cost only in battle).

### How it is built (6.5.7c)

- A creature's `magicChanneler` in `monsters.json` (2 for both Magi) is copied onto its battle stacks, as `magicDamper` is.
- The battle's change to a spell's cost becomes one function of the stacks and the caster's side: the highest `magicDamper` of the other side minus the highest `magicChanneler` of the caster's own, both by `side` and dead stacks included. It takes `magicDamperAgainst`'s place where the battle checks, saves and shows the cost, so the book, "That spell costs …" and a reload need nothing new.
- `spellCost` keeps the cost at 0 or more.
- The demo map's Valeska (hero-2) gets 6 Magi, so the lower costs can be seen in a battle there.

### Left for later (6.5.7c)

- A computer hero's Magi lowering its costs: computer heroes don't cast yet (5.8 later).

### The Master Genies' spells (6.5.7d)

Checked against the wiki's raw page source (Genie and Master Genie, Spellcaster, and the pages of each spell, which list the Master Genies among their casters), the RoE manual's text quoted there, `GENRLTXT.TXT` for the texts, and the engine's Tower creature data (`RANDOM_SPELLCASTER` 2, `CASTS` 3, `CREATURE_ENCHANT_POWER` 6) and its battle code (the random spell action, the list of spells it rolls from and its checks).

- Instead of acting, a stack of Master Genies casts a spell on another stack of its side, three times a battle; then it fights as a Genie (wiki; the engine). Casting takes its turn, as an attack does.
- The spell is rolled, each one usable on the target equally likely; the player picks only the target (wiki: "Spells cast by Master Genie are random"; the engine rolls one of the usable spells).
- Cast at Advanced in its school, with Spell Power 6, so a spell lasts 6 rounds; the number of Genies doesn't matter (wiki; the engine). Advanced never casts on all stacks, so every spell goes on the one target. The hero's skills, Power, Sorcery and artifacts play no part (Fire Shield's burn is 20%).
- It isn't the hero's cast: the hero can still cast that round, and it costs no spell points.
- The spells: Air Shield, Anti-Magic, Bless, Bloodlust, Counterstrike, Cure, Fire Shield, Fortune, Haste, Magic Mirror, Mirth, Prayer, Precision, Protection from Air, Fire, Water and Earth, Shield, Slayer and Stone Skin (both sources), and Frenzy (the wiki's Genie and Frenzy pages; the engine's list leaves it out; we follow the wiki, agreed with the user). Magic Mirror waits for enemy heroes casting (8.1), as the hero's does.
- A spell is left out when (the engine's checks; the wiki's caveats name the immunities, Slayer and Cure, and its players' notes Air Shield, Bloodlust, Anti-Magic and Magic Mirror):
  - the target is immune to it (Dragons to levels 1-3, Giants to mind spells, a stack under Anti-Magic) or the spell's own rule turns it away (Precision on a stack that doesn't shoot);
  - it is already on the target;
  - Cure on a stack whose top creature has lost no health;
  - Bloodlust on a shooter;
  - Shield and Fire Shield when every enemy stack shoots;
  - Air Shield when no enemy stack shoots;
  - Anti-Magic and the four Protections when the enemy side has no hero;
  - Slayer when the enemy has no king its Advanced reaches (the first and second groups). The engine checks for any king; we decided on the ones it reaches, as the wiki says it won't cast a spell with no effect (agreed with the user).
- Not on itself, nor on a stack with no spell left to give: those get the usual cursor (the engine refuses both; the wiki says "an allied troop"; agreed with the user).
- Hovering a stack it can cast on shows the spell cursor and "Cast a spell on Pikemen" (`core.genrltxt.301`, the plural name as the game gives it). Hovering an enemy still attacks it and an empty hex still moves there.
- The log: "The Master Genies cast Bless" (`core.genrltxt.566`), "The Master Genie casts Bless" for one (`core.genrltxt.565`), then the spell's own line as for the hero's cast where it has one.
- A computer's Master Genies cast while they can, on the stack of theirs worth the most (AI value times count) that has a spell left to give; otherwise they fight. Our decision: the engine's battle AI weighs every possible action, which comes with the smarter AI's later parts (5.7b).

### How it is built (6.5.7d)

- The Master Genie's `casts` in `monsters.json` (`{ "times": 3, "skillLevel": 2, "power": 6, "spells": [...] }`), copied onto its battle stacks; the Ogre Magi and the elementals reuse it with one spell each.
- A refactor first: the lasting spells' effects and rounds and Cure's healing are worked out from a skill level and a Power, which the hero's cast takes from the hero and the stack's from its `casts`.
- A spell's `usefulWhen` in `spells.json` names the check beyond its targets: `targetWalks` (Bloodlust), `enemyWalks` (Shield, Fire Shield), `enemyShoots` (Air Shield), `enemyHasHero` (Anti-Magic, Magic Mirror, the Protections) and `enemyKingReached` (Slayer, by its `kingsReached` at the caster's level). Immunities, Precision's shooters and Cure's hurt stacks come from the spell's targets, as for the hero.
- One function lists the spells a stack can give a target (the checks above), used by the view's cursor, the cast and the computer.
- A saved fact, `fact.battle.stack.cast` (the stack, target, spell, and its effects and rounds or its healing, as rolled); each stack's casts left are counted down as the facts replay, so a reload keeps them.
- The demo map's Valeska (hero-2) gets 4 Master Genies.

### Left for later (6.5.7d)

- Magic Mirror among the spells, with enemy heroes casting (8.1).
- Cure also leaving out a stack with no harmful spell, once Cure removes them (8.1).
- The Ogre Magi's Bloodlust and the elementals' Protections, with their creatures (Stronghold, Conflux).
- A computer hero's Master Genies choosing by what helps most: the smarter AI (5.7b).

### Left for later (6.5.7a)

- Hate: with Inferno's creatures (the Efreet), and the Titans' with Dungeon's Black Dragons.
- Growth bonuses, recruiting: Tower's town and its map dwellings.
- The player's Giants resisting a computer hero's mind spells: computer heroes don't cast yet (5.8 later).
