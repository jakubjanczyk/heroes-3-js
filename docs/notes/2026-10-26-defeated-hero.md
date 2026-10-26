# A defeated hero (2026-10-26)

Roadmap 4.5.5. Follows `docs/notes/2026-10-25-tavern.md`.

## How Heroes 3 does it

Checked against the Heroes 3 wiki (heroes.thelazy.net: Combat, Tavern, and the game's changelogs).

- **Beaten.** The hero leaves the map. Their artifacts go to the winning hero, and the hero goes back to the pool the taverns offer heroes from.
- **Retreat.** The hero keeps all their artifacts but loses the army, and gets no experience from the battle. They are in the player's tavern straight away, with one creature of their default stack. Retreating on day 7 after the turn has passed puts them in one of the tavern's places instead of a new hero.
- **Surrender.** Only against an enemy hero, for half the recruitment cost of the creatures left (gold only). The hero waits in the player's tavern with the army left to them and all their artifacts.
- A hero hired again on the day they were beaten, retreated or surrendered doesn't get full movement points.
- **Tavern armies.** Only the two heroes offered at the start of a week bring their starting army. A hero who takes a hired one's place brings a single non-upgraded first-level creature.
- The wiki doesn't say whether a beaten hero hired again keeps their level and skills.

## What we do

- A beaten hero hired again is a level 1 hero of their class, with the class's primary skills and a new starting army: hiring always makes a new hero (`fact.hero.hired`), whatever the hero was before.
- The pool is the tavern's heroes (`game/data/tavern.json`) followed by the heroes the scenario started with, by name (`heroPool` in `game/heroes/tavern.js`). Heroes on the map are never offered, so a hero is in the pool again as soon as they leave the map.
- A hero who retreats is treated as a beaten one.
- The hero list drops a hero removed from the map and, if they were selected, selects and centres on the player's next hero.
- A hero filling the place of one just hired brings one creature of the first stack of their class's starting army.

## Not yet

- The artifacts going to the winner (no artifacts or enemy heroes yet).
- The retreated hero waiting in the tavern with their level and artifacts; surrender.
- Keeping the movement points left when hired again on the same day.
