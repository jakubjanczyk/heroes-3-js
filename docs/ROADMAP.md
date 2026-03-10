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
- [ ] Terrain type enum: grass, dirt, snow, swamp, desert, lava, sand, rough, subterranean, water
- [ ] Terrain data in scenario JSON (tile value encodes terrain type, not just 0/1)
- [ ] CSS class per terrain type with distinct color/pattern
- [ ] Water tiles are impassable
- [ ] Terrain type affects movement cost (see 4.6)

### 1.2 Cursor System
- [ ] Custom cursor images replacing default browser cursor
- [ ] Cursor state machine: default, move (reachable), move-far (beyond 1 turn), attack, visit, interact, blocked
- [ ] Hover over empty passable tile: green boot (reachable) or yellow boot (2+ turns) or red X (unreachable)
- [ ] Hover over monster: sword cursor
- [ ] Hover over town: door/visit cursor
- [ ] Hover over resource: grab/pickup cursor
- [ ] Hover over mine: flag cursor
- [ ] Hover over hero: exchange cursor (when multiple heroes exist)
- [ ] Cursor updates in real-time as mouse moves across tiles
- [ ] Cursor reflects whether tile is within current turn's movement range

### 1.3 HUD Redesign
- [ ] Top resource bar showing all 7 resource types with icons and counts
- [ ] Day/week/month display in resource bar (e.g. "Month 1, Week 1, Day 1")
- [ ] Right sidebar panel: minimap at top, hero portrait below, action buttons below
- [ ] Bottom info bar: shows name + brief info of whatever entity the mouse hovers over
- [ ] "End Turn" button styled and positioned like H3 (hourglass icon in right panel)
- [ ] "Next Hero" button (arrow icon) - cycles to next hero with remaining movement
- [ ] System menu button (gear icon) - placeholder for options/save/load
- [ ] H3-style border/frame around the map viewport area
- [ ] Resource bar tooltips showing daily income per resource

### 1.4 Minimap Improvements
- [ ] Minimap shows terrain colors matching terrain types
- [ ] Entity dots on minimap: hero (player color), town (large dot), monster (red), resource (yellow)
- [ ] Click on minimap to move camera to that location
- [ ] Drag on minimap to pan camera
- [ ] Current viewport rectangle shown on minimap
- [ ] Fog of war reflected on minimap (when fog is implemented)

### 1.5 Camera Improvements
- [ ] Keyboard arrow keys scroll the map
- [ ] Camera bounds - cannot scroll beyond map edges
- [ ] Smooth camera transitions when clicking minimap
- [ ] Double-click on hero portrait centers camera on hero

---

## Milestone 2: Rich Entity Interactions

Entities become meaningful content containers. Critical for portfolio.

### 2.1 Right-Click Info Panels
- [ ] Right-click any entity shows an info popup overlay
- [ ] Popup positioned near the clicked entity, not centered
- [ ] Click outside or press Escape to dismiss
- [ ] Monster info: name, creature type, estimated count (Few/Several/Pack/Lots/Horde/Throng/Legion), difficulty indicator
- [ ] Town info: name, faction type, owner (player color or neutral), garrison preview, built structures summary
- [ ] Resource info: resource type, amount to be collected
- [ ] Mine info: mine type, daily income amount, current owner
- [ ] Hero info: name, portrait, level, primary stats (A/D/P/K), army summary (creature icons + counts)
- [ ] Info panels have H3-style parchment/panel background

### 2.2 Entity Data Model Expansion
- [ ] Entities support `metadata` field in scenario JSON: `{ title, description, image, links[], tags[] }`
- [ ] Metadata displayed in right-click panels and interaction modals
- [ ] Entity `displayName` field (overrides type-based default name)
- [ ] Entity `flavor` field (short text shown on hover in bottom info bar)
- [ ] Validation: scenario loader validates entity metadata schema

### 2.3 Town View Screen
- [ ] Entering a town opens a full-screen town view (replaces adventure map)
- [ ] Town background image area (faction-specific later, placeholder for now)
- [ ] Building slots displayed on town background (empty/built state)
- [ ] Town name at top of screen
- [ ] Garrison bar: up to 7 creature stacks displayed
- [ ] Visiting hero army bar below garrison (when hero is in town)
- [ ] "Exit" button returns to adventure map
- [ ] Town view has its own event scope (town.command.*, town.fact.*)
- [ ] Creatures available for recruitment panel
- [ ] Gold/resource display within town view

