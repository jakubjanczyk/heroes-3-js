# Game state store (2026-10-25)

How the game keeps per-player, per-hero and per-town data once there are several heroes, towns and players, and how fog of war fits in. This comes before fog of war (7.1) and multiple heroes (4.5) on the roadmap. Diagrams of the same design: https://claude.ai/artifact/AuXEQ4uLzKNcaXy7BeoPj1 (private to the repo owner).

## The problem

The saved event log already is the source of truth: facts are saved to IndexedDB, and a reload replays them through the bus. But every module that needs domain data keeps its own copy, built from the same facts:

| Fact | Modules keeping their own copy |
|---|---|
| `fact.town.captured` | 7, each with its own `createOwnedTowns()` |
| `fact.hero.army.changed` | 6 |
| `fact.mine.captured` | 5 |
| `fact.hero.leveledUp`, `fact.town.building.built` | 4 each |
| resources | 2 `createTreasury()` copies (`hud`, `town`) |

On top of the copies, the code assumes one hero and one player:

- Towns already work per id (`townsById`, `builtByTownId`, the garrisons map), but ownership is hardcoded to `PLAYER_COLOR = 'red'`.
- Heroes don't. `findHero()` returns the first hero, and 12 modules keep a single `hero`, `heroTile` or `experience` from it. The hero's name and class come from the global `game/data/hero.json` (`definitions.hero`), not from the hero. Movement points live in one `turnState` in `turn.module`. A second hero in the scenario would not work.
- Several facts don't say whose they are: `fact.hero.experience.gained`, `fact.hero.leveledUp` and `fact.hero.movementPoints.changed` have no `heroId`. `fact.town.captured` and `fact.mine.captured` have no owner. `fact.resources.spent` and `fact.income.collected` have no player. `ui.hero.selected` has no `heroId`. `fact.hero.moved` and `fact.hero.army.changed` already carry `heroId`.
- Fog of war is the first feature whose data is per player. Built the old way, it would become one more copy, in a module that only knows red.

## The model

This is event sourcing with a light form of CQRS:

- **Event store:** the IndexedDB event log (`engine/eventlog.js`). It is append-only, holds only facts, and is the source of truth.
- **Write side:** commands. A domain module takes a `command.*`, reads the current state, decides, and emits `fact.*`. Random rolls happen here and their results go into the fact (as `hero-levels` already does), so replay never rolls again.
- **Read model:** the game state store, the current state worked out by applying every saved fact in order. It is in memory only and rebuilt from the log on every load. It is not a saved checkpoint: nothing about it is written to IndexedDB.
- **Light CQRS:** domain modules (deciding) and views (showing) read the same model. There are no separate read and write models.

`game/heroes/turn-system.js` already works this way on a small scale (`decideEndTurn(state)`, `applyTurnEnded(state, …)`). The store makes that the pattern for all game data.

## Decisions

### Who talks to whom

- Modules never talk to each other, same as now: no imports between modules and no query APIs on modules.
- Two things connect them, and neither is a module. **The bus** carries commands, facts and `ui.*` events. **The store** holds the shared state.
- The store belongs to no module. Only facts build it, so deleting any module leaves the store state exactly the same.
- **The bus applies each fact to the store before notifying listeners.** When a fact is emitted, the bus saves it to the log (if it is a saved type), applies it to the store, then calls the listeners. So a listener already reads the new state. The emitter must not read the state back after emitting: see "Consistency between facts" below.
- The store is applied to **even when the bus is silent**, so a silent replay still builds the state.
- **Modules read the store and never write it.** The module runtime passes a read handle next to `emit` and `on`: `defineModule(({ emit, on, state }) => …)`, with `state.get()` returning the current frozen state. The handle has no `apply`.
- **The store emits nothing and has no subscribe API.** Modules learn when to update from the facts they already listen to, then read what they need. There is no catch-all `state.changed` event.
- **No global singleton.** `bootApp` creates the store and hands it to the bus and the module runtime, so each behavior test boot gets a fresh one.

### Layers

- `engine/store.js`: generic. It keeps a value and replaces it with `applyFact(value, fact)`. It knows nothing about the game.
- `engine/bus.js`: gains a `beforeDispatch(event)` option, called after recording and before the `silent` check and the listeners.
- `game/state/`: core state, pure functions only, with no `app/` or `game/heroes/` imports (see "Core and Heroes slices" below).
- `game/heroes/state/`: the Heroes slices and the queries that read them.
- `app/boot-app.js`: creates the store as `createStore(combineSlices([...CORE_SLICES, ...config.content.stateSlices]))`, passes `beforeDispatch: store.apply` to the bus, and passes the read handle to `registerModules`.
- `app/modules/shared/module-runtime.js`: passes `state` to each module's setup.
- The existing rules still hold: `engine/` never imports `game/`, and core `game/` never imports `game/heroes/`.

