# Secondary skills (2026-10-26)

Roadmap 4.7.1: the list of secondary skills and each hero's starting skills. Choosing a skill on level-up is 4.7.2; what each skill does is 4.7.3.

## How Heroes 3 does it

Checked against the Heroes 3 wiki (heroes.thelazy.net: Secondary skill, Castle, Knight, Cleric).

- **The skills.** Shadow of Death has 28 (Interference and Runes are Horn of the Abyss only, so we leave them out). In the game's own order: Pathfinding, Archery, Logistics, Scouting, Diplomacy, Navigation, Leadership, Wisdom, Mysticism, Luck, Ballistics, Eagle Eye, Necromancy, Estates, Fire Magic, Air Magic, Water Magic, Earth Magic, Scholar, Tactics, Artillery, Learning, Offense, Armorer, Intelligence, Sorcery, Resistance, First Aid.
- **Levels.** Basic, Advanced, Expert. A hero has at most 8 skills. A skill once learned is never lost.
- **Starting skills** belong to the hero, not the class. Most heroes start with two Basic skills, a few with one Advanced. Every Knight has Basic Leadership:

  | Hero | Starting skills | Specialty (4.4) |
  |---|---|---|
  | Orrin | Basic Leadership, Basic Archery | Archery |
  | Valeska | Basic Leadership, Basic Archery | Archers |
  | Edric | Basic Leadership, Basic Armorer | Griffins |
  | Sylvia | Basic Leadership, Basic Navigation | Navigation |
  | Lord Haart | Basic Leadership, Basic Estates | Estates |
  | Sorsha | Basic Leadership, Basic Offense | Swordsmen |
  | Christian | Basic Leadership, Basic Artillery | Ballista |
  | Tyris | Basic Leadership, Basic Tactics | Cavaliers |

  The Clerics, for when the class comes: Adela (Basic Wisdom, Basic Diplomacy), Cuthbert (Basic Wisdom, Basic Estates), Adelaide (Advanced Wisdom), Ingham (Basic Wisdom, Basic Mysticism), Sanya (Basic Wisdom, Basic Eagle Eye), Loynis (Basic Wisdom, Basic Learning), Caitlin (Basic Wisdom, Basic Intelligence), Rion (Basic Wisdom, Basic First Aid). Sir Mullich, Catherine and Roland are campaign heroes, not in taverns.
- **Hero screen.** Eight slots in two columns under Experience and Spell Points, filled in the order the skills were learned: the skill's icon with its level and name beside it ("Basic" over "Leadership"). Right click shows the skill's picture, "Basic Leadership" and what it does at that level. The status bar says "View Basic Leadership Info".
- **Exchange screen.** A row of small skill icons under each hero's primary skills.
- **The hero box** (right click on the map, in the tavern) shows no secondary skills.

## What we do

