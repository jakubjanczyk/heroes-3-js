# Heroes 3 JS - Feature Roadmap

Prioritized feature roadmap for the game engine and portfolio use case.
The portfolio is a **separate project** consuming this as a core engine/library.

---

## High-Level Overview

| # | Milestone | Priority | Portfolio? |
|---|-----------|----------|------------|
| 1 | Visual Foundation & Cursor System | P0 | Yes |
| 2 | Rich Entity Interactions | P1 | Yes |
| 3 | Game Economy & Time | P1 | Yes |
| 4 | Hero System | P1 | Partial |
| 5 | Creatures & Combat | P1 | No |
| 6 | Town Development | P2 | Yes |
| 7 | Map Objects & World | P2 | Partial |
| 8 | AI & Opponents | P2 | No |
| 9 | Engine as Library / Scenarios | P2 | Yes |
| 10 | Sprites, Animations & Audio Polish | P3 | Yes |

---

## Milestone 1: Visual Foundation & Cursor System

Make the game visually functional. CSS-based - no sprites yet.

### 1.1 Terrain Types
- [x] Terrain type enum: grass, dirt, snow, swamp, lava, sand, rough, subterranean, water, rock (no desert: Heroes 3 uses sand)
- [x] Terrain data in scenario JSON (tile value encodes terrain type, not just 0/1)
- [x] CSS class per terrain type with distinct color/pattern
- [x] Water tiles are impassable
- [x] Terrain type affects movement cost (see 4.6)

### 1.2 Cursor System
Heroes 3 cursors instead of boots and a red X; see `docs/notes/2026-10-19-cursors.md`.
- [x] Custom cursor images replacing default browser cursor (the H3 arrow everywhere, buttons included)
- [x] Cursor states as in H3: arrow, hero, move, attack, visit, numbered 2-4 for the day the hero gets there
- [x] Hover over empty passable tile: horse, numbered when it takes 2+ days; arrow when unreachable
- [x] Hover over monster: crossed swords cursor
- [x] Hover over town entrance: rearing horse (visit) cursor; the town body shows the arrow
- [x] Hover over resource or treasure chest: rearing horse (visit) cursor
- [x] Hover over mine entrance: rearing horse (visit) cursor; the mine body shows the arrow
- [x] Hover over the hero: hero helmet cursor
- [x] Hover over own town: castle cursor; its entrance keeps the rearing horse while the hero is selected (2.3b)
- [x] With a town selected in the town list, the map shows the arrow: the hero does not move
- [x] Hover over another of the player's heroes: exchange cursor, numbered with the day; see `docs/notes/2026-10-25-heroes-meeting.md`
- [x] Scroll arrows at the map edges, while edge scrolling
- [x] Cursor updates in real-time as mouse moves across tiles, and when the hero moves under a still mouse
- [x] Cursor reflects whether tile is within current turn's movement range

### 1.3 HUD Redesign
- [x] Resource bar along the bottom (as in H3) showing all 7 resource types with icons and counts, in H3 order
- [x] Day/week/month display at the end of the resource bar ("Month: 1, Week: 1, Day: 1")
- [x] Right sidebar panel as in H3: minimap, then hero list / 2x5 adventure buttons / town list side by side, then the info box with the army
- [x] Status bar between the map and the resource bar, naming whatever the mouse is over (see 2.5)
- [x] "End Turn" button styled and positioned like H3 (hourglass icon in right panel)
- [x] "Next Hero" button (arrow icon): centres on the hero, disabled once it has no movement left (cycling needs several heroes)
- [x] System options button (gear icon): popup with Music, Reset and Return to game
- [x] H3-style border/frame around the map viewport area
- [x] Interface frame tinted in the current player's colour (`data-player-color` on `.game-shell`; only red used for now)
- [x] Hero list shows the movement left as a green bar beside the portrait, with no number (as in H3)
- [x] Buttons for features that don't exist yet are shown disabled: Kingdom overview, Underground, Quest log, Sleep hero, Cast spell, Adventure options
- [ ] (Not in H3, optional extra) Resource bar tooltips showing daily income per resource. H3 shows income in Kingdom overview

### 1.4 Minimap Improvements
- [x] Minimap shows terrain colors matching terrain types
- [x] Object colours as in H3: hero in player colour; towns and mines neutral grey until owned. Monsters and resources are not shown (H3 does not show them either)
- [x] Owned mines in the owner's player colour
- [x] Owned towns in the owner's player colour
- [x] Click on minimap to move camera to that location
- [x] Drag on minimap to pan camera
- [x] Current viewport rectangle shown on minimap
- [x] Fog of war reflected on minimap

### 1.5 Camera Improvements
- [x] Keyboard arrow keys scroll the map
- [x] Camera bounds - cannot scroll beyond map edges
- [ ] (Not in H3, optional extra) Smooth camera transitions when clicking minimap. H3 jumps straight there
- [x] Clicking the hero's portrait in the hero list selects the hero and centres the camera on them; a click on the hero already selected opens the hero screen instead, as in H3 (4.3b)

---

## Milestone 2: Rich Entity Interactions

Entities become meaningful content containers. Critical for portfolio.

### 2.1 Right-Click Info Panels
As in H3, the popup is shown only while the right mouse button is held down and disappears when it is released.
- [x] Right-click (and hold) any map object shows an info popup centred on the cursor
- [x] Releasing the right mouse button dismisses it (no Escape / click outside: there is nothing to dismiss once released)
- [x] Monster: the creature's picture (its map look until sprites), then count category and plural name, as on hover ("Pack of Skeletons"); never the exact number
- [x] Resource: resource name only; the amount stays hidden until it is picked up
- [x] Mine: mine name, and the owner's colour on the next line ("(Red)") once owned
- [x] Town: town info box (picture, name, Hall and Fort icons, daily gold, garrison) for own towns; name only for others; see `docs/notes/2026-10-22-town-income.md`
  - [x] For now: the player's own town gets the town box (name and the empty garrison); other towns their name. Fort and Hall need buildings (6.2)
- [ ] Hero: hero info box (portrait, name, primary stats A/D/P/K, morale/luck, army)
  - [x] For now: the same box as the info box (portrait initial, name, primary skills, the army with exact counts); morale/luck and spell points need later work
- [x] Right-click on empty terrain shows the terrain name
- [x] Popups look like H3 message boxes: brown leather background, player colour only in the gold-trimmed frame
- [x] (Not in H3, touch screens) Long press (500 ms) opens the same popup above the finger; lifting the finger closes it, a short tap still moves as before

### 2.2 Entity Data Model Expansion
- [ ] Entities support `metadata` field in scenario JSON: `{ title, description, image, links[], tags[] }`
- [ ] Metadata displayed in right-click panels and interaction modals
- [ ] Entity `displayName` field (overrides type-based default name)
- [ ] Entity `flavor` field (short text shown on hover in bottom info bar)
- [ ] Validation: scenario loader validates entity metadata schema