### Core and Heroes slices

Most of the state is Heroes content (towns, mines, armies, primary skills, income, creature growth), while core modules (`movement`, `selection`, `camera`, `entity-view`) need to read it too: hero tiles and removed entities. So the state is built from slices. Core owns the machinery and the generic slices; Heroes adds its own through content, the same way `entityBehaviors` is passed today.

A slice:

```js
{
  key: 'towns',
  initial: ({ scenario, definitions, config }) => ({ … }),
  on: {
    'fact.town.captured': (towns, detail, previousState) => towns
  }
}
```

- `on` names the facts the slice applies, so a test checks they are all saved fact types. A fact it doesn't name leaves the slice as it is.
- `previousState` is the whole state before this fact, read only. Income on a new day, for example, reads the towns' buildings and the mines' owners. A slice never writes another slice.
- `config` is there because the starting movement points come from `config.maxMovementPoints`.

Core, in `game/state/`:

- `combineSlices(slices)` builds `initialGameState` and `applyFact`, and throws on a duplicate key.
- Generic slices:
  - `players`: colours and `activePlayer`; `viewingPlayer` is a query.
  - `heroes`: per hero, only `owner`, `tile` and `removed`.
  - `mapObjects`: `removedEntityIds`.
  - `date`.
  - `fog`, possibly, with the vision radius passed in by content.
- Core queries: `heroTile(state, id)`, `heroIdsOf(state, player)`, `isRemoved(state, id)`, `viewingPlayer(state)`, … Core modules use only these.

Heroes, in `game/heroes/state/`:

- Slices: `towns`, `mines`, `kingdoms` (resources per player), `heroDetails` (army, experience, level, primary skills, movement points), `monsters` (counts).
- Queries that join core and Heroes slices: `heroById(state, id)` returns `{ ...heroes[id], ...heroDetails[id] }`.
- `app/heroes/content.js` exposes them as `stateSlices`. Boot is already the one place that picks the content.

A hero is split over two slices keyed by the same id. To core, a hero is something with an owner standing on a tile; everything else about it is Heroes content. That keeps the engine reusable for another game.

### Consistency between facts

Two things can show a listener a state that live play and replay don't agree on.

- **A decision made of several facts.** Recruiting emits `fact.resources.spent`, `fact.town.creatures.recruited` and `fact.town.garrison.changed` one by one. A listener of the first sees the gold paid but the garrison unchanged.
- **A fact emitted from a listener.** If listener A of fact X emits fact Y, listener B of X, called after A, already sees Y applied. On replay Y comes only after every listener of X, so B sees a different state.

The rules:

- **Never read the state back after emitting.** A command handler reads the state once, works out every fact it leads to, and emits them. Today `hero-levels` emits `fact.hero.experience.gained` and then reads the new experience to find the levels gained; it works out the levels from the experience before and the amount instead.
- **What the emitter needs, it takes from its own decision.** A module that has just decided something knows the outcome: it can update its own screen state from the facts it built (an optimistic update) without waiting for them to come back, and check against the fact when it arrives.
- **A decision is emitted as one commit:** `emitAll([...facts])`, with `emit(fact)` a commit of one. The bus applies every fact of the commit, saves them, then notifies the listeners of each fact in order. Every listener sees the state after the whole commit, never a half-done recruit.
- **Facts emitted by a listener are heard at once,** before the listener goes on. Queuing them until the current commit's listeners were done was tried and dropped: whether an emit was queued then depended on who was on the stack, and the battle, which reads its state back after emitting, replayed a monster's opening shot over and over. So a listener of fact X may see a fact Y that an earlier listener of X emitted, which a replay would not show it; nothing relies on that today.

Open question: whether replay needs to know which facts were one commit. With each saved entry carrying a `tx` id, replay can apply and notify a whole commit at once, exactly as live play did. Without it, replay applies the facts of a commit one by one, and a listener during replay may see the half-done state. Views that render again at `ui.restore.completed` don't care; anything that decides during replay would. Start without `tx` and add it if a case shows up.

### What changes the state

- Only saved facts (`APP_PERSISTED_FACT_TYPES`) change the state. Otherwise a reload would rebuild a different state from the one the player had.
- The one exception is `fact.world.ready`, which is not saved but is emitted on every boot before replay. Applying it sets the state to `initialGameState(…)`.
- The rule goes by fact type, not by the `log` option: replay emits every saved fact with `log: false` too.
- So a live emit of a saved type that skips saving can't be allowed to change the state. Today there are two cases:
  - **`fact.income.collected`** isn't a saved type; the mines and town modules re-emit it on every replay of `fact.turn.ended`. Income is therefore added while applying `fact.turn.ended`, from the mines and towns each player owns. That needs the store to know mine and town incomes, from `definitions`. `fact.income.collected` can stay as a notice for the info box and the resource bar.
  - **The starting `fact.hero.movementPoints.changed`** is a saved type that `turn.module` emits unsaved on `fact.world.ready`. With the store, the starting movement points come from `initialGameState`, and that emit goes away.
