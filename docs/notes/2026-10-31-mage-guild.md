# Mage Guild (2026-10-31)

Roadmap 4.8.2, the second of eight parts of hero magic (4.8, 5.8), built in four parts of its own: the guild's spells and its screen (4.8.2.1), learning spells and buying a spell book (4.8.2.2), Wisdom and magic schools on level-up (4.8.2.3), Scholar (4.8.2.4). This note covers part 1; the later parts add their sections when they are planned.

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

## Not checked

- The description shown by a click or right-click on a spell (the one at no skill) comes from the engine only.
- The weights come from one wiki table; the game's file it was read from isn't online. Each level adding up to 100 and the wiki's own derived table of chances (Magic Arrow 89% in Castle) agree with them.

## Not yet

- Learning the guild's spells and buying a spell book (4.8.2.2), the Wisdom and magic school guarantees on level-up (4.8.2.3), Scholar (4.8.2.4).
- Other factions: their highest level, their weights and spells they never get, Tower's Library (one more spell of each level), Conflux's Aurora Borealis (every spell), their own screens (6.5).
- Banned spells and map makers choosing a town's spells (9.1).
