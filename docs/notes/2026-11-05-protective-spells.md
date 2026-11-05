# Protective spells

Roadmap 4.8.7.2: Slayer, Counterstrike, Fire Shield, Magic Mirror and Anti-Magic, the spells the hero casts on own stacks to fight better or be safer from spells. Proposed in three parts:

- **4.8.7.2a Slayer and Counterstrike**
- **4.8.7.2b Fire Shield**
- **4.8.7.2c Anti-Magic**

Magic Mirror waits for enemy heroes casting (8.1): it only turns back an enemy's spells, and Castle's Mage Guild never has it.

## The rules, as checked

### Slayer (Fire, level 4, 16 / 12 spell points) — 4.8.7.2a

Checked against the wiki (Slayer, King), the descriptions in `game/data/spells.json` and an open-source engine's spell config (`spells/timed.json`), creature config and damage rules.

- One own stack, at every level (no mass effect). Undead can have it (not a mind spell). Checked against the wiki ("target allied troop") and the engine (range 0, no undead condition).
- Lasts Power rounds. Checked against the wiki ("1 rnd/sp") and the engine (`N_TURNS`).
- The stack's Attack is 8 higher in every attack on a "king" creature: its melee attacks, shots and strikes back. Checked against the wiki ("Attack rating is increased by eight against …") and the engine (+8 to the attacker's Attack when the defender is a king the spell reaches).
- Which kings it reaches grows with Fire Magic: no skill and Basic reach the first group (Dragons, Behemoths, Hydras, Firebirds), Advanced also Angels and Devils, Expert also Giants and Titans. Checked against the wiki's King page, the descriptions and the engine (king levels 0 / 2 / 3 in the creature configs, Slayer's level 0 / 1 / 2 / 3 with the skill).
- Of our creatures only Angels and Archangels are kings (the second group); the creatures of the first and third groups come with the other factions (6.5).
- Combat log: the usual cast line (`core.genrltxt.195`); the engine gives it none of its own.

### Counterstrike (Air, level 4, 24 / 20 spell points) — 4.8.7.2a

Checked against the wiki (Counterstrike), the descriptions and the engine's spell config and retaliation rules.

- One own stack strikes back 1 more time each round (no skill and Basic) or 2 more times (Advanced). At Expert every own stack strikes back 2 more times, cast straight from the book. Checked against the wiki, the descriptions and the engine (val 1 / 2 / 2, range X at Expert).
- Lasts Power rounds. Checked against the wiki and the engine.
- The extra strikes back are there as soon as it is cast, in the round it is cast. Checked against the engine (the retaliations left are the total less those used); the wiki says nothing.
- Once Dispel removes it, the extra strikes back still left this round stay until the round ends. Checked against the wiki; the engine takes them away straight off. To ask.
- Royal Griffins already strike back without limit: it can be cast on them and does nothing. Checked against the wiki.
- Combat log: the usual cast lines.

### Fire Shield (Fire, level 4, 16 / 12 spell points) — 4.8.7.2b

Checked against the wiki (Fire Shield, with its worked examples) and the engine's spell config and its fire shield rule.

- One own stack, at every level. Lasts Power rounds. Checked against the wiki and the engine.
- A stack that hits the shielded stack in melee takes 20% (no skill and Basic), 25% (Advanced) or 30% (Expert) of the damage back. Shots don't. Checked against the wiki and the engine.
- The share is worked out from the damage the strike would have done with the shielded stack's defences left out: its Defense when higher than the attacker's Attack, Shield and Air Shield; the attacker's Attack, Bless and luck count. Only as much as the shielded stack had health for counts. Checked against the wiki ("considering all attack bonuses of the attacker but not … defensive bonuses", its examples) and the engine (the damage with only the raising factors, capped at the health before the strike).
- It is spell damage of the Fire school: Sorcery raises it and Protection from Fire on the attacker lowers it; no luck. Checked against the wiki and the engine.
- It answers the strike that kills the shielded stack too. Checked against the wiki's examples and the engine.
- Combat log: "The Fire Shield does %d damage." (`core.genrltxt.376`, the spell damage line), then the creatures that perish. Checked against the wiki's copy of `GENRLTXT.TXT` and the engine's use of it.

### Anti-Magic (Earth, level 3, 15 / 12 spell points) — 4.8.7.2c

Checked against the wiki (Anti-Magic), the descriptions and the engine's spell config and target rules.

- One own stack, at every level. Lasts Power rounds.
- The stack can't be the target of a spell of level 1 to 3 (no skill and Basic), 1 to 4 (Advanced) or any level (Expert), the hero's own spells too: it can't be picked, a spell hitting all stacks or an area leaves it out. Dispel still reaches it. Checked against the wiki and the engine.
- Casting it removes the harmful spells on the stack, not the helpful ones. Checked against the wiki and the engine (dispels negative and neutral spells, not positive ones).
- Combat log: the usual cast line.

### Magic Mirror (Air, level 5, 25 / 20 spell points) — with 8.1

Checked against the wiki (Magic Mirror) and the engine's spell config.

- An enemy spell aimed at the stack goes to a random enemy stack instead, 20% / 30% / 40% of the time; area spells and spells on every stack aren't turned back. It also makes the stack immune to Hypnotize.
- Nothing the hero casts on own stacks is hostile, and Castle's Mage Guild never rolls it, so it waits for enemy heroes casting (8.1).

## Left for later

- Magic Mirror, Cure removing harmful spells, with enemy heroes casting (8.1).
- The first and third groups of kings, Master Genies casting these spells, Efreet Sultans' own fire shield and creatures immune to fire, with the creatures (6.5). Coronius's Slayer specialty, with hero specialties.
- Orb of Tempestuous Fire raising Fire Shield's damage, Ironfist of the Ogre (7.8).
- War machines, which none of these spells go on, with them.
