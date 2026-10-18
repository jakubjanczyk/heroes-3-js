# Hero primary skills (2026-10-18) — plan

Roadmap 4.1. The hero gets the four Heroes 3 primary skills: Attack, Defense, Power and Knowledge. They are shown wherever H3 shows them on the adventure map. They have no effect yet: Attack and Defense wait for combat (5.6), Power and Knowledge for magic (4.8).

## How Heroes 3 does it

- **Starting values come from the hero class.** Every hero has a class (Knight, Cleric, ...), and a level-1 hero starts with that class's four values. VCMI reads them from the original game's `DATA/HCTRAITS.TXT` (`lib/entities/hero/CHeroClassHandler.cpp`, `loadFromLegacyData`).
- **The map maker can override them.** The H3 map editor has "Customize primary skills" per hero placed on the map. That replaces the class values.
- **Minimums.** Attack 0, Defense 0, Power 1, Knowledge 1 (VCMI `HEROES_MINIMAL_PRIMARY_SKILLS`). VCMI raises a lower value to the minimum and logs a warning.
- **Spell points.** A hero starts with 10 × Knowledge spell points (no Intelligence skill yet).
- **Where they are shown.**
  - The info box in the adventure panel, for the selected hero (`CInteractableHeroTooltip`). It also holds the portrait and the name. Below them are four icons (sword, shield, spell book, scrolls) with the numbers in boxes underneath. There are no text labels. Next row: morale and luck, three army slots, then spell points. The four other army slots are below. Checked against a VCMI screenshot of the vanilla interface (`static/img/screenshots/1.6.0/Search object vanilla.jpg` in `vcmi/vcmi.eu`): Christian, a Knight, shows 2 2 1 1 and 10 spell points.
  - The right-click popup on a hero (`CInfoBoxPopup` with `CHeroTooltip`, `client/widgets/MiscWidgets.cpp`). It is the same box: portrait, name, the four values, spell points, morale, luck and the army. You see all of it for your own heroes, but only name and army for others.
  - The hero screen (not built yet: 4.1 / 4.3) labels them "Attack", "Defense", "Power", "Knowledge".

### Starting values per class (Attack / Defense / Power / Knowledge)

From the homm.fandom.com "Hero class" table:

| Class | Faction | A | D | P | K |
|---|---|---|---|---|---|
| Knight | Castle | 2 | 2 | 1 | 1 |
| Cleric | Castle | 1 | 0 | 2 | 2 |
| Ranger | Rampart | 1 | 3 | 1 | 1 |
| Druid | Rampart | 0 | 2 | 1 | 2 |
| Alchemist | Tower | 1 | 1 | 2 | 2 |
| Wizard | Tower | 0 | 0 | 2 | 3 |
| Demoniac | Inferno | 2 | 2 | 1 | 1 |

The other eleven classes (Heretic, Death Knight, Necromancer, Overlord, Warlock, Barbarian, Battle Mage, Beastmaster, Witch, Planeswalker, Elementalist) are left for when we can check them against a source.

## What we do

- `game/data/hero-classes.json` holds the starting values per class. `game/data/hero.json` gets a class: the one hero type is a Knight.
- A hero on the map may set `primarySkills` in the scenario, like the H3 editor. A skill it gives replaces the class value, and a skill it leaves out keeps the class value.
- The scenario loader rejects (does not clamp) an unknown skill name, a value that is not a whole number, and a value below the H3 minimum. It already does the same for monster counts and starting resources.
- Info box: the four values under the name, in H3 order, with a CSS/SVG icon each and no text label. Screen readers get "Attack 2" and so on. Spell points go after the third army slot, as in H3.
- Right-click popup on the hero: the name, then the same four values and spell points.
- Nothing is stored in the event log. The values come from the scenario and nothing changes them yet. Leveling (4.2) will be the first thing that does.

## Not yet

- Effects of the skills (combat, spell power, mana use and regeneration).
- Morale and luck, portrait art, the hero screen.
- Other players' heroes showing only name and army.
