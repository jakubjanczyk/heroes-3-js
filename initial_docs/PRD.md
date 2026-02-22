# Product Requirements Document
## HoMM3-Inspired Browser Game Engine — V1

---

## Overview

A browser-based game engine built with vanilla JS, HTML, and CSS (no frameworks, no canvas) that powers a Heroes of Might and Magic 3-inspired game. The engine is designed from the start to be reusable — the game is the forcing function, but a second use case (an interactive personal portfolio) is a first-class consideration that shapes architectural decisions.

The engine and game are developed together but kept strictly separated. The game lives on top of the engine. A future portfolio experience would sit alongside it, sharing the engine entirely.

---

## Goals

- Build a working, playable V1 slice of a HoMM3-inspired game in the browser
- Build the underlying engine to be reusable across different "experiences" (game, portfolio, etc.)
- Keep the tech stack minimal: vanilla JS, HTML, CSS, SVG — no frameworks, no build tools required to start
- Establish architecture patterns early (event sourcing, entity/state separation, layered rendering) that don't need to be revisited as scope grows

## Non-Goals for V1

- Full HoMM3 feature parity (combat system, spell system, AI, full town management)
- Multiplayer (designed to not preclude it, but not implemented)
- Polished art (placeholder visuals acceptable for V1)
- Mobile support (desktop-first for now)

---

## Users

**Primary:** The developer (you), building and iterating on the game and engine.

**Secondary (V2+):** Players of the game. Visitors to the portfolio experience.

---

## V1 Scope

### What V1 includes

A rendered map with a hero the player can move around. The map contains monsters, resources, and towns. When the hero steps on any of them, something happens and the player is informed. That's the complete loop.

Specifically:

**Map**
- A tile-based map rendered from a scenario JSON file
- Multiple terrain types (grass, dirt, water, mountain) with distinct visual treatment
- Impassable tiles the hero cannot walk through
- Camera that follows the hero or scrolls to show the map

**Hero**
- One player-controlled hero on the map
- Click a tile to move the hero there via pathfinding
- Hero has movement points that limit how far they can move per turn
- Basic attributes: name, class, movement speed
- Multiple hero types with distinct definitions (e.g. Knight, Necromancer)

**Entities on the map**
- Monsters: neutral creatures that block a tile. When hero arrives, monster is defeated and disappears. Multiple types with different names and strengths.
- Resources: pickups on the map. When hero arrives, resource is collected and disappears. Multiple types (gold, wood, gems).
- Towns: permanent structures. When hero arrives, a notification is shown. Town remains. Multiple town types (Castle, Necropolis).

**Interaction feedback**
- When any interaction occurs, a notification panel shows what happened ("Defeated Griffin!", "Collected 500 Gold", "Entered Castle")
- No combat view, no town screen — just the notification for V1

**Turn system**
- Basic turn structure: player acts, then turn ends (no AI opponent in V1)
- Movement points reset each turn
- "End turn" button

### What V1 explicitly excludes

- Combat mechanics or combat view
- Town building screen
- Spells, artifacts, skills
- AI opponents
- Multiple heroes
- Fog of war (nice to have but not required)
- Save/load (event log exists but no persistence UI)

---

## Entity Definitions (V1 Data)

Each entity type has a **definition** (static, from JSON) and a **state** (dynamic, derived from events).

### Heroes
| Type | Name | Class | Movement |
|---|---|---|---|
| KNIGHT | Sir Roland | Knight | 12 |
| NECROMANCER | Sandro | Necromancer | 10 |

### Monsters
| Type | Name | Strength | Tier |
|---|---|---|---|
| WOLF | Wolf Raider | 80 | 1 |
| GRIFFIN | Griffin | 300 | 3 |
| DRAGON | Dragon | 2000 | 6 |

### Resources
| Type | Name | Amount |
|---|---|---|
| GOLD | Gold | 1000 |
| WOOD | Wood | 5 |
| GEM | Gems | 3 |

### Towns
| Type | Name | Faction |
|---|---|---|
| CASTLE | Castle | Human |
| NECROPOLIS | Necropolis | Undead |

### Terrain
| Type | Passable | Movement Cost |
|---|---|---|
| GRASS | yes | 1 |
| DIRT | yes | 1 |
| ROAD | yes | 0.5 |
| WATER | no | — |
| MOUNTAIN | no | — |

---

## Key Interactions (V1)

| Hero steps on | Result | Notification |
|---|---|---|
| Monster tile | Monster disappears, MONSTER_DEFEATED emitted | "Defeated [name]!" |
| Resource tile | Resource disappears, RESOURCE_COLLECTED emitted | "Collected [amount] [name]" |
| Town tile | Nothing removed, TOWN_VISITED emitted | "Visited [name]" |
| Impassable tile | Move rejected, nothing happens | — |
| Out of movement | Move rejected | — |

---

## Event Model

The game uses event sourcing. All game-deciding facts are recorded in an append-only event log. Commands (player intent) are validated first and never logged. Only facts are logged.

**Commands (intent, not logged)**
- MOVE_COMMAND
- END_TURN_COMMAND

**Events (facts, logged)**
- HERO_MOVED
- HERO_ARRIVED
- MONSTER_DEFEATED
- RESOURCE_COLLECTED
- TOWN_VISITED
- TURN_ENDED
- NOTIFICATION_SHOWN

This model means the full game session can be replayed by replaying the event log from the beginning.

---

## Success Criteria for V1

- [ ] Map renders from a JSON scenario file
- [ ] Hero renders on the map and can be moved by clicking tiles
- [ ] Pathfinding routes hero around impassable tiles
- [ ] Movement points limit hero movement, reset on end turn
- [ ] At least 3 monsters, 3 resources, 1 town present on test map
- [ ] Hero stepping on monster removes it and shows notification
- [ ] Hero stepping on resource removes it and shows notification
- [ ] Hero stepping on town shows notification, town remains
- [ ] Event log records all facts and can be inspected in console
- [ ] Engine folder has no imports from game folder

---

## Future Versions (Not Designed Now, Not Blocked)

**V2:** Combat view when hero meets monster. Town screen when hero enters town. Fog of war.

**V3:** Multiple heroes. Spell system. Artifact system. Skill leveling.

**V4:** AI opponent. Full turn cycle. Win/loss conditions.

**Portfolio mode:** Swap game content for portfolio content. Same engine, different scenario JSON and interaction handlers.

**Multiplayer:** Event log synced across clients via websocket. Turn-based so no real-time sync needed.