### 2.4 Interaction Modals Upgrade
- [ ] Monster defeat modal: show creature name, count defeated, XP gained, any loot dropped
- [ ] Resource pickup modal: show resource icon, type name, amount collected (e.g. "+500 Gold")
- [ ] Resource pickup: brief floating number animation on map (optional, low priority)
- [ ] Mine capture modal: show mine type, daily income, "Mine captured!" message
- [ ] Town visit: redirect to town view screen instead of modal
- [ ] Artifact pickup modal: show artifact name, description, stat bonuses, equip slot
- [ ] Dwelling visit modal: show available creatures, count, cost, recruit button

### 2.5 Bottom Info Bar
- [ ] Hovering over any tile shows terrain type name
- [ ] Hovering over an entity shows: icon + name + brief description
- [ ] Hovering over monster shows: name + estimated strength ("A few Skeletons guard this area")
- [ ] Hovering over resource shows: type + amount ("500 Gold")
- [ ] Hovering over mine shows: type + owner + income ("Gold Mine - Neutral - 1000g/day")
- [ ] Hovering over town shows: name + faction + owner ("Castle - Player 1")
- [ ] Info bar clears when mouse moves to empty tile or off map

---

## Milestone 3: Game Economy & Time

Core game loop - resources flow, time passes.

### 3.1 Day/Week/Month Cycle
- [ ] End turn advances day counter by 1
- [ ] Day counter persisted in event log
- [ ] Week = 7 days. New week triggers `fact.week_started` event
- [ ] Month = 4 weeks (28 days). New month triggers `fact.month_started` event
- [ ] "New Week" notification popup at start of each week
- [ ] "New Month" notification popup at start of each month
- [ ] Current date displayed in HUD: "Month 1, Week 2, Day 3"
- [ ] Day 1 of week 1 is the starting day

### 3.2 Resource Income System
- [ ] At the start of each new day (after end turn), income is calculated and applied
- [ ] Income sources: owned mines, owned towns
- [ ] Income event: `fact.income_collected` with breakdown per source
- [ ] Income summary tooltip on each resource in HUD (e.g. "Gold: 5000 (+2000/day)")
- [ ] Visual feedback when income is added (brief flash/highlight on resource counts)
- [ ] Starting resources defined in scenario JSON

### 3.3 Mine Ownership
- [ ] Mines have an `owner` property: null (neutral), or player ID
- [ ] Hero arriving at neutral mine: captures it, owner set to hero's player
- [ ] Hero arriving at own mine: "You already own this mine" (no action or brief info)
- [ ] Hero arriving at enemy mine: captures it (combat later, auto-capture for now)
- [ ] Mine visual indicator: small colored flag/dot showing owner color
- [ ] Neutral mines have no flag or gray flag
- [ ] Mine ownership persisted in event log
- [ ] Mine income only from owned mines

### 3.4 Resource Spending Framework
- [ ] `canAfford(costs)` utility: checks if player has enough resources
- [ ] `spendResources(costs)` with event: `fact.resources_spent` with reason
- [ ] Insufficient resources: UI shows which resources are missing (red highlight)
- [ ] Resource costs defined as `{ gold: N, wood: N, ore: N, ... }` objects
- [ ] Used by: town building construction, creature recruitment, hero recruitment

### 3.5 Starting Resources & Configuration
- [ ] Scenario JSON defines starting resources per player
- [ ] Default starting resources if not specified (10000 gold, 20 wood, 20 ore, etc.)
- [ ] Resources initialized on world ready, before first turn

---

## Milestone 4: Hero System

Heroes become characters with identity and progression.

### 4.1 Hero Primary Attributes
- [ ] Four primary stats: Attack, Defense, Power, Knowledge
- [ ] Starting values defined per hero type (e.g. Knight: A2/D2/P1/K1)
- [ ] Stats displayed in hero panel and right-click info
- [ ] Attack: increases creature damage dealt in combat
- [ ] Defense: reduces creature damage taken in combat
- [ ] Power: increases spell damage/duration
- [ ] Knowledge: determines max mana (Knowledge * 10)

### 4.2 Hero Experience & Leveling
- [ ] Heroes earn XP from: defeating monsters, visiting XP objects (Learning Stone, etc.)
- [ ] XP thresholds per level (H3 formula: level N requires progressively more XP)
- [ ] Level-up event: `fact.hero_leveled_up`
- [ ] Level-up popup: choose +1 to one of two offered primary stats
- [ ] Hero level displayed in hero panel and info screens
- [ ] Current XP and XP to next level shown in hero details

