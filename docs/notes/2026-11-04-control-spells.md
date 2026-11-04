# Control spells

Roadmap 4.8.7.1: Blind, Berserk, Hypnotize, Forgetfulness and Frenzy, the mind spells that change what a stack does. Too big for one PR, so in three parts:

- **4.8.7.1a Blind**
- **4.8.7.1b Forgetfulness and Frenzy**
- **4.8.7.1c Berserk and Hypnotize** (a stack attacking the nearest stack, a stack changing sides)

## The rules, as checked

### Blind (Fire, level 2, 10 / 8 spell points)

- One enemy stack. Lasts Power rounds, like the other lasting spells (4.8.4.1). Checked against the wiki (duration "1 rnd/sp") and the engine (`N_TURNS`).
- A blind stack skips its turns. Checked against the wiki ("cannot act until attacked, dispelled or effect wears off") and the engine (not active).
- Being attacked in any way removes it: a melee attack, a shot or damage from a spell. The wiki says "attacked in any way"; the engine ends it only on a creature's attack. Decided with the user: the wiki.
- The blind stack retaliates to the attack that wakes it at 50% of its attack (Basic), 25% (Advanced), and not at all at Expert. Checked against the wiki and the engine (attack reduction 50 / 75, no retaliation at Expert).
- Once Blind is gone, a stack whose turn has not come this round acts as usual; one whose turn has passed acts this round too (wiki: "it will act immediately"). Decided with the user: it takes its place in the turn order by its speed, so it acts after the faster stacks still to act this round, not straight away.
- Dispel removes it (4.8.4.4); Cure removes it too, but only enemy casters put it on our stacks (8.1).
- Undead, and creatures immune to mind spells, can't be blinded (wiki: mind spell; engine: undead excluded). Of our creatures that is the undead; the `notOnUndead` flag covers it (4.8.6.1).
- Combat log: "The %s cannot see!" (`core.genrltxt.556`, checked against the wiki's copy of GENRLTXT.TXT and the engine's reference to it).
- Not at Expert on all stacks: it stays single-target at every level (engine: no mass effect).

### Forgetfulness (Water, level 3, 12 / 9 spell points) — 4.8.7.1b

- One enemy stack that shoots; a stack that can't shoot can't be targeted (like Precision's `shootersOnly`). Undead can't be targeted (mind spell). Checked against the wiki and the engine.
- Lasts Power rounds. Checked against the wiki ("1 rnd/sp") and the engine (`N_TURNS`).
- Basic: the stack's shots do half damage ("half of the unit forgets to shoot"). Checked against the spell's description, the wiki and the engine (shooting damage reduced by 50%).
- Advanced and Expert: the stack can't shoot at all. It walks up and fights hand to hand, at the half damage a shooter's melee attack already does. Checked against the wiki and the engine (100% disables shooting).
- Expert: every enemy stack that shoots. Checked against the description, the wiki and the engine (range X).
- Combat log: the usual "%s casts '%s' on the %s." line; the game has no line of its own for it (the engine gives it none).

### Frenzy (Fire, level 4, 16 / 12 spell points) — 4.8.7.1b

- One own stack, at every level (no mass effect). Undead can't be targeted. Checked against the wiki ("target allied troop") and the engine (positive spell, single target).
- The stack's Attack goes up by 100% (Basic), 150% (Advanced) or 200% (Expert) of its Defense, and its Defense drops to 0. Checked against the wiki and the engine.
- Combat log: the usual cast line, as above.

## Decided for 4.8.7.1b

- Frenzy ends as the stack's turn starts in the round after the cast (the wiki), not on its first attack: it lasts through the enemy's turns, and a stack that defends while frenzied still has no Defense.
- Forgetfulness hits one stack at Advanced, as its description says; all of the enemy's shooters only at Expert.
- A forgetful shooter's melee attack is left alone: it does a shooter's usual half damage.
- Frenzy's Attack bonus is worked out from the Defense the stack would have without it, Defend's bonus included.

## Left for later

- 4.8.7.1c as above.
- Creatures immune to Forgetfulness or Frenzy we don't have yet (Titans, elementals, war machines), with them. Master Genies casting Frenzy, with the creatures (6.5). Pendant of Total Recall (7.8.3).
- Unicorns casting Blind after attacking, with the creatures (6.5). Ballista and towers shooting a blind stack, with war machines and sieges.
- Pendant of Second Sight, Badge of Courage (7.8.3).
