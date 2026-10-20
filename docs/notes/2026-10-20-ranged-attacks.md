# Ranged attacks (2026-10-20)

Roadmap 5.6: shooters shoot. Archers, Marksmen, Monks and Zealots had their shots in the creature data but walked up and fought hand to hand. Follows `docs/notes/2026-10-20-battle-attacks.md` and `docs/notes/2026-10-20-wait-defend-auto-combat.md`.

## How Heroes 3 does it

Checked against VCMI where marked (`lib/constants/NumericConstants.h`, `lib/battle/CBattleInfoCallback.cpp`, `server/battles/BattleActionProcessor.cpp`, `client/gui/CursorHandler.h`); the rest is from the game as players know it and the Might and Magic wiki.

- **Shooting.** A shooter with shots left and no living enemy next to it shoots instead of moving: clicking any enemy stack, wherever it stands, shoots it (VCMI `battleCanShoot`). With an enemy next to it, or no shots left, it can only fight hand to hand, as other creatures do.
- **No retaliation.** A shot is not struck back at. (Some creatures of other factions do strike back at shooters; none of ours.)
- **Shots.** 12 a battle, 24 once upgraded. Every shot uses one. Marksmen shoot twice: the second shot comes while the target still lives and they have a shot left (VCMI `makeRangedAttack`).
- **Distance penalty.** A target more than 10 hexes away, counted from the shooter's hex to the nearest hex of the target, takes half damage (VCMI `BATTLE_SHOOTING_PENALTY_DISTANCE`, `battleHasDistancePenalty`).
- **Melee penalty.** A shooter that fights hand to hand does half damage, its retaliation included. Zealots have no melee penalty. Not checked against VCMI's source, which we could not fetch.
- **Rounding.** Both penalties halve the damage after attack and defense, then it is rounded down and is at least 1.
- **Walls.** In Heroes 3 only castle walls get in the way of a shot; there is no line of fire on an open battlefield.
- **Texts.** The log reads as for a melee attack ("The Archers do 10 damage. One Pikeman perishes."). The status bar over a target reads "Shoot Pikemen (12 shots left, damage 21-31)"; the wording is from memory, not the game's text files. The cursor is an arrow, and a broken arrow when the distance penalty applies (VCMI `Cursor::Combat::SHOOT` and `SHOOT_PENALTY`).

## What we do

- `game/heroes/battle.js` gives each stack its shots, how many it fires a turn and whether it has the melee penalty. `canShoot` says whether the stack can shoot now; `getShotTargets` lists every enemy it can shoot with the damage range and whether the distance penalty applies. A stack that can shoot has no melee targets, so a click on an enemy always shoots. `planStackShot` rolls the shots and `shootStack` applies them, takes the shots off and ends the turn.
- `game/heroes/battle-damage.js` halves the damage when told to: `shotSequence` for the distance penalty, `strikeSequence` for a shooter's melee strikes and retaliations.
- Clicking an enemy the shooter can shoot sends `command.battle.stackShoot.requested`. The battle module saves `fact.battle.stack.shot` with every shot's damage, so a reload replays the same damage and the same shots left.
- The combat AI shoots the nearest enemy stack (fewest hexes to any of its hexes, the earlier army slot on a tie) whenever the stack can shoot, else plays as before. That covers a monster's shooters and the hero's under Auto combat.
- `scripts/build-cursors.mjs` draws the arrow and the broken arrow, snapped in two with the head half at a right angle to the tail (`battle-shoot`, `battle-shoot-penalty`); the hotspot is the middle.

## Testing

- Behavior tests: `tests/behavior/behavior.battle-ranged.test.js`, plus the cursors, the monster's shooters and Auto combat in their own battle test files.
- Running a shooter out of shots takes a dozen rounds with the enemy kept away from it, which the battlefield cannot set up yet, so that is checked in `game/heroes/battle.test.js`.

## Not yet

- Shots left shown in the creature's info window (no such window yet), the Ammo Cart.
- Castle walls in the line of fire (siege, roadmap 5.10).
- A shooter AI that keeps away from enemies or goes for their shooters (roadmap 5.7b, "Smarter combat AI").
- Attack animations: the arrow flying.
