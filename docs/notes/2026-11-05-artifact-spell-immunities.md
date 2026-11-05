# Artifact spell immunities

Roadmap 4.8.6.3, the last part of immunities and Resistance (4.8.6) that can be built now: two artifacts the game already has (7.8.3, 7.8.7) that keep spells off the wearer's troops. Undead immunities were 4.8.6.1 (`docs/notes/2026-11-04-spell-immunities.md`); Resistance (4.8.6.2) waits for an enemy that casts.

## The rules, as checked

### Badge of Courage (Misc, Treasure, 1000 gold)

- Besides its +1 morale, the hero's troops are immune to mind spells. The artifact's own text doesn't say so. Checked against the wiki (Badge of Courage: "Hidden Effect: Immunity to mind spells", its Trivia: the text "was never updated"; Mind spell: "makes all of the hero's creatures immune to mind spells") and the engine (the artifact gives the mind spell immunity to the wearer's troops). Horn of the Abyss removed it; we keep it.
- The mind spells are Berserk, Blind, Forgetfulness, Frenzy, Hypnotize, Mirth and Sorrow. Checked against the wiki (Template:Mind spells) and the engine (those seven, and only those, are kept off stacks with mind spell immunity).
- It turns away the hero's own mind spells too: Mirth and Frenzy can't go on the hero's stacks, and Berserk's area leaves them out. Checked against the engine (the immunity is checked whoever casts); the wiki says "immune to mind spells" with no exception.

### Power of the Dragon Father (Torso, combination, 42000 gold)

- Besides its +6 to all primary skills (built in 7.8.7), the hero's troops are immune to spells of level 1 to 4. Checked against the wiki (Power of the Dragon Father: "Allied troops are immune to level 1–4 spells"), the artifact's own text ("all troops are immune to 1-4th level spells", in `game/data/artifacts.json`) and the engine (a level 4 spell level immunity on the wearer's troops).
- The hero's own spells too: no Bless, Haste, Cure or Anti-Magic on them, and Armageddon, Fireball, Chain Lightning and the other area spells of level 4 or lower leave them out. Checked against the wiki ("it will prevent the hero from casting any beneficial spell on their own units … an extremely powerful Dragogeddon enabler", with the list of area spells) and the engine (the same immunity Anti-Magic gives, checked whoever casts).
- It is the immunity Anti-Magic gives (4.8.7.2d), so it works the same everywhere a spell picks its stacks: not a target ("Select Spell Target", the blocked cursor, a click cancels), left out at Expert ("That spell will affect no one!" when no stack is left), left out of areas and of Chain Lightning's jumps. With Anti-Magic on the stack too, the higher of the two counts. Checked against the engine (the two immunities are one kind; the highest counts).
- Dispel still reaches the troops. Checked against the wiki (Dispel: "creatures with magic immunity" are affected, only the Sphere of Permanence keeps it off) and the engine (Dispel ignores immunities). The troops can't have any spell for it to remove while the hero can only cast level 1-5 spells and none of level 5 goes on own stacks yet.

### Both

- Only a worn artifact counts, not one in the backpack, as for every artifact (7.8.1).
- The immunity is the hero's troops'. An enemy stack the hero hypnotized fights for the hero but isn't the hero's troop, so the hero's spells still reach it. Checked against the engine (the hero's bonuses go to the stacks of the hero's side, and Hypnotize doesn't change a stack's side); the wiki says nothing. Decided with the user: follow the engine.
- Neither artifact changes a message or a window: the spell's target rules are where it shows.

## What we do

- Each of the seven mind spells gets `mind: true` in `game/data/spells.json`. Undead count as immune to mind spells, so those seven lose `notOnUndead`, which stays on Bless, Curse and Death Ripple (refactor first, no behaviour change).
- Artifacts get `battleImmunities`: `{ "mindSpells": true }` for the Badge, `{ "spellLevel": 4 }` for the Dragon Father. The hero's stacks take them from the worn artifacts at the start of the battle, and the spell rules read them next to the undead and Anti-Magic. Another artifact with an immunity is data only.
- Untested: Dispel reaching the Dragon Father's troops (they can't have a spell to remove) and a level 5 spell getting through (none goes on own stacks yet).

## Left for later

- Resistance (4.8.6.2): its chance only counts against an enemy's spells, and no enemy casts yet: no enemy heroes (8.1), and no creature that casts among ours (Faerie Dragons and the others come with 6.5). Moved to "5.8 later", decided with the user.
- A level 5 spell on own stacks getting through the Dragon Father (Sacrifice, 4.8.7.3; Magic Mirror, 8.1), and Sacrifice failing because its raising is a level 4 Resurrection (wiki).
- Creatures immune to mind spells or spell levels (Golems, Elementals, Dragons, Giants and Titans, 6.5).
- The Orb of Vulnerability negating every immunity (7.8).
- The pendants that keep one spell off (Dispassion, Second Sight, Holiness, Life, Free Will, Negativity, Total Recall), with the artifacts that have them (7.8).
