# Control spells

Roadmap 4.8.7.1: Blind, Berserk, Hypnotize, Forgetfulness and Frenzy, the mind spells that change what a stack does. Too big for one PR, so in three parts:

- **4.8.7.1a Blind**
- **4.8.7.1b Forgetfulness and Frenzy**
- **4.8.7.1c Berserk and Hypnotize** (a stack attacking the nearest stack, a stack changing sides)

## The rules, as checked

### Blind (Fire, level 2, 10 / 8 spell points)

- One enemy stack. Lasts Power rounds, like the other lasting spells (4.8.4.1). Checked against the wiki (duration "1 rnd/sp") and the engine (`N_TURNS`).
- A blind stack skips its turns. Checked against the wiki ("cannot act until attacked, dispelled or effect wears off") and the engine (not active).
- Being attacked removes it, by a melee attack or a shot. Damage from a spell does not (the engine ends Blind "until being attacked"; the wiki says "attacked in any way"). Open question below.
- The blind stack retaliates to the attack that wakes it at 50% of its attack (Basic), 25% (Advanced), and not at all at Expert. Checked against the wiki and the engine (attack reduction 50 / 75, no retaliation at Expert).
- Once Blind is gone, a stack whose turn has not come this round acts as usual; one whose turn has passed acts straight away (wiki). Open question below.
- Dispel removes it (4.8.4.4); Cure removes it too, but only enemy casters put it on our stacks (8.1).
- Undead, and creatures immune to mind spells, can't be blinded (wiki: mind spell; engine: undead excluded). Of our creatures that is the undead; the `notOnUndead` flag covers it (4.8.6.1).
- Combat log: "The %s cannot see!" (`core.genrltxt.556`, checked against the wiki's copy of GENRLTXT.TXT and the engine's reference to it).
- Not at Expert on all stacks: it stays single-target at every level (engine: no mass effect).

## Left for later

- 4.8.7.1b, 4.8.7.1c as above.
- Unicorns casting Blind after attacking, with the creatures (6.5). Ballista and towers shooting a blind stack, with war machines and sieges.
- Pendant of Second Sight, Badge of Courage (7.8.3).
