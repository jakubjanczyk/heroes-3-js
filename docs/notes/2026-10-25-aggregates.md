# Aggregates (2026-10-25)

Who may change each part of the game's data, and where the rules that guard it live. A proposal to discuss, meant to go together with the game state store (`docs/notes/2026-10-25-game-state-store.md`): the store fixes reading the data, this fixes changing it.

## The problem

Hero, town and player are concepts in the code, not units with an owner.

- **The hero is changed by six modules:** `movement` (tile), `turn` (movement points), `hero-levels` (experience, level, primary skills), `hero-army`, `town` (the garrison exchange) and `battle` (army after a battle, removal when lost). `fact.hero.army.changed` alone comes from three of them (`hero-army`, `town`, `battle`).
- **Its rules are checked wherever a change happens.** Seven army slots, or never leaving the hero without an army, are each checked by whichever module makes the change.
- **The player doesn't exist in code.** It is `PLAYER_COLOR = 'red'` in `game/heroes/town-ownership.js`. Resources are spent by `town`, added by interaction outcomes, and paid as income by `mines` and `town`.
- **Decisions live inside module closures.** `build()` and `recruit()` in `town.module.js` read the module's own copies of the state. Nothing outside the module can ask "could this town build this?", which the AI (8.3, 8.4) will need to.
- **Modules grow into everything at once.** `town.module.js` (581 lines) holds the Town's rules, its decisions, the `ui.town.updated` view model, map clicks and map blockers.

These are also why every module keeps its own copy of the data: there is no one place each part of it belongs to.

## The aggregates

An aggregate is a piece of the state with its own id, changed only by its own decisions, which check its rules.

| Aggregate | Id | Holds | Decides |
|---|---|---|---|
| **Hero** | `heroId` | owner, tile, movement points, experience, level, primary skills, army | moving and spending movement points, gaining experience and levels, rearranging and splitting the army |
| **Town** | `townId` | owner, buildings, built today, garrison, creatures available | building, recruiting, moving garrison stacks, capture |
| **Kingdom** | player colour | resources, explored tiles | nothing of its own: its facts come from other decisions (spending, income, pickups) |
| **Calendar** | (one) | date, active player | ending the turn and starting a new day |
| **Battle** | battle (one at a time) | stacks, turn order, auto combat | battle commands; stays its own bounded context, as now |

Map objects (monster counts, removed entities) have no rules of their own to guard; they stay a slice changed by the facts above (a battle's end, a pickup).

## The rules

### Every saved fact belongs to one aggregate

- It is named after it and carries its id: `fact.hero.*` has `heroId`, `fact.town.*` has `townId`, resource facts have `player`.
- Step 1 of the store plan (facts say whose they are) already does most of this.
- A few facts need renaming or splitting to say which aggregate they change: `fact.resources.spent` is the Kingdom's, `fact.monster.count.changed` the map objects'.

### Each aggregate is one folder

`game/heroes/town/`, `game/heroes/hero/`, `game/heroes/kingdom/`, `game/heroes/calendar/`; the battle files move to `game/heroes/battle/`.

- `state.js`: the store slice, `initial` and `apply`.
- `decide.js`: pure functions from the state and a command to the facts, or a reason it is refused:

  ```js
  decideRecruit(state, { townId, tier, creature, count, player })
  // → { facts: [...] } or { rejected: 'noRoomInGarrison' }
  ```

- `queries.js`: what other code reads from it.
- The aggregate's rules (one building a day, one Capitol per player, seven army slots, the cost of a building) live only in `decide.js`. The rule helpers that exist today (`army-exchange.js`, `town-buildings.js`, `creature-recruitment.js`, `hero-experience.js`, …) move into the folder they belong to and are called from there.

A decision reads the state once and returns every fact it leads to, so it never reads the state back after emitting (see "Consistency between facts" in the store plan).

### One module per aggregate handles its commands

- The module connects the bus to `decide`: it takes the command, reads the state, calls `decide`, emits the facts as one commit, or shows the refusal (`ui.town.message.opened`).
- `hero-army`, `hero-levels` and the movement points half of `turn` become one `hero` module. `turn` keeps the calendar. `town` keeps the town's commands.
- The view model (`ui.town.updated`) and screen state (open town, selected town, map blockers) can move out of `town.module.js` into a view module that reads the store; that is not required by this proposal but becomes easy.
- The AI, later, calls the same `decide` functions to find out what it may do, without the bus or the DOM.

### A decision across aggregates is one commit

Some decisions change two aggregates at once:

| Decision | Facts |
|---|---|
| Recruiting | Town: creatures recruited, garrison changed. Kingdom: resources spent. |
| Building | Town: building built. Kingdom: resources spent. |
| Garrison exchange | Town: garrison changed. Hero: army changed. |
| Battle won | Hero: army changed, experience gained (and levels). Map objects: monster removed. |
| New day | Calendar: turn ended. Every hero: movement points. Every kingdom: income. Every town: creature growth on a new week. |

- The decision lives with the aggregate the command is about (recruiting with the Town) and may read the others through the state (the Kingdom's resources).
- Its facts go out as one commit, so no listener sees half of it.
- With one process and one store there is no need for anything heavier (sagas, eventual consistency between aggregates).

## How it fits the store plan

Not a new phase: each area of the store plan also gets its decisions pulled out.

- Step 2 (towns): the `towns` slice, and `build()`, `recruit()` and the garrison moves into `game/heroes/town/decide.js`.
- Step 3 (heroes): the `heroDetails` slice, and the `hero` module replacing `hero-army`, `hero-levels` and the movement points half of `turn`.
- Step 4 (the rest): the `kingdoms` slice; spending and income become Kingdom facts.

Behavior tests stay the safety net: the player sees nothing change. The pure `decide` functions are where a unit test may earn its place, for rules a player can't reach yet (several players, one Capitol per player across towns).

## Open questions

- **Movement.** Moving the hero is a long process (one `fact.hero.moved` per step, with delays) run by `movement.module` and `movement-system.js`, a core module. Does deciding the move (the route, what each step costs, where the hero stops) belong to the Hero aggregate in Heroes content, with the walk itself staying in core? Or does core keep "a hero walks a route" and Heroes only supply the costs, as `movementRules` does now?
- **Interaction outcomes.** A pickup or a chest is decided by the entity's behavior and turned into facts by `app/heroes/interaction-outcomes.js`, next to the modal it shows. Do those become decisions of the Hero (a pickup) and Kingdom (the resources), or stay as they are?
- **Refusals.** Most refused commands do nothing visible today. Should `decide` always return a reason, even when the screen shows nothing yet?
