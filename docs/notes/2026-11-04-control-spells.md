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

### Berserk (Fire, level 4, 20 / 16 spell points) — 4.8.7.1c

Checked against the wiki (Berserk, Mind spell), the spell's descriptions already in `game/data/spells.json`, and an open-source engine's spell config (`spells/timed.json`) and its rules for a berserk stack's turn.

- Aimed at a hex, not at a stack, and not only at enemies: it goes on every stack in the area, the hero's own too. The area is the hex itself at Basic (and with no skill), that hex and the 6 around it at Advanced, and 2 hexes out (19 hexes) at Expert. Checked against the descriptions ("six hexes greater", "eighteen hexes greater"), the wiki and the engine (range 0, 0-1, 0-2).
- Undead can't be berserked (mind spell). Checked against the wiki and the engine.
- It lasts until the stack's own attack, a melee attack or a shot; a retaliation doesn't end it. No rounds count down (the wiki: a stack that can't attack anyone keeps it for 255 turns). Checked against the wiki ("1 attack") and the engine (until own attack).
- A berserk stack's turn plays itself, whoever's stack it is: a shooter with no stack of either side next to it shoots the nearest stack of either side; otherwise it goes for the nearest stack of either side (fewest hexes to get next to it), attacks it if it gets there this turn, or walks as far towards it as it can. Checked against the wiki ("attacks nearest troop whether it is an ally or enemy") and the engine.
- The stack attacked strikes back as usual, an own stack too. Checked against the engine (no exception for berserk attackers).
- Berserk removes Hypnotize, and Hypnotize removes Berserk. Checked against the wiki and the engine (`counters`).
- Dispel removes it (4.8.4.4).
- Combat log: the usual cast lines of an area spell (`core.genrltxt.195`, `196`); the game has no line of its own for it (wiki's `GENRLTXT.TXT`, engine).

### Hypnotize (Air, level 3, 18 / 15 spell points) — 4.8.7.1c

Checked against the wiki (Hypnotize), the descriptions in `game/data/spells.json` and the engine's spell config and battle rules.

- One enemy stack whose health is at most 10 / 20 / 50 + 25 × Power (no skill casts as Basic). Checked against the wiki and the descriptions ("an additional 10 hit points", "an additional 40").
- Undead can't be hypnotized (mind spell). Checked against the wiki and the engine.
- Lasts Power rounds. Checked against the wiki ("1 rnd/sp") and the engine (`N_TURNS`).
- While it lasts the stack fights for the hero: the player plays its turns (Auto combat does with Auto combat on), it attacks the monster's stacks, they attack it, and the hero's stacks can't. It strikes back as usual, whoever attacks it (the wiki: the description's "without fear of retaliation" is wrong).
- A shooter is blocked by a stack next to it that started on the other side: the hypnotized stack doesn't stop the monster's shooters, a hypnotized shooter is stopped by the monster's stacks (the wiki), and it stops the hero's shooters (the engine; the wiki says nothing).
- Its side for the battle's end stays the monster's (the engine: a battle is over when one side has no stack of its own left).
- Dispel removes it; Berserk too (above).
- Combat log: the usual cast line.

## Decided for 4.8.7.1c

- A berserk stack, and the nearest stack it goes for, are worked out with the combat AI's rules (5.7b), only with every stack a target; ties go to the earlier army slot, attacker first, as the AI's do.
- The count box of a berserk or hypnotized stack is red (a harmful spell), as for the other harmful spells.
- The hypnotized stack keeps facing the way it did and stays where it stands.
- Hypnotize's health counts every creature at full health, as the wiki says (the engine counts the health left), and the stack's must be less than the limit (the wiki; the engine allows it at the limit). Decided with the user.
- Sorcery doesn't raise the limit: the wiki's Sorcery page speaks only of damage (the engine raises it). Decided with the user.
- Berserk can't be aimed where its area holds no stack it can go on (an empty hex, undead only): "Select Spell Target" and the blocked cursor. Neither source settles it; decided with the user.
- When every stack the monster has left is hypnotized, the battle goes on (the engine; the wiki says nothing): the monster's side still has a stack. Decided with the user.

## Left for later

- Creatures immune to Forgetfulness or Frenzy we don't have yet (Titans, elementals, war machines), with them. Master Genies casting Frenzy, with the creatures (6.5). Pendant of Total Recall (7.8.3).
- Unicorns casting Blind after attacking, with the creatures (6.5). Ballista and towers shooting a blind stack, with war machines and sieges.
- Pendant of Second Sight, Badge of Courage (7.8.3).
- Pendant of Dispassion (immune to Berserk) and Pendant of Free Will (immune to Hypnotize) (7.8.3). Creatures immune to them we don't have yet, and Fangarms casting Hypnotize, with the creatures (6.5). Cure removing Hypnotize, with enemy heroes casting (8.1). Berserk on war machines, with them.
