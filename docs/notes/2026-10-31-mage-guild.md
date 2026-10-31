# Mage Guild (2026-10-31)

Roadmap 4.8.2, the second of eight parts of hero magic (4.8, 5.8), built in four parts of its own: the guild's spells and its screen (4.8.2.1), learning spells and buying a spell book (4.8.2.2), Wisdom and magic schools on level-up (4.8.2.3), Scholar (4.8.2.4). This note covers parts 1 to 3; Scholar adds its section when it is planned.

## How Heroes 3 does it

Checked against the Heroes 3 wiki's raw page source (Mage Guild, its Spell probability table and Unavailable spells by town templates, Death Ripple, and the `GENRLTXT.TXT` page of Translation Data), against an open-source engine's town spell setup and Mage Guild window and its Castle faction config, and against a screenshot of Castle's Mage Guild from the user. Shadow of Death rules; Horn of the Abyss towns (Cove, Factory, Bulwark) are left out.

### The spells in a guild

- **How many.** A guild teaches five spells of level 1, four of level 2, three of level 3, two of level 4 and one of level 5, each level once it is built (wiki, Mage Guild; the engine: 6 − level spells per level).
- **Highest level.** Stronghold and Fortress stop at level 3, Castle at 4, the others at 5 (wiki). Our Castle's buildings already stop at Mage Guild Level 4.
- **Which spells.** Each slot is a weighted draw among the level's spells that can still come up, without repeats (wiki, Spell probability table: "the remaining spell pool is reduced"; the engine draws weighted without repeats). Each spell has a weight per town; the wiki's "Spell Slot Probabilities" table lists them ("percentages based on the values stored in the game files"), and each level's weights add up to 100 for every town. For Castle:
  - Level 1: Magic Arrow 30; Bless, Cure, Dispel, Shield 10; Haste, Slow, Stone Skin 5; Protection from Fire, Protection from Water, Summon Boat, View Air, View Earth 3; Bloodlust, Curse 0.
  - Level 2: Ice Bolt 50; Disrupting Ray, Precision, Scuttle Boat 6; Blind, Fire Wall, Fortune, Lightning Bolt, Quicksand, Remove Obstacle 4; Disguise, Protection from Air, Visions, Weakness 2; Death Ripple 0.
  - Level 3: Frost Ring 16; Anti-Magic, Destroy Undead 12; Fireball, Forgetfulness, Land Mine, Teleport 8; Air Shield, Earthquake, Force Field, Hypnotize, Mirth, Misfortune, Protection from Earth 4; Animate Dead 0.
  - Level 4: Chain Lightning, Meteor Shower, Prayer, Resurrection, Town Portal, Water Walk 10; Berserk, Clone, Counterstrike, Fire Shield, Frenzy, Inferno, Slayer, Sorrow 5; Armageddon 0.
- **Spells Castle never gets** (weight 0): Bloodlust, Curse, Death Ripple, Animate Dead, Armageddon, and level 5, which it can't build. The wiki's Unavailable spells by town lists the same ones (with the level 5 spells), and Death Ripple's own page says it "can only appear in Necropolis' mage guild". Titan's Lightning Bolt is never in any guild (it is not in the table; the engine leaves out special spells).
- **When.** The engine draws a town's whole order of spells when the map starts and shows the first ones of each built level; the wiki says a random set "becomes available" for each level. Either way the player can't see the spells of a level before it is built, and they never change afterwards.
- **Map makers** can ban spells, which may leave slots empty (wiki). We have no banned spells yet.

### The screen

