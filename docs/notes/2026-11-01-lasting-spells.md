# Spells that last (2026-11-01)

Roadmap 4.8.4, the fourth of eight parts of hero magic (4.8, 5.8): spells that put an effect on a stack for some rounds. Built in four parts:

1. How a lasting spell works, with the six spells that change a stat: Haste, Slow, Shield, Stone Skin, Bloodlust, Weakness.
2. Bless, Curse, Precision, Air Shield, Disrupting Ray, Prayer, Fortune, Misfortune, Mirth, Sorrow, in two parts: (a) the six that change damage or a stat, (b) the four that change morale or luck.
3. At Expert most of them hit all friendly or all enemy stacks.
4. Cure, Dispel and the four Protections.

Casting itself (the book, once a round, aiming, spell points, the cast fact) is 4.8.3, see `docs/notes/2026-11-01-casting-in-battle.md`.

## How Heroes 3 does it

Checked against the Heroes 3 wiki's raw page source (Haste, Slow, Shield, Stone Skin, Bloodlust, Weakness, Counter, Primary skill) and against an open-source engine's spell config (`spells/timed.json`) and its battle rules (spell duration, the end of a round, countering, the stack's count box). Shadow of Death rules: Horn of the Abyss values, which the wiki marks, are left out.

### The six spells

| Spell | School, level | Cost (none / with the school) | Target | None / Basic | Advanced | Expert |
|---|---|---|---|---|---|---|
| Haste | Air, 1 | 6 / 5 | own stack | Speed +3 | Speed +5 | Speed +5 |
| Slow | Earth, 1 | 6 / 5 | enemy stack | Speed −25% | Speed −50% | Speed −50% |
| Shield | Earth, 1 | 5 / 4 | own stack | melee damage taken −15% | −30% | −30% |
| Stone Skin | Earth, 1 | 5 / 4 | own stack | Defense +3 | Defense +6 | Defense +6 |
| Bloodlust | Fire, 1 | 5 / 4 | own stack | Attack +3 in melee | +6 | +6 |
| Weakness | Water, 2 | 8 / 6 | enemy stack | Attack −3 | Attack −6 | Attack −6 |

- **The numbers** agree in the wiki and the engine's config. The costs are already in `game/data/spells.json`.
- **No skill casts as Basic**, as for the damage spells (wiki: one value for both; the engine's config has a single "base" level).
- **Slow rounds the new Speed down** (wiki): Speed 4 → 3 at Basic, 2 at Advanced.
- **Shield** multiplies the melee damage the stack takes by 85% or 70% (wiki, Shield and its note on the damage formula; engine: a melee damage reduction). Shots aren't reduced.
- **Bloodlust** counts only in melee: a strike or a retaliation, also a shooter's melee attack (wiki: "for hand-to-hand attacks"; engine: melee only).
- **Haste and Slow change the turn order** for the rest of the round: the order goes by Speed (engine: the queue is worked out again).
- **Expert hits all** friendly or enemy stacks: that is 4.8.4.3. Until then Expert casts on one stack with Expert's value.
- **Target:** the helpful spells only on own stacks, the harmful ones only on enemy stacks (wiki: "selected allied / friendly / enemy unit"; engine: the spell's target follows whether it is positive or negative).

### How long it lasts

- **As many rounds as the hero's Power** (wiki, Primary skill: "1 point of Power skill equals 1 round of duration"; engine: the duration is the caster's Power, plus artifacts that lengthen spells). A hero with Power 0 counts as 1 (wiki).
- **Counted down when a new round starts** (engine): cast in round 1 by a hero with Power 2, it lasts rounds 1 and 2 and is gone when round 3 starts.
- **Counters:** Haste removes Slow and Slow removes Haste on the stack (wiki, Counter and the spells' pages; engine). The engine also makes Bloodlust and Weakness counter each other; the wiki lists them as neither counters nor opposites (we follow the engine, decided with the user).

### Shown on the stack

- **The stack's count box changes colour** (engine: the box is drawn in its "positive" colour when the stack has more helpful spells than harmful ones, "negative" for more harmful, "neutral" when they are even).
- How many rounds are left shows in the stack's creature window, which we don't have yet (4.3).

### The combat log

- "Lord Haart casts 'Haste' on the Swordsmen." (`core.genrltxt.195`, already used for the bolts).
- Nothing is written when a spell runs out (engine; the wiki says nothing).

## What we do

- **Data.** Each of the six spells gets its effect in `game/data/spells.json`: which stat, its value at each skill level (none, Basic, Advanced, Expert) and whether it targets own or enemy stacks; Haste and Slow name each other as counters. Another stat spell later is data only.
- **Casting** works as for the bolts: pick it in the battle book, hover a stack it can target ("Cast Haste on Swordsmen", the spell cursor, its hexes lit), click to cast; anywhere else says "Select Spell Target" and a click cancels. Spell points, once a round and the combat log line are as for the bolts.
- **The stack's stats** are worked out from its own and its spells' effects wherever they count: Speed for its reach and the turn order, Attack and Defense for the damage in the hover text and the strike. Defend's bonus moves to the same place.
- **The stack whose turn it is keeps it.** Haste can make another of the hero's stacks faster than the one acting: it acts next, not straight away (the engine's cast is not the stack's action; it ends no turn).
- **A Power of 0** can't be set in our scenarios, so a hero casts for at least 1 round anyway.
- **The count box** turns green for a stack with more helpful spells, red for more harmful, and a third colour when they are even (our own colours until the battle's graphics, 10.x).
- **The rounds** run out when a new round starts; the box turns back.
- **A reload** keeps the spells and the rounds left: the cast is a saved fact, with the effect and the rounds it was cast for, and the rounds are replayed.
- **Counters and the even colour wait for enemy heroes casting (8.1).** The hero casts helpful spells only on own stacks and harmful ones only on enemy stacks, so no stack can have Haste and Slow, Bloodlust and Weakness, or a helpful and a harmful spell at once until then.

## Decided with the user

- **The same spell cast again** on a stack that has it keeps the longer of the two durations, as the engine does (the wiki says nothing).
- **Bloodlust and Weakness counter each other**, as the engine has it: whichever was cast last stays (the wiki's Counter page doesn't list them).
- **The count box colours** are our own: green, red, and yellow when even.

## Part 2: Bless, Curse, Precision, Air Shield, Disrupting Ray, Prayer, Fortune, Misfortune, Mirth, Sorrow

Checked against the Heroes 3 wiki's raw page source (each spell's page, Hourglass of the Evil Hour, Spirit of Oppression) and against an open-source engine's spell config (`spells/timed.json`), its damage rules (Bless and Curse, Shield and Air Shield as separate factors), its stack's Attack and Defense, and its morale and luck limits. Costs are already in `game/data/spells.json`.

| Spell | School, level | Target | None / Basic | Advanced | Expert |
|---|---|---|---|---|---|
| Bless | Water, 1 | own | each creature does its maximum damage | maximum + 1 | maximum + 1 |
| Curse | Fire, 1 | enemy | each creature does its minimum damage | minimum − 1 (at least 1) | minimum − 1 |
| Precision | Air, 2 | own | Attack +3 for shots | +6 | +6 |
| Air Shield | Air, 3 | own | damage taken from shots −25% | −50% | −50% |
| Disrupting Ray | Air, 2 | enemy | Defense −3, until the battle ends, adds up | −4 | −5 |
| Prayer | Water, 4 | own | Attack, Defense and Speed +2 | +4 | +4 |
| Fortune | Air, 2 | own | Luck +1 | +2 | +2 |
| Misfortune | Fire, 3 | enemy | Luck −1 | −2 | −2 |
| Mirth | Water, 3 | own | Morale +1 | +2 | +2 |
| Sorrow | Earth, 4 | enemy | Morale −1 | −2 | −2 |

- **Bless and Curse** change each creature's damage before the stack's count and Attack and Defense: Advanced Bless on Pikemen (1–3) makes every creature do 4, Advanced Curse makes it 1 (wiki: "maximum damage + 1", "minimum damage − 1 … cannot be reduced to below 1", the manual's "80%" is wrong; engine: the same shift per creature, at least 1). They count for every attack: strike, retaliation and shot. The damage shown on hover follows (Bless: one number).
- **Precision** counts for shots only (wiki: "for ranged attacks"; engine: distance attacks only), not a shooter's melee attack.
- **Air Shield** lessens shots only, as Shield lessens melee only; both on one stack each lessen their own kind (engine: two factors, each ignoring the other kind).
- **Disrupting Ray** is the one spell that adds up: each cast takes 3, 4 or 5 more Defense and none of it runs out before the battle ends (wiki: "until end of combat", "the only cumulative spell"; engine: a permanent, cumulative effect). Its count box stays red for the rest of the battle.
- **Attack and Defense never go below 0** for the damage (wiki, Disrupting Ray: "limited by zero defense level"; engine: a stack's Attack and Defense are at least 0). This also holds for Weakness from part 1.
- **Prayer's Speed** changes reach and the turn order as Haste does.
- **Morale and luck stay between −3 and +3** with the spells (engine: the totals are capped at the size of the chance tables, ±3; wiki, Morale and Luck pages). Negative luck does nothing (wiki, Misfortune: "no bad luck can occur in the game"), so Misfortune only lowers a positive luck; a monster has no luck, so against monsters it changes nothing but the count box.
- **Undead** have no morale, so Mirth and Sorrow do nothing on them; their immunity to mind spells (they can't be targeted) is 4.8.6.1.
- **Hourglass of the Evil Hour and Spirit of Oppression** keep cancelling positive luck and morale, and the spells' effects on them count for nothing, Sorrow's and Misfortune's too (wiki: Spirit of Oppression "also negates … Mirth and Sorrow"; the engine only caps the total at 0, so Sorrow still lowers it).
- **Counters** (Bless and Curse, Fortune and Misfortune, Mirth and Sorrow; wiki and engine for Bless and Curse, engine for the others) wait for enemy heroes casting (8.1), like Haste and Slow.

### What we do

- Each spell's effect goes in `game/data/spells.json` like part 1's: `maximumDamage` / `minimumDamage` (the shift added to each creature's damage; Bless at 0 still makes it the maximum), `rangedAttack`, `rangedDamageTakenPercent`, Prayer's `attack`, `defense` and `speed` together, and Disrupting Ray's `defense` with `untilBattleEnds` and `addsUp`. Prayer is data only.
- Precision's `shootersOnly`: hovering a stack that can't shoot says "Select Spell Target", as for a stack of the wrong side.
- A spell that lasts until the battle ends is saved with no rounds and never counted down.
- The damage shown on hover is one number when the lowest and highest are the same, as with Bless ("Attack Pikemen (damage 121)"). Our own text, as the rest of the hover damage.
- Part 2b: the four spells' effects are `morale` and `luck` in `game/data/spells.json`. A stack's morale and luck in battle are worked out from its army's and its spells', capped at ±3, and luck below 0 counts as 0 (`getStackMorale`, `getStackLuck`). With an artifact that cancels one of them, only the army's penalty is left and the spells add nothing. Misfortune is data only: it changes nothing until enemy heroes (8.1).

### Decided with the user

- Split in two: (a) Bless, Curse, Precision, Air Shield, Disrupting Ray, Prayer; (b) Fortune, Misfortune, Mirth, Sorrow.
- Precision targets only the hero's shooters (wiki: "the selected friendly ranged unit"; the engine has no limit).
- Spirit of Oppression cancels Sorrow too, as the wiki says (the engine lets Sorrow lower morale below 0); Hourglass of the Evil Hour does the same with Fortune and Misfortune.


### Not yet (part 2)

- Expert hitting all stacks (4.8.4.3); counters (8.1); immunities, such as the wiki's undead immune to Bless and Curse (4.8.6.1); Halflings' luck and Minotaurs' morale not below +1 (6.5); Disrupting Ray surviving Dispel and Cure (4.8.4.4).

## Not checked

- The count box's exact colours in the original game.

## Not yet

- Counters (Haste and Slow, Bloodlust and Weakness) and the even colour of the count box, with enemy heroes casting (8.1).
- Expert hitting all stacks (4.8.4.3); the other lasting spells (4.8.4.4).
- The creature window in battle with the spells and rounds left (4.3).
- Artifacts that lengthen spells, hero specialties in these spells, creatures casting them (Master Genie, Ogre Mage) and war machines immune to them (7.8, 6.5, with the creatures).
- Destroy Undead (5.8 later).
