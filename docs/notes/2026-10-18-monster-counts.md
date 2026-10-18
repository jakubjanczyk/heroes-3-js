# Monster counts (2026-10-18)

Roadmap 5.2 (first part), which also finishes the monster items in 2.1 and 2.5.

## Data

- Every monster in a scenario has a `count`, a positive whole number: `{ "kind": "MONSTER", "type": "SKELETON", "count": 12, ... }`.
- `loadGame` rejects a scenario whose monster has no count, or a count that isn't a positive whole number (`0`, `-3`, `2.5`, `"12"`).
- The demo scenario's skeletons have counts across all size bands, so each word can be seen in the game.

## Behaviour

As in Heroes 3, the player never sees the exact count, only a word for the size of the group, with the plural name:

| Count | Text |
|-------|------|
| 1-4 | Few Skeletons |
| 5-9 | Several Skeletons |
| 10-19 | Pack of Skeletons |
| 20-49 | Lots of Skeletons |
| 50-99 | Horde of Skeletons |
| 100-249 | Throng of Skeletons |
| 250-499 | Swarm of Skeletons |
| 500-999 | Zounds of Skeletons |
| 1000+ | Legion of Skeletons |

- The rollover bar and the right-click popup show it. The popup's picture is still labelled with the plural name ("Skeletons").
- The defeat message stays "Skeleton defeated" (2.4).

## How it works

- `game/heroes/monster-count.js` turns a count and a plural name into the text.
- `game/heroes/rollover-text.js` uses it for monsters; the popup reuses the rollover text.

## Tests

- `tests/behavior/behavior.rollover-bar.test.js`: both ends of every band.
- `tests/behavior/behavior.info-popup.test.js`: one example, mouse and touch.
- `game/load.test.js`: rejected counts. `game/heroes/demo-scenario.test.js`: the real demo scenario passes the load checks.

## Not yet

- Monsters fleeing, joining or fighting, and weekly growth (rest of 5.2).