### 4.3 Hero Army
- [ ] Hero carries up to 7 creature stacks
- [ ] Each stack: creature type + count
- [ ] Army displayed in hero panel (7 slots, creature icon + count per slot)
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
- [ ] Base MP per hero (default 1500 in H3 - different from current 15)
- [ ] Terrain movement costs:
  - Road: 75% of base (fastest)
  - Dirt, grass, subterranean: 100 MP per tile (base cost)
  - Rough, sand: 125 MP per tile
  - Snow, swamp, desert: 150 MP per tile
- [ ] Pathfinding skill reduces terrain penalties:
  - Basic: 75% penalty, Advanced: 50%, Expert: no penalty
- [ ] Logistics skill increases total MP:
  - Basic: +10%, Advanced: +20%, Expert: +30%
- [ ] Path preview shows MP cost per step and total
- [ ] Unreachable tiles (water, mountains) have infinite cost

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
- [ ] Creature data file per faction with all creatures
- [ ] Creature stats: attack, defense, min damage, max damage, health, speed, growth, cost
- [ ] Creature tier: 1-7 (determines power level and town dwelling level)
- [ ] Creature abilities/flags: ranged, flying, double-wide (2-hex), undead, etc.
- [ ] Upgraded creature variants (e.g. Skeleton -> Skeleton Warrior)
- [ ] Creature value (AI value) for army strength estimation
- [ ] At minimum implement Castle faction creatures:
  - T1: Pikeman / Halberdier
  - T2: Archer / Marksman
  - T3: Griffin / Royal Griffin
  - T4: Swordsman / Crusader
  - T5: Monk / Zealot
  - T6: Cavalier / Champion
  - T7: Angel / Archangel

### 5.2 Monster Encounters on Map
- [ ] Monsters on map have a creature type and count (not just "skeleton")
- [ ] Monster count categories: Few (1-4), Several (5-9), Pack (10-19), Lots (20-49), Horde (50-99), Throng (100-249), Legion (250+)
- [ ] Monster count shown on hover (category, not exact number)
- [ ] Monster aggression: some flee, some join, some fight (based on army strength ratio + Diplomacy)
- [ ] Monster growth over time: count increases each week (optional, based on scenario settings)
- [ ] Approaching a monster initiates combat (not instant defeat)
- [ ] Weak monsters may offer to flee or join hero's army

### 5.3 Combat Grid & Layout
- [ ] Combat takes place on a separate screen (hexagonal grid)
- [ ] Grid size: 15 columns x 11 rows of hexagonal cells
- [ ] Attacker units placed on left side, defender on right
- [ ] Terrain background based on adventure map terrain where combat started
- [ ] Obstacles on combat grid (random placement or scenario-defined)
- [ ] Grid cells: passable, obstacle, wall (siege)
- [ ] Hex coordinate system with neighbor calculation
- [ ] Mouse hover highlights hex, shows movement/attack range

### 5.4 Combat Turn Order
- [ ] Initiative based on creature speed stat
- [ ] Faster creatures act first
- [ ] Each stack acts once per round
- [ ] Round ends when all stacks have acted, then new round starts
- [ ] Current active stack highlighted
- [ ] Turn order bar/queue display showing upcoming stacks
- [ ] Ties in speed: attacker goes first

### 5.5 Combat Movement
- [ ] Active stack can move up to its speed in hexes
- [ ] Pathfinding on hex grid (avoid obstacles and other stacks)
- [ ] Movement range highlighted (reachable hexes)
- [ ] Flying creatures ignore ground obstacles, can move to any hex in range
- [ ] Double-wide creatures (e.g. Cavalier) occupy 2 hexes
- [ ] Click to move stack to hex
- [ ] Movement animation (stack slides across hexes)

### 5.6 Combat Attacks
- [ ] Melee attack: move adjacent to enemy stack, click to attack
- [ ] Damage formula: `base_damage * count * (1 + 0.05 * (attack - defense))` (simplified H3 formula)
- [ ] Attack stat = creature attack + hero Attack attribute
- [ ] Defense stat = creature defense + hero Defense attribute
- [ ] Damage range: random between creature min and max damage per unit
- [ ] Casualties calculated: total damage / creature max health = units killed, remainder tracked
- [ ] Retaliation: defending stack counter-attacks once per round (unless ability prevents it)
- [ ] Ranged attack: ranged creatures can attack from distance
- [ ] Ranged: limited ammo (shots per battle, usually 12-24)
- [ ] Ranged: half damage if adjacent enemy (melee penalty)
- [ ] Ranged: half damage beyond half grid distance (distance penalty)
- [ ] Ranged: blocked by obstacles/walls in line of fire
- [ ] Attack animation: brief visual for attack, damage number shown
- [ ] Death animation: stack at 0 units removed from grid

