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
- A hero standing in its own town stayed there until 8.4.4; it now leaves once it has somewhere to go, exploring included.

## Built

- **8.4.1**: a computer hero's targets are resource piles not yet picked up, mines its owner doesn't own and dwellings its owner hasn't flagged that have no guards against it; it goes to the nearest it can reach without a fight, by the movement points the route costs (ties to the top row, then the left), and on to the next until its movement points run out. A taken mine shows its new owner's flag on the map and the minimap and pays them from the next day. Another player's hero arriving anywhere opens nothing on the player's screen: no recruit window, no question and no message; the facts it sets off (a flag, a pile picked up) still happen. The hourglass stays in the info box throughout.
- **8.4.2**: a computer hero with no pile, mine or dwelling it can reach without a fight goes to the nearest tile its owner has explored that is empty and touches unexplored ground, by the movement points the route costs (ties to the top row, then the left), past no monster. Walking there reveals the tiles around it for its owner, not for the player; the hero then decides again, so a pile it finds is picked up the same day if it can reach it, and a tile too far for today is reached on a later day. With nothing unexplored it can reach, or fog of war off, it stays where it is; a hero in its own town still stays there.
- **8.4.3**: at the start of a computer player's turn, before its heroes move, each of its towns builds one building it can pay for that day. A town aims for its income halls first, then its dwellings in the Hall's order (every basic dwelling before any upgrade), then the rest in the Hall's order, and builds a building's missing requirements on the way to it (a Tavern before the Town Hall, the Stables before the Training Grounds). A building it can't pay for, or can't build (no water, a Capitol in another of its towns), is passed over for the next it can; with none it builds nothing. The cost comes out of its owner's resources. Nothing is shown while it happens; the player sees it in the town's fort icon, the Thieves' Guild and the town screen once they take the town. A reload during the turn doesn't build again.
- **8.4.4**: when a computer hero's move comes and it stands in its own town (after the town has built), its owner recruits there: the creatures of every standing dwelling, strongest first by AI value (an upgraded creature before the plain one sharing its pool), each as many as are available and the owner can pay for, into the garrison. The hero then takes the garrison's stacks, strongest first, onto a stack of the same creature or an empty slot; what doesn't fit stays. A hero arriving at a dwelling of its owner's recruits as many as are available and the owner can pay for (a first-tier dwelling's for free), and a flagged dwelling is a target again while it has creatures the owner can pay for and the hero has room for. A hero no longer stays in its town for good: it leaves for a target or to explore. No window or message opens for the player; the stack move and split commands now name the town they act on.

- **8.4.5**: a computer hero's targets also take in monsters on tiles its owner has explored, and dwellings whose guards, it is stronger than: its army's total AI value times √((1 + 0.05 × Attack) × (1 + 0.05 × Defense)) above the enemy's total AI value × 1.1. It goes to the nearest target as before; a monster is reached only by a route whose battle is with that monster alone. A guarded dwelling's question is answered yes without showing it. The battle is fought at once and unseen: the battle AI plays both sides, each action is saved, the results are applied at once (no results window, no dwelling recruit window). A won battle leaves the hero with its survivors and the experience, and it carries on with the movement points it has left (recruiting at a dwelling it has just taken); a lost one removes it from the map for good. A battle in which no stack can get anywhere is lost. The player sees the walk when they can see it, then the monster fading out or the hero gone; the hourglass stays.

## Plan for 8.4.5

- **Which monsters**: a monster on a tile its owner has explored is a target when the hero is stronger than it. The hero's strength is its army's total AI value (each creature's AI value times its count) times √((1 + 0.05 × Attack) × (1 + 0.05 × Defense)). The monster's is its own total AI value. The hero must be stronger by more than a tenth: its strength above the monster's × 1.1 (agreed). Checked against the reference engine's AI (the hero's fighting strength, and the safe attack ratio of 1.1 used at every difficulty). The original game's AI is not documented. The magic part of the reference engine's hero strength is left out, since computer heroes don't cast in battle yet.
- **Guarded dwellings**: a dwelling whose guards the hero is stronger than, by the same rule, is a target too. Arriving there starts the battle without the question the player is asked; once it is won the dwelling is flagged and the hero recruits there as at any of its owner's dwellings (8.4.4).
- **How it gets there**: a monster joins the one list of targets, nearest by movement points (ties to the top row, then the left). The route to it may pass by no other monster: the battle it ends in must be with the target. Piles, mines and dwellings still can't be reached past a monster, so a pile behind a weak monster is picked up once the monster is beaten.
- **The battle**: fought at once and unseen: no battle screen, no music change, no results window. The battle AI plays both sides, stack by stack, as with auto combat; the computer hero doesn't cast, retreat or surrender. Each action is saved as the player's are, so a reload during it carries on from where it was.
- **Won**: the monster leaves the map, the hero keeps what survived, gains the experience and levels up as 8.1 already does for another player's hero (a skill offer taken at random). It then goes on with its movement points left, as the player's hero does after a battle.
- **Lost**: the hero leaves the map and is gone (not to the tavern, as for the player's beaten hero; agreed); the monster keeps what survived, with its count on the map shown smaller.
- **What the player sees**: the hero walking up to the monster, when the player can see those steps (8.3.2), then the monster gone, or the hero gone; nothing else. The hourglass stays. The hero's popup shows its smaller army (size words, exact counts with Expert Visions).
- One refactor first: the battle module's defender `afterWin` (the dwelling's recruit window) and the results window only for the viewing player's hero, by one check that the battle is unseen.

## Plan for 8.4.4

- **When, in a town**: when a computer hero's turn to move comes and it stands in its own town, its owner recruits there, then the hero decides where to go. The towns have built by then, so a dwelling built that morning recruits the same day.
- **Where recruits go**: into the town's garrison, as the player's recruits do (the recruit window's army is the town's upper one). The hero then takes the garrison's stacks into its army (the garrison it found too, agreed), strongest first, as far as its seven slots allow; a stack of a creature it already leads joins that stack, and what doesn't fit stays in the garrison. Checked against the reference engine's AI, which recruits into the town's upper army and then has the visiting hero take the best creatures from the garrison.
- **What, in a town**: every creature its standing dwellings offer, strongest first by the creature's AI value across all tiers (so an upgraded creature comes before the plain one of its tier, which shares its pool), each as many as are available and its owner can pay for. A creature with no room in the garrison is passed over. Checked against the reference engine's AI, which buys from the top of the dwelling down, as many as it can afford.
- **At a dwelling**: a computer hero arriving at a dwelling of its owner's (just flagged, or flagged before) recruits as many of its creatures as are available and its owner can pay for; a first-tier dwelling's creatures join for free, as for the player. With no room in the army it recruits nothing.
- **Dwellings as targets again**: a dwelling its owner has flagged is a target while it has creatures the owner can pay for at least one of and the hero has room for, so a hero goes back to it after the new week.
- **Leaving its town**: a hero in its own town no longer stays there for good; after recruiting, it leaves once it has somewhere to go, exploring included (agreed).
- **What the player sees**: nothing while it happens, as for building: no recruit window, no message (a free dwelling's "join your army" message neither), the hourglass stays. Afterwards: the hero's army in its popup (size words, exact counts with Expert Visions), the Thieves' Guild's rows, and the creatures gone from the town or dwelling once the player takes it.
- Nothing is saved up (agreed): recruiting spends what the owner has, so the next day's building may have to wait (weighing is 8.4.8).
- A reload during the computer's turn doesn't recruit twice: what was recruited is no longer available.
- One refactor first: the town's stack move and split commands name the town (they act on the open town now), so the computer player can move a garrison's stacks to its visiting hero without the town screen.

## Plan for 8.4.3

Agreed: build what can be paid for today, with no saving up (weighing comes with 8.4.8); the dwellings and the rest in the order below.

- **When**: at the start of a computer player's turn, before its heroes move (so 8.4.4 can recruit what was built that day). Each of its towns builds at most one building, as the player's can; the towns take their turn in the order of the player's town list.
- **What it aims for**, in a fixed order: the income buildings (Town Hall, City Hall, Capitol), then the creature dwellings in the Hall's order (by tier), every basic dwelling before any upgrade, then the rest in the Hall's order (forts, Tavern and its upgrade, Blacksmith, Marketplace, Resource Silo, Mage Guilds, Shipyard, Stables, the horde building).
- **Requirements first**: the steps towards a building are its missing requirements, each with its own first, then the building itself. A town builds the first step, down the whole list, that it can build today: whatever the player could build there, so the cost, a Shipyard's water and a Capitol already standing in another of the owner's towns are checked as for the player. A town aiming for the Town Hall builds its Tavern first.
- **Nothing saved up**: a step the owner can't pay for is passed over for the next one it can; with nothing it can pay for, the town builds nothing that day.
- The building is paid for from its owner's resources and saved with the same facts as the player's; the town module's checks stay the rules' guard.
- **What the player sees**: nothing while it happens (no message, the hourglass stays). Afterwards: the fort icon in the town's box, the Thieves' Guild's rows, Expert Visions, and the town screen once the player takes the town.
- A reload during the computer's turn doesn't build twice: a town that built today can't build again.
- Checked against the reference engine's AI, which also builds a building's requirements on the way to it and sorts its wishes into income halls, dwellings and the rest, but weighs them by cost and need; weighing is 8.4.8. The original game's AI is not documented.
- One refactor first: what a building's status in a town depends on (built, built today, water, built in another town, the owner's treasury) is read from the state by one function, `buildingContextOf` in `game/heroes/state/building-context.js`, used by the town module and by the computer player.

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
- Keeping a garrison back to defend the town: 8.4.7. Saving gold for a building instead of recruiting, and going back to a town to recruit: 8.4.8.
- Exploring towards the tile that reveals the most for its cost, rather than the nearest: 8.4.8.
- Saving up for a building, and choosing a town's building by what it is worth rather than a fixed order: 8.4.8.
- With 8.4.5: a computer hero casting, retreating or surrendering in battle (smarter combat AI, 5.7b); guarded artifacts, chests and bonus objects as targets (8.4.8); monsters offering to join or flee a stronger hero (5.2), which would apply to computer heroes too.
