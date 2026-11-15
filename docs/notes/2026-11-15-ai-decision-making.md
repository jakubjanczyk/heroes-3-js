# AI decision making

Roadmap 8.4. Computer heroes do more than pick up resource piles (8.3.1, `docs/notes/2026-11-13-ai-basics.md`): they take mines and dwellings, explore, fight monsters they can beat, and their towns build and recruit. Each decision reuses the moves the player's hero makes: the AI only picks what to ask for.

## Parts

Each part is one PR.

1. **8.4.1 Capturing mines and dwellings.** A computer hero's targets are resource piles, and mines and dwellings not flagged by its owner, that it can reach without a fight; it goes to the nearest one. A guarded dwelling is not a target. Flagging a dwelling recruits nothing (8.4.4).
2. **8.4.2 Exploration.** With nothing to go to, a computer hero walks towards the nearest tile its owner hasn't explored, revealing the map for its owner as the player's hero does.
3. **8.4.3 Town building.** Each day a computer player builds one building in each town that can, in a fixed order: income, then dwellings, then the rest.
4. **8.4.4 Recruiting.** A computer hero in its own town, or at its own dwelling, recruits what its owner can pay for, strongest creatures first; with it a hero may leave its town (it stays only while it has nothing to go to).
5. **8.4.5 Fighting monsters.** A computer hero attacks a monster (or a dwelling's guards) its army is stronger than, by the army's total creature strength; the battle is fought without being shown, with the battle AI on both sides, and its result shown on the map.
6. **8.4.6 Attacking the player.** A computer hero attacks the player's heroes, towns and garrisons it is stronger than; the player fights the battle on the battle screen during the computer's turn.
7. **8.4.7 Threat response.** A weak computer hero keeps away from stronger enemy heroes; a hero goes back to defend its town when an enemy hero stronger than the garrison can reach it next day.
8. **8.4.8 Weighing goals.** Targets compared by what they are worth against the days they cost, instead of the nearest first.

Difficulty levels are left out until a scenario setup screen can choose them (9.2); the computer players' starting resources (8.1.12) already depend on a difficulty.

## Rules, as checked

The game's own AI is not documented; what the computer does is ours to decide. Only what the player sees follows the game:

- **A mine or dwelling flagged by a computer hero** shows its new owner's flag on the map and the minimap, as for any capture (8.1.4). Not yet checked: whether the player gets a message when a computer hero takes one of the player's mines. Planned: no message, as for piles.
- A computer player's mines pay it the mine's income each new day (3.3), as the player's do.

## Decisions

- **One list of targets** for 8.4.1: piles, mines and dwellings not owned by the hero's owner, the nearest by movement points, ties to the top row then the left, as for piles.
- **A dwelling is a target only when unguarded** (guards are fought in 8.4.5).
- **The recruit window never opens for a computer hero**, and neither does the info box's "Mine captured" (the hourglass stays).
- A hero standing in its own town still stays there (until 8.4.4).

## Built

- **8.4.1**: a computer hero's targets are resource piles not yet picked up, mines its owner doesn't own and dwellings its owner hasn't flagged that have no guards against it; it goes to the nearest it can reach without a fight, by the movement points the route costs (ties to the top row, then the left), and on to the next until its movement points run out. A taken mine shows its new owner's flag on the map and the minimap and pays them from the next day. Another player's hero arriving anywhere opens nothing on the player's screen: no recruit window, no question and no message; the facts it sets off (a flag, a pile picked up) still happen. The hourglass stays in the info box throughout.
- **8.4.2**: a computer hero with no pile, mine or dwelling it can reach without a fight goes to the nearest tile its owner has explored that is empty and touches unexplored ground, by the movement points the route costs (ties to the top row, then the left), past no monster. Walking there reveals the tiles around it for its owner, not for the player; the hero then decides again, so a pile it finds is picked up the same day if it can reach it, and a tile too far for today is reached on a later day. With nothing unexplored it can reach, or fog of war off, it stays where it is; a hero in its own town still stays there.

## Plan for 8.4.2

- **What "nothing to go to" means**: no target of 8.4.1's list (pile, mine, dwelling) the hero can reach without a fight, however many days away. A known pile three days off comes before an unexplored tile next door.
- **Where it goes**: a computer hero only walks on tiles its owner has explored (8.3.1), so it can't target an unexplored tile itself. It goes to the nearest explored, empty, passable tile that touches (in any of the eight directions) a tile its owner hasn't explored, by the movement points the route costs, ties to the top row then the left, as for targets. Walking there reveals the tiles around it for its owner, as the player's hero does (a hero sees 5 tiles); the hero then decides again, so a pile found on the way is picked up the same day if it is in reach.
- A tile it can only reach past a monster, or by stepping onto a guarded tile, doesn't count, as for targets.
- A tile too far for today is walked towards and reached on a later day.
- With fog of war off, or once every tile it can reach has nothing unexplored next to it, the hero stays where it is.
- A hero standing in its own town still stays there (8.4.4).
- What a computer hero explores is its owner's: the player's fog doesn't lift where it walks.
- Checked against the reference engine's AI, which explores too but picks a tile by the tiles it reveals, squared, over the movement points it costs. We take the nearest tile now and leave weighing it to 8.4.8. The original game's AI is not documented.
- One small refactor first: the choice of the nearest reachable tile in `game/heroes/computer-heroes.js` is taken out of the target code, so targets and exploration tiles go through the same choice.

## Plan for 8.4.1

- The computer player's targets are found from the scenario's entities by their arrival interaction (resource collect, mine enter, dwelling visit), and a mine or dwelling drops out once its owner is the hero's.
- A computer hero arriving at a dwelling flags it; the outcome that opens the recruit window is only for the viewing player's hero.

## Left for later

- Everything listed above after 8.4.1, and difficulty levels (9.2).
- Resource generators (windmills, water wheels) as targets: 8.4.8, where a target's worth is weighed.
- Recruiting at a flagged dwelling: 8.4.4.
- Exploring towards the tile that reveals the most for its cost, rather than the nearest: 8.4.8.
