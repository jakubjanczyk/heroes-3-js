# Event naming (2026-10-25)

A longer-term clean-up of event names and fact payloads, to discuss. Not needed for the game state store (`docs/notes/2026-10-25-game-state-store.md`), but the store makes the problem clearer: only saved facts change the state, so the saved facts are the domain events and the rest are something else.

## The problem

`fact.*` covers three different things today.

- **Domain events, saved and changing the game:** `fact.hero.moved`, `fact.town.building.built`, `fact.resources.spent`, …
- **Screen state, saved so a reload shows the same screen, but not part of the game:** `fact.preview.target.selected`, `fact.preview.cleared`, `fact.town.opened`, `fact.town.left`, `fact.battle.autoCombat.changed`, `fact.interactions.queued`.
- **Notices, not saved:** `fact.move.started`, `fact.move.finished`, `fact.route.planned`, `fact.interaction.reached`, `fact.world.ready`, `fact.income.collected`.

Which one an event is shows only in `APP_PERSISTED_FACT_TYPES` in `app/events.js`. Roadmap 9.4 already notes it for `fact.route.planned`.

Fact payloads aren't consistent either:

- Some carry the whole new value: `fact.hero.army.changed` and `fact.town.garrison.changed` send the full army.
- Some carry the change: `fact.town.creatures.recruited` sends the count bought, `fact.resources.spent` the amounts.

## Proposal

### Four prefixes

| Prefix | Saved | Changes the store | Examples |
|---|---|---|---|
| `command.*` | no | no | `command.town.build.requested` |
| `fact.*` | yes | yes | `fact.hero.moved`, `fact.town.building.built` |
| `session.*` | yes | no | `session.town.opened`, `session.preview.target.selected` |
| `notice.*` (or `ui.*`) | no | no | `notice.move.started`, `notice.route.planned` |

- The prefix alone says whether an event is saved, so `APP_PERSISTED_FACT_TYPES` can be checked against it (or replaced by it).
- `fact.world.ready` stays the one exception: not saved, but it sets the store's starting state. It could become `notice.world.ready` with the store reset done by boot instead.
- Whether `notice.*` merges into `ui.*` depends on whether anything but views listens to them; `fact.move.finished` drives `interaction`, a domain module, so a separate prefix reads better.

### One convention for payloads

Pick per kind of fact and write it down, since the store's apply functions depend on it:

- **The whole new value** for state a player rearranges freely (an army, a garrison). The apply function just stores it, replay can't drift, and the decision already has the result.
- **The change** for amounts that add up from several sources (resources, creatures available, experience). The apply function adds it, and the fact keeps the reason (`reason: 'town.recruit'`).

Whatever the choice, every saved fact names its aggregate's id (see `docs/notes/2026-10-25-aggregates.md`).

## When

After the store and aggregates, or alongside roadmap 9.4 (quieter event bus). Renaming saved types breaks saved sessions, which is fine while there are none worth keeping; later it would need the event log's `v` to read old names.
