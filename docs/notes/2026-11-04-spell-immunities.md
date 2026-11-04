# Spell immunities

Roadmap 4.8.6.1, the first of three parts of immunities and Resistance (4.8.6): stacks a spell can't go on. Resistance's chance is 4.8.6.2, the artifacts' immunities 4.8.6.3.

## The rules, as checked

- **Undead are immune to the mind spells and to Bless, Curse, Death Ripple, Resurrection and Sacrifice** (wiki, Undead: "immune to all Mind Spells (except Forgetfulness …) as well as Bless, Curse, Death Ripple, Resurrection and Sacrifice"; engine: Bless, Curse, Mirth, Sorrow, Death Ripple, Blind, Berserk, Frenzy, Hypnotize, Forgetfulness, Resurrection and Sacrifice all exclude undead). Of the spells we have that leaves Bless, Curse, Mirth and Sorrow; Death Ripple already skips them (4.8.5.3). The wiki's Bless page lists the undead as immune too.
- Forgetfulness: the wiki says undead are not immune in the original game (a bug Horn of the Abyss fixed), the engine makes them immune. Decided with the user: undead are immune to it too (4.8.7.1).
- **An immune stack is not a target**: hovering it shows "Select Spell Target" and the blocked cursor, and a click cancels the spell, as for any stack the spell can't go on (4.8.3.4). At Expert, a spell that hits all friendly or all enemy stacks leaves the immune ones out, and with only immune stacks says "That spell will affect no one!" and keeps the spell points (4.8.4.3). Checked against the engine (a target condition filters the stacks); the wiki says only "cannot be Blessed".
- Creatures that resist spells by level or school (Black and Gold Dragons, Efreet, the Elementals, Golems' damage reduction): none of our creatures has one yet.

## What we do

- Bless, Curse, Mirth and Sorrow get `notOnUndead` in `game/data/spells.json`; Death Ripple's `"targets": "living"` keeps hitting the whole battlefield but takes its undead rule from the same flag. Another spell undead ignore is data only.

## Left for later

- Creature immunities by spell level or school, and Golems' spell damage reduction: with the creatures that have them (6.5), decided with the user.
- Forgetfulness (undead immune) and the other control spells (4.8.7.1); Resurrection and Sacrifice (4.8.7.3, 5.8 later).
- The Orb of Vulnerability negating the immunities (7.8).
