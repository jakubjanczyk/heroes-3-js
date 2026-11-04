# Area damage (2026-11-04)

Roadmap 4.8.5, the fifth of eight parts of hero magic (4.8, 5.8): damage spells that hit every stack in an area of the battlefield, the hero's own stacks too. Built in four parts (the last three one spell at a time, decided with the user):

1. Fireball, Inferno, Meteor Shower and Frost Ring, aimed at a hex, with the four Protections (from Air, Earth, Fire and Water), which first count once an own stack can be hit (moved here from 4.8.4.4, see part 4 of `docs/notes/2026-11-01-lasting-spells.md`).
2. Armageddon.
3. Death Ripple.
4. Chain Lightning.

Casting itself (the book, once a round, spell points, Sorcery, the cast fact) is 4.8.3, see `docs/notes/2026-11-01-casting-in-battle.md`; lasting spells and Expert hitting all stacks are 4.8.4.

## Part 1: Fireball, Inferno, Meteor Shower, Frost Ring and the Protections

Checked against the Heroes 3 wiki's raw page source (Fireball, Inferno (spell), Meteor Shower, Frost Ring, the four Protections, Spell damage reduction, and `Translation_Data/GENRLTXT.TXT`), the game's own descriptions already in `game/data/spells.json`, and an open-source engine's spell config (`spells/offensive.json`, `spells/timed.json`), its rules for which stacks an area spell hits, the status bar while aiming, the spell damage reduction and the combat log of a damage spell. Shadow of Death rules: Horn of the Abyss values, which the wiki marks, are left out.

### The four spells

| Spell | School, level | Cost (none / with the school) | Area | None / Basic | Advanced | Expert | Per point of Power |
|---|---|---|---|---|---|---|---|
| Fireball | Fire, 3 | 15 / 12 | the hex and the 6 around it | 15 | 30 | 60 | 10 |
| Inferno | Fire, 4 | 16 / 12 | the hex and every hex within 2 (19) | 20 | 40 | 80 | 10 |
| Meteor Shower | Earth, 4 | 16 / 12 | the hex and the 6 around it | 25 | 50 | 100 | 25 |
| Frost Ring | Water, 3 | 12 / 9 | the 6 hexes around it, not the hex itself | 15 | 30 | 60 | 10 |

