# Extensibility
## Core Engine vs Experience Architecture

---

## Philosophy

The engine is HoMM3-specific. Archetypes, mechanics, and structure are all designed around the game. The extensibility exists to swap content and presentation for different usage — not to make the engine generic for any possible game.

Generic-for-anything engines end up good at nothing. HoMM3-specific-but-swappable means real decisions get made based on real requirements. A portfolio experience uses the same mechanics — it just maps different content onto them.

The mechanics are HoMM3. The content is swappable.

---

## The Boundary

**Engine owns — HoMM3 mechanics and infrastructure:**
- Tile system, coordinate math
- Camera, viewport, virtualization
- Event bus, event log, IndexedDB
- Occupancy system, pathfinding
- Layer stack, rendering loop
- Registry (seam between engine and experience)
- HoMM3 archetypes — hero, creature, resource, town, mine, dwelling, artifact
- Core mechanic rules — movement points, interaction patterns, turn structure
- Archetype event contracts — what events each archetype emits and when

**Experience owns — content and presentation:**
- Specific entity subclasses and definitions (Griffin, Castle, Gold vs ProjectSite, SkillPickup)
- What scene opens on interaction (town screen vs project detail panel)
- UI components (resource bar and hero panel vs portfolio nav and info panel)
- Scenario and world data (which entities exist, where they are)
- Visual theme, art, typography

---

## What Extensibility Actually Means

The portfolio doesn't replace how heroes move, how towns work, or how resources are collected. It maps its own content onto those existing mechanics. The metaphor fits naturally:

- A portfolio **project site** is a `Town` — walk to it, enter it, a scene opens, it stays on the map
- A portfolio **achievement** is a `Resource` — walk over it, it's collected, it disappears
- A portfolio **challenge overcome** is a `Creature` — interact with it, it resolves, it's gone

What changes between game and portfolio: definition data, visual representation, what scene opens. What doesn't change: the underlying rules.

---

## Engine Archetypes

The archetypes live in the engine and are named as HoMM3 concepts. They define interaction patterns and emit generic events. Specific behavior downstream of those events belongs to the experience.

```
engine/archetypes/
  hero.js      ← moving avatar, has movement points, army slots
  creature.js  ← neutral blocker, has strength, emits CREATURE_INTERACTED
  resource.js  ← collectable, disappears, emits RESOURCE_COLLECTED
  town.js      ← permanent location, emits TOWN_ENTERED
  mine.js      ← capturable, emits MINE_CAPTURED, generates income per turn
  dwelling.js  ← recruitable creatures, emits DWELLING_ENTERED
  artifact.js  ← collectable, goes to hero inventory, emits ARTIFACT_COLLECTED
  passive.js   ← decorative, no interaction
```

Each archetype is a thin base class. It knows the pattern — what triggers, what event fires, what state it carries. It knows nothing about Griffin stats, town building trees, or what a mine produces.

```js
// engine/archetypes/creature.js
class Creature extends Entity {
  // state: { id, type, tile, count, side }
  onInteract(detail) {
    bus.emit('CREATURE_INTERACTED', {
      creatureId: this.id,
      heroId: detail.heroId,
      strength: this.def.strength
    })
  }
}

// engine/archetypes/resource.js
class Resource extends Entity {
  onInteract(detail) {
    bus.emit('RESOURCE_COLLECTED', {
      resourceId: this.id,
      heroId: detail.heroId,
      payload: this.def.payload  // { type: 'GOLD', amount: 500 } or anything else
    })
    bus.emit('ENTITY_REMOVE', { id: this.id })
  }
}

// engine/archetypes/town.js
class Town extends Entity {
  onInteract(detail) {
    bus.emit('TOWN_ENTERED', {
      townId: this.id,
      heroId: detail.heroId,
      townType: this.def.type
    })
    // town does not remove itself
  }
}
```

---

## Registry

The registry is the single seam between engine and experience. Experiences register content into it. Engine reads from it to spawn entities. They never import each other directly.

```js
// engine/registry.js
class Registry {
  constructor() {
    this.entityClasses = new Map()  // type string → class
    this.uiComponents = new Map()   // slot name → element
    this.systems = []               // ordered list of systems
  }

  registerEntity(type, EntityClass) {
    this.entityClasses.set(type, EntityClass)
  }

  registerUI(slot, element) {
    this.uiComponents.set(slot, element)
  }

  registerSystem(system) {
    this.systems.push(system)
  }

  createEntity(type, definition, state) {
    const EntityClass = this.entityClasses.get(type)
    if (!EntityClass) throw new Error(`No entity registered for type: ${type}`)
    return new EntityClass(definition, state)
  }
}

export const registry = new Registry()
```