### 5.7 Combat Actions (Wait, Defend, Retreat, Surrender)
- [ ] **Wait**: skip current turn, act later in the round (after all others, at half-speed priority)
- [ ] **Defend**: skip turn, +25% defense until next turn
- [ ] **Retreat**: hero flees battle, loses all creatures, hero survives
- [ ] **Surrender**: pay gold to enemy to leave with army intact (gold cost = army value)
- [ ] **Auto-combat**: AI controls your army to resolve battle quickly
- [ ] Action buttons displayed during active stack's turn

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
  - XP awarded (based on defeated army AI value)
  - Loot: gold and/or resources dropped by neutral monsters
  - Creature losses tallied and shown in summary
  - "Victory" screen with stats
- [ ] **Defeat**: all your stacks destroyed
  - Hero lost (removed from map)
  - If defending town: town captured by attacker
  - "Defeat" screen
- [ ] **Flee/Retreat**: hero escapes, army lost, hero goes to nearest town or removed
- [ ] **Surrender**: hero keeps army, pays gold
- [ ] Post-combat: return to adventure map, dead monsters removed, hero continues

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
- [ ] Road tile type in terrain data
- [ ] Roads reduce movement cost to 75% of base
- [ ] Road visuals: dirt path rendered on tiles
- [ ] Pathfinding prefers roads (lower cost = naturally preferred by A*)
- [ ] Roads connect towns and key locations in scenarios

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
- [ ] Water tiles are impassable on foot
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
- [ ] Road layer in terrain data
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
- [ ] `M` or click: move selected hero
- [ ] `E` or button: end turn
- [ ] `Space`: next hero with remaining movement
- [ ] `H`: hero list
- [ ] `T` / `K`: town list
- [ ] `Arrow keys`: scroll map
- [ ] `+`/`-`: zoom in/out
- [ ] `Escape`: close current modal/panel/view
- [ ] `Enter`: confirm dialog
- [ ] `S`: spellbook (in combat and adventure map)
- [ ] `W`: wait (in combat)
- [ ] `D`: defend (in combat)
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
4. Bottom info bar on hover (2.5)
5. Right-click info panels (2.1)
6. Day/week/month cycle (3.1)
7. Mine ownership (3.3)
8. Resource income system (3.2)
9. Resource spending framework (3.4)

### Phase 2 - "Heroes Have Depth"
10. Hero primary attributes (4.1)
11. Hero experience & leveling (4.2)
12. Hero army (4.3)
13. Movement points & terrain costs (4.6)
14. Monster encounters (count + categories) (5.2)
15. Entity data model expansion (2.2)

### Phase 3 - "Combat Works"
16. Creature database (5.1)
17. Combat grid & layout (5.3)
18. Combat turn order (5.4)
19. Combat movement (5.5)
20. Combat attacks (melee + ranged) (5.6)
21. Combat actions: wait, defend, retreat (5.7)
22. Combat resolution (5.9)

### Phase 4 - "Towns & Economy"
23. Town view screen (2.3)
24. Town buildings system (6.1)
25. Common buildings (6.2)
26. Creature dwellings in town (6.3)
27. Town garrison (6.4)
28. Interaction modals upgrade (2.4)

### Phase 5 - "Living World"
29. Fog of war (7.1)
30. Roads (7.2)
31. Multiple heroes (4.5)
32. Hero secondary skills (4.7)
33. Creature dwellings on map (7.4)
34. Resource-generating objects (7.5)
35. Permanent bonus objects (7.7)
36. Stat-boosting objects (7.6)
37. Artifacts on map (7.8)
38. Obstacles & decorations (7.3)

### Phase 6 - "Real Competition"
39. Player system (8.1)
40. AI basics (8.3)
41. AI decision making (8.4)
42. Victory conditions (8.5)
43. Combat spells (5.8)
44. Hero magic (4.8)
45. Siege combat (5.10)
46. Town factions (6.5)

### Phase 7 - "Polish & Reusability"
47. Engine public API (9.3)
48. Scenario format v2 (9.1)
49. Multiple scenarios + selector (9.2)
50. Keyboard shortcuts (10.6)
51. Save/Load system (10.7)
52. Sound effects (10.4)
53. Music per context (10.5)
54. Entity sprites (10.1)
55. Terrain sprites (10.2)
56. Animations (10.3)
57. Map portals (7.9)
58. Water & boats (7.10)
59. Hot-seat multiplayer (8.2)
60. Map editor (9.4)

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
