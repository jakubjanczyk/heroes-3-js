# Battle attacks (2026-10-20)

Roadmap 5.6, melee first: the player's stacks attack the monster, it strikes back, creatures die and the battle is won when the monster has none left. Follows `docs/notes/2026-10-20-battle-turns-and-movement.md`.

## How Heroes 3 does it

Checked against VCMI (`scripts/damage/damageCalculator.lua`, `lib/battle/BattleInfo.cpp`, `server/battles/BattleActionProcessor.cpp`, `config/gameConfig.json`, `config/creatures/castle.json`) and the Might and Magic wiki's Damage page.

- **Attacking.** The player clicks an enemy stack. Of the hexes next to it the stack can attack from, the one nearest the mouse is picked (VCMI `BattleFieldController::selectNearestDirection`; on a tie the upper side), so a side off the battlefield, taken or out of reach gives way to the nearest one that is not. The stack walks or flies there first, or attacks where it stands if it is already there.
- **Base damage.** Up to 10 creatures each roll their damage and the rolls add up. A bigger stack rolls 10 times and the sum is multiplied by count / 10, rounded down.
- **Attack and defense.** A stack's Attack is its creature's plus its hero's Attack skill, and the same for Defense; a monster has no hero. Attack above defense adds 5% a point, up to +300% (60 points); defense above attack takes 2.5% a point, up to -70% (28 points). Further bonuses (luck, Offense, jousting, hatred) add to the +%, and further reductions (Armorer, Shield) each multiply; none of them exist yet.
- **Rounding.** The damage is rounded down and is at least 1.
- **Casualties.** The damage goes to the top creature's health left first, then kills one creature per full health; what is left over wounds the next creature, which stays wounded.
- **Retaliation.** A defender that lives strikes back once a round, with its own damage roll; Griffins twice a round, Royal Griffins every time. Every stack can strike back again when a new round starts. A stack that dies does not.
- **Strikes twice.** Crusaders attack, take the retaliation, and attack again if both still live.
- **Corpses.** A stack with no creatures left lies on its hex: it gets no turn, cannot be attacked, and other stacks walk over it and stand on it.
- **Experience.** The winner's hero earns the health of every enemy creature killed.
- **Texts.** The log reads "The Angels do 175 damage. 17 Pikemen perish." ("The Crusader does 9 damage.", "One Pikeman perishes."), and the status bar over an enemy "Attack Pikemen (damage 18-36)". The wording is from memory and VCMI's comments, not from the game's `GENRLTXT.TXT`; VCMI writes its own status text.

VCMI rolls the damage in the stack's whole range after the modifiers, averaging up to 10 rolls; the wiki rolls first and applies the modifiers after. They differ by a point of rounding at most; we follow the wiki.

## What we do

- `game/heroes/battle-damage.js` holds the damage rules: the roll, attack against defense (kept in thousandths so the rounding is exact), casualties, and the strike sequence of one attack.
- `game/heroes/battle.js` gives every stack its attack, defense, damage, health, the top creature's health and the retaliations left this round. Only living stacks take turns and block hexes. It lists the enemy stacks the active stack can attack, with the hexes it can attack each from and the damage range, and applies an attack.
- Clicking an enemy asks the battle module to attack (`command.battle.stackAttack.requested`, with the target and the hex to attack from). It rolls the strikes (`config.random`, `Math.random` by default) and saves one `fact.battle.stack.attacked` with the way there and every strike's damage, so a reload replays the same damage. The stack walks there as for a move, then the counts and the log change.
- When the monster has no creatures left the battle ends as Auto combat ends it, and the module asks for the experience (`command.hero.experience.gain.requested`); the level-up popup shows over the map. Auto combat earns the whole monster's health.
- `battle-view.module.js` picks the hex to attack from by where the mouse is in the target hex's box. A finger cannot point at a side before it taps (the game has no touch), so on a touch screen a stack already next to the target attacks from where it stands. It draws a dead stack as a dark creature lying on its hex with no count (`Dead Crusader` for screen readers), and shows the log lines with the newest at the bottom.

## Not yet

- The hero's army keeps the creatures it lost only for the battle: back on the map it is whole again.
- If every hero stack died the battle waited, as the monster had no AI, until `docs/notes/2026-10-20-combat-ai.md`.
- A monster was one stack, so a defender dying always ended the battle, until it split into several (`docs/notes/2026-10-20-monster-stacks-double-wide-and-battle-cursors.md`, which also brought the sword cursor).
- Ranged attacks, luck, jousting, hatred, attack and death animations.
