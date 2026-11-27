# Smarter combat AI (2026-11-27)

Roadmap 5.7b, "Smarter combat AI". Follows `docs/notes/2026-10-20-combat-ai.md` (the first, simple AI: the nearest stack) and `docs/notes/2026-10-20-wait-defend-auto-combat.md`. The same AI plays the monsters, auto combat and the battles computer heroes fight unseen (8.4.5), so every part changes all three.

## Parts

1. **5.7b.1 Targets by worth.** Among the stacks a stack can shoot or attack this turn, it picks the one whose losses are worth the most, less what it would lose to the retaliation. With none in reach it still walks toward the nearest.
2. **5.7b.2 Wait and Defend.** A stack that can't attack this turn waits, or stays back, rather than walk into an enemy's first strike; it defends when it has nothing better to do.
3. **5.7b.3 Positioning.** Shooters step away from an enemy next to them instead of fighting hand to hand at half damage, and walkers go for the enemy's shooters and stand where they block them; stacks guard their own shooters.
4. **5.7b.4 A computer hero casts damage spells**, the spell and the target whose losses are worth the most, once a round.
5. **5.7b.5 A computer hero casts its other spells**: helpful spells on its own stacks, harmful ones on the enemy's.
6. **5.7b.6 A computer hero retreats and surrenders** when the battle is lost, and accepts or refuses the player's surrender.
7. **5.7b.7 Spells on the adventure map side**: a computer hero learning spells in a Mage Guild, and weighing the Mage Guild, the School of Magic, Knowledge and spell points (left out in 8.4.3, 8.4.7b and 8.4.8 until computer heroes cast).

## The game's rules

The original game's combat AI is not documented: the wiki has no page on it, and the reference engine's forum posts on it can't be reached from here. The rules below follow (agreed) the reference engine's battle AI (its attack evaluation: the worth of the damage dealt less the worth of the damage taken back), checked in its source. We already weigh an arrow tower's or a Ballista's target the same way (`game/heroes/self-aimed-shots.js`, `docs/notes/2026-11-26-war-machines.md`).

## 5.7b.1 Targets by worth

- **Which targets.** A stack that can shoot weighs every enemy stack it can shoot. A stack that can't shoot weighs every enemy stack it can attack this turn, from every hex next to it in reach. The hex matters only to a stack with a breath: a Dragon attacks from where its breath also hits a second enemy stack when it can (agreed).
- **What an attack is worth.** The attack is planned as it would be made, twice: with every damage roll at its lowest and at its highest, no luck and no ability triggered by chance (Blinding, Curse, Death Blow); its worth is the average of the two (as the arrow towers average the lowest and highest damage). Each strike in it costs the stack struck its worth lost: the damage, at most all its health, at its creature's AI value per health point, plus the creatures it kills at their AI value (the arrow towers' rule). The attack is worth what the other side loses less what the attacker's side loses: the retaliation, a second strike's retaliation, a Fire Shield's burn, a Dragon's breath on a stack of its own side.
- **Picking.** The attack worth the most; on a tie, the nearer hex (fewest hexes to walk), then the earlier army slot, then the order of `getHexesNextTo` (as today). A shot has no retaliation, so a shooter's choice is only the worth it destroys.
- **An attack worth less than nothing is still made** in this part (agreed); 5.7b.2 adds waiting and defending instead.
- **None in reach.** The stack walks or flies toward the nearest enemy stack, as today.
- **Unchanged.** A berserk stack still attacks the nearest stack (the spell's rule). War machines keep their own aim (the Ballista, the arrow towers, the First Aid Tent, the Catapult).
- The plan stays a pure function of the battle state and the rolls passed in, so a reload replays it as now.
- Built in `game/heroes/battle-ai.js`: each attack is planned and resolved on a copy of the battle, and the stacks' losses compared. The worth of a loss is in `game/heroes/battle-worth.js`, shared with the arrow towers' aim.

## Left for later

- Waiting, defending and staying back: 5.7b.2.
- Weighing the enemy's shooters a stack blocks, and the target to walk toward when none is in reach: 5.7b.3.
- Spells, retreat and surrender: 5.7b.4 to 5.7b.6.
