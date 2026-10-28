# Morale and luck in battle (2026-10-28)

Roadmap 4.9 and 5.6: what morale and luck do in battle. Follows `docs/notes/2026-10-28-morale-and-luck.md`, which works out each hero's values.

## How Heroes 3 does it

Checked against the Heroes 3 wiki (raw source of the Morale, Luck, Combat, Damage and Undead pages) and against an open-source engine's rules and battle code.

- **A stack's morale and luck** are its army's, as the battle starts. Undead (Skeletons) always have morale 0.
- **Good morale.** After a stack moves, attacks or shoots, and once its target has struck back, it may act again straight away. The chance is 1, 2 or 3 in 24 at morale +1, +2, +3. Not after Defend, not when the stack died or the battle is over, and once a round: a stack that acted again cannot do so a second time that round.
- **Bad morale.** As a stack's turn starts it may freeze and lose the turn. The chance is 2, 4 or 6 in 24 at morale -1, -2, -3. It is rolled once a turn: not when a stack that waited gets its turn back, nor on an extra turn. A frozen stack still strikes back.
- **Luck.** Every strike may be lucky: the attack, the retaliation, a Crusader's second strike, each shot. The chance is 1, 2 or 3 in 24 at luck +1, +2, +3. A lucky strike adds +100% to the damage bonuses, next to the attack bonus and outside its +300% cap: it doubles the base damage, not the final damage (doubling the final damage is Horn of the Abyss).
- **Monsters.** A monster's army has morale as a hero's does: one alignment +1, undead in it -1, Angels +1 (checked against the open-source engine only; the wiki does not say). A monster has no hero, so no luck.
- **A stack that waited** may still get good morale when it acts at the end of the round (the wiki's Combat page: "Creatures acting during third phase can still get morale"). The open-source engine does not allow it; we follow the wiki, as agreed.

The game's battle log texts are not online. Ours are our own wording:
- "High morale enables the Pikemen to attack again."
- "Low morale causes the Pikemen to freeze in panic."
- "Good luck shines on the Pikemen." (before the strike's damage line)

## What we do

- `game/heroes/battle.js` gives each stack its morale and luck when the battle is created, keeps the stacks whose morale took effect this round, and the one acting again. It works out the chances (`getGoodMoraleChance`, `getBadMoraleChance`), gives the extra turn (`finishAction`) and freezes a stack (`freezeStack`).
- `game/heroes/battle-damage.js` rolls luck for each strike and adds the lucky bonus; a strike is saved with `lucky: true`.
- `battle.module.js` rolls good morale when the stack acts and saves the result with the move, attack or shot (`goodMorale: true`), so a reload gives the same extra turn. Bad morale is rolled as a turn starts and saved as `fact.battle.stack.froze`. Monster stacks and Auto combat follow the same rules.
- The rolls come from `config.moraleRandom` and `config.luckRandom` (`Math.random` by default); behavior tests set them so that neither takes effect unless a test says otherwise.

## Not yet

- Morale and luck animations and sounds.
- The wait phase of its own for a stack that waits on its extra turn: it waits with the others.
- A bad morale roll that let the stack act is not saved: after a reload the stack's turn is rolled for again.
- The other morale and luck sources listed in the earlier note (artifacts, spells, map objects, the Bone Dragon and Devils, magical terrain).
