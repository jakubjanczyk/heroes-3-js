# Retreat, Surrender and the battle results window (2026-10-20)

Roadmap 5.7 and 5.9. Follows `docs/notes/2026-10-20-wait-defend-auto-combat.md`.

## How Heroes 3 does it

- **Results window.** When a battle is over, the battle stays on screen, darkened, and a window opens over it. It shows each side's name (the hero, or the monster's creature) as Victorious or Defeated, a line on how it went, and "Battlefield Casualties": a row of the creatures each side lost, one picture per creature type with the number lost, or "None". OK (Enter) closes it and the adventure map comes back.
- **Retreat** (R). The game first asks "Are you sure you want to retreat?". The hero flees, the army is lost, and the hero goes to the tavern pool to be hired again. The monster keeps what it has left.
- **Surrender** (S). Only an enemy hero accepts it: the attacker pays the army's cost in gold and leaves with the army. Against neutral creatures the button is disabled.

## What we do

- `fact.battle.finished` (saved, with `outcome`: `won`, `lost` or `retreated`) ends the fighting and opens the results window. Nothing changes on the map yet. `command.battle.resultsClose.requested` (OK) then saves `fact.battle.ended` and what the battle did to the map: the monster gone and the experience gained, or the hero gone and the monster's count. So a reload with the window open shows it again, and the level-up popup opens only after OK.
- `game/heroes/battle-results.js` builds what the window shows from the battle. Casualties are what each stack had at the start less what it has left, added up per creature, so a monster split into several stacks is one entry. `ui.battle.updated` carries it as `results`.
- **Retreat** is enabled when Wait and Defend would be: on a hero stack's turn, with nothing moving and Auto combat off (`canRetreat`). The confirmation lives in the view only, and its OK sends `command.battle.retreat.requested`. A hero who retreats leaves the map as a beaten one does, and goes back to the tavern pool (`docs/notes/2026-10-26-defeated-hero.md`). Retreating gives no experience, and the casualties are the creatures killed before the hero ran.
- **Surrender** stays disabled; its title says neutral creatures do not accept surrender. There are no enemy heroes yet.
- The window text is from memory of the game, not checked against its text files: "A glorious victory!", "For valor in combat, {hero} receives {n} experience", "Your forces suffer a bitter defeat, and {hero} abandons your cause.", "The cowardly {hero} flees from battle.".
- There are no portraits or creature pictures yet. A casualty is shown as the stand-in the battlefield uses, with the creature's name under it.

## Not yet

- Portraits and creature pictures in the window.
- Surrender to an enemy hero; the retreated hero waiting in the player's tavern with their level and artifacts.
- Loot from neutral monsters (5.9).
