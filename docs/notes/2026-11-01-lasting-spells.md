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
- **Expert hits all** friendly or enemy stacks: that is 4.8.4.3, see part 3 below.
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

- Counters (8.1); immunities, such as the wiki's undead immune to Bless and Curse (4.8.6.1); Halflings' luck and Minotaurs' morale not below +1 (6.5); Disrupting Ray surviving Dispel and Cure (4.8.4.4).

## Part 3: Expert hits all friendly or all enemy stacks

Checked against the Heroes 3 wiki's raw page source (Haste, Slow, Precision, Prayer, Bless, Mirth, Disrupting Ray: each page's Expert effect), the game's own Expert descriptions already in `game/data/spells.json` ("Increases the speed of all friendly units", "Reduces the selected enemy unit's defense strength" for Disrupting Ray), and an open-source engine's spell config (`spells/timed.json`: the Expert level's range covers the whole battlefield) and its casting rules (a spell that hits everyone needs no target; the cast's description; a spell with nobody to affect can't be cast).

- **Which spells.** All fifteen lasting spells built so far but Disrupting Ray: Haste, Slow, Shield, Stone Skin, Bloodlust, Weakness, Bless, Curse, Precision, Air Shield, Prayer, Fortune, Misfortune, Mirth, Sorrow. The three sources agree. Disrupting Ray stays on one stack at Expert (all three). Cure, Dispel and the Protections (4.8.4.4) and Counterstrike and Forgetfulness (4.8.7) also hit all at Expert, with their parts.
- **Whose stacks.** A helpful spell goes on every one of the hero's living stacks, a harmful one on every living enemy stack (wiki: "all allied / all enemy units"; engine: a "smart" target that keeps helpful spells off enemies and harmful ones off friends). Precision only on the hero's shooters (wiki: "all friendly ranged units"; engine: its shooter condition), as at Basic and Advanced.
- **No aiming.** The spell is cast as soon as it is picked in the book: the book closes and every stack gets it (engine: a spell that hits everyone takes no target).
- **Nobody to affect.** With no stack it can go on (Expert Precision and no shooters), the book stays open and says "That spell will affect no one!" (`core.genrltxt.185`, engine); nothing is spent and the hero can still cast this round. This is the same rule 4.8.3 planned for Destroy Undead.
- **The value** is Expert's on every stack, for as many rounds as the hero's Power; a stack that already has the spell keeps the longer duration, as for one stack.
- **The cost** is Expert's, paid once (the costs in `game/data/spells.json`).
- **The combat log:** "Lord Haart casts 'Haste'." (`core.genrltxt.196`, "%s casts '%s'."; engine). The engine writes the one-stack line ("… on the Swordsmen.", `195`) when only one stack is hit.

### Decided with the user

- When an Expert spell hits only one stack (one enemy stack left, or one shooter for Precision), the combat log names it, as the engine does: "Lord Haart casts 'Slow' on the Pikemen."
- **Haste and Prayer** change the turn order for the rest of the round, as on one stack; the stack whose turn it is keeps it.

### What we do

- `game/data/spells.json`: each of the fifteen spells' `lasting` gets `allAtExpert: true`; another such spell is data only.
- Picking one with Expert in its school casts it straight from the book; below Expert it is aimed as now.
- The cast fact names every stack hit (`targetIds`), so a reload puts the spell back on the same stacks. The book asks the battle to cast, and closes when the cast is saved, or shows "That spell will affect no one!" when the battle finds no stack.
- A burst of light over each stack hit.

### Not yet (part 3)

- Immunities that keep a stack out of an Expert spell, such as undead and Bless or mind spells (4.8.6.1).
- Enemy heroes casting Expert spells on the player's stacks (8.1).

## Part 4: Cure and Dispel

Checked against the Heroes 3 wiki's raw page source (Cure, Dispel, the four Protections) and against an open-source engine's spell config (`spells/other.json`, `spells/timed.json`) and its rules for healing and for removing spells (which stacks can be targeted, which spells come off, a spell with nothing to do). Costs and descriptions are already in `game/data/spells.json`.

### Dispel (Water, 1; 5, or 4 with Water Magic)