---

## Experience Entry Points

Each experience has one entry file that registers its content. This is the only place experience-specific code is gathered.

### Game

```js
// game/index.js
import { registry } from 'engine/registry.js'
import { Hero }                      from 'game/entities/hero.js'
import { Griffin, Wolf, Dragon }     from 'game/entities/monsters.js'
import { Gold, Wood, Gem }           from 'game/entities/resources.js'
import { Castle, Necropolis }        from 'game/entities/towns.js'
import { MovementSystem }            from 'game/systems/movement.js'
import { InteractionSystem }         from 'game/systems/interaction.js'
import { TurnSystem }                from 'game/systems/turn.js'
import { CombatSystem }              from 'game/systems/combat.js'

registry.registerEntity('KNIGHT',      Hero)
registry.registerEntity('NECROMANCER', Hero)
registry.registerEntity('GRIFFIN',     Griffin)
registry.registerEntity('WOLF',        Wolf)
registry.registerEntity('DRAGON',      Dragon)
registry.registerEntity('GOLD',        Gold)
registry.registerEntity('WOOD',        Wood)
registry.registerEntity('GEM',         Gem)
registry.registerEntity('CASTLE',      Castle)
registry.registerEntity('NECROPOLIS',  Necropolis)

registry.registerSystem(new MovementSystem())
registry.registerSystem(new InteractionSystem())
registry.registerSystem(new TurnSystem())
registry.registerSystem(new CombatSystem())

registry.registerUI('top-bar',      document.createElement('game-resource-bar'))
registry.registerUI('bottom-panel', document.createElement('game-hero-panel'))
registry.registerUI('dialogs',      document.createElement('game-dialog-host'))
```

### Portfolio

```js
// portfolio/index.js
import { registry } from 'engine/registry.js'
import { Avatar }      from 'portfolio/entities/avatar.js'      // extends Hero
import { ProjectSite } from 'portfolio/entities/project.js'    // extends Town
import { Achievement } from 'portfolio/entities/achievement.js' // extends Resource
import { Challenge }   from 'portfolio/entities/challenge.js'   // extends Creature
import { JourneySystem } from 'portfolio/systems/journey.js'

registry.registerEntity('AVATAR',      Avatar)
registry.registerEntity('PROJECT',     ProjectSite)
registry.registerEntity('ACHIEVEMENT', Achievement)
registry.registerEntity('CHALLENGE',   Challenge)

registry.registerSystem(new JourneySystem())

registry.registerUI('top-bar',      document.createElement('portfolio-nav'))
registry.registerUI('bottom-panel', document.createElement('portfolio-info'))
registry.registerUI('dialogs',      document.createElement('portfolio-detail'))
```

Portfolio entities extend HoMM3 archetypes. They inherit the mechanics and override only what they need — typically just `render()` and what scene opens on interaction.

---

## Game Entities Extend Archetypes

Game-specific classes add HoMM3 rules on top of archetype foundations. In many cases the subclass is thin — the archetype does most of the work, and specific behavior lives in systems that listen to archetype events.

```js
// game/entities/monsters.js
import { Creature } from 'engine/archetypes/creature.js'

class Griffin extends Creature {
  // definition from monsters.json:
  // { type: 'GRIFFIN', name: 'Griffin', strength: 300, tier: 3, speed: 6 }
  // state: { id, type, tile, count, side: 'neutral' }
  // inherits onInteract — emits CREATURE_INTERACTED
  // CombatSystem listens to that and handles the fight
}

class Dragon extends Creature {
  // same archetype, different definition data
}
```

The archetype handles the interaction. The game subclass is a named container for the definition type. Behavior lives in systems listening to archetype events.

---

## main.js

Boots the engine. One import line determines the experience. Everything else is identical.

```js
// main.js
import { Engine }   from 'engine/engine.js'
import { registry } from 'engine/registry.js'

// swap this one line to change experience
import 'game/index.js'
// import 'portfolio/index.js'

const engine = new Engine(registry)
await engine.init()
engine.start()
```

---

## Scenario as World Definition

Scenario JSON is swappable — different file, different world. Engine reads entity types, looks up registered classes, spawns entities. Unknown types throw a clear error pointing to missing registration.

