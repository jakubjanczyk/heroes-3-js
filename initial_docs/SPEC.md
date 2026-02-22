# Product Specification
## HoMM3-Inspired Browser Game Engine

---

## Vision

A browser-based game engine that faithfully recreates the experience of Heroes of Might and Magic 3, built entirely on the modern web platform with no external dependencies. The engine is designed from the ground up to be reusable — the game proves it works, but the same foundation powers entirely different experiences for different audiences.

The project has two parallel identities:

**As a game** — a faithful, playable HoMM3 recreation that captures the core loop of exploration, resource gathering, army building, and tactical combat. Not a clone with different art, but a genuine reimagining of what made HoMM3 compelling, running natively in the browser.

**As a platform** — a tile-based world engine that any experience can be built on. The first alternative use case is a personal portfolio website where visitors explore a world to discover work history, projects, and skills — the same mechanics, completely different content and purpose.

---

## Guiding Principles

**The game is the forcing function.** Every engine decision is validated against real game requirements. Abstract engine design without a demanding consumer produces nothing useful.

**Mechanics are HoMM3. Content is swappable.** The engine is not generic. It understands heroes, creatures, towns, resources, mines, armies, and combat. What those things contain, look like, and mean in context is replaceable.

**Web platform only.** No frameworks, no game engines, no rendering libraries. The browser is powerful enough. This is also a demonstration that it is.

**Event sourcing throughout.** Everything that happens is recorded. Any session can be replayed from the beginning. This makes debugging, replaying, sharing, and future multiplayer all tractable from day one.

---

## V1 — Proof of Concept

### Goal

Prove the core loop works. A hero moves around a map, encounters things, and something meaningful happens. Nothing more. The point of V1 is to validate the engine architecture under real conditions, not to ship a game.

### What the player experiences

The player sees a tile-based map rendered in the browser. A hero stands on the map. The player clicks a tile and the hero walks there, step by step, routing around obstacles. The map contains monsters, resource pickups, and towns.

When the hero reaches a monster, the monster is defeated and disappears. A notification tells the player what happened. When the hero reaches a resource, it is collected and disappears — the player is told what they got. When the hero reaches a town, a notification confirms the visit. The town stays.

The hero has a limited number of movement points per turn. When they run out, the player ends the turn and movement resets. That is the complete game loop for V1.

The session persists across page reloads. The player can reset and start fresh.

### What is in the world

A hand-crafted map with varied terrain — grass, dirt, roads, water, mountains. Heroes cannot walk through water or mountains. Roads are faster to traverse.

Three hero types available, each with different movement speeds. Three monster types at different threat levels. Three resource types. Two town types.

### What V1 deliberately excludes

No combat. No town screen. No army. No economy beyond notification text. No fog of war. No AI opponent. No save slots or multiple sessions. No win or loss condition.

These aren't missing features — they're deferred to ensure V1 ships at all.

### Success criteria

- Map renders from a data file, not hardcoded
- Hero moves via click, routes around impassable terrain
- Movement points limit travel, reset on end turn
- All three entity types respond correctly to hero arrival
- Session survives page reload
- Reset button works
- No code from the game layer exists in the engine layer

---

## V2 — The Game Begins

### Goal

Turn V1 into something that feels like a game. The first session a player sits down and actually wants to keep playing.

### Resource economy

Collected resources go into a player inventory shown in a persistent UI bar. Gold, wood, ore, gems, mercury, sulfur, crystal — all tracked. Resources mean something because buildings and recruitment cost them.

Mines on the map can be captured by walking to them. Captured mines generate income at the start of each turn. Mines can be recaptured by an opponent.

### Hero army

Heroes carry an army of up to seven creature stacks. Each stack is one creature type and a count. Army size is what makes combat winnable or unwinnable.

Heroes start with a small army defined in the scenario. Army grows through recruitment at towns and dwellings.

### Town screen

Entering a town opens a full town screen. The player sees which buildings exist, which can be built, and what each costs. Buildings unlock creature recruitment tiers, produce resources, and improve the town's defenses.

The player can recruit creatures from available tiers into the hero's army, limited by weekly growth and army slots.

### Combat — auto resolve

When a hero meets a neutral creature stack, combat is resolved automatically based on army strength comparison. A result screen shows what happened — who won, what was lost. No tactical view yet.

This makes army building meaningful without requiring the full combat system.

### Turn structure

A proper turn cycle. The player acts with their hero — moves, captures, enters towns. Pressing end turn triggers: mines yield resources, creature pools in towns and dwellings replenish weekly, AI opponent takes their turn if present.

### Fog of war

The map starts hidden. Terrain and objects are revealed as the hero explores. Revealed areas remain visible. Unrevealed areas show as black. This makes exploration feel like discovery.

### Win and loss conditions

A scenario has defined win and loss conditions. The simplest: capture the enemy town to win, lose yours to lose. V2 ships with one scenario that has a real ending.

---

## V3 — Depth

### Goal

The game now has the depth that made HoMM3 a classic. A full session takes hours and involves real strategic decisions.

### Tactical combat

