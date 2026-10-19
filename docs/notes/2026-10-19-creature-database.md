# Creature database (2026-10-19)

Roadmap 5.1, first step: the 14 Castle creatures, plus Skeleton and Skeleton Warrior because Skeletons are the creature the game already uses on the map and in the hero's army.

## How Heroes 3 does it

- **Stats.** Every creature has attack, defense, a damage range, health, speed, weekly growth, a cost and an AI value (the game's `CRTRAITS.TXT`).
- **Tiers and upgrades.** A faction has seven tiers, each with a basic creature and its upgrade (Pikeman → Halberdier, Skeleton → Skeleton Warrior).
- **Abilities.** Shooters have a number of shots (12, or 24 once upgraded), and many creatures have their own abilities: flying, double-wide, undead, shoots twice, strikes twice, jousting and so on. The Angel takes one hex but the Archangel two (VCMI `config/creatures/castle.json`).
- **Where the stats show.** Only in the creature window, opened from the hero screen or a town. The adventure info box shows pictures and counts only.

## What we do

- `game/data/monsters.json` holds every creature, map monsters and army troops alike, keyed by type (`PIKEMAN`, `ROYAL_GRIFFIN`, `SKELETON_WARRIOR`). Each has `name`, `namePlural`, `faction`, `tier`, `upgradesTo` (basic creatures only), `attack`, `defense`, `damage: { min, max }`, `health`, `speed`, `growth`, `cost` (resource type to amount, as starting resources: `{ "GOLD_PILE": 3000, "GEMS_PILE": 1 }`), `aiValue`, `abilities` and, for shooters, `shots`.
- Abilities are names only (`ranged`, `flying`, `doubleWide`, `undead`, `shootsTwice`, `strikesTwice`, `jousting`, ...). Nothing uses them until combat.
- Since the creatures are in the data, a scenario can put any of them on the map or in a hero's army; their names show in the status bar, the right-click popup and the army slots through the code the Skeletons already go through.
- Nothing shows the stats yet: as in the game, they belong in the creature window, which needs a hero screen or a town.
- `game/data/monsters.test.js` checks the file against the game's values, written out per creature.
- Tiers, upgrades, shots, double-wide and abilities were checked against VCMI's `config/creatures/castle.json` and `necropolis.json`. VCMI reads the base stats from the game files, so attack, defense, damage, health, speed, growth, cost and AI value are not cross-checked against a source yet.

## Not yet

- The other factions and the neutral creatures.
- Creature portraits: the army slots still show the map monster look.
- The creature window, army strength, and anything that uses the stats (combat, recruiting, monster experience).
