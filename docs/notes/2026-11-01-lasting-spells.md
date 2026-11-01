# Spells that last (2026-11-01)

Roadmap 4.8.4, the fourth of eight parts of hero magic (4.8, 5.8): spells that put an effect on a stack for some rounds. Built in four parts:

1. How a lasting spell works, with the six spells that change a stat: Haste, Slow, Shield, Stone Skin, Bloodlust, Weakness.
2. Bless, Curse, Precision, Air Shield, Disrupting Ray, Prayer, Fortune, Misfortune, Mirth, Sorrow.
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
- **Counters:** Haste removes Slow and Slow removes Haste on the stack (wiki, Counter and the spells' pages; engine). The engine also makes Bloodlust and Weakness counter each other; the wiki lists them as neither counters nor opposites. See the open questions.

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
- **The count box** turns green for a stack with more helpful spells, red for more harmful, and a third colour when they are even (our own colours until the battle's graphics, 10.x).
- **The rounds** run out when a new round starts; the box turns back.
- **A reload** keeps the spells and the rounds left: the cast is a saved fact and the rounds are replayed.

## Not checked

- What happens when the same spell is cast again on a stack that has it (a new duration, or the longer of the two; the new level's value). The engine keeps the longer duration; the wiki says nothing.
- Whether Bloodlust and Weakness counter each other (the engine says so, the wiki doesn't).
- The count box's exact colours in the original game.

## Not yet

- Expert hitting all stacks (4.8.4.3); the other lasting spells (4.8.4.2, 4.8.4.4).
- The creature window in battle with the spells and rounds left (4.3).
- Artifacts that lengthen spells, hero specialties in these spells, creatures casting them (Master Genie, Ogre Mage) and war machines immune to them (7.8, 6.5, with the creatures).
- Destroy Undead (5.8 later).