When heroes meet in battle or attack a defended town, combat moves to a hex grid tactical view. Each creature stack takes turns based on speed. Stacks attack, retaliate, and move. Spells can be cast. Combat ends when one side is eliminated or retreats.

This is the biggest feature in the project. It needs its own complete design before implementation begins.

### Hero progression

Heroes gain experience from combat and earn levels. On leveling, the player chooses between two skills. Skills compound over a playthrough — a hero with expert logistics and advanced spellpower plays very differently from one without.

Secondary skills include: logistics (movement), archery, spellpower, knowledge, leadership, diplomacy, and more. Each has three levels: basic, advanced, expert.

### Spell system

Heroes with a spellbook can learn and cast spells. Spells are found in towns, on the map, and in certain buildings. Adventure map spells affect movement, vision, terrain. Combat spells deal damage, buff armies, apply effects.

Mana regenerates at the start of each turn based on hero knowledge.

### Artifacts

Artifacts are found on the map, won in combat, or purchased. They equip to specific slots on the hero — helmet, armor, weapon, boots, ring, cloak. Each modifies hero stats or grants special abilities. Combining certain artifacts creates combination artifacts with enhanced effects.

### Multiple heroes

The player can have multiple heroes on the map simultaneously. Heroes can visit each other to transfer army, resources, and artifacts. Only one hero can garrison a town.

Managing multiple heroes — specialist vs generalist, chain movement, garrison vs explorer — becomes a key strategic dimension.

### Advanced AI

The AI opponent manages resources, builds strategically, recruits armies, and actively threatens the player. Not a puzzle to solve but a genuine opponent that adapts to the map state.

---

## V4 — The Full Game

### Goal

A complete, shippable game that stands on its own.

### Full creature roster

All six factions: Castle, Rampart, Tower, Inferno, Necropolis, Dungeon. Each faction has seven creature tiers with upgrades. Creatures have unique abilities — flying, ranged attack, double strike, resurrection, shooting without retaliation, and more.

### Full campaign and scenario support

Multiple maps of varying size and difficulty. A campaign with a story connecting maps. Scenario objectives beyond simple town capture — find an artifact, defeat a specific hero, survive for a number of weeks.

Map editor for creating custom scenarios.

### Multiplayer

Two to eight players sharing a turn-based session. Players take turns simultaneously within their turn, then pass. The event log makes this tractable — every action is an event, events are synced, all clients derive identical state.

Hot seat multiplayer (multiple players on one device) ships first. Online multiplayer via WebRTC peer-to-peer or a lightweight sync server ships later.

### Persistent progression

Optional meta-layer across sessions. Heroes that survive a campaign carry forward. Unlockable factions and scenario types. A replay vault where sessions can be saved, named, and watched back.

---

## The Platform — Beyond the Game

The engine is not only a game engine. The same foundation supports entirely different experiences. The first alternative is a personal portfolio, but the pattern extends further.

### How extensibility works

The engine understands HoMM3 mechanics. An experience provides content — what types of entities exist, what they look like, what happens when you interact with them, what the world contains. The engine runs the same regardless of what content is registered.

An experience provides: entity type definitions, scenario world data, interaction scenes, UI components, and a visual theme. The engine provides: the map, movement, pathfinding, camera, event system, persistence, and all rendering infrastructure.

Swapping an experience is a single line change at boot time.

### Portfolio experience

A personal website where the visitor controls a hero walking through a world that represents the author's professional life.

Towns are employers — entering one opens a rich detail view of that job: role, years, what was built, what was learned. Creature encounters are challenges overcome — a difficult project, a hard transition, a team crisis. Resolving one reveals what happened. Resource pickups are skills and tools acquired along the journey. Artifacts are notable achievements.

The visitor explores at their own pace. They can follow a suggested path or wander freely. The world tells a story through mechanics rather than a wall of text on a traditional resume page.

This experience is memorable in a way no React portfolio ever will be. Visitors do not forget the one that made them play a game to learn about someone.

### Other possible experiences

**Educational worlds** — a history curriculum where students explore a map set in a specific era. Towns are cities, creatures are historical conflicts, resources are cultural achievements. The same engine, completely different content and purpose.

**Narrative experiences** — a short story told through map exploration. Characters are entities, scenes are interactions, the world is the story structure. The author defines the scenario, the reader plays through it.

**Team onboarding** — a company's internal knowledge base as an explorable world. New hires walk through the codebase as a map, enter architectural decisions as towns, collect key concepts as resources. Dry documentation becomes something people want to explore.

The pattern is the same in all cases: a world to explore, things to encounter, scenes triggered by interaction. The engine handles the world. The experience handles the meaning.

---

## What All Versions Share

Regardless of which version or which experience:

- Sessions persist and can be replayed from any point
- The map is always tile-based with the same coordinate system
- Heroes always move by pathfinding, consume movement points, and reset on turn end
- Entities always have a definition (static) and a state (dynamic, event-sourced)
- The event log is the save file — no separate serialization format
- The engine never knows which experience is running
- The experience never reimplements engine infrastructure

These are not constraints to work around. They are the architecture. Everything else builds on them.