- **Basic and none:** one of the hero's own stacks. **Advanced:** one stack of either side. **Expert:** every stack on the battlefield, both sides, cast straight from the book (wiki; engine; the game's descriptions say the same).
- **It removes every spell on the stack**, helpful and harmful, except Disrupting Ray, which stays until the battle ends (wiki: "unaffected by Dispel"; engine: Disrupting Ray is a spell that can't be removed).
- **A stack with no spell to remove can't be targeted** (engine: the target must have a spell Dispel can remove; the wiki says nothing). Hovering it says "Select Spell Target". Expert Dispel with no spell to remove anywhere says "That spell will affect no one!", as part 3.
- What a removed spell did goes with it: Speed (reach and the turn order for the rest of the round), Attack, Defense, damage, morale and luck, and the count box's colour.
- Expert Dispel also clears Fire Wall, Force Field, Land Mine and Quicksand (wiki, engine): with those spells (5.8 later).

### Cure (Water, 1; 6, or 5 with Water Magic)

- **Heals** 10 + 5 × Power hit points at Basic and with no skill, 20 + 5 × Power at Advanced, 30 + 5 × Power at Expert (wiki; the game's descriptions: "10 points more", "20 points more"). No Sorcery bonus (it raises damage only).
- **Only the top creature's lost health**: creatures already killed don't come back (engine: Cure's healing stops at the top creature; Resurrection is the spell that raises them). So a stack whose top creature is unhurt has nothing to heal.
- **Basic and Advanced:** one own stack. **Expert:** every own stack, cast straight from the book (wiki, engine).
- **It also removes the harmful spells** on the stack, but not Disrupting Ray, and not the helpful ones (wiki, engine).
- **A stack it can do nothing for can't be targeted** (engine: a stack must be hurt or have a harmful spell; the wiki says nothing): "Select Spell Target" over it, "That spell will affect no one!" for Expert Cure with no stack to help.
- **The combat log** has only the cast line ("Lord Haart casts 'Cure' on the Swordsmen.", `core.genrltxt.195`; "Lord Haart casts 'Cure'.", `196`); the engine writes no healing line for a hero's spell.

### The Protections

- Protection from Air (2), Earth (3), Fire (1), Water (1): an own stack takes 30% less damage from spells of that school at Basic, 50% at Advanced and Expert, all own stacks at Expert, for Power rounds (wiki, engine; Horn of the Abyss's 50/75 left out). Magic Arrow is in every school, and one Protection counts against it (wiki, Protection from Water; engine: the first school with a Protection).

### What we do

- **Dispel and Cure in this part; the Protections with area damage (4.8.5.1).** The hero's damage spells hit only enemy stacks until then, so a Protection on an own stack could not change anything a player sees. Fireball and the other area spells hit own stacks too, and that is where the Protections first count.
- **Cure removing harmful spells waits for enemy heroes casting (8.1)**, with the counters: until then the hero puts harmful spells only on enemy stacks and Cure goes only on own ones, so there is nothing for it to remove. Cure in this part heals.
- `game/data/spells.json`: Dispel's `removesSpells` gives its targets at each skill level (`own`, `own`, `any`, `any`), Cure's `heals` its `base` hit points at each skill level and `perPower`, and both have `allAtExpert`. Disrupting Ray's `lasting` has `cannotBeRemoved`. Another healing or removing spell later is data only.
- A stack keeps, with each spell on it, whether it can be removed. Hovering a stack Dispel can't go on, or one Cure has nothing to heal on, says "Select Spell Target", as for a stack of the wrong side.
- The cast fact keeps the hit points healed, so a reload heals the same, and Dispel's targets, so a reload removes the same spells.

### Decided with the user

- **Advanced Cure** heals one stack (wiki, engine); the game's own Advanced description in `game/data/spells.json` says "all friendly units". The description stays as the game has it.
- The Protections move to 4.8.5.1, and Cure removing harmful spells to 8.1.
- Dispel can't target a stack with no spell it can remove, nor Cure a stack it can't heal (engine).

### Not yet (part 4)

- The Protections (4.8.5.1). Cure removing harmful spells (8.1). Expert Dispel clearing Fire Wall, Force Field, Land Mine and Quicksand (5.8 later). Sphere of Permanence (7.8). Cure and Dispel cast by creatures (6.5).

## Not checked

- The count box's exact colours in the original game.

## Not yet

- Counters (Haste and Slow, Bloodlust and Weakness) and the even colour of the count box, with enemy heroes casting (8.1).
- The four Protections: built with area damage (4.8.5.1), see `docs/notes/2026-11-04-area-damage.md`.
- The creature window in battle with the spells and rounds left (4.3).
- Artifacts that lengthen spells, hero specialties in these spells, creatures casting them (Master Genie, Ogre Mage) and war machines immune to them (7.8, 6.5, with the creatures).
- Destroy Undead (5.8 later).