- **Opening it.** Clicking the Mage Guild on the town picture (engine).
- **The picture** (the user's screenshot of Castle): a stone room with a window onto the town's landscape. The scrolls sit where each level's spells go: level 1 on the shelf under the table (five), level 2 in the niches of the left column (four), level 3 on the bookshelf (three), level 4 in the arches of the middle column (two). The engine puts them at the same places for Castle.
- **A spell's scroll** shows its picture (engine: the spell scroll images). We have no spell pictures yet, so the scroll shows the spell's name (decided with the user).
- **Levels not built yet** show closed scrolls in their places, as many as the level will have (engine; the screenshot shows two closed scrolls for Castle's level 4). A town's levels above its highest have no scrolls at all (engine: it only goes up to the town's highest level).
- **Hovering a spell** shows its name in the status bar at the bottom (engine).
- **Clicking a spell** shows its description in a message with OK; **right-clicking** shows it in a popup while the button is held. Both show the description at no skill in its school (engine). Not checked against a second source.
- **The bottom bar** has the status bar and the exit button on the right: "Exit Mage Guild" (`core.genrltxt.593`, wiki Translation Data). Enter and Escape close it too (engine). Under it, the kingdom's resources and the date.

## What we do

- **Data.** Each spell in `game/data/spells.json` gets its weight per town (`mageGuildChances`, `{ "CASTLE": 30 }`); a town missing from it never gets the spell. Only Castle's weights for now.
- **Rolling.** A guild level's spells are drawn the first time they are needed (the screen opened, later a hero visiting) and saved as a fact, as the tavern's heroes are. A level drawn once never changes; building the next level draws only that level. The player sees the same as when they are drawn at the start, and a town that starts the scenario with a guild needs nothing extra.
- **The screen** is a window over the town screen, as the Hall and the Tavern are; the resources and the date stay in the HUD under it (decided with the user). It keeps the game's 800 x 600 layout, drawn with CSS: the stone room, the window, the niches, the arches, the bookshelf and the table, with the scrolls at Castle's places. A scroll is the spell's name on a parchment; a closed scroll is two rolled ones.
- **The highest level** is the last guild level the town type's Hall offers: Castle's stops at 4, so its screen has no place for level 5.

## Learning spells and buying a spell book (4.8.2.2)

Checked against the Heroes 3 wiki's raw page source (Mage Guild, Wisdom, Spell Book, and the `GENRLTXT.TXT` page of Translation Data) and against an open-source engine's town and spell book code.

### How Heroes 3 does it

- **Who learns.** A hero with a spell book learns the guild's spells of every built level up to the highest one they can learn (wiki, Mage Guild: guilds "teach heroes new spells"; the engine). A hero without a spell book learns nothing.
- **Wisdom.** Without it a hero learns spells up to level 2; Basic Wisdom opens level 3, Advanced level 4, Expert level 5 (wiki, Wisdom; the engine's skill config). Wisdom limits learning only, not casting (wiki).
- **When.** On walking into the town, when a guild level is built while the hero is in it, and right after buying a spell book (the engine). A spell the hero already knows isn't learned twice. No message tells the player: the spells are simply in the book (the engine shows none; the wiki mentions none).
- **Buying a spell book.** Clicking the Mage Guild with a hero without a spell book in the town (engine: the visiting hero) offers one for 500 gold (wiki, Mage Guild and Spell Book; the engine's cost):
  - with the gold, the question `core.genrltxt.214` "To cast spells, your hero must first buy a spell book for 500 gold.  Do you wish to buy one?", showing the spell book, Yes and No;
  - without it, `core.genrltxt.213` "To cast spells, your hero must first buy a spell book for 500 gold.  Unfortunately, you seem to be a little short of cash at the moment.", with OK.
  - Either way the guild's screen opens: after Yes, after No, and under the short-of-cash message (the engine).
  - Yes takes the 500 gold, gives the hero the book and teaches them the guild's spells at once.
- **No hero in the town**, or one with a spell book: the guild opens without asking.

### What we do

- The hero in the town is the one standing at its entrance; we have no garrison heroes yet.
- **A hero hired in the tavern learns the guild's spells when hired** (decided with the user). The engine only teaches on the next visit; hired heroes from our pool have no spell book yet, so it shows only with a hero whose data gives one.
- A hero of the game (`game/data/heroes.json`) may come with `spellBook` and `spells`, as with secondary skills; a scenario hero's own `spellBook` wins.
- Learning is saved as a fact (`fact.hero.spells.learned`), and buying as the gold spent and `fact.hero.spellBook.bought`. Facts replayed on load teach nothing again.
- Opening the guild with a hero in the town draws its levels' spells as before; the hero then learns from them, so the spells learned are the ones its screen shows.


- The description shown by a click or right-click on a spell (the one at no skill) comes from the engine only.
- The weights come from one wiki table; the game's file it was read from isn't online. Each level adding up to 100 and the wiki's own derived table of chances (Magic Arrow 89% in Castle) agree with them.
- That the guild opens after No, and under the short-of-cash message, comes from the engine only.
- When exactly spells are learned (the visit, a new level, buying the book) comes from the engine only; the wiki says only that guilds teach spells.

## Wisdom and magic schools on level-up (4.8.2.3)

Checked against the Heroes 3 wiki's raw page source (Secondary skill, Wisdom, Hero class) and against an open-source engine's level-up code and hero class config.

### How Heroes 3 does it

- **Wisdom.** A might hero who hasn't been offered Wisdom is offered it at level 6; a magic hero at level 3. Once offered, whether picked or not, it comes again at most 6 levels later for a might hero, 3 for a magic hero (wiki, Wisdom and Secondary skill; the engine).
- **Magic schools.** The same for one of Fire, Air, Water and Earth Magic: every 4 levels for a might hero, every 3 for a magic hero (wiki; the engine). Which school is drawn by the class's weights among the schools the slot can offer (wiki, step 3; the engine).
- **Counting.** The engine keeps a count per hero that starts at 1 and goes up by one at each level-up before the offers are drawn; Wisdom is due when it reaches 6 (3), a school at 4 (3). So a hero who starts at level 1 and is never offered them gets Wisdom at level 6 and a school at level 4, then every 6 and 4 levels after the last offer.
- **Both slots.** The rule applies to each of the two offers, the upgrade and the new skill: the upgrade is Wisdom when it is due and the hero has it at Basic or Advanced; the new skill is Basic Wisdom when it is due and the hero can learn it (wiki, step 3; the engine draws each slot in turn).
- **Wisdom first.** When both are due, a slot offers Wisdom; once Wisdom is offered in a slot, its count starts again, so the next slot can offer the school. When Wisdom takes the only slot a school could have, the school stays due for the next level-up (the engine).
- **Any offer counts.** Wisdom or a school offered by chance starts its count again too (wiki, step 5; the engine).
- **Can't offer it.** A hero with Expert Wisdom, or with 8 skills and no Wisdom, isn't offered it; the count goes on and the guarantee waits until a slot can offer it (the engine). The same for schools.
- **Classes.** Knight is a might class, Cleric a magic one (the engine's class config; the wiki's Hero class page lists the levels: 4, 8, 12 for a might hero's school, 6, 12, 18 for Wisdom, 3, 6, 9 for a magic hero's). In Shadow of Death the Elementalist counts as might for this (wiki); not a Castle class.

### What we do

- Each hero class says whether it is might or magic (`"kind": "MIGHT"` in `hero-classes.json`); might is 6 and 4 levels, magic 3 and 3.
- The levels Wisdom and a school were last offered are worked out from the level-ups already saved (their offers), so nothing new is saved and a reload counts the same. A hero starts as if last offered them at level 0, whatever level they start at: the engine plays a map's high-level hero through the level-ups they skipped, we don't, so a scenario hero starting at level 5 without Wisdom is offered it at level 6 (to be confirmed with the user).
- The upgrade offer stays an even pick among the hero's Basic and Advanced skills when nothing is due (4.7.2).

### Not checked

- The wiki and the engine agree on everything above; the order of the two slots (upgrade first) and that Wisdom offered in the first slot frees the second for a school come from the engine only.

## Not yet

- A hero learning spells on gaining Wisdom while in a town (a level-up there), and a hero in the town's garrison (6.4).
- Scholar (4.8.2.4).
- A hero learning spells on gaining Wisdom in a town: a hero can't gain a level in a town yet (no town building or garrison gives experience).
- Other factions: their highest level, their weights and spells they never get, Tower's Library (one more spell of each level), Conflux's Aurora Borealis (every spell), their own screens (6.5).
- Banned spells and map makers choosing a town's spells (9.1).
