# Spell book and spell points (2026-10-31)

Roadmap 4.8.1, the first of eight parts of hero magic (4.8, 5.8): the 70 spells' data, a hero's spell points, the spell book and the window that shows it. Nothing can be cast yet. The Mage Guild is 4.8.2; casting in battle starts at 4.8.3.

## How Heroes 3 does it

Checked against the Heroes 3 wiki's raw page source (List of spells, each spell's own page, Spell Point, Spell Book, Intelligence, Mysticism, and the `SPTRAITS.TXT`, `SSTRAITS.TXT`, `GENRLTXT.TXT`, `HeroScrn.txt`, `Help.txt`, `SkillLev.txt` and `artraits.txt` pages of Translation Data), and against an open-source engine's spell loader, hero rules (spell points, the new day), spell book window and hero windows. Shadow of Death rules: the wiki marks Horn of the Abyss values (Intelligence 20 / 35 / 50%, Mysticism by percentage), which are left out.

### The spells

- **70 spells**, in the game's order (`SPTRAITS.TXT`): 10 adventure spells, then 60 combat spells. 15 of the combat spells do damage, 45 do something else (wiki, List of spells). The creature abilities that follow them in the same file are not hero spells.
- **Each spell has** a name, a level (1-5), its schools, a cost at each level of its school's skill (none, Basic, Advanced, Expert), and a description at each of those levels. The open-source engine reads them all from `SPTRAITS.TXT`. The wiki's Translation Data page has the names and descriptions but not the numbers, so levels, schools and costs are checked against the wiki's List of spells and each spell's own page, which agree on all 70.
- **Schools.** Air, Earth, Fire or Water. Magic Arrow and Visions are in all four, and a hero casts them with their best school skill (wiki, Magic Arrow).
- **Cost.** Any level of the school's skill makes a spell cheaper. Basic, Advanced and Expert give the same lower cost (Magic Arrow 5, then 4), except Teleport: 15 / 12 / 6 / 3, "the only spell with a spell point cost that changes with every level of the Water Magic secondary skill" (wiki, Teleport). We keep four costs per spell, as the game's file does.
- **Titan's Lightning Bolt** (level 5 Air, cost 0) is in the list but only Titan's Thunder gives it (wiki). It is never learnt or rolled in a guild.
- **Names.** The book shows the name column of `SPTRAITS.TXT`. Two names are shorter there than on the wiki: "Prot. from Water" and "Prot. from Earth" (but "Protection from Air" and "Protection from Fire"), and the four elementals are "Fire Elemental", "Earth Elemental", "Water Elemental" and "Air Elemental", not "Summon Fire Elemental". We use the game's names.
- **Descriptions** are the game's own (`SPTRAITS.TXT`), e.g. "{Magic Arrow}  Causes a bolt of magical energy to strike the selected unit." at no skill and "{Basic Magic Arrow} …" at Basic.

