# Visitable objects from their data (2026-10-29)

The bonus objects (7.6, 7.7) and resource generators (7.5) used to have four modules, one per family. Each module had its own message table and its own flow, and the footprints sat in code. Now one module runs them all from the object's data in `game/data/bonus-objects.json` and `game/data/resource-generators.json`. An object made of the parts below needs no code.

This replaces the "how it's built" parts of `2026-10-27-permanent-bonus-objects.md`, `2026-10-27-resource-generators.md` and `2026-10-28-stat-boosting-objects.md`. Their game rules still hold.

## An object's data

```json
"TREE_OF_KNOWLEDGE": {
  "name": "Tree of Knowledge",
  "visits": "oncePerHero",
  "rolls": { "price": { "per": "game", "as": "resources", "weighted": [{ "chance": 34, "value": {} }, …] } },
  "cost": "{price}",
  "asksFirst": true,
  "rewards": [{ "type": "level" }],
  "messages": { "gives": "…", "offer": "… for a mere {price}…", "tooPoor": "… \"I need {price}.\"…", "visited": "…" }
}
```

| Field | What it says |
|---|---|
| `name` | The name on the map, in the status bar and the popup. |
| `description` | The popup's line on what it gives. Without one, each reward describes itself ("+1 Attack", "+1 level for 2000 gold"); an object with `choices` and no description has no line. |
| `footprint` | The tiles it blocks besides the entrance, as offsets from it (`y` negative upwards). Default: none. |
| `picture` | Resource generators only: `{ left, right, rows }` around the entrance when the picture covers more than the blocked tiles (the Windmill). |
| `visits` | How often a hero can take the rewards: `oncePerHero`, `whileBonusLasts` (not while a bonus from an object of the same type lasts: until the next battle, or the week for the Stables), `oncePerWeek` (once a week, for whichever hero comes first) or `always`. |
| `requires` | Checks that turn the hero away, in order, each with the key of its `message`: `minimumHeroLevel` (`level`, `withDiplomacy`), `lacksSecondarySkill` (`skill`), `hasRoomForSecondarySkill`. |
| `cost` | Resources paid for the rewards. A hero who can't pay gets `tooPoor`. |
| `choices` | Lists of rewards the player picks one of, after the `offer` message. With a cost, the player can also leave. |
| `asksFirst` | With a cost, ask yes or no first (the `offer` message), showing the rewards. A cost that comes out as nothing gives straight away. |
| `rewards` | What the hero gets. See below. |
| `rolls` | Values drawn per object. `per`: `game` (when the game starts, unless the scenario's entity sets a value of that name, such as `"skill"` on a Witch Hut) or `week` (on the week's first visit that gives the rewards). Draws from `weighted` (`chance` in percent), `anyOf`, or every secondary skill (`"as": "secondarySkill"`, with `except`). `as` also says how `{name}` reads in a message: `resources` ("2000 gold"), `secondarySkill` (its name) or `number`. |
| `statusText` | Shown after the name in place of "(Visited)", once a hero of the player has been inside ("({skill})" for the Witch Hut). |
| `messages` | `gives`, `visited`, `offer`, `tooPoor` and the `requires` keys. `{name}` is a rolled value. `<key>.<reward type>` is used instead of `<key>` when that reward is given: the Stables' `gives.upgradeCreatures`. |

Anywhere in `cost`, `rewards` or `requires`, a value written as `"{name}"` is the value rolled under that name.

### Rewards

| Type | Fields | Gives |
|---|---|---|
| `experience` | `amount` | Experience. |
| `level` | | The experience to reach the next level. |
| `primarySkills` | `attack`, `defense`, `power`, `knowledge` | Primary skills, for good. |
| `secondarySkill` | `skill`, `level` | A secondary skill. |
| `battleBonus` | `morale`, `luck`, or `byDay: [{ days, morale, luck }]` | Morale and luck until the next battle. |
| `movementPoints` | `amount` | Movement points for today, above the maximum if need be. |
| `endsMovement` | | Ends the hero's day. |
| `weekMovementPoints` | `amount` | Movement points now and on each new day until the week ends. |
| `upgradeCreatures` | `upgrades: { CAVALIER: "CHAMPION" }` | Upgrades those creatures in the army; nothing when there are none. |
| `resources` | `resources` (with `firstWeek`), `oneOf: [resources, …]`, or `anyOf: [type, …]` with `amount: { min, max }` | Resources to the hero's player. |

A reward with `"everyVisit": true` is also given on a visit turned away because the hero has used the object (the Stables upgrade Cavaliers on every visit).

`game/heroes/visitable-objects/check-definition.test.js` checks every object's data: known visit limits, reward and requirement types, the messages its visit can show, and a roll for each `{name}`.

## How it's built

- `game/heroes/visitable-objects/definitions.js`: finds an object's data by its entity kind, fills in rolled values and rolls them.
- `game/heroes/visitable-objects/rewards.js`: per reward type, what the hero gains on this visit and the popup's line on it.
- `game/heroes/visitable-objects/visits.js`: decides a visit (`resolveVisit`): turned away with a message, a choice, a yes/no question, or the rewards given. It also says what the status bar and popup add.
- `app/heroes/modules/visitable-objects.module.js`: rolls the per-game values on `command.game.setup.requested`, takes `command.mapObject.visit.requested`, and turns each gain into its fact. The pictures under a message come from `app/heroes/presentation/visit-rewards.js`.
- State: the `visitableObjects` slice keeps each object's rolled values, the players whose heroes have been inside and whether it was visited this week. A hero's `visitedBonusObjects`, `battleBonuses` and `weekBonus` say what that hero has used.
- Facts: `fact.mapObject.visited` (every visit), `fact.mapObject.values.rolled`, `fact.hero.bonusObject.visited` (`oncePerHero` objects), `fact.hero.primarySkills.gained`, `fact.resources.gained`, and the existing hero facts for skills, morale and luck, movement points and the army. A game saved before this change doesn't replay correctly: start a new one with Reset.

## What still needs code

- A reward, requirement, visit limit or roll of a new kind: a spell from a Shrine, an artifact, creatures that join. Add it once to `rewards.js` (and its events in the module, and its picture in `visit-rewards.js`), or to `visits.js`. Every object that uses it after that is data only.
- An object with more than one entrance tile (the Oasis, the Watering Hole): footprints assume a single entrance.
- A new entity kind: it needs its entity behaviour, its map presentation and an entry in the kinds `definitions.js` knows.
