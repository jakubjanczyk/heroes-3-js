# Hero primary skills (2026-10-18)

Roadmap 4.1. The hero has the four Heroes 3 primary skills: Attack, Defense, Power and Knowledge. They are shown wherever H3 shows them on the adventure map. They have no effect yet: Attack and Defense wait for combat (5.6), Power and Knowledge for magic (4.8).

## How Heroes 3 does it

- **Starting values come from the hero class, not from the hero.** Every hero has a class (Knight, Cleric, ...), and a new hero starts with that class's four values. VCMI reads them from the original game's `DATA/HCTRAITS.TXT` (`lib/entities/hero/CHeroClassHandler.cpp`, `loadFromLegacyData`). A hero's own data (`config/heroes/castle.json`: Orrin, Valeska, Edric, ...) has only the class, starting secondary skills and specialty, and `CGHeroInstance::initHero` sets each primary skill from `getHeroClass()->primarySkillInitial`.
- **The map maker can override them.** The H3 map editor has "Customize primary skills" for each hero placed on the map. VCMI reads it as the hero's `primarySkills` from the map, and it replaces the class values.
- **Minimums.** Attack 0, Defense 0, Power 1, Knowledge 1 (VCMI `HEROES_MINIMAL_PRIMARY_SKILLS`). VCMI raises a lower value to the minimum and logs a warning.
- **Where they are shown.**
  - The info box at the bottom of the adventure panel, for the selected hero (`CInteractableHeroTooltip`, `client/widgets/MiscWidgets.cpp`).
    - Top row: the portrait, and beside it the name over four icons (sword, shield, spell book, books) with the numbers in boxes underneath. There are no text labels.
    - Next row: morale and luck, three army slots, then spell points. The four other army slots are below.
    - Checked against a VCMI screenshot of the vanilla interface (`static/img/screenshots/1.6.0/Search object vanilla.jpg` in `vcmi/vcmi.eu`): Christian, a Knight, shows 2 2 1 1.
  - The right-click popup on a hero (`CInfoBoxPopup` with `CHeroTooltip`), which is the same box.
  - The hero screen (not built yet) labels them "Attack", "Defense", "Power", "Knowledge".

### Starting values per class (Attack / Defense / Power / Knowledge)

From the homm.fandom.com "Hero class" table. Only the Knight is in the game data for now.

| Class | Faction | A | D | P | K |
|---|---|---|---|---|---|
| Knight | Castle | 2 | 2 | 1 | 1 |
| Cleric | Castle | 1 | 0 | 2 | 2 |
| Ranger | Rampart | 1 | 3 | 1 | 1 |
| Druid | Rampart | 0 | 2 | 1 | 2 |
| Alchemist | Tower | 1 | 1 | 2 | 2 |
| Wizard | Tower | 0 | 0 | 2 | 3 |
| Demoniac | Inferno | 2 | 2 | 1 | 1 |

The other eleven classes are left for when we can check them against a source.

## What we do

- `game/data/hero-classes.json` holds the starting values per class (only the Knight). `game/data/hero.json` names the hero's class.
- A hero in the scenario may set `primarySkills` (`{ "attack": 3 }`). A skill it gives replaces the class value, and a skill it leaves out keeps the class value.
- The scenario loader rejects an unknown skill name, a value that is not a whole number, and a value below the H3 minimum. It does not clamp, matching how monster counts and starting resources are checked. The skill list (`game/heroes/primary-skills.js`) comes from the heroes content and is passed to `loadGame`, as terrain types are.
- Info box, in the H3 layout:
  - Top row: the portrait (the hero's initial until there are portraits), and beside it the name over the four skills.
  - Each skill is an SVG icon with its value in a box underneath. Screen readers hear "Attack" and the value; the mouse gets the name as a tooltip.
  - Below: three army slots, then four. The morale, luck and spell points slots are left out until those exist.
  - On short screens the army goes into one row, as before. On portrait phones the panel is too small for the portrait (the hero list shows it), so it is the name, the skills and one row of army.
- Right-click popup on the hero: the name, then the same four skills.
- Nothing is stored in the event log. The values come from the scenario, and nothing changes them yet. Leveling (4.2) will be the first thing that does.

## Not yet

- Effects of the skills (combat damage, spell power, mana).
- Spell points, morale and luck, portrait art, the hero screen.
- Other players' heroes showing only name and army.
- The other hero classes.