### 2.3 Town View Screen
See `docs/notes/2026-10-20-town-screen.md`.
- [x] Entering a town opens a full-screen town view (replaces adventure map); a town open at reload is shown again
- [x] Town background image area (faction-specific later, placeholder for now): the Castle's land and sky drawn in SVG
- [x] The buildings standing drawn on the town picture, as SVG stand-ins laid out after the H3 Castle (6.3.5)
- [x] Town name in the panel as in H3: the scenario's `name` for the town, else its type's name
- [x] Garrison bar: up to 7 creature stacks displayed (empty until towns have garrisons, 6.4)
- [x] Visiting hero army bar below garrison (when hero is in town), the hero's portrait placeholder first
- [x] "Exit" button (✓, Enter or Escape) returns to adventure map
- [x] Town view has its own events (`command.town.leave.requested`, `fact.town.visited`, `fact.town.left`)
- [x] Creatures available for recruitment panel, with their weekly growth (6.3.2, 6.3.3)
- [x] Hall icon in the panel opens the Hall (6.1)
- [x] The town's daily gold in the panel
- [x] Fort icon in the panel once the town has a Fort, its towers showing the level as the town box's do; it opens the Fort window (6.3.4)
- [ ] Hall icon showing the town's hall level in the panel, as the town box does (it is always the same picture)
- [x] Town list on the panel's right side: the owned towns, the open one framed; clicking one switches to it
- [x] Gold/resource display within town view: the resource bar and date stay under the town screen
- [x] Hovering a town on the map shows its own name (the scenario's `name`) in the status bar and popup
- [x] Hovering the panel names what is under the mouse in the town's status bar: a creature's "9 Pikemen available, +14 growth", the Hall and Fort icons' buildings, "Leave town", a town in the list, the visiting hero's name (H3's "Select <hero> (visiting)" once heroes can garrison)

### 2.3b Town Ownership & Town List
Heroes 3 lets the player open their own towns from the sidebar or the map, with no hero inside. See `docs/notes/2026-10-21-town-ownership.md`.
- [x] A scenario can give a town to the player (`"owner": "red"`); the demo scenario starts with Whitemoon
- [x] Entering a neutral town captures it: a flag in the player's colour on the town, as mines have (3.3). No siege yet: towns have no defenders (5.10)
- [x] Owned towns in the player's colour on the minimap (1.4)
- [x] Owned towns fill the sidebar town list (1.3), in the order they were taken
- [x] Clicking a town in the list selects it, centres the map on it and shows its town info box in place of the hero's (2.1); clicking the hero in the hero list, or Next hero, selects the hero again
- [x] Clicking the selected town again, or double-clicking it, opens its town screen
- [x] Clicking an owned town on the map opens its town screen; the town cursor shows over it (1.2)
- [x] A town opened without a hero shows an empty visiting hero row; leaving returns to the map
- [x] The town list on the town screen's panel switches between owned towns (2.3)
- [x] Ownership persisted in the event log; an open town screen is shown again after reload

### 2.4 Adventure Map Messages
What a visit tells the player. Small pickups go to the info box (2.4b); a dialog opens only for the rest.
- [x] Town visit: opens the town screen
- [x] Treasure chest: dialog to pick the gold or the experience
- [x] Resource pickup: no dialog; the info box shows the resource and the amount (2.4b). A dialog only when the scenario gives the pile its own message
- [x] Mine capture: no dialog; the info box shows the mine's name and the resource's picture with its daily amount for 3 seconds (2.4b); see `docs/notes/2026-10-25-info-box-mine-capture.md`
- [ ] Monster defeat: no message of its own; the battle results window says it (5.9). A monster guarding a treasure says what the hero found after the battle (`core.advevent.183`, with monster loot, 5.9)
- [x] Artifact pickup: no message, the artifact just goes to the hero (7.8.1)
- [x] A message when the backpack is full: "You cannot pick up this artifact, you already have a full load!" (7.8.5)
- [ ] Dwelling visit: asks whether to recruit, then opens the recruit window (6.3.3) (with map dwellings, 7.4)
- [ ] (Not in H3, optional extra) Floating number over the map on a pickup

### 2.4b Info Box
The box at the bottom of the adventure panel shows more than the selected hero or town. How it works:
- It shows the selected hero or town by default.
- A message (a pickup) replaces it for 3 seconds: the pictures with their amounts, a short text over them when it fits (`core.advevent.113` for a resource). Several messages queue and show one after another; a click skips to the next; then the selection comes back. Each pickup plays a sound.
- Clicking it goes through three views: the selected hero or town, then the kingdom overview, then the date, then back. The overview and the date go back to the selection by themselves after 3 seconds. A click on a unit in the hero's army or the town's garrison does not change the view: units there can be selected and rearranged as on the hero and town screens (no split), and right-clicking one opens its creature info window.
- Kingdom overview: the number of the player's towns at each hall level (Village Hall, Town Hall, City Hall, Capitol icons with a count under each), then a row of the allies' flags and a row of the enemies'.
- Date: "Day N" (the day of the week) with the new-day animation; on the first day of a new week "Week N" with that week's animation instead. It also shows by itself for 3 seconds at the start of every turn except the first day, with the new day, week or month sound.
- During another player's turn: an hourglass with that player's crest (8.1).
- Hovering it shows its help text in the status bar, and right-click shows a popup explaining the box (`zelp[292]`, `allTexts[109]`).

Stages:
- [x] Selected hero or town (1.3, 2.1)
- [x] Resource pickup shown for 3 seconds, then back to the selection; a click, moving the hero or selecting a town brings the selection back sooner (2.4); see `docs/notes/2026-10-24-info-box-resource-pickup.md`
- [ ] Queued messages, a click skipping to the next (needs pickups that give several things, 7.5-7.8)
- [ ] Pickup sounds
- [x] Clicking it shows the kingdom overview (towns per hall level, empty Allies and Enemies rows), then the date, then back; each goes back after 3 seconds; see `docs/notes/2026-10-24-info-box-kingdom-overview.md`
- [ ] The allies' and enemies' flags in the kingdom overview (8.1)
- [x] Selecting and rearranging units in the hero's army and the town's garrison in the info box, as on the hero and town screens but without splitting; see `docs/notes/2026-10-25-info-box-army.md`
- [ ] Right-clicking a unit in the info box opens its creature info window (needs the creature info window, 4.3)
- [ ] The date opened by a click plays the new day sound and music, as at the start of a turn (10.4, 10.5)
- [x] The date at the start of each turn after the first: "Day N", or "Week N" on a new week, with the sun rising over the hills (each week of the month under its own sky); see `docs/notes/2026-10-24-info-box-date.md`
- [ ] The new day, week and month sounds (with sound effects, 10.4)
- [x] Status bar text on hover, and right-click popup: a "status window" popup in the middle of the map explaining the box (2.5, 2.1); see `docs/notes/2026-10-25-info-box-help.md`
- [ ] Other pickups as they come: experience, primary skills, spells, artifacts, creatures (7.5-7.8)
- [ ] A picked-up artifact shows in the info box, its picture and name, as a picked-up resource does (7.8.1 picks it up with no message)
- [ ] The hourglass during another player's turn (8.1)

### 2.5 Status Bar
As in H3: a one-line status bar between the map and the resource bar. Text only, no icons, no amounts or income.
- [x] Hovering over a tile with nothing on it shows the terrain name ("Grass", "Water")
- [x] Hovering over a monster shows its plural name ("Skeletons")
- [x] With monster counts (5.2): count category and plural name ("Pack of Skeletons")
- [x] Hovering over a resource shows its name ("Gold"); never the amount
- [x] Hovering over a mine shows its name ("Gold Mine"), on any tile of its footprint
- [x] Hovering over a town shows its name, on any tile of its footprint
- [x] Hovering over the hero shows the hero's name
- [x] The bar empties when the mouse leaves the map
- [ ] Later: hovering over HUD buttons shows what they do ("End turn"), as in H3

---

## Milestone 3: Game Economy & Time

Core game loop - resources flow, time passes.

### 3.1 Day/Week/Month Cycle
- [x] End turn advances day counter by 1
- [x] Day counter persisted in event log (derived from the persisted turn number)
- [ ] Week = 7 days. New week triggers `fact.week_started` event (for creature growth, 6.3.3)
- [ ] Month = 4 weeks (28 days). New month triggers `fact.month_started` event (same)
- [x] "New Week" notification popup at start of each week (a new month shows the same popup; no separate month popup)
- [x] Current date displayed in HUD: "Month: 1, Week: 2, Day: 3"
- [x] Day 1 of week 1 is the starting day

### 3.2 Resource Income System
- [x] At the start of each new day (after end turn), income is calculated and applied
- [x] Income source: owned mines (daily amounts as in H3, in `game/data/mines.json`)
- [x] Income source: owned towns, from their highest hall (6.2); see `docs/notes/2026-10-22-town-income.md`
- [x] Income paid on each new day by the game state, from the towns and mines each player owns (replaying captures and turn ends pays it again)
- [ ] Income breakdown per source (add when something shows it, e.g. the HUD tooltip)
- [ ] (Not in H3, optional extra) Income summary tooltip on each resource in HUD (e.g. "Gold: 5000 (+2000/day)")
- [ ] Visual feedback when income is added (brief flash/highlight on resource counts)
- [x] Starting resources defined in scenario JSON (see 3.5)

### 3.3 Mine Ownership
- [x] Mines are neutral until captured (one player for now, so ownership is just captured or not)
- [x] Hero arriving at neutral mine: captures it, with no message
- [x] Hero arriving at own mine: no action
- [ ] Hero arriving at enemy mine: captures it (combat later, auto-capture for now)
- [x] Mine visual indicator: small flag in the owner's colour
- [x] Neutral mines have no flag
- [x] Each mine blocks the tiles either side of its entrance; the Gem Pond and Ore Pit also the three above, the Sawmill a second tile on the left and, above, the entrance's tile and the one right of it. The rest of the picture can be walked on
- [x] Mine ownership persisted in event log
- [x] Mine income only from owned mines

### 3.4 Resource Spending Framework
See `docs/notes/2026-10-22-spending-resources.md`.
- [x] `canAfford(totals, cost)` utility: checks if player has enough resources (`game/heroes/treasury.js`)
- [x] Spending emits `fact.resources.spent` with the resources and a reason (persisted)
- [x] Insufficient resources: the building window marks the resources the player is short of in red; the Hall shows the building's bar red ("Not enough resources")
- [x] Resource costs defined as objects by resource type, as `startingResources` (`{ GOLD_PILE: 500, WOOD_PILE: 5 }`)
- [ ] Used by:
  - [x] Town building construction
  - [x] Creature recruitment (6.3.3)
  - [ ] Hero recruitment (4.5)

### 3.5 Starting Resources & Configuration
- [ ] Scenario JSON defines starting resources per player
  - [x] For now: one `startingResources` object for the only player (missing types start at 0)
- [x] Default starting resources if not specified: Heroes 3 Normal difficulty (20000 gold, 20 wood, 20 ore, 10 each of mercury, sulfur, crystal and gems)
- [x] Resources initialized on world ready, before first turn

---

## Milestone 4: Hero System

Heroes become characters with identity and progression.

### 4.1 Hero Primary Attributes
- [x] Four primary stats: Attack, Defense, Power, Knowledge
- [x] Starting values come from the hero's class, as in H3 (Knight: A2/D2/P1/K1); only the Knight for now
- [x] A scenario may set any of them per hero, like the H3 editor's "Customize primary skills"; values below the H3 minimums (A0/D0/P1/K1) are rejected
- [x] Stats displayed in the info box (H3 layout: portrait, name, four icons with values) and the hero's right-click popup
- [x] Stats shown in the hero screen (4.3b)
- [x] Attack: increases creature damage dealt in combat (`docs/notes/2026-10-20-battle-attacks.md`)
- [x] Defense: reduces creature damage taken in combat
- [ ] Power: increases spell damage/duration
- [ ] Knowledge: determines max mana (Knowledge * 10)

### 4.2 Hero Experience & Leveling
- [ ] Heroes earn XP from: defeating monsters, visiting XP objects (Learning Stone, etc.)
  - [x] For now: Treasure Chests (see 7.7)
  - [x] Winning a battle: the health of every enemy creature killed (see 5.9)
- [x] XP thresholds per level as in H3: 1000, 2000, 3200, 4600, 6200, 8000, 10000, 12200, 14700, 17500, 20600, then each step 20% more than the one before
- [x] A scenario may set a hero's starting experience (default 0)
- [x] Level-up facts: `fact.hero.experience.gained` and `fact.hero.leveledUp` (with the rolled primary skill, so a reload replays it)
- [x] Level-up popup as in H3: "Hero is now a level 2 Knight." and the primary skill gained ("+1 Defense"), one popup per level
- [x] The primary skill is not chosen: H3 rolls it by the hero class's chances (Knight: A35/D45/P10/K10 up to level 9, A30/D30/P20/K20 from level 10)
- [ ] Choose one of two secondary skills on level-up (4.7.2)
- [x] Hero level shown on the hero screen ("Level 3 Knight"), the only place H3 shows it (4.3b)
- [x] Current experience shown on the hero screen (4.3b)
- [ ] Right-clicking Experience on the hero screen shows the level, the experience for the next level and the current experience, as in H3

### 4.3 Hero Army
- [x] Hero carries up to 7 creature stacks, each in its own slot; a scenario gives every hero an army
- [x] Each stack: creature type + count
  - [x] For now: Skeletons only (from `game/data/monsters.json`), with no creature stats
- [x] Army displayed in the info box and the hero's right-click popup (7 slots, creature picture + exact count per slot; the map look until creature portraits)
- [ ] Click on stack to see creature details (stats, abilities)
- [ ] Drag-and-drop to reorder stacks within hero army
- [x] Split stack: divide one stack into two (in town: 6.3.6, on the hero screen, and between two heroes: 4.5.3)
- [x] Rearranging the army on the hero screen as in the town (6.3.6): click a stack to frame it, click another slot to move, swap or merge, Shift+click or the screen's Split button to split
- [ ] Merge stacks: drag same creature type together to combine
- [ ] Army strength estimate (sum of AI values) shown in hero info

### 4.3b Hero Screen
The H3 hero screen, laid out as the game's; see `docs/notes/2026-10-23-hero-screen.md`.
- [x] Opens on a click on the selected hero in the hero list or on the map, and on a second click on the visiting hero's portrait in a town (the first frames it); ✓, Enter or Escape close it
- [x] Shows the portrait (the initial for now), name, "Level N Knight", the four primary skills, experience and the seven army slots
- [x] Status bar along the bottom: "View Attack Info" over a primary skill, "View Experience Info" over Experience
- [x] Not saved: a reload shows the map
- [x] Empty frames where H3 shows what the game has no data for yet: specialty, morale, luck, spell points, eight secondary skills, the artifact slots on the paper doll, the backpack, Quest Log and Dismiss Hero, the formation, tactics and split buttons
- [x] Secondary skills fill their eight frames (4.7.1)
- [ ] Fill the other frames as their features come: specialty (4.4), morale and luck, spell points and the spell book (4.8), artifacts and backpack (M7), Quest Log, Dismiss Hero (4.5), formations and tactics (5.3)
- [x] Rearranging the army there (4.3)
- [ ] Right-click info on each part, as H3's popups (primary skill descriptions, experience)
- [ ] The hero list down the right side switches between heroes (4.5); it shows the one hero for now
- [x] Status bar text over the army slots, as in town without "(visiting)": "Select Pikeman", "Move Pikeman", "Exchange Pikeman with Archer", "Combine Pikeman armies", "Empty"
- [ ] Status bar text over the portrait (the hero's name) and the buttons

### 4.4 Hero Identity & Portrait
- [ ] Hero has a portrait image (displayed in HUD sidebar, hero panel, map)
- [ ] Hero class: Knight, Cleric, Ranger, Druid, etc. (affects starting stats/skills)
- [ ] Hero specialty: unique bonus (e.g. "+1 Attack per level", "Archery specialist")
- [ ] Hero biography text (flavor)
- [ ] Multiple hero types defined in hero data files

### 4.5 Multiple Heroes
Built in five parts. Parts 1 and 2 first (they shipped together); 3 to 5 in any order after them.

#### 4.5.1 Several heroes from the scenario
- [x] A scenario can start a player with several heroes; the default scenario has two
- [x] All of them on the map, the minimap and in the hero list (portrait and movement bar each)
- [x] Clicking a hero in the list selects them and centres the camera; clicking one on the map selects them
- [x] Selected hero framed in the list (no frame while a town is selected)
- [x] Routes, movement points, the hero box, the hero screen and town visits follow the selected hero; each hero spends their own movement points, and ending the day resets them all
- [x] Each hero keeps their own planned route while another is selected
- [x] Routes go around the player's other heroes; meeting them is 4.5.3
- [x] The selected hero is saved: after a reload the same hero is selected. A new day selects the first hero

#### 4.5.2 Next Hero button
- [x] Cycles through the heroes with movement points left, wrapping round, and centres on the one it selects
- [x] Disabled when none have any left

#### 4.5.3 Heroes meeting
See `docs/notes/2026-10-25-heroes-meeting.md`.
- [x] Hovering over another of the player's heroes shows the exchange cursor (1.2); clicking them plans the route there, and selects them only when there is none
- [x] Walking onto them opens the exchange screen: banners, portraits, primary skills side by side and both armies and secondary skills, with empty frames for what heroes don't have yet (artifacts, spell points, ...)
- [x] Click a stack then where it goes, as in the garrison exchange (6.3.6); splitting stacks there too (4.3)
- [x] The arrow under each slot sends that stack to the other hero; move all left, move all right and swap armies buttons
- [ ] Status bar texts and right-click popups over the rest of the screen
- [ ] Dragging stacks between heroes, later

#### 4.5.4 Tavern: hiring heroes
See `docs/notes/2026-10-25-tavern.md`.
- [x] Clicking the Tavern on the town picture opens the tavern window: two heroes from a pool, 2500 gold each
- [x] A hired hero appears at the town's entrance with a small starting army
- [x] At most 8 heroes per player; no hiring while a hero stands in the town
- [x] The barkeep's rumour, a new one each week; the heroes for hire change each week too
- [x] Holding the right button on a hero for hire shows their hero box
- [x] Only the two heroes offered at the start of a week bring a starting army; a hero who takes a hired one's place brings a single first-level creature
- [ ] Heroes of the other classes and factions; at the start of each week the left-most hero is of the faction the player started as, whichever tavern it is
- [ ] The Thieves' Guild button (8.1); it is there but does nothing yet
- [ ] Rumours about the other players and the Grail (8.1, 7.x)

#### 4.5.5 A defeated hero
See `docs/notes/2026-10-26-defeated-hero.md`.
- [x] A hero who loses a battle leaves the map and the hero list, and the player's next hero is selected
- [x] They go back to the tavern pool, the heroes the scenario started with too; hired again, they are a level 1 hero of their class with a new starting army
- [ ] A beaten hero's artifacts go to the winning hero (with artifacts, 7.8, and enemy heroes, 8.1)
- [ ] A hero who retreats is in the player's tavern straight away, with their level, skills, spells and artifacts, but only one creature of their default stack; no experience from the battle. Retreating on day 7 after the turn has passed puts them in one of the tavern's places instead of a new hero
- [ ] A hero who surrenders is in the player's tavern straight away with everything, the army left to them included (5.7)
- [ ] The tavern's "… with N artifacts" counts them (`core.genrltxt.215`), once a hero can come back with artifacts
- [ ] A hero hired again on the day they were beaten, retreated or surrendered keeps the movement points they had left
- [ ] Losing the last hero: the defeat case of victory conditions (8.5)

### 4.6 Movement Points & Terrain
- [x] 1500 MP per day for now (H3: 1300-2000 from the slowest creature's speed; needs hero army, 4.3)
- [x] A step costs the terrain of the tile the hero leaves:
  - Grass, dirt, lava, subterranean: 100
  - Rough: 125
  - Sand, snow: 150
  - Swamp: 175
  - Rock, water: impassable on foot
- [x] Diagonal step costs the straight cost × √2, rounded down (141 / 176 / 212 / 247)
- [x] Diagonal step that no longer fits is allowed when a straight one would, and takes all MP left
- [x] When what is left after a step can't pay a straight step from the new tile, MP drops to 0
- [x] Route search picks the cheapest route by MP; diagonal steps may pass between two blocked tiles
- [x] Path preview marks the part of the route past today's MP (H3 shows no per-step costs)
- [x] Roads (needs a road layer): used only when both tiles have a road, cost of the road left: dirt 75, gravel 65, cobblestone 50
- [ ] Pathfinding skill takes 25 / 50 / 75 off the terrain cost, never below 100
- [ ] Native terrain: an all-native army pays 100 on its terrain
- [ ] Logistics skill increases total MP:
  - Basic: +10%, Advanced: +20%, Expert: +30%
- [ ] A click while the hero walks stops them at the next tile

### 4.7 Hero Secondary Skills
Built in three parts; see `docs/notes/2026-10-26-secondary-skills.md`.

#### 4.7.1 Skills and starting skills
- [x] The 28 skills (`game/data/secondary-skills.json`), each with Basic, Advanced and Expert: Pathfinding, Archery, Logistics, Scouting, Diplomacy, Navigation, Leadership, Wisdom, Mysticism, Luck, Ballistics, Eagle Eye, Necromancy, Estates, Fire Magic, Air Magic, Water Magic, Earth Magic, Scholar, Tactics, Artillery, Learning, Offense, Armorer, Intelligence, Sorcery, Resistance, First Aid
- [x] Up to 8 per hero; each hero starts with their own (`game/data/heroes.json`): every Knight has Basic Leadership, plus Archery (Orrin, Valeska), Armorer (Edric), Navigation (Sylvia), Estates (Lord Haart), Offense (Sorsha) or Artillery (Christian)
- [x] The scenario's first hero is Lord Haart; a scenario hero may list their own skills
- [x] Hired heroes get their starting skills, and keep them after a reload; a beaten hero hired again has their starting skills
- [x] The hero screen fills its eight secondary skill slots ("Basic" over "Leadership", initials for the icon); right click shows what the skill does, the status bar "View Basic Leadership Info"
- [x] The exchange screen shows both heroes' skills

#### 4.7.2 Choosing a skill on level-up
- [x] On level-up, choose 1 of 2: one skill the hero has at Basic or Advanced, one weighted by the class's table (the Knight's in `hero-classes.json`; the note has the Cleric's); with no skill to upgrade both are new, with 8 skills both are upgrades
- [x] Nothing picked at first and OK disabled until a pick; a single offer comes picked; with nothing to offer, OK is enabled
- [x] Several levels at once show one popup each, the next offering skills after the last pick
- [x] The choice saved as a fact, so a reload replays it; a popup open when the page closed shows again with the same offers
- [ ] Guaranteed offers: Wisdom at least every 6 levels and a magic school at least every 4, unless the hero has them or can't learn them
- [x] The popup laid out as the game's: each line in a dark bar, the hero between two medals, the gained primary skill pictured over "Knowledge +1", the checkmark in the bottom right
- [ ] The hero's portrait (4.4) and skill pictures in place of the initials

#### 4.7.3 What the skills do
Each comes with the feature it changes; the note has every skill's numbers.
- [ ] Logistics, Pathfinding (4.6), Navigation (7.10)
- [ ] Scouting (7.1)
- [ ] Estates (3.2)
- [ ] Learning (4.2)
- [ ] Archery, Offense, Armorer (5.6)
- [x] Leadership and Luck (4.9)
- [ ] Tactics (5.3), Ballistics (5.10), Artillery and First Aid (with war machines)
- [ ] Diplomacy (5.2, 5.7)
- [ ] Wisdom, Mysticism, Intelligence, Eagle Eye, Scholar and the four schools of magic (4.8); Sorcery and Resistance (5.8)
- [ ] Necromancy (with the Necropolis)

### 4.8 Hero Magic
70 spells: 15 combat damage spells, 45 other combat spells and 10 adventure map spells, each with a level (1-5), a school (Air, Earth, Fire, Water; Magic Arrow and Visions are in all four) and a cost, lower with any level of the school's skill (Magic Arrow 5, or 4). The combat spells are 5.8. Built in eight parts; each part's note checks its rules.

#### 4.8.1 Spell book and spell points
See `docs/notes/2026-10-31-spell-book-and-spell-points.md`.
- [ ] The 70 spells' data (`game/data/spells.json`): name, level, schools, cost and description at each level of the school's skill
- [ ] Spell points: 10 × Knowledge, more with Intelligence; 1 back each day, more with Mysticism; all back when the hero starts the day in a town with a Mage Guild
- [ ] Spell points shown on the hero screen, in its spell points frame, and in the hero list, the info box, the hero popup and the exchange screen
- [ ] A scenario hero may start with a spell book and spells; the demo map's first hero has a spell book
- [ ] The spell book window: the school tabs, pages, right-click description of each spell; opened by the adventure map's Cast spell button. Nothing can be cast yet
- [ ] Kept after a reload

#### 4.8.2 Mage Guild
- [ ] Each guild level rolls its spells when built: five of level 1, four of level 2, three of level 3, two of level 4 (Castle stops at 4), with Castle's odds and the spells it never gets
- [ ] Clicking the Mage Guild opens its screen showing the spells
- [ ] The Mage Guild sells a spell book for 500 gold
- [ ] A visiting hero with a spell book learns the guild's spells; up to level 2 without Wisdom, Wisdom opening levels 3, 4 and 5
- [ ] Level-up offers Wisdom at least every 6 levels and a magic school at least every 4 (4.7.2)
- [ ] Scholar: two heroes meeting teach each other spells up to level 2 / 3 / 4 (4.5.3)

#### 4.8.3 to 4.8.7
The combat spells, in 5.8.

#### 4.8.8 Adventure map spells
- [ ] View Air, View Earth, Visions, Dimension Door, Fly and Town Portal, cast from the spell book on the map
- [ ] Summon Boat, Scuttle Boat and Water Walk with boats (7.10); Disguise with enemy heroes (8.1)

#### 4.8 later
- [ ] Map objects: the Shrines of Magic Incantation, Gesture and Thought, Magic Well, Magic Spring, Pyramid, spells from Pandora's Box (7.7)
- [ ] Artifacts: the spell scrolls, the Charm, Talisman and Mystic Orb of Mana, the Tomes and Orbs, Wizard's Well, Titan's Thunder's spell book and bolt (7.8)
- [ ] Eagle Eye: learning a spell an enemy hero casts in battle (8.1)

### 4.9 Morale and Luck
See `docs/notes/2026-10-28-morale-and-luck.md` and, for battle, `docs/notes/2026-10-28-morale-and-luck-in-battle.md`.
- [x] Morale -3 to +3 and luck 0 to +3, the modifiers added up and held to the range
- [x] Sources the game has: Leadership and Luck skills; creatures of one town +1, of three -1, four -2; undead in the army -1; Angels or Archangels +1
- [x] Shown on the hero screen, the exchange screen and the hero box (info box, right-click popup, tavern), with stand-in pictures
- [x] Right click: the state as title, what it means, and the current modifiers or "None"; the status bar names the state
- [x] Follows the army as it changes, and the same after a reload
- [x] In battle: good morale gives an extra turn, bad morale freezes a stack, luck doubles the base damage (5.6)
- [x] A picture over the stack when its morale or luck takes effect: good morale, bad morale, good luck (stand-ins)
- [ ] The game's morale and luck animations and sounds in their place (10.3, 10.4)
- [ ] The wait phase of its own for a stack that waits on its extra turn (it waits with the others for now)
- [ ] Bonuses until the next battle (7.6), artifacts (7.8) and spells (5.8)

---

## Milestone 5: Creatures & Combat

The central gameplay mechanic.

### 5.1 Creature Database
See `docs/notes/2026-10-19-creature-database.md`.
- [ ] Creature data for every faction (one file, `game/data/monsters.json`, with a faction on each creature)
  - [x] Castle, plus Skeleton and Skeleton Warrior (the creatures the game already uses)
- [x] Creature stats: attack, defense, min damage, max damage, health, speed, growth, cost
- [x] Creature tier: 1-7 (determines power level and town dwelling level)
- [x] Creature abilities/flags: ranged (with shots), flying, double-wide (2-hex), undead, etc. (names only; they do nothing until combat)
- [x] Upgraded creature variants (e.g. Skeleton -> Skeleton Warrior)
- [x] Creature value (AI value) for army strength estimation
- [ ] Creature portraits (58x64 and 32x32) for the army slots, hero screen and town
- [x] At minimum implement Castle faction creatures:
  - T1: Pikeman / Halberdier
  - T2: Archer / Marksman
  - T3: Griffin / Royal Griffin
  - T4: Swordsman / Crusader
  - T5: Monk / Zealot
  - T6: Cavalier / Champion
  - T7: Angel / Archangel

### 5.2 Monster Encounters on Map
- [x] Monsters on map have a creature type and count (not just "skeleton"); the scenario must give every monster a count
- [x] Monster count categories as in H3: Few (1-4), Several (5-9), Pack (10-19), Lots (20-49), Horde (50-99), Throng (100-249), Swarm (250-499), Zounds (500-999), Legion (1000+)
- [x] Monster count shown on hover and in the right-click popup (category, not exact number)
- [ ] Monster aggression: some flee, some join, some fight (based on army strength ratio + Diplomacy)
- [ ] Monster growth over time: count increases each week (optional, based on scenario settings)
- [x] Approaching a monster initiates combat (not instant defeat): the battle screen opens; Auto combat wins it for now (`docs/notes/2026-10-20-battle-screen.md`)
- [ ] Weak monsters may offer to flee or join hero's army

### 5.3 Combat Grid & Layout
See `docs/notes/2026-10-20-battle-screen.md` and `docs/notes/2026-10-20-monster-stacks-double-wide-and-battle-cursors.md`.
- [x] Combat takes place on a separate screen (hexagonal grid)
- [x] Grid size: 15 columns x 11 rows of hexagonal cells
- [x] Attacker units placed on left side, defender on right, in the Heroes 3 start formation
- [x] Terrain background based on adventure map terrain where combat started (the ground takes the terrain's colour)
- [x] Attacking hero shown in the top-left corner (a placeholder figure)
- [x] Combat bar as in H3: System options, Surrender, Retreat, Auto combat, message log, Cast spell, Wait, Defend, and the status bar (only Auto combat works yet)
- [x] A battle open at reload is shown again
- [x] A neutral monster splits into several stacks, as in H3: more the weaker the hero's army, one more or fewer by the monster's tile; a scenario may set the number
- [ ] A split monster's middle stack is sometimes the upgraded creature, as in H3
- [ ] Clicking your own stack shows its creature's details and clicking the hero the hero's (the ? and helmet cursors already show over them)
- [ ] Creature pictures on the battlefield (placeholders for now)
- [ ] Obstacles on combat grid (random placement or scenario-defined)
- [ ] Grid cells: passable, obstacle, wall (siege)
- [ ] Hex coordinate system with neighbor calculation
- [x] Mouse hover highlights the hex under it, as H3's cursor shadow: a hex the stack can move to, or every hex of an enemy it can attack or shoot (`docs/notes/2026-10-20-battle-hover-highlight.md`)
- [ ] Hover shows a stack's movement/attack range

### 5.4 Combat Turn Order
See `docs/notes/2026-10-20-battle-turns-and-movement.md`.
- [x] Initiative based on creature speed stat
- [x] Faster creatures act first
- [x] Each stack acts once per round
- [x] Round ends when all stacks have acted, then new round starts
- [x] Current active stack highlighted
- [ ] (Not in H3, optional extra) Turn order bar/queue display showing upcoming stacks
- [x] Ties in speed: attacker goes first, then the earlier army slot
- [x] The monster's stacks take their turns with the combat AI (5.7b)

### 5.5 Combat Movement
- [x] Active stack can move up to its speed in hexes
- [x] Pathfinding on hex grid (around other stacks; obstacles when there are some)
- [x] Movement range highlighted (reachable hexes)
- [x] Flying creatures ignore ground obstacles, can move to any hex in range
- [x] Double-wide creatures (e.g. Cavalier) occupy 2 hexes, the back half behind them; edge columns past each side take only back halves
- [x] Click to move stack to hex
- [x] Movement animation (stack slides across hexes)
- [x] Status bar over a reachable hex: "Move Skeletons here" / "Fly Angels here"
- [x] Battle cursors as in H3: walk, fly, blocked, the sword from the side attacked from, ? over your own stacks, the helmet over the hero, the arrow while a stack moves

### 5.6 Combat Attacks
See `docs/notes/2026-10-20-battle-attacks.md` and `docs/notes/2026-10-20-ranged-attacks.md`.
- [x] Melee attack: click an enemy stack; the reachable side nearest the mouse picks the hex to attack from (on a touch screen a stack next to it attacks from where it stands), and the stack walks or flies there first
- [x] Damage formula as in H3: attack above defense +5% a point (up to +300%), defense above attack -2.5% a point (up to -70%), rounded down, at least 1
- [x] Attack stat = creature attack + hero Attack attribute
- [x] Defense stat = creature defense + hero Defense attribute
- [x] Damage roll as in H3: one roll per creature up to 10 creatures; a bigger stack rolls 10 times, times count / 10
- [x] Casualties: the damage goes to the wounded top creature first, then whole creatures; the leftover wounds the next
- [x] Retaliation: defending stack strikes back once per round (Griffins twice, Royal Griffins every time); a dead stack does not
- [x] Crusaders strike twice: attack, retaliation, attack again
- [x] Combat log as in H3: "The Angels do 175 damage. 17 Pikemen perish." (wording not checked against the game's text files)
- [x] Status bar over an enemy: "Attack Pikemen (damage 18-36)" (wording not checked against the game's text files)
- [x] Ranged attack: a shooter with shots and no enemy next to it shoots any enemy stack, wherever it is, and the target does not strike back
- [x] Ranged: limited ammo (12 shots a battle, 24 once upgraded); Marksmen shoot twice and use a shot each time
- [x] Ranged: a shooter attacking in melee (an enemy next to it, or no shots left) does half damage, its retaliation too; Zealots do not (melee penalty)
- [x] Ranged: half damage at a target more than 10 hexes away (distance penalty)
- [x] Status bar over a target: "Shoot Pikemen (12 shots left, damage 21-31)"; the cursor is an arrow, broken when the distance penalty applies
- [ ] Ranged: blocked by castle walls in line of fire (in H3 only walls block a shot: siege, 5.10)
- [ ] Shots left shown in the creature's info window (needs the window) and the Ammo Cart
- [ ] Attack animation: brief visual for attack, damage number shown
- [x] A stack at 0 units stays on its hex as a corpse: it gets no turn, and other stacks can stand on it
- [ ] Death animation
- [x] Luck: a lucky strike adds +100% to the damage (4.9)
- [ ] Jousting (Cavaliers), hatred (Angels and Devils), Offense and Armorer skills

### 5.7 Combat Actions (Wait, Defend, Retreat, Surrender)
See `docs/notes/2026-10-20-wait-defend-auto-combat.md` and `docs/notes/2026-10-20-retreat-surrender-results.md`.
- [x] **Wait**: skip current turn, act again once every other stack has acted, the stacks that waited slowest first; once per round
- [x] **Defend**: end the turn with +20% Defense (at least 1 point) until the stack's next turn
- [x] **Retreat** (R): asked first; the hero flees and loses the army. For now the hero leaves the map as when beaten; keeping their level and artifacts is 4.5.5
- [ ] **Surrender**: pay the enemy gold to leave with the army: half the recruitment cost of the creatures left, gold only; the hero waits in the player's tavern with the army (4.5.5)
  - [x] Disabled against neutral monsters, as in H3: only an enemy hero takes a surrender
  - [ ] The surrender itself (needs enemy heroes)
- [x] **Auto-combat**: the combat AI plays your stacks until the battle ends or you press it again
- [x] Wait and Defend work only on your stack's turn: disabled while the monster acts, a stack moves or Auto combat plays
- [ ] A defending stack shown as such (H3 shows it in the creature's info window)

### 5.7b Combat AI
See `docs/notes/2026-10-20-combat-ai.md`.
- [x] Enemy stacks act on their own, simply: go for the nearest stack (fewest hexes to a side of it; the earlier army slot on a tie) and attack it, or get as close as the turn allows. A shooter that can shoot shoots the nearest enemy stack instead
- [x] Auto combat uses the same AI for the player's stacks
- [ ] Smarter combat AI (later):
  - [ ] Pick the target by threat and value (damage it can deal, creatures it can kill, retaliation it would take), not only by distance
  - [ ] Shooters stay back rather than stand still, and go for enemy shooters
  - [ ] Use Wait and Defend (5.7), e.g. wait for the enemy to come into reach rather than walk into a first strike
  - [ ] Protect its own shooters and weak stacks; keep stacks together
  - [ ] Cast spells when a hero leads the army (5.8)

### 5.8 Combat Spells
Parts 3 to 7 of hero magic (4.8).

#### 4.8.3 Casting in battle, single-target damage
- [ ] Cast spell works: once per round, on one of your stacks' turns, the stack acting afterwards
- [ ] The battle spell book shows only combat spells; casting takes the spell points
- [ ] Strength by Power and the school's skill level (no skill casts as Basic)
- [ ] Magic Arrow, Lightning Bolt, Ice Bolt, Implosion and Destroy Undead
- [ ] Sorcery's extra damage; the cast and the damage in the combat log

#### 4.8.4 Spells that last
- [ ] Bless, Bloodlust, Shield, Stone Skin, Air Shield, Precision, Haste, Prayer, Fortune, Mirth; Curse, Slow, Weakness, Disrupting Ray, Misfortune, Sorrow
- [ ] They last as many rounds as the hero's Power; at Expert most hit all friendly or all enemy stacks
- [ ] Cure, Dispel and the four Protections
- [ ] The Angelic Alliance's Prayer (7.8.7)

#### 4.8.5 Area damage
- [ ] Fireball, Inferno, Meteor Shower, Frost Ring, Death Ripple, Chain Lightning and Armageddon
- [ ] Targeting a hex shows the area hit; your own stacks are hit too

#### 4.8.6 Immunities and Resistance
- [ ] Undead immune to mind spells, creatures resisting some spell levels or schools
- [ ] The Resistance skill's chance an enemy spell fails on a stack
- [ ] Badge of Courage's immunity to mind spells (7.8.3) and the Power of the Dragon Father's immunity (7.8.7)

#### 4.8.7 Control and special spells
May split in two.
- [ ] Blind, Berserk, Hypnotize, Forgetfulness, Frenzy, Slayer, Counterstrike, Fire Shield, Magic Mirror, Anti-Magic, Teleport, Clone and Sacrifice

#### 5.8 later
- [ ] Fire Wall, Force Field, Quicksand, Land Mine and Remove Obstacle, with obstacles on the battlefield (5.3); Earthquake with sieges (5.10)
- [ ] The four Summon Elemental spells, Resurrection and Animate Dead, with the elementals and the dead counted
- [ ] Enemy heroes casting, and the combat AI and Auto combat casting (8.1, 5.7b)
- [ ] The Armor of the Damned's curses (7.8.7)

### 5.9 Combat Resolution
- [ ] **Victory**: all enemy stacks destroyed or fled
  - [x] The battle ends when the monster has no creatures left
  - [x] XP awarded: the health of every enemy creature killed, as in H3 (Auto combat counts the whole monster)
  - [x] The hero's army keeps its losses after the battle: each stack keeps the creatures it has left, a stack with none leaves its slot empty
  - Loot: gold and/or resources dropped by neutral monsters
  - [x] Creature losses tallied and shown in the results window, for both sides
  - [x] Results window over the darkened battle: each side Victorious or Defeated, "A glorious victory!" and the experience gained; OK (Enter) closes it, and a level-up popup follows
- [ ] **Defeat**: all your stacks destroyed
  - [x] Hero lost (removed from map)
  - [x] The monster stays on the map with the creatures it has left
  - If defending town: town captured by attacker
  - [x] The results window: "Your forces suffer a bitter defeat, and ... abandons your cause"
- [x] **Flee/Retreat**: hero escapes, army lost, hero removed (no taverns yet); the monster keeps what it has left
- [ ] **Surrender**: hero keeps army, pays gold
- [x] Post-combat: return to adventure map, dead monsters removed, hero continues

### 5.10 Siege Combat
- [ ] Entering a town that has defenders (a garrison, 6.4, or later an enemy hero) starts a battle; the town is captured only if the hero wins. Until then entering a neutral town captures it straight away (2.3b)
- [ ] Combat at a fortified town includes walls
- [ ] Wall segments with health points (can be destroyed by catapult)
- [ ] Gate: main entry point, can be attacked/destroyed
- [ ] Moat: slows/damages attackers crossing
- [ ] Arrow towers: shoot attacking stacks each round
- [ ] Catapult: attacker's siege weapon, targets walls/towers
- [ ] Defender stacks placed inside walls
- [ ] Attacker must breach walls or gate to reach defenders
- [ ] Fort/Citadel/Castle determines wall strength and tower count

---

## Milestone 6: Town Development

Towns as economic and military hubs.

### 6.1 Town Buildings System
See `docs/notes/2026-10-21-town-buildings.md`.
- [x] Each town has a set of building slots: the Hall, opened from the town screen's Hall icon, in H3's rows (Castle so far)
- [x] Build one building per day per town
- [x] Buildings have resource costs (gold + materials), shown in the building window
- [x] Building checks the player can afford it and spends the cost (3.4)
- [x] Buildings have prerequisites; the window lists the missing ones
- [x] Build button: select building, construction completes instantly; the Hall closes back to the town screen
- [x] A scenario can start a town with buildings (`"buildings": [...]`); every town has its Village Hall
- [x] Shipyard only in a town with water next to it; one Capitol per player
- [x] Built buildings visually appear on town view background (6.3.5); see `docs/notes/2026-10-23-town-picture.md`
- [ ] Building pictures and descriptions in the Hall and the building window
- [x] Building name on hover in the town screen's status bar (6.3.5)
- [ ] Right-clicking a building on the town picture shows its info: picture, name and description (H3 shows the building window without Build)
- [ ] Other factions' buildings and Hall layouts (shared buildings are in `game/data/buildings.json`)
- [ ] A faction can drop a shared building it doesn't have (`"SHIPYARD": null` for Inferno and Dungeon), so a scenario can't give it one
- [ ] Buildings that upgrade themselves: a horde building (Griffin Bastion) upgrades when its dwelling is upgraded (matters once buildings have effects, 6.3)
- [ ] Unit test checking the data files: every `requires` and Hall entry names a building that exists
- Requirements are all-of lists; the eight original factions need nothing else (no "A or B" requirements)

### 6.2 Common Buildings (all factions)
- [x] **Village Hall** (built-in) -> Town Hall -> City Hall -> Capitol
  - Income: 500 / 1000 / 2000 / 4000 gold per day
  - Only one Capitol across all towns
- [ ] **Fort** -> Citadel -> Castle
  - Fort: basic walls in siege, no creature growth bonus; opens the Fort window (6.3.4)
  - Citadel: moat + tower, +50% creature growth
  - Castle: 2 towers, +100% creature growth (replaces the Citadel's +50%, doesn't add to it)
- [ ] **Tavern**: recruit heroes, +1 morale to visiting hero
- [ ] **Marketplace**: trade resources (exchange ratios depend on marketplace count)
- [ ] **Resource Silo**: provides +1 of a specific resource per day (faction-dependent)
- [ ] **Blacksmith**: provides ballista (first aid tent/ammo cart) to visiting heroes
- [ ] **Mage Guild** (levels 1-5): teaches spells to visiting heroes
  - Each level unlocks random spells of that tier
  - Higher tiers require lower tiers built first

### 6.3 Creature Dwellings in Town
How Heroes 3 does it:
- Each dwelling makes one creature tier (7 per faction). Its upgrade makes the upgraded creature recruitable too, from the same pool.
- Growth arrives at the start of each week (with the "New week" popup). Unbought creatures pile up from week to week, in neutral towns too, so a captured town keeps what built up.
- A dwelling that stands at the start of the game, or has just been built, has one week of creatures to buy straight away.
- Bonuses: Citadel +50%, Castle +100% (the Fort gives none); horde buildings add a flat number (Griffin Bastion: +3 Griffins).
- Recruits go to the town's garrison only, never to the visiting hero; with no room there, Recruit says "There is no room in the garrison for this army." and the window stays open. No hero is needed, and there is no daily limit.
- The panel (bottom left of the town screen) shows each built tier's creature with its weekly growth ("+14"), in a row of 4 and a row of 3; an unbuilt tier's slot is empty. Clicking a creature opens its recruit window.
- The Fort window, opened from the Fort icon or the fort on the town picture, exists only once a Fort is built; its title is the fort's name (Fort, Citadel, Castle). Tiers 1-6 in two columns and tier 7 centred below: each card has the plural creature name over the dwelling's picture, the dwelling's name and "Available: N", the creature's picture, and Attack, Defense, Damage, Health, Speed and Growth. Clicking a card opens the recruit window over it; the ✓ closes it.
- The recruit window: "Recruit <plural>" as its title; both creatures for an upgraded dwelling, the selected one framed in red and the upgraded one selected first; boxes for Cost Per Troop (a column per resource), Available, Recruit and Total Cost; a slider with arrow buttons, going no higher than the player can afford; Max, Recruit (greyed out at 0) and Cancel. The slider starts at 1 when one can be bought and afforded, otherwise at 0.
- A dwelling built during the game has one week of its creature's own growth straight away; the Citadel's and Castle's bonus counts from the next week.

Stages, one PR each, done in this order:

#### 6.3.1 Town garrison holds creatures (6.4)
- [x] A scenario can start a town with a garrison (`"garrison": [...]`, as a hero's army); see `docs/notes/2026-10-22-town-garrison.md`
- [x] The garrison is shown in the town screen's top row, the town box (2.1) and the right-click popup
- [x] Only the player's own towns may start with a garrison for now: in H3 a garrisoned town is taken only by winning a siege (5.10), which doesn't exist yet. Neutral garrisons come with sieges (6.4)

#### 6.3.2 Weekly growth
- [x] Dwellings in the data say which creature they make; horde buildings say what they add (Griffin Bastion +3)
- [x] Citadel +50%, Castle +100%, horde buildings' flat bonus; see `docs/notes/2026-10-22-creature-growth.md`
- [x] The town screen's panel shows each built tier's creature and its weekly growth (2.3)

#### 6.3.3 Recruit window, opened from the panel
- [x] Each dwelling keeps the creatures available to buy; the recruit window is the first place the player sees that number, so it comes with this stage
- [x] Dwellings standing at the start of the game have one week of creatures
- [x] Growth at the start of each week, piling up, in neutral towns too (worked out from the turn ends, as income is; no `fact.week_started` yet, 3.1)
- [x] Recruit window: title, Cost Per Troop, Available, Recruit, Total Cost, slider with arrows, Max, Recruit, Cancel
- [x] Slider starts at 1 when one can be bought and afforded, else 0; Recruit greyed out at 0
- [x] Upgraded dwelling: both creatures shown, upgraded one selected first, sharing the pool
- [x] Recruiting spends the resources (`fact.resources.spent`, 3.4) and lowers what is available; persisted
- [x] A dwelling built today has one week of creatures straight away
- [x] Recruits go to the garrison only; with no room there, recruiting is refused with "There is no room in the garrison for this army."
- [x] The slider goes no higher than the player can afford; Max picks as many as are available and affordable; Enter recruits, Escape cancels
- [x] The town box and right-click popup show the recruits in the garrison; see `docs/notes/2026-10-22-creature-recruitment.md`

#### 6.3.4 Fort window
- [x] The Fort icon opens the Fort window once a Fort is built; see `docs/notes/2026-10-23-fort-window.md`
- [x] Seven cards with the creature, dwelling, available count and stats, as above; a tier without a dwelling shows its plain dwelling and creature with none available
- [x] Clicking a card opens the recruit window over it; recruiting goes back to the Fort window with the new numbers

#### 6.3.5 Buildings on the town picture (6.1, 2.3)
- [x] Built buildings drawn on the town picture as stand-ins; a chain shows only its highest building (Castle replaces Citadel and Fort); see `docs/notes/2026-10-23-town-picture.md`
- [x] Hovering a building highlights it and shows its name in the status bar
- [x] Clicking a dwelling opens its recruit window, the fort the Fort window, the hall the Hall
- [x] Clicking the Tavern opens the tavern window (4.5.4)
- [ ] Clicking the other buildings opens their screens as they come: Marketplace and Resource Silo, Mage Guild (4.8), Blacksmith, Shipyard (6.2); the Brotherhood, Lighthouse and Stables show their description
- [ ] Right-click info on a building (6.1)
- [ ] A building just built fades in, as in H3

#### 6.3.6 Moving creatures between garrison and visiting hero (6.4)
- [x] Click a stack, then a slot: it moves onto an empty slot, merges into the same creature, swaps with another; between the rows or within one; see `docs/notes/2026-10-23-garrison-exchange.md`
- [x] The hero's army is never left empty: its last stack moved to the garrison leaves one creature behind, and merged into the same creature there opens the split window
- [x] Hovering a slot says what a click does in the status bar, in H3's words ("Select Pikeman (in garrison)", "Exchange Pikeman with Archer", "Move Pikeman")
- [x] Split a stack (Shift+click, or the Split button, onto an empty slot or a stack of the same creature, then pick the counts); see `docs/notes/2026-10-23-stack-splitting.md`

#### 6.3 later
- [ ] Upgrading creatures already in an army (Upg. dwelling + Hill Fort)
- [ ] "Week of the X" (+5 growth) and plague weeks
- [ ] Growth from the Grail (+1 per flagged map dwelling is 7.4.4)

### 6.4 Town Garrison
- [x] Town has its own garrison (7 creature stacks, independent of visiting hero) (6.3.1)
- [ ] Garrison defends town if attacked while no hero is present (5.10)
- [ ] A scenario can give a neutral town a garrison that defends it; capturing the town means winning that battle (5.10). Until sieges exist, only the player's own towns may start with a garrison (6.3.1)
- [x] Visiting hero can exchange creatures with garrison (click a stack, then where it goes) (6.3.6)
- [x] Garrison shown in town view as a row of 7 slots (6.3.1)

### 6.5 Town Factions
- [ ] Each faction has unique buildings, creatures, and town view
- [ ] Minimum viable: **Castle** faction fully implemented
- [ ] Faction list (implement progressively):
  - Castle (human knights, angels)
  - Rampart (elves, unicorns, dragons)
  - Tower (mages, genies, titans)
  - Inferno (demons, devils)
  - Necropolis (undead, liches, bone dragons)
  - Dungeon (dark elves, black dragons)
  - Stronghold (orcs, behemoths, thunderbirds)
  - Fortress (gnolls, wyverns, hydras)
  - Conflux (elementals, phoenixes)
- [ ] Faction-specific town background art
- [ ] Faction-specific creature lineup and stats
- [ ] Faction-specific special buildings

---

## Milestone 7: Map Objects & World

Rich adventure map with meaningful locations.

### 7.1 Fog of War
- [x] Two tile states: unexplored (black) and explored. An explored tile stays revealed for good, and what happens on it stays visible (an enemy hero walking there included); nothing is dimmed or shown as last seen
- [x] A tile is in sight when its distance, rounded to a whole number, is at most the sight radius
- [x] Hero vision radius: 5 tiles by default, after every step of a walk
- [x] Town vision radius: 5 tiles around an owned town's entrance, at the start and when it is captured
- [x] Any other object owned at the start (a mine) sees 3 tiles; capturing one reveals nothing more
- [x] Fog drawn as a black layer over terrain and objects, tile by tile
- [x] Unexplored tiles: a click does nothing, routes go around them, the cursor is the arrow, the status bar is empty, and right-clicking shows "Uncharted Territory"
- [x] Minimap draws unexplored tiles black and hides the towns and mines on them
- [x] A scenario can turn fog of war off (`fogOfWar: false`); it is on by default
- [ ] Soft fog edges where unexplored tiles meet explored ones (with terrain sprites, 10.2)
- [ ] Scouting skill: Basic +1, Advanced +2, Expert +3 vision radius (4.7)
- [ ] Town buildings that see further, such as the Lookout Tower (6.5)

### 7.2 Roads
- [x] Road layer in scenario data: dirt, gravel or cobblestone per tile, on top of the terrain
- [x] Road movement costs as in 4.6: used only when both tiles have a road, cost of the road left (dirt 75, gravel 65, cobblestone 50)
- [x] Road visuals: road rendered on tiles
- [x] Route search prefers roads (lower cost, so the cheapest route takes them)
- [x] Roads connect towns and key locations in scenarios

### 7.3 Obstacles & Multi-Tile Objects
See `docs/notes/2026-10-30-obstacles.md`.
- [x] Mountains, Oak Trees, Pine Trees, Trees, Lakes, Rocks and Craters: the game's 41 base shapes, each blocking only some tiles of its picture
- [x] Placed by the bottom-right corner of the picture, as the game's maps do; drawn tile by tile in the kind's colour
- [x] The status bar and right-click popup name it over a tile it blocks; the terrain over the others
- [x] The minimap shows the tiles it blocks in a darker shade of their terrain
- [x] Obstacle data in `game/data/obstacles.json`; a new shape is data only
- [x] The demo map's rock walls are mountains, the gaps filled with small rocks; trees on its open ground
- [ ] The other terrain sets' pictures and the decorations that block nothing, once there are pictures (10.1)
- [ ] The darker minimap shade for what other objects block besides their entrance

### 7.4 Creature Dwellings on Map
Castle's seven dwellings only; other factions' come with them (6.5). Built in four parts; see `docs/notes/2026-10-26-map-dwellings.md`.

#### 7.4.1 Dwellings on the map, visited and flagged
- [x] Guardhouse (Pikemen), Archers' Tower, Griffin Tower, Barracks, Monastery, Training Grounds and Portal of Glory (`game/data/dwellings.json`); each blocks its entrance and the tile left of it (the Archers' Tower the tile right of it instead, the Guardhouse the tile above the left one too), the rest of its picture can be walked on
- [x] Shown on the map and minimap, hidden under fog; visit cursor on the entrance, the arrow on the rest; the status bar and the right-click popup name it
- [x] A hero entering it flags it in the player's colour, on the map, the minimap and in the popup; kept after a reload

#### 7.4.2 Recruiting
- [x] Each dwelling has a week of its creature's growth (Pikemen 14, Archers 9, Griffins 7, Swordsmen 4, Monks 3, Cavaliers 2, Angels 1); at each new week the count goes back to the growth, unbought creatures don't pile up
- [x] Levels 2-7: entering it opens the recruit window straight away, with no question first (shared with the town's, 6.3.3); recruits join the visiting hero's army and cost what they cost in a town
- [x] Level 1 (Pikemen) are free and get no recruit window: entering asks, under the dwelling's name as a title, "Would you like to recruit Pikemen?" with Yes and No (`core.advevent.35`); No leaves without recruiting; Yes adds them all to the army, then a message says "14 Pikemen join your army." (`core.genrltxt.423`); with no room, "The Pikemen would join your hero, but there aren't enough provisions to support them." (`core.genrltxt.425`) and none join; with none left this week, "There are no Pikemen here to recruit." (`core.genrltxt.422`)
- [x] Levels 2-7 with a full army: the recruit window opens as usual, and Recruit is refused with "The Archers would join your hero, but there aren't enough provisions to support them." over it (the same text as level 1; not yet checked in the game)
- [x] What was bought kept after a reload
- [ ] The message boxes' titles: the game shows these messages without the dwelling's name over them

#### 7.4.3 Guards
- [x] The Monastery, Training Grounds and Portal of Glory are guarded by three weeks of their non-upgraded creature: 9 Monks, 6 Cavaliers, 3 Angels, fighting as one stack
- [x] Entering one asks, with no title, "Much to your dismay, the <dwelling> is guarded by <a few> <Monks>. Do you wish to fight the guards?" (`core.genrltxt.421`, the count in words as for monsters); No leaves without a battle; Yes starts the battle, and winning flags the dwelling and opens the recruit window
- [x] A hero beaten or retreating leaves the map; the guards left stay until the week ends, kept after a reload
- [x] The guards come back at the start of every week, but never fight the player who owns the dwelling
- [x] The battle takes a defender army that isn't a monster on the map

#### 7.4.4 Town growth
- [x] Each flagged dwelling adds +1 to its creature's weekly growth in every town the player owns that makes the creature, upgraded dwellings included (creature panel, Fort window, the town's pool); see `docs/notes/2026-10-26-map-dwellings.md`
- [x] The Citadel and Castle bonus is a share of the dwelling's own growth only, so a Castle and a flagged Guardhouse give Pikemen +29
- [x] The growth shown changes as soon as the dwelling is flagged; the creatures come with the next week. A dwelling the player owns at the start counts in the town's first week too
- [x] Neutral towns get nothing from the player's flags

### 7.5 Resource-Generating Objects (Weekly)
The game's only three; see `docs/notes/2026-10-27-resource-generators.md`.
- [x] **Windmill**: 3-6 of one of Ore, Mercury, Sulfur, Crystal or Gems a week (never Wood or Gold)
- [x] **Water Wheel**: 1000 gold a week, 500 in the first week of the game
- [x] **Mystical Garden**: 500 gold or 5 gems a week, even chances
- [x] Each object gives once a week to whichever hero enters it first; any other visit that week gets the "come back next week" message and nothing
- [x] Reset at start of each new week; what was taken is kept after a reload
- [x] The Windmill blocks only its entrance, the Mystical Garden the tiles either side of it, the Water Wheel two rows of three ending at it; shown on the map with its name, status bar and right-click popup name it
- [ ] Pictures on the map (10.1) and their visit sounds (10.4)

### 7.6 Stat-Boosting Objects
Bonuses that don't last. Built in four parts; see `docs/notes/2026-10-28-stat-boosting-objects.md`.
- [x] A bonus from an object can't be taken again while the hero still has one from an object of the same kind; bonuses of different kinds add up

#### 7.6.1 Until the next battle
- [x] **Faerie Ring**: luck +1
- [x] **Swan Pond**: luck +2, and the hero loses the rest of the day's movement points
- [x] **Idol of Fortune**: luck +1 on days 1, 3, 5, morale +1 on days 2, 4, 6, both on day 7
- [x] **Temple**: morale +1, +2 on day 7
- [x] The bonuses count in battle and show in the morale and luck popups; they are gone once a battle ends, so the hero can take them again

#### 7.6.2 Movement points
- [x] **Fountain of Youth**: morale +1 until the next battle, +400 movement points until the end of the day
- [x] **Rally Flag**: morale +1, luck +1, +400 movement points
- [ ] **Oasis** (morale +1, +800) and **Watering Hole** (morale +1, +400), if wanted: they have more than one entrance tile
- [x] Movement points above the maximum until the end of the day

#### 7.6.3 Fountain of Fortune
- [x] Luck -1, +1, +2 or +3 until the next battle, rolled per fountain each week

#### 7.6.4 Stables
- [x] +400 movement points now and at the start of each day until the end of the week; another Stables does nothing that week
- [x] Cavaliers upgraded to Champions for free, on any visit
- [ ] The Castle town's Stables building gives the same movement points (6.5)

- [ ] Later: the Buoy and the Mermaids on water (7.10)

### 7.7 Permanent Bonus Objects (One-Time)
Once per hero, a bonus that stays. Built in five parts; see `docs/notes/2026-10-27-permanent-bonus-objects.md`.
- [x] **Treasure Chest**: choose its gold or experience (1000 gold or 500 XP, 1500 or 1000, 2000 or 1500); the chest disappears
  - [x] Random tier when the scenario sets none (32% / 32% / 31%), and the 5% artifact chest (7.8.5)

#### 7.7.1 Once per hero, free
- [x] **Learning Stone**: +1000 experience
- [x] **Mercenary Camp** +1 Attack, **Marletto Tower** +1 Defense, **Star Axis** +1 Power, **Garden of Revelation** +1 Knowledge
- [x] Each hero keeps the objects they have visited; another hero can still use them; visiting again gets the object's second message
- [x] Status bar and right-click popup add "(Visited)" or "(Not visited)" for the selected hero
- [x] A beaten hero hired again loses the bonuses and the visited list, as with their level

#### 7.7.2 Choices
- [x] **Arena**: +2 Attack or +2 Defense, the hero has to pick one
- [x] **School of War**: +1 Attack or +1 Defense for 1000 gold; may leave without paying; too little gold gets a message and the school stays unvisited
- [x] **School of Magic**: +1 Power or +1 Knowledge for 1000 gold, as the School of War

#### 7.7.3 Tree of Knowledge
- [x] Gives the experience missing for the next level; a free tree gives it without asking
- [x] Price rolled per tree at the start: free, 2000 gold or 10 gems (34 / 33 / 33), or set by the scenario, and kept after a reload; a paid tree asks first, and too little leaves it unvisited
- [x] Right-click popup: "+1 level", or "+1 level for 2000 gold" / "for 10 gems" (our own wording), and "(Visited)" for the selected hero

#### 7.7.4 Witch Hut
- [x] Each hut teaches one skill at Basic, rolled at the start from all but Leadership and Necromancy, or set by the scenario; class restrictions don't apply
- [x] Already has the skill, or has 8 skills: a message and nothing
- [x] The status bar and popup name the skill once a hero of the player has visited ("Witch Hut (Archery)", our own wording)

#### 7.7.5 Library of Enlightenment
- [x] +2 to all four primary skills, once per hero
- [x] Hero level 10 needed, 8 / 6 / 4 with Basic / Advanced / Expert Diplomacy; a hero turned away can come back

### 7.8 Artifacts on Map
Built in seven parts. 134 artifacts without HotA's, each with a slot (Helmet, Cape, Necklace, Weapon, Shield, Torso, two Rings, Feet, five Misc), a class (Treasure, Minor, Major, Relic) and a cost; the HotA values in the wiki's tables are left out (Boots of Speed +600, Equestrian's Gloves +300). Two of the same artifact don't add up, except Quiet Eye of the Dragon and the resource artifacts.

#### 7.8.1 On the map and worn
See `docs/notes/2026-10-29-artifacts-on-the-map.md`.
- [x] An artifact on the map blocks its tile and is picked up from the next one; shown with its name, visit cursor, status bar and right-click popup
- [x] Picking it up asks and shows nothing: it goes to the first free slot of its kind, else to the backpack, and leaves the map
- [x] The hero screen's slots show what the hero wears, and the backpack's first five
- [x] The 38 artifacts that only change primary skills (Centaur's Axe to Sword of Judgement), counted wherever primary skills are, battle included, never below Attack and Defense 0 or Power and Knowledge 1
- [x] Two of the same count once, except those that add up (Quiet Eye of the Dragon)
- [x] A scenario hero may start with artifacts; a beaten hero hired again has none
- [x] Kept after a reload

#### 7.8.2 Moving them on the hero screen
See `docs/notes/2026-10-29-moving-artifacts.md`.
- [x] Click an artifact to take it onto the pointer, then put it in another slot of its kind, swapping with what is there; a slot of another kind does nothing
- [x] While one is held, the empty slots it can go in are highlighted (not the backpack)
- [x] A backpack frame takes it in at that place, the rest moving along; closing the screen puts a held artifact back as a picked-up one goes
- [x] The backpack's arrows move it round by one, with more than five in it; the order is kept
- [x] Right-click an artifact for its description; the status bar names it ("View Centaur's Axe Info") or says "Empty"
- [ ] Check in the game how moving works: taken from one source only

#### 7.8.3 Morale, luck and movement
See `docs/notes/2026-10-30-morale-luck-and-movement-artifacts.md`.
- [x] The morale and luck artifacts (Clover of Fortune, Cards of Prophecy, Ladybird of Luck, Badge of Courage, Crest of Valor, Glyph of Gallantry, Still Eye of the Dragon, Pendant of Courage), listed by name in the morale and luck popups
- [x] The Hourglass of the Evil Hour and Spirit of Oppression: in battle, positive luck or morale is 0 on both sides; penalties stay; the hero screen still shows the usual values
- [x] Boots of Speed (+600) and Equestrian's Gloves (+300): land movement points over the maximum when worn at the start of a day, day 1 included
- [x] Two of the same count once; a new artifact with morale, luck, movement or a battle cancel is data only
- [ ] Badge of Courage's immunity to mind spells (5.8)

#### 7.8.4 Guarded artifacts
See `docs/notes/2026-10-30-guarded-artifacts.md`.
- [x] Guards set by the scenario, up to seven stacks; entering always asks whether to fight them (`core.genrltxt.420`, the guards left unnamed)
- [x] Winning picks the artifact up; guards already beaten stay beaten after a retreat or defeat, and after a reload
- [ ] A map maker's own guard text, and guards that attack without asking when there is none (9.1)

#### 7.8.5 Artifacts from chests and a full backpack
See `docs/notes/2026-10-30-chest-artifacts-and-a-full-backpack.md`.
- [x] The Treasure Chest's 5% artifact: a random Treasure-class artifact, no choice, put on as a picked-up one is; a full backpack gets one of the three gold-or-experience chests instead (7.7)
- [x] The backpack holds 64; with it full nothing more can be picked up, even with its slot free (`core.advevent.2`); guards beaten with a full backpack leave the artifact on the map
- [ ] (Not in H3, optional extra) A window showing the whole backpack, opened from the hero screen, as some remakes have; the game itself shows only five at a time
- The tavern's "… with N artifacts" moved to 4.5.5: no hero in the tavern has artifacts yet

#### 7.8.6 Between heroes
See `docs/notes/2026-10-30-artifacts-between-heroes.md`.
- [x] The exchange screen's paper dolls and backpacks (4.5.3): moving artifacts from one hero to the other, highlighted slots on both, descriptions and status bar
- [x] Move all artifacts to either hero and swap artifacts; what has no room stays; a full backpack takes nothing
- [x] A held artifact goes back to the hero who picked it up when the screen closes; kept after a reload
- [ ] The modifier keys that move only worn artifacts or only the backpack

#### 7.8.7 Combination artifacts
See `docs/notes/2026-10-30-combination-artifacts.md`.
- [x] Angelic Alliance, Armor of the Damned, Power of the Dragon Father and Titan's Thunder, whose parts are all in the game
- [x] With all the parts worn, putting the last one on or right-clicking one asks to combine them (`core.genrltxt.732`); right-clicking the combination, worn or in the backpack, asks to take it apart (`core.genrltxt.733`), the parts going back where they were worn
- [x] A combination holds all its parts' slots, the others shown locked; it takes one backpack slot and gives its parts' bonuses plus its own
- [x] The Dragon Father's +6 to all primary skills; the Angelic Alliance's good and neutral towns counting as one for the wearer's morale
- [ ] Their spell effects (5.8): the Dragon Father's immunity, the Alliance's Prayer, the Armor of the Damned's curses, Titan's Thunder's bolt and spell book
- [ ] The other eight combinations, with the artifacts they are made of: Admiral's Hat, Bow of the Sharpshooter, Cloak of the Undead King, Cornucopia, Elixir of Life, Ring of the Magi, Statue of Legion, Wizard's Well

#### 7.8 later
- [ ] Resource artifacts (3.2), battle artifacts such as Ring of Vitality and Ring of the Wayfarer (5.6), spell artifacts and immunities (4.8, 5.8), the Necromancy and boat artifacts
- [ ] War machines, the spell book and the Grail
- [ ] A beaten hero's artifacts going to the winner (4.5.5, needs enemy heroes)

### 7.9 Map Portals & Teleporters
- [ ] **Monolith One-Way Entrance/Exit**: teleport between paired locations
- [ ] **Monolith Two-Way**: bidirectional teleport
- [ ] **Subterranean Gate**: travel between surface and underground layers
- [ ] **Whirlpool**: random teleport on water (sea)
- [ ] Portal pairing defined in scenario JSON
- [ ] Stepping on entrance teleports hero to exit (costs movement points)

### 7.10 Water & Boats
- [x] Water tiles are impassable on foot
- [ ] Boats: hero boards a boat at shore to travel on water
- [ ] Boat locations on map (entity type)
- [ ] Hero movement changes to water movement when on boat
- [ ] Disembark at any shore tile
- [ ] Summon Boat spell (creates boat)
- [ ] Sea monsters and floating resources on water

---

## Milestone 8: AI & Opponents

Making the game a competitive experience.

### 8.1 Player System
- [ ] Multiple players defined in scenario JSON (player ID, color, faction, starting town/hero)
- [ ] Player colors: red, blue, tan, green, orange, purple, teal, pink
- [ ] Active player tracking: whose turn is it
- [ ] Turn order: players take turns in sequence (Player 1 -> Player 2 -> ... -> New Day)
- [ ] Each player has own: heroes, towns, mines, resources, fog of war
- [ ] Entities colored/flagged by owning player

### 8.2 Hot-Seat Multiplayer
- [ ] Turn transition screen: "Player X's Turn - Press to continue"
- [ ] Screen hidden during transition (prevent seeing opponent's map)
- [ ] Each player sees own fog of war
- [ ] Timer per turn (optional setting)
- [ ] Victory condition check after each turn

### 8.3 AI System - Basics
- [ ] AI controls non-human players
- [ ] AI runs during its turn (after human player ends turn)
- [ ] "AI is thinking..." indicator while AI processes
- [ ] AI hero movement visible on map (fast-forwarded animation)
- [ ] Basic AI loop: for each hero, decide action, execute, repeat

### 8.4 AI Decision Making
- [ ] **Exploration**: AI heroes move toward nearest unexplored area
- [ ] **Resource collection**: AI prioritizes nearby free resources
- [ ] **Mine capture**: AI captures unowned mines
- [ ] **Town building**: AI builds structures in priority order (income -> army -> upgrades)
- [ ] **Army recruitment**: AI recruits available creatures each week
- [ ] **Combat engagement**: AI attacks monsters it can defeat, avoids stronger ones
- [ ] **Threat response**: AI defends towns under threat, retreats weak heroes
- [ ] AI difficulty levels: Easy (poor decisions, slow), Normal, Hard (optimal play, bonuses)

### 8.5 Victory Conditions
- [ ] **Defeat all enemies**: last player standing wins (default)
- [ ] **Capture specific town**: own a designated town
- [ ] **Defeat specific hero**: eliminate a target hero
- [ ] **Collect resources**: accumulate X of a resource
- [ ] **Find artifact**: locate a specific artifact on the map
- [ ] Victory condition defined in scenario JSON
- [ ] Victory screen with stats summary
- [ ] Loss condition: lose all towns and heroes

---

## Milestone 9: Engine as Library / Scenarios

Making the engine reusable. Enables portfolio and custom scenarios.

### 9.1 Scenario Format v2
- [ ] Scenario JSON schema documented and validated
- [ ] Rich entity metadata support (title, description, image, links, tags)
- [ ] Multiple terrain types in tile data (enum values instead of 0/1)
- [x] Road layer in terrain data
- [ ] Named regions/zones on map (for triggers, labels)
- [ ] Starting conditions: resources, heroes, towns per player
- [ ] Victory/loss conditions
- [ ] Scenario difficulty rating
- [ ] Scenario metadata: name, description, author, version

### 9.2 Multiple Scenarios
- [ ] Start screen / scenario selector
- [ ] List of available scenarios with preview (name, map size, description)
- [ ] Load selected scenario
- [ ] Scenario files in `/scenarios/` directory auto-discovered or listed in manifest
- [ ] Different scenarios for different purposes (tutorial, game, portfolio)

### 9.3 Engine Public API
- [ ] Clean import surface: `import { createGame } from 'heroes-3-js'`
- [ ] Configuration object: map container element, scenario data, options
- [ ] Options: disable specific HUD elements, custom event hooks, initial camera position
- [ ] Event hooks: subscribe to game events from outside (onEntityInteracted, onHeroMoved, etc.)
- [ ] Programmatic control: moveHero, selectHero, openTown, endTurn
- [ ] Theming: CSS custom properties for colors, borders, fonts
- [ ] Lifecycle: start, pause, resume, destroy

### 9.4 Quieter Event Bus
Moving the mouse across a few tiles sends dozens of events. For each new tile there are three: `ui.tile.hovered`, then `command.route.requested` and `fact.route.planned` (with the whole path), sent so the cursor can count the days to the tile. The cursor asks again after every hero step and every change to movement points. None of these describe something that happened in the game, and they swamp the bus events panel.
- [ ] The cursor plans the route to the hovered tile itself: the route planning in `game/systems/movement-system.js` becomes a shared helper used by both the movement module and the cursor, which already tracks the hero's tile, the map and what is still on it
- [ ] A hover sends only `ui.tile.hovered`, once per tile; `command.route.requested` / `fact.route.planned` stay for clicks
- [ ] `fact.route.planned` is not saved, so it is not a fact: rename it (e.g. `ui.route.planned`) or drop it once only clicks use it

### 9.5 One Fact per Decision
A decision is saved today as several facts emitted together: recruiting is `fact.resources.spent`, `fact.town.creatures.recruited` and `fact.town.garrison.changed`. The log then follows how the game state is split up instead of what the player did. Instead, each decision is saved as one fact naming everything that happened, and each slice of the game state works out its own part, as `fact.turn.ended` already pays income and grows creatures. Facts never cause other facts: a fact a listener emits on hearing another would be paid twice on replay, or have to be re-emitted on every reload. See `docs/notes/2026-10-25-game-state-store.md`.
- [ ] Recruiting is one fact `{ townId, player, tier, creature, count, cost }`: the towns slice moves the creatures into the garrison, the kingdoms slice takes the cost
- [ ] Building is one fact with its cost; the kingdoms slice takes the cost
- [ ] Ending the day is one fact; the heroes slice restores every hero's movement points
- [ ] The cost goes in the fact, so an old session keeps what was paid if prices change later
- [ ] Views that showed resources redraw on the facts that change them (recruit, build, pickups, a new day)
- [ ] `emitAll` stays only for a decision that really is several facts, or goes

### 9.6 Map Editor (stretch)
- [ ] Visual in-browser tile editor
- [ ] Paint terrain types
- [ ] Place entities with properties
- [ ] Define terrain passability
- [ ] Place roads
- [ ] Set starting conditions
- [ ] Export to scenario JSON
- [ ] Import existing scenario for editing

---

## Milestone 10: Sprites, Animations & Audio Polish

Visual and audio excellence. Last mile.

### 10.1 Entity Sprites
- [ ] Sprite images for each entity type (hero, all creature types, towns, mines, resources, objects)
- [ ] Sprite sheets for animated entities
- [ ] Direction-aware hero sprite (facing direction of movement)
- [ ] Town sprites per faction
- [ ] (Not in H3, optional extra) Draw the map with WebGL if the DOM gets too slow
- [ ] Mine sprites per type
- [ ] Resource pile sprites per type

### 10.2 Terrain Sprites
- [ ] Tile textures per terrain type (grass, dirt, snow, etc.)
- [ ] Tile edge blending (transitions between terrain types)
- [ ] Animated water tiles
- [ ] Road sprites overlaid on terrain

### 10.3 Animations
- [ ] Hero walking: multi-frame stepping animation
- [ ] Combat: attack, hit reaction, death per creature type
- [ ] Spell effects: visual particles/overlays per spell
- [ ] Town building construction: build animation
- [ ] Resource pickup: floating icon/number
- [ ] Level-up: sparkle/glow effect
- [ ] Screen transitions: fade between adventure map and combat/town view

### 10.4 Sound Effects
- [ ] Movement: footstep sounds per terrain type
- [ ] Combat: sword clash, arrow fire, spell cast, creature death
- [ ] UI: button click, menu open/close, resource pickup ding
- [ ] Town: ambient town sounds, building construction
- [ ] Alerts: new week fanfare, new month fanfare, level up sound
- [ ] Monster encounter: roar/growl before combat

### 10.5 Music System
- [ ] Different tracks per terrain type (grassland theme, snow theme, etc.)
- [ ] Town music per faction
- [ ] Combat music (different from adventure map)
- [ ] Victory/defeat fanfares
- [ ] Smooth crossfade between tracks
- [ ] Music volume control
- [ ] Separate SFX volume control

### 10.6 Keyboard Shortcuts
A button lists its keys in `aria-keyshortcuts`; the screen on top takes the keys (`app/modules/keyboard-shortcuts.module.js`, see `docs/notes/2026-10-20-wait-defend-auto-combat.md`). A new shortcut is that attribute on its button.
- [x] Shortcut mechanism: a key presses the enabled button that lists it, on the top screen only
- [ ] `M` or click: move selected hero
- [ ] `E` or button: end turn
- [ ] `Space`: next hero with remaining movement
- [ ] `H`: hero list
- [ ] `T` / `K`: town list
- [x] `Arrow keys`: scroll map (camera input, not a button)
- [ ] `+`/`-`: zoom in/out
- [ ] `Escape`: close current modal/panel/view
- [ ] `Enter`: confirm dialog
- [ ] `S`: spellbook (in combat and adventure map)
- [x] `W`: wait (in combat)
- [x] `D` or `Space`: defend (in combat)
- [x] `A`: Auto combat
- [ ] `R`: retreat, `S`: surrender (in combat, with those actions)
- [ ] Adventure map buttons (end turn, next hero, move...) get their H3 keys
- [ ] Number keys `1-7`: select creature stack in combat
- [ ] Shortcuts shown in tooltip on hover over buttons

### 10.7 Save/Load System
- [ ] Save game to named slot (extends current event log persistence)
- [ ] Multiple save slots
- [ ] Auto-save at start of each turn
- [ ] Load game from save list
- [ ] Save metadata: scenario name, date, turn number, screenshot
- [ ] Delete old saves
- [ ] Confirm before overwriting existing save
- [ ] Save to IndexedDB (local) or exportable file

---

## Recommended Work Order

Balancing game functionality + portfolio readiness.
Sprites and map authoring are intentionally late.

### Phase 1 - "Functional Game" (core loop)
1. Terrain types with CSS (1.1)
2. Cursor system (1.2)
3. HUD redesign (1.3)
4. Status bar on hover (2.5)
5. Right-click info panels (2.1)
6. Roads (7.2): finishes terrain movement costs (4.6)
7. Day/week/month cycle (3.1)
8. Mine ownership (3.3)
9. Resource income system (3.2)
10. Starting resources (3.5). The resource spending framework (3.4) waits for its first user (town buildings or recruitment)

### Phase 2 - "Heroes Have Depth"
11. Hero primary attributes (4.1)
12. Hero experience & leveling (4.2)
13. Hero army (4.3)
14. Movement points & terrain costs (4.6)
15. Monster encounters (count + categories) (5.2)
16. Entity data model expansion (2.2)

### Phase 3 - "Combat Works"
17. Creature database (5.1)
18. Combat grid & layout (5.3)
19. Combat turn order (5.4)
20. Combat movement (5.5)
21. Combat attacks (melee + ranged) (5.6)
22. Combat actions: wait, defend, retreat (5.7)
23. Combat AI, kept simple (5.7b)
24. Combat resolution (5.9)

### Phase 4 - "Towns & Economy"
25. Town view screen (2.3)
26. Town ownership & town list (2.3b)
27. Town buildings system (6.1)
28. Common buildings (6.2)
29. Creature dwellings in town (6.3)
30. Town garrison (6.4)
31. Info box (2.4b) and adventure map messages (2.4)

### Phase 5 - "Living World"
First: the game state store, steps 1 to 4 of `docs/notes/2026-10-25-game-state-store.md`. Fog of war and multiple heroes are built on it.

32. Fog of war (7.1)
33. Multiple heroes (4.5), in five parts: several heroes from the scenario, Next Hero, meeting, tavern, defeated hero
34. Hero secondary skills (4.7): the skills and starting skills, then choosing one on level-up; their effects come with the features they change
35. Creature dwellings on map (7.4), Castle only, in four parts: on the map and flagged, recruiting, guards, town growth
36. Resource-generating objects (7.5)
37. Permanent bonus objects (7.7), in five parts: free once-per-hero objects, choices (Arena, schools), Tree of Knowledge, Witch Hut, Library of Enlightenment
38. Morale and luck (4.9): worked out and shown, then used in battle
39. Stat-boosting objects (7.6)
40. Artifacts on map (7.8), in seven parts: on the map and worn, moving them on the hero screen, morale, luck and movement, guards, chests and a full backpack, between heroes, combination artifacts
41. Obstacles & decorations (7.3)

### Phase 6 - "Real Competition"
42. Hero magic and combat spells (4.8, 5.8), in eight parts: spell book and spell points, Mage Guild, casting in battle with single-target damage, spells that last, area damage, immunities and Resistance, control and special spells, adventure map spells
43. Player system (8.1)
44. AI basics (8.3)
45. AI decision making (8.4)
46. Victory conditions (8.5)
47. Siege combat (5.10)
48. Town factions (6.5)
49. Smarter combat AI (5.7b)

### Phase 7 - "Polish & Reusability"
50. Engine public API (9.3)
51. Scenario format v2 (9.1)
52. Multiple scenarios + selector (9.2)
53. Keyboard shortcuts (10.6)
54. Save/Load system (10.7)
55. Sound effects (10.4)
56. Music per context (10.5)
57. Entity sprites (10.1)
58. Terrain sprites (10.2)
59. Animations (10.3)
60. Map portals (7.9)
61. Water & boats (7.10)
62. Hot-seat multiplayer (8.2)
63. Map editor (9.6)
64. Quieter event bus (9.4): no route events on hover
65. One fact per decision (9.5): recruiting, building and ending the day each saved as one fact

---

## Portfolio Extraction Points

The engine becomes portfolio-usable **after Phase 1-2** completion:
- Rich entity content display via extended data model
- Visually polished enough with CSS-based terrain and HUD
- Custom scenarios with portfolio-specific entities

The portfolio project would:
- Import core engine modules (map, entities, movement, camera, bus)
- Provide its own scenario JSON (companies as towns, projects as monsters, skills as resources, certs as artifacts)
- Add a guided tour module (scripted camera movement + entity highlights)
- Add a "casual mode" with simplified/infinite movement for non-gamers
- Custom CSS theme for personal branding