| Spell | School | Level | Cost (none / with the school) |
|---|---|---|---|
| Summon Boat | Water | 1 | 8 / 7 |
| Scuttle Boat | Water | 2 | 8 / 6 |
| Visions | all | 2 | 4 / 2 |
| View Earth | Earth | 1 | 2 / 1 |
| Disguise | Air | 2 | 4 / 2 |
| View Air | Air | 1 | 2 / 1 |
| Fly | Air | 5 | 20 / 15 |
| Water Walk | Water | 4 | 12 / 8 |
| Dimension Door | Air | 5 | 25 / 20 |
| Town Portal | Earth | 4 | 16 / 12 |
| Quicksand | Earth | 2 | 8 / 6 |
| Land Mine | Fire | 3 | 18 / 15 |
| Force Field | Earth | 3 | 12 / 9 |
| Fire Wall | Fire | 2 | 8 / 6 |
| Earthquake | Earth | 3 | 20 / 17 |
| Magic Arrow | all | 1 | 5 / 4 |
| Ice Bolt | Water | 2 | 8 / 6 |
| Lightning Bolt | Air | 2 | 10 / 8 |
| Implosion | Earth | 5 | 30 / 25 |
| Chain Lightning | Air | 4 | 24 / 20 |
| Frost Ring | Water | 3 | 12 / 9 |
| Fireball | Fire | 3 | 15 / 12 |
| Inferno | Fire | 4 | 16 / 12 |
| Meteor Shower | Earth | 4 | 16 / 12 |
| Death Ripple | Earth | 2 | 10 / 8 |
| Destroy Undead | Air | 3 | 15 / 12 |
| Armageddon | Fire | 4 | 24 / 20 |
| Shield | Earth | 1 | 5 / 4 |
| Air Shield | Air | 3 | 12 / 9 |
| Fire Shield | Fire | 4 | 16 / 12 |
| Protection from Air | Air | 2 | 7 / 5 |
| Protection from Fire | Fire | 1 | 5 / 4 |
| Prot. from Water | Water | 1 | 5 / 4 |
| Prot. from Earth | Earth | 3 | 12 / 9 |
| Anti-Magic | Earth | 3 | 15 / 12 |
| Dispel | Water | 1 | 5 / 4 |
| Magic Mirror | Air | 5 | 25 / 20 |
| Cure | Water | 1 | 6 / 5 |
| Resurrection | Earth | 4 | 20 / 16 |
| Animate Dead | Earth | 3 | 15 / 12 |
| Sacrifice | Fire | 5 | 25 / 20 |
| Bless | Water | 1 | 5 / 4 |
| Curse | Fire | 1 | 6 / 5 |
| Bloodlust | Fire | 1 | 5 / 4 |
| Precision | Air | 2 | 8 / 6 |
| Weakness | Water | 2 | 8 / 6 |
| Stone Skin | Earth | 1 | 5 / 4 |
| Disrupting Ray | Air | 2 | 10 / 8 |
| Prayer | Water | 4 | 16 / 12 |
| Mirth | Water | 3 | 12 / 9 |
| Sorrow | Earth | 4 | 16 / 12 |
| Fortune | Air | 2 | 7 / 5 |
| Misfortune | Fire | 3 | 12 / 9 |
| Haste | Air | 1 | 6 / 5 |
| Slow | Earth | 1 | 6 / 5 |
| Slayer | Fire | 4 | 16 / 12 |
| Frenzy | Fire | 4 | 16 / 12 |
| Titan's Lightning Bolt | Air | 5 | 0 |
| Counterstrike | Air | 4 | 24 / 20 |
| Berserk | Fire | 4 | 20 / 16 |
| Hypnotize | Air | 3 | 18 / 15 |
| Forgetfulness | Water | 3 | 12 / 9 |
| Blind | Fire | 2 | 10 / 8 |
| Teleport | Water | 3 | 15 / 12 / 6 / 3 |
| Remove Obstacle | Water | 2 | 7 / 5 |
| Clone | Water | 4 | 24 / 20 |
| Fire Elemental | Fire | 5 | 25 / 20 |
| Earth Elemental | Earth | 5 | 25 / 20 |
| Water Elemental | Water | 5 | 25 / 20 |
| Air Elemental | Air | 5 | 25 / 20 |

### Spell points

