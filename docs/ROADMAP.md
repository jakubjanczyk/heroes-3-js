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
- [ ] Hover over own town: town cursor (needs town ownership)
- [ ] Hover over another hero: exchange cursor (needs multiple heroes)
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
- [ ] Owned towns in the owner's player colour (needs town ownership)
- [x] Click on minimap to move camera to that location
- [x] Drag on minimap to pan camera
- [x] Current viewport rectangle shown on minimap
- [ ] Fog of war reflected on minimap (when fog is implemented)

### 1.5 Camera Improvements
- [x] Keyboard arrow keys scroll the map
- [x] Camera bounds - cannot scroll beyond map edges
- [ ] (Not in H3, optional extra) Smooth camera transitions when clicking minimap. H3 jumps straight there
- [x] Clicking the hero's portrait in the hero list centres the camera on the hero (as in H3, one click is enough)
- [ ] Double-click on the hero's portrait opens the hero screen, as in H3 (needs a hero screen, 4.1 / 4.3)

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
- [ ] Town: town info box (name, fort/hall level, garrison) for own towns; name only for others
  - [x] For now: the town's name (needs town ownership and buildings)
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
- [x] Town background image area (faction-specific later, placeholder for now): a castle drawn in CSS
- [ ] Building slots displayed on town background (empty/built state) (needs town buildings, 6.1)
- [x] Town name in the panel as in H3: the scenario's `name` for the town, else its type's name
- [x] Garrison bar: up to 7 creature stacks displayed (empty until towns have garrisons, 6.4)
- [x] Visiting hero army bar below garrison (when hero is in town), the hero's portrait placeholder first
- [x] "Exit" button (✓, Enter or Escape) returns to adventure map
- [x] Town view has its own events (`command.town.leave.requested`, `fact.town.visited`, `fact.town.left`)
- [ ] Creatures available for recruitment panel (its place is kept empty; needs dwellings, 6.3)
- [ ] Hall and Fort icons and the daily income in the panel (places kept empty; needs 6.2)
- [ ] Town list on the panel's right side (needs town ownership)
- [x] Gold/resource display within town view: the resource bar and date stay under the town screen
- [ ] Hovering a town on the map shows its own name (the scenario's `name`) in the status bar and popup

### 2.4 Interaction Modals Upgrade
- [ ] Monster defeat modal: show creature name, count defeated, XP gained, any loot dropped
- [ ] Resource pickup modal: show resource icon, type name, amount collected (e.g. "+500 Gold")
- [ ] Resource pickup: brief floating number animation on map (optional, low priority)
- [ ] Mine capture modal: show mine type, daily income, "Mine captured!" message
- [x] Town visit: redirect to town view screen instead of modal
- [ ] Artifact pickup modal: show artifact name, description, stat bonuses, equip slot
- [ ] Dwelling visit modal: show available creatures, count, cost, recruit button

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
- [ ] Week = 7 days. New week triggers `fact.week_started` event (add when something reacts to it, e.g. creature growth)
- [ ] Month = 4 weeks (28 days). New month triggers `fact.month_started` event (same)
- [x] "New Week" notification popup at start of each week (a new month shows the same popup; no separate month popup)
- [x] Current date displayed in HUD: "Month: 1, Week: 2, Day: 3"
- [x] Day 1 of week 1 is the starting day

### 3.2 Resource Income System
- [x] At the start of each new day (after end turn), income is calculated and applied
- [x] Income source: owned mines (daily amounts as in H3, in `game/data/mines.json`)
- [ ] Income source: owned towns (needs town ownership)
- [x] Income event: `fact.income.collected` with the total per resource (not persisted: replaying captures and turn ends pays it again)
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
- [x] Mine ownership persisted in event log
- [x] Mine income only from owned mines

### 3.4 Resource Spending Framework
- [ ] `canAfford(costs)` utility: checks if player has enough resources
- [ ] `spendResources(costs)` with event: `fact.resources_spent` with reason
- [ ] Insufficient resources: UI shows which resources are missing (red highlight)
- [ ] Resource costs defined as `{ gold: N, wood: N, ore: N, ... }` objects
- [ ] Used by: town building construction, creature recruitment, hero recruitment

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
- [ ] Stats shown in the hero screen (needs a hero screen)
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
- [ ] Choose one of two secondary skills on level-up (needs secondary skills, 4.7)
- [ ] Hero level displayed in hero panel and info screens (H3 shows it on the hero screen only)
- [ ] Current XP and XP to next level shown in hero details (hero screen)

### 4.3 Hero Army
- [x] Hero carries up to 7 creature stacks, each in its own slot; a scenario gives every hero an army
- [x] Each stack: creature type + count
  - [x] For now: Skeletons only (from `game/data/monsters.json`), with no creature stats
- [x] Army displayed in the info box and the hero's right-click popup (7 slots, creature picture + exact count per slot; the map look until creature portraits)
- [ ] Click on stack to see creature details (stats, abilities)
- [ ] Drag-and-drop to reorder stacks within hero army
- [ ] Split stack: divide one stack into two (right-click > split)
- [ ] Merge stacks: drag same creature type together to combine
- [ ] Army strength estimate (sum of AI values) shown in hero info

### 4.4 Hero Identity & Portrait
- [ ] Hero has a portrait image (displayed in HUD sidebar, hero panel, map)
- [ ] Hero class: Knight, Cleric, Ranger, Druid, etc. (affects starting stats/skills)
- [ ] Hero specialty: unique bonus (e.g. "+1 Attack per level", "Archery specialist")
- [ ] Hero biography text (flavor)
- [ ] Multiple hero types defined in hero data files

### 4.5 Multiple Heroes
- [ ] Player can control more than one hero simultaneously
- [ ] Hero recruitment from tavern in town (costs gold)
- [ ] Maximum heroes per player (8 in H3)
- [ ] "Next Hero" button cycles through heroes with remaining MP
- [ ] Hero list panel: shows all heroes with portrait, name, MP remaining
- [ ] Click hero in list to select and center camera
- [ ] Selected hero highlighted on map and in list
- [ ] Heroes meeting on map: open army exchange screen
- [ ] Army exchange screen: two rows of 7 slots, drag between heroes
- [ ] Hero defeated (loses all army): hero removed from map, goes to tavern pool (recruitable again)

### 4.6 Movement Points & Terrain
Rules checked against VCMI's pathfinder (`config/terrains.json`, `config/roads.json`, `lib/pathfinder/CPathfinder.cpp`).
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

### 4.7 Hero Secondary Skills
- [ ] Up to 8 secondary skills per hero
- [ ] Three levels: Basic, Advanced, Expert
- [ ] Offered on level-up: choose 1 of 2 skills (new skill or upgrade existing)
- [ ] Key skills:
  - **Logistics** - increases movement points
  - **Pathfinding** - reduces terrain penalties
  - **Leadership** - increases morale
  - **Luck** - increases luck
  - **Archery** - increases ranged damage
  - **Offense** - increases melee damage
  - **Armorer** - reduces damage taken
  - **Wisdom** - allows learning higher-level spells
  - **Earth/Air/Fire/Water Magic** - improves spells of that school
  - **Necromancy** - raise skeletons from battlefield dead
  - **Estates** - daily gold income bonus
  - **Learning** - bonus XP from all sources
  - **Scouting** - increases vision radius
  - **Navigation** - allows/improves sea travel
  - **Diplomacy** - chance to recruit neutral monsters
  - **Eagle Eye** - chance to learn enemy spells in combat
  - **Mysticism** - mana regeneration per day
  - **Intelligence** - bonus max mana
  - **First Aid** - heal creatures in combat
  - **Ballistics** - improved catapult in sieges
  - **Artillery** - improved ballista
  - **Scholar** - exchange skills/spells between heroes

### 4.8 Hero Magic
- [ ] Hero has mana points (max = Knowledge * 10)
- [ ] Mana regenerates 1 per day (base), more with Mysticism
- [ ] Spell book: shows all learned spells
- [ ] Spells have level (1-5), school (earth/air/fire/water), mana cost
- [ ] Spells learned from: Mage Guild in town, Scholar exchanges, map objects
- [ ] Wisdom skill required for level 3+ spells (Adv for 4, Expert for 5)
- [ ] Adventure map spells:
  - **Summon Boat** - creates a boat at nearest shore
  - **View Air/Earth** - reveals resources/terrain on map
  - **Dimension Door** - teleport hero to a visible tile
  - **Town Portal** - teleport to nearest/any owned town
  - **Fly** - allows movement over any terrain
- [ ] Combat spells: see Milestone 5

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
- [ ] Jousting (Cavaliers), hatred (Angels and Devils), luck, Offense and Armorer skills

### 5.7 Combat Actions (Wait, Defend, Retreat, Surrender)
See `docs/notes/2026-10-20-wait-defend-auto-combat.md` and `docs/notes/2026-10-20-retreat-surrender-results.md`.
- [x] **Wait**: skip current turn, act again once every other stack has acted, the stacks that waited slowest first; once per round
- [x] **Defend**: end the turn with +20% Defense (at least 1 point) until the stack's next turn
- [x] **Retreat** (R): asked first; the hero flees and loses the army. With no taverns yet the hero leaves the map, as when beaten
- [ ] **Surrender**: pay gold to enemy to leave with army intact (gold cost = army value)
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
- [ ] Hero can cast one spell per combat round (instead of a stack acting)
- [ ] Spell targeting: single stack, hex area, all allies, all enemies, self
- [ ] Damage spells: Magic Arrow, Lightning Bolt, Fireball, Chain Lightning, Armageddon, etc.
- [ ] Buff spells: Haste, Shield, Bless, Bloodlust, Prayer, etc.
- [ ] Debuff spells: Slow, Curse, Weakness, Blind, etc.
- [ ] Summon spells: Fire/Earth/Air/Water Elemental
- [ ] Resurrection spells: Resurrect, Animate Dead
- [ ] Spell damage/duration affected by hero Power stat and magic school skill level
- [ ] Mana cost deducted on cast
- [ ] Spell book UI: grid of spell icons, click to select, click target to cast
- [ ] Spell immunity: some creatures immune to certain spell levels or schools

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
- [ ] Each town has a set of building slots
- [ ] Build one building per day per town
- [ ] Buildings have resource costs (gold + materials)
- [ ] Buildings have prerequisites (tech tree)
- [ ] Build button: select building, confirm cost, construction completes instantly (start of day)
- [ ] Built buildings visually appear on town view background
- [ ] Building info on hover: name, description, cost, prerequisites, effect

### 6.2 Common Buildings (all factions)
- [ ] **Village Hall** (built-in) -> Town Hall -> City Hall -> Capitol
  - Income: 500 / 1000 / 2000 / 4000 gold per day
  - Only one Capitol across all towns
- [ ] **Fort** -> Citadel -> Castle
  - Fort: basic walls in siege, +50% creature growth
  - Citadel: moat + tower, +50% creature growth (stacks with Fort)
  - Castle: 2 towers, +50% creature growth (stacks)
- [ ] **Tavern**: recruit heroes, +1 morale to visiting hero
- [ ] **Marketplace**: trade resources (exchange ratios depend on marketplace count)
- [ ] **Resource Silo**: provides +1 of a specific resource per day (faction-dependent)
- [ ] **Blacksmith**: provides ballista (first aid tent/ammo cart) to visiting heroes
- [ ] **Mage Guild** (levels 1-5): teaches spells to visiting heroes
  - Each level unlocks random spells of that tier
  - Higher tiers require lower tiers built first

### 6.3 Creature Dwellings in Town
- [ ] One dwelling per creature tier (7 total per faction)
- [ ] Dwelling produces creatures weekly (growth rate per creature type)
- [ ] Accumulated creatures shown in town recruitment panel
- [ ] Recruit button: spend gold (+ sometimes resources) to add creatures to garrison/hero army
- [ ] Upgraded dwelling: unlocks upgraded creature variant, costs more to build
- [ ] External dwellings on map also produce creatures (see M7)

### 6.4 Town Garrison
- [ ] Town has its own garrison (7 creature stacks, independent of visiting hero)
- [ ] Garrison defends town if attacked while no hero is present
- [ ] Visiting hero can exchange creatures with garrison (drag-and-drop between rows)
- [ ] Garrison shown in town view as a row of 7 slots

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
- [ ] Three tile states: unexplored (black), previously seen (dimmed/shrouded), visible (full)
- [ ] Hero vision radius: 5 tiles by default (increased by Scouting skill)
- [ ] Town vision radius: 5 tiles around owned towns
- [ ] Fog updates when hero moves or turn starts
- [ ] Entities in fog are hidden (not rendered)
- [ ] Entities in shroud show last-known state (but may have changed)
- [ ] Fog rendered as overlay layer on terrain
- [ ] Minimap reflects fog state
- [ ] Scouting skill: Basic +1, Advanced +2, Expert +3 vision radius

### 7.2 Roads
- [x] Road layer in scenario data: dirt, gravel or cobblestone per tile, on top of the terrain
- [x] Road movement costs as in 4.6: used only when both tiles have a road, cost of the road left (dirt 75, gravel 65, cobblestone 50)
- [x] Road visuals: road rendered on tiles
- [x] Route search prefers roads (lower cost, so the cheapest route takes them)
- [x] Roads connect towns and key locations in scenarios

### 7.3 Obstacles & Multi-Tile Objects
- [ ] Mountains: large multi-tile impassable obstacles (visual variety)
- [ ] Trees/forests: 1-2 tile obstacles
- [ ] Rocks, ruins, lakes: decorative blocking objects
- [ ] Multi-tile rendering: object anchored at one tile, rendered spanning multiple
- [ ] Obstacle data in scenario JSON with footprint definitions

### 7.4 Creature Dwellings on Map
- [ ] Standalone buildings on the adventure map where heroes recruit creatures
- [ ] Each dwelling has a creature type and weekly growth
- [ ] First visit: fight guards (neutral creatures) or claim if unguarded
- [ ] Subsequent visits: recruit available creatures (accumulated since last visit)
- [ ] Dwelling ownership: flagged to player who last visited
- [ ] External dwellings are separate from town dwellings

### 7.5 Resource-Generating Objects (Weekly)
- [ ] **Windmill**: gives random resource each week (not gold)
- [ ] **Water Wheel**: gives 1000 gold per week
- [ ] **Mystical Garden**: gives 500 gold or 5 gems per week
- [ ] Once-per-week limit tracked per hero per object
- [ ] Visual state: "available" vs "visited this week" (flag/sparkle)
- [ ] Reset at start of each new week

### 7.6 Stat-Boosting Objects
- [ ] **Fountain of Youth**: +1 movement point for current turn, +1 morale until next battle
- [ ] **Rally Flag**: +1 morale, +1 luck, +400 movement points for current day
- [ ] **Idol of Fortune**: +1 morale, +1 luck until next battle
- [ ] **Temple**: +2 morale if visited on day 7
- [ ] **Faerie Ring**: +1 luck until next battle
- [ ] **Swan Pond**: +2 luck until next battle
- [ ] **Fountain of Fortune**: random +1 to +3 luck until next battle
- [ ] **Stables**: +400 movement points for current week, Cavalier upgrade
- [ ] Bonuses are temporary (specified duration per object type)
- [ ] Bonus tracking per hero per object with cooldown

### 7.7 Permanent Bonus Objects (One-Time)
- [x] **Treasure Chest**: choose its gold or experience (1000 gold or 500 XP, 1500 or 1000, 2000 or 1500); the chest disappears
  - [ ] Random tier when the scenario sets none (H3: 32% / 32% / 31%), and the 5% artifact chest (needs artifacts, 7.8)
- [ ] **Learning Stone**: +1000 XP (one-time per hero)
- [ ] **Tree of Knowledge**: level up for gold or gems (one-time per hero)
- [ ] **Mercenary Camp / Marletto Tower / Star Axis / Garden of Revelation**: +1 to a primary stat permanently (one-time per hero)
- [ ] **Witch Hut**: teaches a random secondary skill (one-time per hero)
- [ ] **School of Magic**: teaches a specific spell (one-time per hero)
- [ ] **School of War**: +1 Attack and +1 Defense (costs 1000 gold)
- [ ] **Library of Enlightenment**: +2 to all primary stats if hero is level 10+ (one-time)
- [ ] Tracking: set of visited object IDs stored per hero

### 7.8 Artifacts on Map
- [ ] Artifacts placed as entities on adventure map
- [ ] Picking up an artifact: hero walks to it, artifact goes to inventory
- [ ] Some artifacts are guarded (fight monsters first)
- [ ] Artifact categories: weapon, helm, armor, shield, ring, amulet, boots, cape, necklace, misc
- [ ] Artifact effects: stat bonuses, special abilities
- [ ] Hero equipment screen: slots for each category
- [ ] Equipped artifacts apply bonuses automatically
- [ ] Key artifacts:
  - Boots of Speed: +600 MP
  - Ring of Vitality: +1 creature health
  - Sword of Hellfire: +6 Attack
  - Armor of Wonder: +1 to all stats
  - Cape of Conjuring: +3 Power
  - etc. (progressive implementation)
- [ ] Artifact sets (Grail components, combo artifacts) - stretch goal

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

### 9.4 Map Editor (stretch)
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
26. Town buildings system (6.1)
27. Common buildings (6.2)
28. Creature dwellings in town (6.3)
29. Town garrison (6.4)
30. Interaction modals upgrade (2.4)

### Phase 5 - "Living World"
31. Fog of war (7.1)
32. Multiple heroes (4.5)
33. Hero secondary skills (4.7)
34. Creature dwellings on map (7.4)
35. Resource-generating objects (7.5)
36. Permanent bonus objects (7.7)
37. Stat-boosting objects (7.6)
38. Artifacts on map (7.8)
39. Obstacles & decorations (7.3)

### Phase 6 - "Real Competition"
40. Player system (8.1)
41. AI basics (8.3)
42. AI decision making (8.4)
43. Victory conditions (8.5)
44. Combat spells (5.8)
45. Hero magic (4.8)
46. Siege combat (5.10)
47. Town factions (6.5)
48. Smarter combat AI (5.7b)

### Phase 7 - "Polish & Reusability"
49. Engine public API (9.3)
50. Scenario format v2 (9.1)
51. Multiple scenarios + selector (9.2)
52. Keyboard shortcuts (10.6)
53. Save/Load system (10.7)
54. Sound effects (10.4)
55. Music per context (10.5)
56. Entity sprites (10.1)
57. Terrain sprites (10.2)
58. Animations (10.3)
59. Map portals (7.9)
60. Water & boats (7.10)
61. Hot-seat multiplayer (8.2)
62. Map editor (9.4)

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