```json
// scenarios/portfolio.json
{
  "meta": { "name": "My Journey", "width": 32, "height": 24 },
  "terrain": [...],
  "entities": [
    { "id": "a1", "type": "AVATAR", "tile": { "x": 2, "y": 2 } },
    {
      "id": "p1", "type": "PROJECT", "tile": { "x": 10, "y": 8 },
      "payload": { "name": "HoMM3 Engine", "year": 2025, "url": "..." }
    },
    {
      "id": "ac1", "type": "ACHIEVEMENT", "tile": { "x": 6, "y": 5 },
      "payload": { "type": "SKILL", "name": "Systems Design" }
    },
    {
      "id": "ch1", "type": "CHALLENGE", "tile": { "x": 14, "y": 9 },
      "strength": 100,
      "payload": { "name": "Led a team through a hard migration" }
    }
  ]
}
```

The `payload` field is passed through to the entity definition. Engine doesn't interpret it — the entity and its scene handler do.

---

## UI Slots

index.html defines named slots. Engine mounts whatever is registered for each. HTML never changes between experiences.

```html
<!-- index.html — identical for game and portfolio -->
<body>
  <div data-ui-slot="top-bar"></div>
  <div class="viewport">
    <!-- layers mounted here by engine -->
  </div>
  <div data-ui-slot="bottom-panel"></div>
  <div data-ui-slot="dialogs"></div>
</body>
```

```js
// engine/engine.js
async init() {
  for (const [slot, element] of registry.uiComponents) {
    const container = document.querySelector(`[data-ui-slot="${slot}"]`)
    if (container) container.appendChild(element)
  }
  for (const system of registry.systems) {
    await system.init()
  }
}
```

---

## Theme Swapping

Engine defines base tokens. Experience overrides them in its own `@layer`. Experience theme always wins without specificity hacks.

```css
/* styles/theme.css — engine base */
:root {
  --ui-panel-bg: rgba(0, 0, 0, 0.85);
  --ui-border:   #444;
  --ui-text:     #eee;
}

/* game/theme.css */
@layer game-theme {
  :root {
    --ui-panel-bg: rgba(20, 16, 10, 0.9);
    --ui-border:   #8b7355;
    --ui-text:     #e8d9b0;
  }
}

/* portfolio/theme.css */
@layer portfolio-theme {
  :root {
    --ui-panel-bg: rgba(8, 10, 20, 0.95);
    --ui-border:   #2a3a5a;
    --ui-text:     #c8d8f0;
  }
}
```

---

## The Discipline This Requires

**Engine never imports from game or portfolio.** If engine code references a game concept by name, it belongs in an archetype event or the registry instead.

**No game content nouns in engine code.** Engine files can say `creature`, `town`, `resource` because those are archetype names. They cannot say `Griffin`, `Castle`, `gold` — those are game content.

**Archetypes emit generic events, systems handle specifics.** `CREATURE_INTERACTED` is an archetype event. `CombatSystem` is a game system that listens and applies HoMM3 rules. The archetype doesn't know about combat. The combat system doesn't care what triggered it — just that a creature interaction occurred.

**Gut check:** delete `/game`. Does the engine still compile? Do archetypes still make sense as standalone concepts? If yes, the boundary is clean.

---

## Folder Structure

```
/engine
  registry.js
  engine.js
  entity.js
  map.js
  camera.js
  occupancy.js
  movement.js
  eventlog.js
  db.js
  input.js
  renderer.js
  archetypes/
    hero.js
    creature.js
    resource.js
    town.js
    mine.js
    dwelling.js
    artifact.js
    passive.js
  workers/
    pathfinding.js
  houdini/
    terrain-painter.js
  layers/
    terrain.js
    object.js
    entity.js
    effects.js
    ui.js

/game                      ← imports from engine only
  index.js                 ← registration entry point
  theme.css
  entities/
    hero.js
    monsters.js
    resources.js
    towns.js
    mines.js
    dwellings.js
    artifacts.js
  systems/
    movement.js
    interaction.js
    turn.js
    combat.js
    economy.js
  ui/
    resource-bar.js
    hero-panel.js
    town-screen.js
    combat-screen.js
    dialog-host.js
  data/
    heroes.json
    monsters.json
    resources.json
    towns.json
    terrain.json

/portfolio                 ← imports from engine only
  index.js
  theme.css
  entities/
    avatar.js
    project.js
    achievement.js
    challenge.js
  systems/
    journey.js
  ui/
    nav.js
    info-panel.js
    detail.js
  data/
    locations.json

/scenarios
  test.json
  portfolio.json

/styles
  main.css
  reset.css
  theme.css

index.html
main.js
```
