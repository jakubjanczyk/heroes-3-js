# Treasure chests and hero levels (2026-10-19)

Roadmap 4.2, first step, through the Treasure Chest (7.7). Chests are the simplest source of experience: unlike monsters, they need no creature stats.

## How Heroes 3 does it

- **Treasure Chest.** Walking up to one opens a dialog: "After scouring the area, you fall upon a hidden treasure cache. You may take the gold or distribute the gold to the peasants for experience. Do you wish to keep the gold?" The player picks the gold or the experience (two icons with the amounts) and confirms with OK. The chest is gone either way.
- **What a chest holds.** 1000 gold or 500 experience (32%), 1500 or 1000 (32%), 2000 or 1500 (31%), or an artifact (5%).
- **Levels.** Level 2 needs 1000 experience, then 2000, 3200, 4600, 6200, 8000, 10000, 12200, 14700, 17500 and 20600 for level 12. After that each step is 20% bigger than the one before, rounded down (VCMI `CHeroHandler::expPerLevel`).
- **Level-up.** The player does not choose the primary skill: the game rolls it by the hero class's chances, which change after level 9 (Knight: Attack 35%, Defense 45%, Power 10%, Knowledge 10% up to level 9; 30/30/20/20 after). The choice on level-up is between two secondary skills. Each level gained shows its own popup.
- **Where experience shows.** Level and experience are on the hero screen only; the adventure info box shows primary skills, not the level.

## What we do

- A chest in the scenario is `{ "kind": "TREASURE_CHEST", "type": "TREASURE_CHEST", "tier": 2 }`; the tier (1, 2 or 3) picks its rewards (`game/heroes/treasure-chest.js`). The hero stops next to it, as for resources.
- The dialog is the interaction modal with choices: OK stays disabled until gold or experience is picked. Modals now wait their turn instead of replacing each other, so several level-up popups show one after another.
- Choosing gold logs `fact.treasureChest.opened` with the gold, which the resource bar adds. Choosing experience logs the same fact without gold, then sends `command.hero.experience.gain.requested`.
- `hero-levels.module.js` handles that command: it logs `fact.hero.experience.gained`, and for each level crossed rolls a primary skill (`config.random`, `Math.random` by default) and logs `fact.hero.leveledUp` with it before opening the popup. Replaying the log rebuilds the experience and skills without rolling again.
- The info box and the hero's right-click popup add the level-up skills to the hero's primary skills.
- A scenario may set a hero's starting `experience` (default 0), as the map editor allows.
- The chest on the map is pixel art in the style of the game's chest, kept in the source as rows of palette keys (`treasure-chest-sprites.js`) and drawn at the resource sprites' scale. The dialog's experience picture is a gold star standing in for the game's experience icon; the gold picture is the gold resource sprite.
- Dialogs are Heroes 3 message boxes, the same box as the right-click popup (`game/ui/message-box.css`): leather background, player-coloured gold-trimmed frame, centred text without a heading, the pictures with "or" between them and a gold frame on the picked one, and OK at the bottom centre.

## Not yet

- Random tiers and artifact chests; XP from monsters (needs creature stats, 5.1).
- Secondary skill choice on level-up (4.7).
- A hero screen showing level and experience.