- **Maximum: 10 × Knowledge** (wiki, Spell Point; `core.genrltxt.151`; the engine's 1000% per Knowledge point). Knowledge here is the total, so artifacts that give Knowledge count.
- **Intelligence** raises it by 25 / 50 / 100% at Basic / Advanced / Expert ("doubles" at Expert, `SSTRAITS.TXT`; the engine's data agrees). The engine drops the fraction (Knowledge 1, Basic: 12).
- **Each new day** the hero gets 1 back (wiki, Spell Point; the engine's default). **Mysticism** makes that 2 / 3 / 4 a day, in place of the 1, not on top of it: "Basic Mysticism allows your hero to regenerate 2 spell points per day" (`SSTRAITS.TXT`), and the engine drops the default 1 when the skill gives more.
- **A Mage Guild refills them.** A hero who starts the day in a town with a Mage Guild of any level gets all of them back (wiki, Spell Point and Mysticism; the engine checks the town the hero is visiting for Mage Guild level 1).
- **Over the maximum.** "It is occasionally possible to have more than your maximum spell points from special events or locations" (`core.genrltxt.151`). The engine never takes points away at the new day: a hero over the maximum keeps what they have and gets nothing back until they go below it. A lower maximum (an artifact with Knowledge taken off) leaves the points as they are.
- **Full at the start.** A hero starts the scenario with all of their spell points, and so does a hero hired in a tavern (engine). Raising Knowledge on a level-up raises the maximum only.
- **No spell book needed** to get them back (the engine doesn't check; the wiki doesn't say otherwise).

### Where spell points show

- **Hero screen.** The Spell Points frame shows "current/maximum" (engine) under the label "Spell Points" (`core.genrltxt.387`). Hovering it, the status bar says "View Spell Points Info" (`HeroScrn.txt`). Right-clicking it shows "{Spell Points}  Lord Haart currently has 10 spell points out of a maximum of 10.  The maximum number of spell points is 10 times your Knowledge.  It is occasionally possible to have more than your maximum spell points from special events or locations." (`core.genrltxt.205`).
- **The hero list** has a blue spell points bar to the right of the portrait, on the other side from the movement bar (engine, `IMANA`). It goes up one step per 5 points: a fixed number of points, not a share of the maximum.
- **The info box and the right-click hero popup** show the number under morale and luck (engine).
- **The exchange screen** shows each hero's spell points by their primary skills (engine). Its right-click is the same text as on the hero screen.

### The spell book

- **It is an artifact in its own slot** (`artraits.txt`: "{Spell Book}  Left-click on the spell book to view your spells."). It can't be traded or lost in a defeat (wiki, Spell Book). Might heroes (Knights) start without one, Alchemists and Death Knights with one (wiki). In custom scenarios the map maker can give a hero one, with spells.
- **On the hero screen** it sits in the spell book frame. Clicking it opens the book; hovering, the status bar says "View Spells" (`HeroScrn.txt`).
- **On the adventure map** the Cast spell button opens it on the adventure spells ("{Cast Spell}  Cast a non-combat spell", `Help.txt`). The engine disables the button for a hero with no spell book.

### The spell book window

Checked against the open-source engine's spell book window and the `Help.txt` button texts. Its pictures (`SpelBack`, `SpelTab`, `Spells`) aren't online.

- **Two pages, six spells each,** twelve to a spread. Corners turn the pages: "Turn to the previous page", "Turn to the next page".
- **School bookmarks** down the right side, top to bottom: Air, Earth, Fire, Water, then All ("Turn to view Air spells", "… Earth spells", "… Fire spells", "… Water spells", "Show all spell schools"). It opens on All. A school's first spread starts with the school's picture in the first two places, so it holds ten spells; the spreads after it hold twelve.
- **Bottom buttons:** combat spells ("Turn to view combat spells"), adventure spells ("Turn to view adventure map spells"), the hero's spell points ("Hero's remaining spell points") and close ("Close the Spell Book").
- **Order:** by level, then by school, then by name.
- **Each spell:** its picture, its name, its level ("1st lev" to "5th lev", `core.genrltxt.172-176`, with "/Bas", "/Adv" or "/Exp" added when the hero has the school's skill, `SkillLev.txt`), and "Spell Points: 5" (`core.genrltxt.387`) with the cost for this hero. One the hero can't afford is drawn in white and orange instead of yellow and white.
- **Hovering a spell**, the status bar says "Magic Arrow (1st lev)".
- **Right-clicking a spell** shows its picture and its description at the hero's level of its school. Damage spells add " Does %d points of damage." (`core.genrltxt.343`), which comes with damage (4.8.3).
- **Left-clicking a spell** the hero can't afford says "That spell costs 15 spell points.  Your hero only has 10 spell points, and therefore can't cast the spell." (`core.genrltxt.206`). A combat spell clicked on the adventure map shows its description, as a right-click does. An adventure spell is cast; until 4.8.8 we show its description too.
- **The book remembers** the tab and page it was last open on, one for the adventure map and one for battles (engine).
- The engine's search box, "show all spells" box and bigger book are its own additions; we leave them out.

## What we do

- **Data.** `game/data/spells.json`: the 70 spells keyed like the other data (`MAGIC_ARROW`), in the game's order, each with `name`, `level`, `schools`, `kind` (`adventure` or `combat`), `costs` (four numbers, none to Expert) and `descriptions` (four texts). Titan's Lightning Bolt has `special: true`, so nothing ever puts it in a book or a guild.
- **A hero's spell book** is the hero's `spellBook` (true or false) and `spells` (the spells in it), not an entry in the artifacts: it can't be moved, traded or lost, so the artifact code needn't know it. The hero screen draws it in the spell book frame.
- **Spell points** are part of the hero's state: `spellPoints`, set to the maximum when the hero comes into play (scenario, tavern) and changed only by facts. The new day's refill or regeneration is worked out from the saved facts on `fact.turn.ended`, as weekly bonuses already are, so a reload gets the same numbers.
- **The scenario.** A hero may have `"spellBook": true` and `"spells": ["MAGIC_ARROW", …]`; spells without a spell book are a scenario mistake. The demo map's first hero, Lord Haart (Knowledge 1, so 10 spell points), gets a spell book with spells that fill both pages of combat spells and every school tab, and some he can't afford yet.
- **The hero classes.** Knights start without a spell book, as now. Starting spells by hero come with the heroes that have them (Clerics, 6.5).
- **Shown** on the hero screen, in the hero list's bar, in the info box and hero popup, and on the exchange screen, as above.
- **The window** as above, with stand-in pictures: each spell's picture is its name's initials in its school's colour, until there are pictures (10.1).
- **Fixing an older note.** `2026-10-26-secondary-skills.md` said Mysticism gives "+2 / 3 / 4" a day; it is 2 / 3 / 4 in place of the 1.

## To ask

- **Cast spell with no spell book.** The engine disables the button. We don't know what the game itself does (disabled, or a message): we'll disable it unless you know otherwise.
- **The hero list's spell points bar** grows by a fixed 5 points a step in the engine, but how many steps it has (the frames of `IMANA`) isn't online. We'd draw it as a share of the hero's maximum, as the movement bar is, unless you know the game's steps.
- **Lord Haart's spells.** Proposed: Magic Arrow, Haste, Shield, Stone Skin, Slow, Bloodlust, Curse, Bless, Cure, Dispel, Lightning Bolt, Ice Bolt, Fireball and Prayer (14 combat spells, so All needs a second spread, and Fireball and Prayer cost more than his 10), and View Air, View Earth, Visions and Town Portal.

## Not checked

- What the game itself shows, as against the engine, for the spell book's layout, its sorting, its colours for a spell the hero can't afford, and remembering the last page: the wiki doesn't describe the window.
- Dropping the fraction with Intelligence: from the engine only.
- A hero in a town's garrison (rather than visiting it) getting a Mage Guild's refill: the engine counts the town the hero visits; we have no garrison heroes yet.
- The costs come from one wiki, on two kinds of page (the List of spells and each spell's own page). The other fan sites with spell tables can't be reached from here.

## Not yet

- Wisdom, the school skills' Basic / Advanced / Expert effects beyond the cost, the Mage Guild and learning spells (4.8.2).
- Casting: in battle from 4.8.3, on the map in 4.8.8.
- The Magic Well, Magic Spring and the Mana artifacts (4.8 later, 7.7, 7.8).
- Spell pictures and the book's art (10.1).
