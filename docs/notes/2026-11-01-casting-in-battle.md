# Casting in battle, single-target damage (2026-11-01)

Roadmap 4.8.3, the third of eight parts of hero magic (4.8, 5.8): the hero casts a spell in battle, once a round, and five damage spells work: Magic Arrow, Lightning Bolt, Ice Bolt, Implosion and Destroy Undead. Spells that last are 4.8.4, area damage 4.8.5, immunities and Resistance 4.8.6.

Built in seven small parts (decided with the user):

1. The spell book in battle: opened by Cast spell, combat spells only, nothing cast yet.
2. Casting Magic Arrow at no skill: damage, spell points, the combat log, a reload.
3. Once a round, and Cast spell off with Auto combat.
4. Aiming: the status bar texts, the spell cursor, cancelling.
5. School skill levels: Advanced and Expert damage, the best school, the cost.
6. Lightning Bolt, Ice Bolt, Implosion, Sorcery, and the damage in the right-click description.
7. Destroy Undead.

## How Heroes 3 does it

Checked against the Heroes 3 wiki's raw page source (Magic Arrow, Lightning Bolt, Ice Bolt, Implosion, Destroy Undead, Sorcery, Primary skill, Spell damage reduction, and the `GENRLTXT.TXT` page of Translation Data), against the spell descriptions already in `game/data/spells.json` (the game's own `SPTRAITS.TXT` texts), and against an open-source engine's spell config, spell casting rules, battle log scripts and spell book window. Shadow of Death rules: the wiki marks Horn of the Abyss values, which are left out.

### When the hero can cast