- `game/data/secondary-skills.json`: the 28 skills in the game's order, keyed by id (`PATHFINDING`, ..., `FIRST_AID`), each with its name and a description per level. The descriptions are our own words for the effects in the table below; the game's texts aren't available.
- `game/data/heroes.json`: the heroes by id (`ORRIN`, ...), each with name, class and `secondarySkills` (`[{ "skill": "LEADERSHIP", "level": "BASIC" }, ...]`, in order). It holds the six Knights the tavern offers and Lord Haart. `tavern.json` keeps the cost and the rumours, and its pool is the heroes in `heroes.json`.
- The scenario's first hero becomes Lord Haart (was "Hero"). His Basic Leadership and Basic Estates come from `heroes.json`, found by name; a scenario hero may list `secondarySkills` itself to override them. A scenario hero not in `heroes.json` starts with none.
- The `heroDetails` slice keeps each hero's `secondarySkills`. A hired hero gets theirs from `heroes.json` by name, so `fact.hero.hired` stays as it is and a reload replays the same skills. A beaten hero hired again starts with their starting skills, as with their level (2026-10-26-defeated-hero.md).
- The hero screen fills its eight slots and the exchange screen its skill rows. The icon is a stand-in (the skill's initials) until there are pictures. The right-click popup and the status bar text come with them.
- A unit test checks the data files: every hero's skills name a skill that exists, at most 8, none twice.
- No skill does anything yet (4.7.3).

## For later

**4.7.2: choosing on level-up.** One offer is a skill the hero has at Basic or Advanced, picked at random; the other is weighted by the class's table. With 8 skills, both are upgrades. A skill banned for the class (Necromancy outside Necropolis) has weight 0 here. The weights:

| Skill | Knight | Cleric | | Skill | Knight | Cleric |
|---|---|---|---|---|---|---|
| Pathfinding | 4 | 2 | | Eagle Eye | 2 | 6 |
| Archery | 5 | 3 | | Necromancy | 0 | 0 |
| Logistics | 5 | 4 | | Estates | 6 | 3 |
| Scouting | 4 | 3 | | Fire Magic | 1 | 2 |
| Diplomacy | 4 | 7 | | Air Magic | 3 | 4 |
| Navigation | 8 | 5 | | Water Magic | 4 | 4 |
| Leadership | 10 | 2 | | Earth Magic | 2 | 3 |
| Wisdom | 3 | 7 | | Scholar | 1 | 6 |
| Mysticism | 2 | 4 | | Tactics | 7 | 2 |
| Luck | 3 | 5 | | Artillery | 5 | 2 |
| Ballistics | 8 | 4 | | Learning | 4 | 4 |
| Offense | 7 | 4 | | Intelligence | 1 | 6 |
| Armorer | 5 | 3 | | Sorcery | 1 | 5 |
| Resistance | 5 | 2 | | First Aid | 2 | 10 |

The wiki's Knight table also lists Interference (5), a Horn of the Abyss skill we leave out.

**4.7.3: the effects**, Basic / Advanced / Expert. Check each skill's wiki page before building its effect:

| Skill | Effect | Needs |
|---|---|---|
| Pathfinding | terrain penalty 25 / 50 / 75 lower, never below 100 | 4.6 |
| Archery | ranged damage +10 / 25 / 50% | 5.6 |
| Logistics | land movement points +10 / 20 / 30% | 4.6 |
| Scouting | vision radius +1 / 2 / 3 | 7.1 |
| Diplomacy | neutral monsters may join; surrender costs 20 / 40 / 60% less | 5.2, 5.7 |
| Navigation | movement at sea +50 / 100 / 150% | 7.10 |
| Leadership | morale +1 / 2 / 3 | morale |
| Wisdom | learn spells of level 3 / 4 / 5 | 4.8 |
| Mysticism | spell points back each day +2 / 3 / 4 | 4.8 |
| Luck | luck +1 / 2 / 3 | luck |
| Ballistics | control of the catapult, more shots and accuracy | 5.10 |
| Eagle Eye | 40 / 50 / 60% chance to learn a spell cast in battle, up to level 2 / 3 / 4 | 4.8 |
| Necromancy | raise 10 / 20 / 30% of the enemy dead as Skeletons | Necropolis |
| Estates | +125 / 250 / 500 gold a day | 3.2 |
| Fire, Air, Water, Earth Magic | that school's spells cheaper and stronger | 4.8, 5.8 |
| Scholar | teach spells up to level 2 / 3 / 4 to a hero met | 4.8, 4.5.3 |
| Tactics | place the army up to 3 / 5 / 7 columns forward before battle | 5.3 |
| Artillery | control of the ballista, chance of double damage | war machines |
| Learning | experience +5 / 10 / 15% | 4.2 |
| Offense | melee damage +10 / 20 / 30% | 5.6 |
| Armorer | damage taken −5 / 10 / 15% | 5.6 |
| Intelligence | spell points +25 / 50 / 100% | 4.8 |
| Sorcery | spell damage +5 / 10 / 15% | 5.8 |
| Resistance | 5 / 10 / 20% chance an enemy spell fails on a stack | 5.8 |
| First Aid | control of the First Aid Tent, heals up to 50 / 75 / 100 | war machines |

## Not yet

- Skill pictures; the initials stand in.
- The 1 of 2 choice on level-up (4.7.2), the effects (4.7.3), the Witch Hut and other ways to learn a skill (7.7).
- The other Knights (Tyris), the Clerics and the other factions' heroes.