- Applying a fact never fails and never decides anything. Validation stays in the command handlers.
- Each fact produces a new state object and reuses whatever it doesn't change: plain spreads, no library.

### Shape of the state

Everything per player, per hero and per town is keyed by id from the start, even with one player and one hero.

```js
{
  date: { turnNumber },
  activePlayer: 'red',
  players: {
    red: {
      resources: { gold, wood, ore, … },
      heroIds: [],            // hero list order
      townIds: [],            // town list order: the scenario's towns, then each captured one
      explored: Uint8Array    // width * height; 1 once this player has seen the tile
    }
  },
  heroes: {
    [id]: { owner, name, heroClass, tile, movementPoints: { value, max }, experience, level, primarySkills, army }
  },
  towns:    { [id]: { owner, buildings, builtToday, garrison, available } },
  mines:    { [id]: { owner } },
  monsters: { [id]: { count } },
  removedEntityIds: []
}
```

- This is the state as the queries show it. Stored, a hero is split over the core `heroes` slice (`owner`, `tile`) and the Heroes `heroDetails` slice (the rest), and `players[p].resources` lives in the Heroes `kingdoms` slice (see "Core and Heroes slices").
- The scenario stays the static description: terrain, entity types, tiles of fixed objects. `staticOccupancy` stays as it is. The store holds only what changes during play.
- A hero's name and class move from `game/data/hero.json` onto the hero entity in the scenario. `hero.json` goes away, or keeps only defaults.
- Movement points move from `turnState` onto each hero. The date stays in the state as `date.turnNumber`.

### Fog of war

- `players[p].explored` is a `Uint8Array` of `width * height`. 8 players on a 144×144 map take about 166 KB.
- **No new fact for fog.** Applying `fact.world.ready` reveals around each player's starting heroes and towns. Applying `fact.hero.moved` reveals around the hero's new tile for the hero's owner. Applying `fact.town.captured` reveals around the town for its new owner.
- The vision radius (5 by default, plus Scouting later) is a rule in `game/state/fog.js`. Fog is rebuilt on replay, so a rule change also applies to old saved sessions.
- A tile is either unexplored or explored; there is no "seen before but out of sight now" state. An explored tile stays revealed and shows what is on it now, so `explored` is all the screen needs.
- When explored changes, the array is copied and a new one stored: about 20 KB per step on a 144×144 map. No other module ever sees it change in place.
- **`deepFreeze` must skip typed arrays.** `Object.freeze` throws on a non-empty `Uint8Array`, so `engine/deep-freeze.js` has to leave `ArrayBuffer` views alone. Typed arrays are then read-only by convention.

### Whose view the screen shows

- `state.activePlayer` is whose turn it is. It is always `'red'` until the player system (8.1).
- Views must not read `activePlayer` directly for fog and "own" checks. They use a query `viewingPlayer(state)`: whose screen this is. For now it returns `activePlayer`. In hot-seat it is the active human player. While an AI player moves, it stays the last human player, so the human never sees the AI's fog. Keeping these as two names from the start keeps views from having to change later.
- Everything that today compares against `PLAYER_COLOR` becomes a check against the viewing player (for display) or against the hero's or town's owner (for rules).

### What stays in modules

- Screen state: the selected hero or town, which screen or window is open, the info box view and its timers, hover, long press, drag-and-drop.
- Animation and timing: `isMoving`, fades, the walk itself.
- The battle. It is self-contained while it lasts and already replays from its own facts. It can become a `battle` slice later if that's needed.
- View models such as `ui.town.updated` stay as `ui.*` events built by their modules. The store holds game data, never what a screen looks like.

### Replay

- First, replay stays as it is: every saved fact goes through the bus to the listeners, and now also through the store.
- Later, once every view renders from the store, replay can apply all facts silently (`bus.silent`), then emit `ui.restore.completed` and let views render once. That is faster on long sessions and removes the restore special cases in views. It is not part of the first steps.

## Guard rails