- **Once a round.** The hero casts at most one spell each battle round. Asked again, the game says "Your hero has already cast a spell this round." (`core.genrltxt.128`; the engine counts casts per side per round, one for a hero).
- **On one of the hero's stacks' turns.** Casting doesn't use the stack's turn: the same stack acts afterwards (engine: a hero's cast is not a unit action).
- **Needs a spell book** (engine: no spell book, no casting).

### Choosing the spell

- **The Cast spell button** opens the spell book on its combat spells. It remembers its own bookmark and spread for battles (4.8.1).
- **Clicking a combat spell** the hero can afford closes the book and the hero aims it. A spell that costs more than the hero has says `core.genrltxt.206`, as on the map (4.8.1).
- **A spell with no target** says "That spell will affect no one!" (`core.genrltxt.185`, engine) and the book stays open; for this part, Destroy Undead with no undead on the battlefield.
- **Clicking an adventure spell in battle** shows its description, as a combat spell does on the map (engine). We don't let the battle book turn to the adventure spells at all (decided with the user).
- **Right-clicking a damage spell** adds " Does %d points of damage." (`core.genrltxt.343`) to its description, worked out for this hero's Power, skill and Sorcery (engine), on the map and in battle.

### Aiming

- **The single-target spells hit an enemy stack only** ("the selected enemy unit", wiki; the engine's single-target damage spells only take an enemy).
- **Hovering an enemy stack**, the status bar says "Cast Magic Arrow on Pikemen" (`core.genrltxt.27`, "Cast %s on %s", with the stack's name for its count; engine). Anywhere else it says "Select Spell Target" (`core.genrltxt.23`) and a click does nothing.
- **Right-clicking cancels** the spell: "Spell cancelled" (`core.genrltxt.731`, engine). The spell points aren't spent and the hero may still cast this round.
- **Destroy Undead isn't aimed**: it hits every undead stack on the battlefield, both sides' (wiki: "All undead troops receive …"; engine: the whole battlefield, not only enemies, undead only).

### Damage

| Spell | None / Basic | Advanced | Expert | Per point of Power |
|---|---|---|---|---|
| Magic Arrow | 10 | 20 | 30 | 10 |
| Lightning Bolt | 10 | 20 | 50 | 25 |
| Ice Bolt | 10 | 20 | 50 | 20 |
| Implosion | 100 | 200 | 300 | 75 |
| Destroy Undead | 10 | 20 | 50 | 10 |

- **Damage = the level's base + Power × the spell's multiplier** (wiki, each spell's page). The steps between levels are also in the game's own descriptions ("Damage inflicted is 10 points more than Basic Magic Arrow", 20 at Expert; 10 and 40 for Lightning Bolt, Ice Bolt and Destroy Undead; 100 and 200 for Implosion), which agree.
- **No skill casts as Basic**: the wiki gives one value for both, and the game's descriptions count Advanced and Expert from Basic.
- **The school's skill level** is the hero's level in the spell's school; Magic Arrow is in all four and uses the best of them (wiki, Magic Arrow; already in `spellSkillLevel`).
- **Power** is the hero's total, artifacts included. A hero whose Power is 0 casts as if it were 1 (wiki, Primary skill).
- **Sorcery** adds 5 / 10 / 15% at Basic / Advanced / Expert (wiki, its Shadow of Death values; the engine's skill config), rounded down (engine).
- **The target takes the damage** as from a strike: the wounded top creature first, the rest down the stack (engine; our `takeDamage`). Spell damage isn't changed by Attack, Defense or luck.
- **Spell damage reduction** (Golems) and immunities come with the creatures that have them and 4.8.6.

### The combat log

- **The cast:** "Lord Haart casts 'Magic Arrow' on the Pikemen." (`core.genrltxt.195`, "%s casts '%s' on the %s."); for a spell with no target, "Lord Haart casts 'Destroy Undead'." (`core.genrltxt.196`) (engine).
- **The damage:** "The Magic Arrow does 30 damage." (`core.genrltxt.376`, the strike's own line with the spell's name), then " One Pikeman perishes." or " 3 Pikemen perish." (`core.genrltxt.378`, `379`) (engine).
- **Destroy Undead:** the game has its own line, "The %s spell does %d damage to all undead creatures." (`core.genrltxt.186`). The engine doesn't use it: it writes the damage line with the total damage and "N creatures perish" for all stacks together.

## What we do

### The spell book in battle (4.8.3.1)

- **Cast spell** on the battle bar (keyboard C) opens the hero's spell book on the combat spells. It works on the player's stacks' turns; it is off for a hero without a spell book, on the enemy's turns and while a stack walks. With Auto combat on the player has no turn, so it is off too.
- **Combat spells only.** In battle the book's Adventure spells pennant is off; the Combat spells one shows as chosen.
- **Its place.** The battle book reopens on the bookmark and spread it was left on in battle; the map's book keeps its own (4.8.1), until the page reloads.
- **Clicking a spell** shows its description in the box over the book, as on the map, or the "That spell costs …" message. Casting starts in 4.8.3.2.
- **Closing it** (Close, Enter or Escape) goes back to the battle with the same stack to act.

### Casting a damage spell (4.8.3.2)

- **Generic.** A combat spell with `damage` in `game/data/spells.json` (`base`: none, Basic, Advanced, Expert; `perPower`) is cast on one enemy stack; the others still show their description. Magic Arrow, Lightning Bolt, Ice Bolt and Implosion have it, so the school's skill level (the best school for Magic Arrow) already sets their damage and cost.
- **Picking and aiming.** Clicking the spell in the battle book closes it; the next click on an enemy stack casts it. A click anywhere else cancels the spell (decided with the user), and so does a battle button.
- **The hit** shows as a burst of light over the stack for a second, a stand-in for the spell's own animation (10.3). A reload doesn't show it again.
- **The fact** `fact.battle.spell.cast` names the hero, the spell, its target, the damage and the spell points it cost.

### Later parts

- **Data.** Each damage spell in `game/data/spells.json` gets its damage: the base at each skill level (four numbers, none to Expert) and the multiplier for Power, and Destroy Undead its targets (every undead stack). Adding a damage spell later is data only, as far as its targets are ones we have.
- **Spell points and the cast are saved** as one fact naming the hero, the spell, its target and the damage each stack took, so a reload replays it, and the hero's spell points go down by the spell's cost. They stay spent after the battle, won, lost or fled.
- **The Cast spell button** works on the player's stack's turn for a hero with a spell book (keyboard C). It is off on the enemy's turns, while a stack walks, with Auto combat on, and for a hero without a spell book. Once the hero has cast this round it stays on and clicking it gives the "already cast" message in a box over the battle, closed with OK.
- **Other combat spells** (Haste, Bless, Fireball, …) show their description when clicked in battle, until their parts (4.8.4, 4.8.5, 4.8.7).
- **Aiming** uses a spell cursor over a stack it can hit; elsewhere the status bar asks for a target. Right-click or Escape cancels, saying "Spell cancelled" in the status bar; a click on anything but an enemy stack cancels too (4.8.3.2).
- **A spell that kills the last enemy stack wins the battle**, as a strike does.
- **Destroy Undead's log:** to decide (below).

## Not checked

- What the original game does when the Cast spell button is clicked after the hero has cast this round (message or a disabled button): the text exists (`core.genrltxt.128`); the engine refuses the cast.
- Where "Spell cancelled" shows in the original game: the engine shows it as a popup.
- The multipliers for Power come from one source (the wiki's spell pages; its Implosion page compares them: 75 for Implosion, 10 for Magic Arrow). The game's file isn't online and the engine reads it from there; the other fan wikis can't be reached from here.

## Not yet

- Spells that last, area damage, immunities and Resistance, control spells (4.8.4 to 4.8.7).
- The casting animation, each spell's own animation and the hero's casting pose (10.3), in place of the burst of light.
- Enemy heroes casting, and the combat AI and Auto combat casting (8.1, 5.7b).
- The Orbs (more damage for one school), hero specialties in spells, Golems' spell damage reduction (7.8, 6.5, with the creatures).
