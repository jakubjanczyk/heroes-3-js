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