- **The damage** is the level's base + Power × the multiplier (wiki). The steps between levels agree with the game's descriptions ("15 points more than Basic Fireball", 45 at Expert; Inferno 20 and 60; Meteor Shower 25 and 75; Frost Ring 15 and 45). No skill casts as Basic, as for the bolts. The costs are already in `game/data/spells.json`.
- **The areas** agree in the wiki and the engine's config (ranges `0,1`, `0-2` and `1`).
- **Sorcery** raises it as for the bolts (wiki: Sorcery under each spell's damage increases).
- **Aimed at a hex, not a stack** (engine: the four are cast on a location). Any hex of the battlefield can be aimed at, an empty one too (engine: "Cast Fireball" over a free hex, nothing blocks the cast).
- **Every living stack with a hex in the area is hit, once**, whichever side it is on (engine: the stacks covering the area's hexes, each counted once, no side filter; wiki, Frost Ring: "take care not to hit your own troops"). A double-wide stack is hit when either of its hexes is in the area; so Frost Ring aimed at one half of a double-wide stack still hits it through its other half (engine: a stack is hit when it covers any hex of the area). A dead stack's corpse is not hit.
- **Each stack takes the damage** as from a bolt: the wounded top creature first, then the rest. Spell damage isn't changed by Attack, Defense or luck.

### Aiming

- **The status bar** says "Cast Fireball" (`core.genrltxt.26`, "Cast %s"; engine) over any hex of the battlefield, with the spell cursor. The engine adds an estimate of the damage, which the game's text doesn't have; we leave it out.
- **The area's hexes are lit** while hovering (engine: the spell's range is highlighted around the hovered hex).

### The Protections

| Spell | School, level | Cost | None / Basic | Advanced | Expert |
|---|---|---|---|---|---|
| Protection from Air | Air, 2 | 7 / 5 | one own stack, 30% less damage from Air spells | 50% | 50%, all own stacks |
| Protection from Earth | Earth, 3 | 12 / 9 | 30%, Earth spells | 50% | 50%, all |
| Protection from Fire | Fire, 1 | 5 / 4 | 30%, Fire spells | 50% | 50%, all |
| Protection from Water | Water, 1 | 5 / 4 | 30%, Water spells | 50% | 50%, all |

- **The numbers** agree in the wiki (its Shadow of Death values; Horn of the Abyss's 50 / 75 left out) and the engine's config; the game's descriptions say Advanced is "nearly twice" Basic.
- **They last** as many rounds as the hero's Power, like the other lasting spells, and Dispel removes them.
- **Only one Protection counts** against a spell of several schools, the first the stack has (engine; wiki, Protection from Water). Magic Arrow is the only such spell, and it hits enemy stacks only, so this changes nothing a player can see until enemy heroes cast (8.1).
- **The damage is lessened and rounded down** (engine: × (100 − 30) / 100 in whole numbers).

### The combat log

- **The cast:** "Lord Haart casts 'Fireball' on the Pikemen." when one stack is hit, "Lord Haart casts 'Fireball'." otherwise, none hit included (`core.genrltxt.195`, `196`; engine: the one-stack line only when one stack is hit, as part 3 of the lasting spells already does).
- **The damage**, the total over every stack hit: "The Fireball does 145 damage." (`core.genrltxt.376`), then " 3 Pikemen perish." for one stack, or for several " 7 creatures perish." / " One creature perishes." (`core.genrltxt.379`, `378` with `core.genrltxt.43` "creatures" and `42` "creature"; engine: an area spell names no creature). No damage line when nothing was hit.

### The end of the battle

- **Killing the last enemy stack wins** and **killing the hero's last stack loses**, as when it falls to a strike.
- **Killing the stack whose turn it is** ends its turn: the next stack acts.
- **Killing every stack on both sides:** the engine makes it a battle nobody wins; the wiki says nothing. See the open question.

### What we do

- **Data.** Each of the four spells gets its `damage` (`base` at none, Basic, Advanced, Expert and `perPower`) and its `area` in `game/data/spells.json`: how far from the aimed hex it reaches and whether the aimed hex itself is hit (`{ "from": 0, "to": 1 }`, Inferno `{ "from": 0, "to": 2 }`, Frost Ring `{ "from": 1, "to": 1 }`). The Protections get a `lasting` with `spellDamageTakenPercent` for their school (70 / 70 / 50 / 50) and `allAtExpert`. Another area spell or protection later is data only.
- **Aiming.** Picking an area spell in the battle book closes it; over any hex of the battlefield the status bar says "Cast Fireball", the cursor is the spell cursor, every hex of the area is lit and every stack it would hit glows (asked for by the user; a bolt's target glows too). Not on a touch screen, where nothing is hovered. A click casts it there. Right-click and Escape cancel ("Spell cancelled"), as for the other spells. The edge columns past each side, where only back halves stand, can't be aimed at: "Select Spell Target" and the blocked cursor, and a click there cancels, as a click off a target does now.
- **The hit.** A burst of light over each stack hit.
- **The fact** names the aimed hex and `hits`, every stack hit with the damage it took (a Protection makes them differ), so a reload hits the same stacks for the same damage. A bolt's fact keeps its target and its `hits` too; a bolt saved before this part, with a target and one damage, replays as one hit.
- **The damage in the combat log** is the spell's damage added up over the stacks hit, as for a bolt: not held to what the stacks had left.
- **A Protection's effect** is `fireSpellDamageTakenPercent` (and `air…`, `earth…`, `water…`), −30 or −50, in `lasting.effects` like Shield's `meleeDamageTakenPercent`.
- **The end of the battle** is checked after the cast as after a strike, the hero's side too; a killed active stack passes the turn on.
- **Single-target bolts** keep working as now: hovering a stack names it and only that stack is hit.

### Decided with the user

- **A spell that kills the last stacks of both sides** loses the battle: the defeat window shows, the hero leaves the map, and so does the monster, with no creatures left (the engine: nobody wins).
- **The edge columns** can't be aimed at: "Select Spell Target", the blocked cursor, and a click cancels the spell.
- **Frost Ring aimed at one half of a double-wide stack** hits it through its other half, as the engine does.
- **No damage estimate** in the status bar while aiming: "Cast Fireball" only, as the game's text has it.

### Not yet (part 1)

- Death Ripple, Armageddon and Chain Lightning (4.8.5.2).
- Immunities (fire-immune creatures, elementals) and spell damage reduction (Golems), 4.8.6.1 and the creatures (6.5).
- The Orbs of each school and hero specialties in these spells (7.8, 6.5).
- Enemy heroes and the combat AI casting them (8.1, 5.7b).
- Each spell's own animation (10.3).

## Parts 2 to 4: Armageddon, Death Ripple and Chain Lightning

Checked against the Heroes 3 wiki's raw page source (Death Ripple, Armageddon, Chain Lightning, Destroy Undead), the game's own descriptions already in `game/data/spells.json`, and an open-source engine's spell config (`spells/offensive.json`) and its rules for which stacks these spells hit, in what order, for how much, and what the combat log says. Shadow of Death values; the wiki's Horn of the Abyss Armageddon (40 per Power) is left out.

### The three spells

| Spell | School, level | Cost (none / with the school) | Hits | None / Basic | Advanced | Expert | Per point of Power |
|---|---|---|---|---|---|---|---|
| Death Ripple | Earth, 2 | 10 / 8 | every living stack but the undead, both sides | 10 | 20 | 30 | 5 |
| Armageddon | Fire, 4 | 24 / 20 | every living stack, both sides | 30 | 60 | 120 | 50 |
| Chain Lightning | Air, 4 | 24 / 20 | an enemy stack, then the nearest stack to it, 4 stacks (5 at Advanced and Expert) | 25 | 50 | 100 | 40 |

- **The damage** is the level's base + Power × the multiplier (wiki), raised by Sorcery as for the other damage spells. The steps agree with the game's descriptions (Death Ripple "10 points more than Basic", 20 at Expert; Armageddon 30 and 90; Chain Lightning 25 and 75). No skill casts as Basic. The costs are already in `game/data/spells.json`.
- **Death Ripple and Armageddon aren't aimed** (engine: their range is the whole battlefield, no side picked; wiki: "all non-undead units", "all troops take"). War machines, which Death Ripple also spares, come with them.
- **Chain Lightning's first target is an enemy stack**, aimed as a bolt is (engine: it picks the target's side as the bolts do; wiki: "strikes target troop").
- **Then it jumps to the nearest living stack** it hasn't hit yet, friend or foe (wiki: "whether it is a friend or a foe"; engine: the closest hex of any stack not hit yet, counted from the hex of the stack it just hit). It stops early when no stack is left.
- **Each jump halves the damage**: the first stack takes the whole damage, the second half, the third a quarter, and so on, each rounded down (wiki: up to 46 + 75 × Power at Basic, so 25 + 12 + 6 + 3; engine: the damage × 0.5 to the power of the stack's place in the chain, rounded down). A Protection from Air lessens each stack's share (engine: the protection first, then the halving).
- **A tie** between two stacks as near: the wiki says one of them is picked at random; the engine picks the one further towards the other side, then the one in the nearer row. See the open questions.

### Casting

- **Death Ripple and Armageddon** are cast straight from the battle book, as an Expert lasting spell is (4.8.4.3): the book closes and every stack they hit takes the damage. With no stack to hit (Death Ripple against undead only), "That spell will affect no one!" (`core.genrltxt.185`) and the book stays open, nothing spent.
- **Chain Lightning** is aimed as a bolt: "Cast Chain Lightning on Pikemen" over an enemy stack, "Select Spell Target" elsewhere, the cancelling as now.
- **The combat log** is the area spells': "Lord Haart casts 'Armageddon'." when more than one stack is hit, the total damage and " 7 creatures perish." (`core.genrltxt.196`, `376`, `379`); with only one stack hit it names it, as Fireball does.
- **A burst of light over each stack hit**, and the end of the battle as for the area spells: both sides' last stacks dying loses it.

### What we do

- **Data.** Each gets its `damage`; Death Ripple `"targets": "living"` and Armageddon `"targets": "all"` (whole battlefield, no aiming; "living" leaves out the `undead` ability); Chain Lightning `"chain": { "strikes": [4, 4, 5, 5], "factor": 0.5 }`. Destroy Undead would then be data only (`"targets": "undead"`), see the open questions.
- **The fact** keeps `hits`, each stack's damage as it was when cast, as the area spells do, so a reload and a random tie replay the same.
- **Cast straight from the book.** A spell with `targets` goes straight from the battle book as an Expert lasting spell does (part 2); its fact has `hits` and no target or hex.
- **Part 2 is built:** Armageddon, and the demo map's first hero knows it.
- **Part 3 is built:** Death Ripple, which leaves out every stack whose creature is undead; the demo map's first hero knows it.

### Part 4: Chain Lightning

Checked again for this part against the wiki's raw Chain Lightning page and the engine's spell config and its rules for picking the chain's stacks (`transformByChain`, the closest-hex rule) and their damage.

- **Strikes:** 4 stacks with no skill or Basic Air Magic, 5 at Advanced and Expert (wiki; engine `chainLength` 4 / 5 / 5; the game's descriptions "Strikes four units" / "five units").
- **The damage halves at each jump, rounded down each time:** the stack's place in the chain n (0 for the first) takes ⌊damage × 0.5ⁿ⌋ (engine). The wiki's "up to 46 + 75 × Power" at Basic is 25 + 12 + 6 + 3 and 40 + 20 + 10 + 5, which agrees; Advanced 96 (50 + 25 + 12 + 6 + 3), Expert 193.
- **Sorcery and Protection from Air** change the damage before it is halved (engine: the spell's damage for that stack, then the halving).
- **The first stack** is an enemy stack, aimed as a bolt is.
- **Where the next jump is counted from:** the hex the bolt landed on. For the first stack that is the hex clicked (either half of a double-wide stack); after that, the hex of the next stack that was nearest. The next stack is the living stack not hit yet with a hex nearest to it, either side (wiki: "whether it is a friend or a foe"; engine: the closest hex among every hex of the stacks not hit yet). Corpses don't count.
- **It stops early** when no living stack is left to jump to.
- **A tie**, two hexes as near: the wiki picks one at random; the engine picks the hex furthest towards the other side from the stack just hit (a larger column when the stack just hit is the hero's, which starts on the left), then the one in the nearer row. See the open questions.
- **The targets are picked before any damage**, so a stack killed on the way still passes the bolt on from its hex (engine: the chain is worked out, then each stack takes its damage).
- **The combat log** is the area spells' (part 1). The hero always has a living stack besides the enemy target, so the chain hits at least two stacks: "Lord Haart casts 'Chain Lightning'.", the total damage and how many creatures perish (`core.genrltxt.196`, `376`, `379`).

What we do:

- **Data.** `"damage": { "base": [25, 25, 50, 100], "perPower": 40 }` and `"chain": { "strikes": [4, 4, 5, 5], "factor": 0.5 }` in `game/data/spells.json`.
- **Aiming** as a bolt: "Cast Chain Lightning on Pikemen" over an enemy stack, the spell cursor; hovering lights the target's hexes and only the target glows, as for a bolt: where the chain would jump isn't shown (decided with the user). "Select Spell Target" elsewhere, cancelling as now.
- **A tie** between hexes as near is picked at random, as the wiki says (decided with the user).
- **The fact** has the first `targetId` and `hits` in the chain's order, each with its share of the damage, so a reload replays it. A random tie replays the same.
- **The bolt jumps from stack to stack**, 300 ms a jump: a jagged bolt is drawn from each stack hit to the next and the burst of light shows over a stack as the bolt reaches it (asked for by the user; the damage and the counts change at once). The end of the battle as for the other area spells.
- **The demo map's first hero knows it.**
- **Part 4 is built:** Chain Lightning; the demo map's first hero knows it.

### Not yet (parts 2 to 4)

- Immunities: Earth and Magma Elementals, Gold and Black Dragons, Efreet, Phoenixes, Pendant of Life and Pendant of Negativity, Armageddon's Blade (4.8.6, 7.8, 6.5). A stack that resists Chain Lightning, which it skips and keeps arcing (4.8.6.2).
- War machines, spared by Death Ripple.
- The Orbs, hero specialties (Septienna, Solmyr) and elementals' vulnerability (7.8, 6.5).
- Each spell's own animation (10.3); Chain Lightning's bolt from stack to stack is drawn already.

## Not checked

- The multipliers for Power come from the wiki only (as for the bolts, see `docs/notes/2026-11-01-casting-in-battle.md`).
- Whether the original game lets an area spell be aimed at an empty hex: the engine does; the wiki says nothing.
- What happens in the original game when a spell kills every stack on both sides.
- Chain Lightning's tie between two hexes as near: random (wiki, which we follow) or towards the other side, then the nearer row (engine). Where the next jump is counted from (the hex the bolt landed on) comes from the engine only.
- Armageddon's and Death Ripple's multipliers for Power come from the wiki only.
- Whether the original game's damage line holds the damage to what the stacks had left (the engine does); we add up the spell's damage, as for a bolt.