- Architecture test (`tests/architecture/`): `game/state/` imports nothing from `app/`.
- Architecture test: every fact type `applyFact` handles is in `APP_PERSISTED_FACT_TYPES`, plus `fact.world.ready`.
- Architecture test: `game/state/` imports nothing from `game/heroes/`, and core modules use only core queries.
- No live emit of a saved fact type passes `log: false`. Only `restore-session.js` does that, when replaying.
- Architecture test, added as each copy is removed: no `app/` module imports `createOwnedTowns`, `createTreasury`, `createTownBuildings` or `findHero`.
- Behavior tests are the safety net for each step. They drive the UI and check the screen, so they should pass unchanged through every step. A behavior test that has to change means the step changed what the player sees.
- Unit tests only where a behavior test can't reach: the fog reveal rule (radius at map edges, several heroes), applying facts from old sessions (see below), and the bus calling `beforeDispatch` while silent.
- Each step follows the `writing-tests` skill: scenarios first, approved, then tests, then code.

## Order of work

1. **Facts say whose they are.** Add `heroId` to `fact.hero.experience.gained`, `fact.hero.leveledUp`, `fact.hero.movementPoints.changed` and `ui.hero.selected`. Add `owner` to `fact.town.captured` and `fact.mine.captured`, and `player` to `fact.resources.spent` and `fact.income.collected`. The commands that lead to them carry the same ids.
2. **The store, with towns.** Add `engine/store.js`, the bus `beforeDispatch` option and commits (`emitAll`), the runtime `state` handle, `combineSlices` with the core slices in `game/state/`, and the `towns` slice in `game/heroes/state/` (owner, town order). Replace the 7 `createOwnedTowns()` copies with reads. This proves the pattern on the area with the most copies.
3. **Heroes.** Add `heroes[id]` with tile, army, experience, level, primary skills and movement points. Move the name and class onto the scenario hero, and movement points out of `turnState`. Replace the 12 single `hero` copies with reads of `heroById(state, selectedHeroId)`. This is the largest step, and the one that makes several heroes possible.
4. **The rest of the copies:** resources (`players[p].resources`, with income applied on `fact.turn.ended`), buildings and garrisons, mines, removed entities and monster counts (`map-objects.js`).
5. **Fog of war (7.1)** as `players[p].explored`, read through `viewingPlayer`. The first feature built only on the store.
6. **Multiple heroes (4.5).** By now this is mostly UI work: the hero list, Next Hero cycling, selecting a hero, the exchange cursor.
7. **Player system (8.1), later.** More entries in `players`, turn order, `activePlayer` changing and `viewingPlayer` following it.

Steps 1 to 4 are done (see "How it was built" below). Within a step, the old and new ways live side by side for one area at a time only.

## Open questions

- **Old saved sessions.** Facts saved before step 1 have no `heroId` or `owner`. Proposed: when applying a fact, fill in a missing `heroId` with the scenario's only hero and a missing owner or player with `'red'`. These are true for every session saved so far, and it costs a few lines. The other choice is to bump `EVENT_SCHEMA_VERSION` and start such sessions over.
- **Selected hero after a reload.** Today selection is a `ui.*` event and not saved: after a reload the hero is selected. With several heroes, and in hot-seat where each player comes back to their own selection, it could become a saved fact held in `players[p].selectedHeroId`. Proposed: keep it unsaved until multiple heroes (step 6), and decide there. Until then each view takes `selectedHeroId` from `ui.hero.selected { heroId }`.
- **Where `selectedHeroId` lives meanwhile.** Several views need it to know which hero to read. Each keeping it from `ui.hero.selected` is a small copy of screen state. That is accepted, since screen state stays in modules. Revisit if it spreads.

## How it was built

Where steps 1 to 4 differ from the plan above:

- **Movement points are core.** They sit on the core `heroes` slice with `owner` and `tile`, since the core `movement` and `selection` modules need them and may read only core queries. The starting value comes from `config.maxMovementPoints`, so the turn module no longer emits it unsaved on `fact.world.ready`.
- **Slice handlers get the world.** The third argument is `{ previousState, scenario, definitions, config }`, since income and creature growth need the definitions.
- **`fact.income.collected` is gone.** Nothing listened to it once the resource bar read the store; views render again on `fact.turn.ended`.
- **`hero.json` keeps the defaults.** The scenario's hero now has its own `name`, `heroClass` and `owner`; a hero without them takes `hero.json`'s, which is what behavior tests rely on.
- **Interaction facts name their hero.** `fact.interaction.reached`, `fact.interactions.queued` and the outcome facts (`fact.battle.started`, `fact.resource.collected`, `fact.town.visited`, `fact.treasureChest.opened`) carry `heroId`, so a capture or a pickup goes to the hero's owner.
- **The store holds only what is shared or per entity.** Data one module uses for itself stays in that module.
- **Views keep `selectedHeroId`** as screen state: the viewing player's first hero at `fact.world.ready`, then `ui.hero.selected { heroId }`.
- **Commits:** ending the day (`fact.turn.ended` with every hero's movement points), recruiting, building and the garrison exchange each go out with `emitAll`.

