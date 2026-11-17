# AI decision making

Roadmap 8.4. Computer heroes do more than pick up resource piles (8.3.1, `docs/notes/2026-11-13-ai-basics.md`): they take mines and dwellings, explore, fight monsters they can beat, and their towns build and recruit. Each decision reuses the moves the player's hero makes: the AI only picks what to ask for.

## Parts

Each part is one PR.

1. **8.4.1 Capturing mines and dwellings.** A computer hero's targets are resource piles, and mines and dwellings not flagged by its owner, that it can reach without a fight; it goes to the nearest one. A guarded dwelling is not a target. Flagging a dwelling recruits nothing (8.4.4).
2. **8.4.2 Exploration.** With nothing to go to, a computer hero walks towards the nearest tile its owner hasn't explored, revealing the map for its owner as the player's hero does.
3. **8.4.3 Town building.** Each day a computer player builds one building in each town that can, in a fixed order: income, then dwellings, then the rest.
4. **8.4.4 Recruiting.** A computer hero in its own town, or at its own dwelling, recruits what its owner can pay for, strongest creatures first; with it a hero may leave its town (it stays only while it has nothing to go to).
5. **8.4.5 Fighting monsters.** A computer hero attacks a monster (or a dwelling's guards) its army is stronger than, by the army's total creature strength; the battle is fought without being shown, with the battle AI on both sides, and its result shown on the map.
6. **8.4.6 Attacking the player's heroes.** A computer hero attacks a player's hero it is stronger than; the player fights the battle on the battle screen during the computer's turn.
6b. **8.4.6b The defending hero's spells, retreat and surrender.**
6c. **8.4.6c Attacking the player's towns.** A town without defenders is taken; its garrison, or a hero in it with the garrison, defends it.
7. **8.4.7 Threat response.** A weak computer hero keeps away from stronger enemy heroes; a hero goes back to defend its town when an enemy hero stronger than the garrison can reach it next day.
7b. **8.4.7b Artifacts and map objects.** A computer hero's targets also take in artifacts (unguarded, or guarded by what it can beat), treasure chests, resource generators (windmills, water wheels), and the bonus and stat-boosting objects it would gain from, nearest first. Planned below.
8. **8.4.8 Weighing goals**, in four parts (agreed):
   - **8.4.8 Weighing targets.** A computer hero's targets are compared by what they are worth against the days they cost, instead of the nearest first. Planned below.
   - **8.4.8b Exploring by what it reveals.** An exploration tile is chosen by the unexplored tiles it reveals against the days it costs, instead of the nearest.
   - **8.4.8c Saving up.** A town's building is chosen by what it is worth rather than a fixed order, and its owner saves for it instead of recruiting or paying for an object.
   - **8.4.8d Weighing danger and skills.** A target in a stronger enemy's reach is weighed down rather than left out, a Witch Hut's skill is weighed, and a hero goes back to a town to recruit.

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

- **8.4.6b**: the player's hero attacked by a computer hero on the open map has the spell book, Retreat and Surrender on its stacks' turns, as an attacking hero has. Its spells are cast in its name, from its spell points, once a round (each side counted on its own), the right-hand stacks being its own. Retreating or surrendering shows the results window with the player's hero Defeated and the computer's Victorious and "The cowardly … flees from battle." or "… surrenders to the enemy, and departs in shame."; the offer names the computer hero and its price is half the player's remaining creatures' cost less the player's hero's Diplomacy, paid to the computer player. The player's hero leaves the map for the tavern with its artifacts (one creature after a retreat, its army after a surrender); the computer hero keeps its survivors and gets only the experience for the creatures it killed, then its turn goes on. A hero who left a battle in another player's turn on the week's last day is still in that player's tavern in the new week, beside one new hero. `fact.battle.finished` names `side: 'defender'` when the defender left, and `fact.hero.wentToTavern` marks a hero who left after their owner's turn.

- **8.4.6c**: a computer hero's targets also take in towns that aren't its owner's (the player's, neutral ones and other computer players'): an undefended town is walked into and taken, a town with a garrison, or with a hero standing in it, is attacked when the hero is stronger than the garrison, with the hero's army joined to it (its strength above theirs × 1.1); the walls don't count until sieges (agreed). A hero in a town is no longer a target of its own. Taking a town gives its flag, income and town list place to the computer player; a hero that walked in recruits there on its next move. When the town is the player's, the battle opens during the computer's turn with the computer's hero on the left. A garrison with no hero is played by the player with no spell book, Retreat or Surrender; its results window says "A glorious victory!" with no experience line, or "Your forces suffer a bitter defeat.". A hero defending a town casts spells but can't retreat or surrender (agreed: in any town, walls or none, for now). Another player's hero walking into a town no longer opens its town screen for the player: the town visit isn't emitted for it.

- **8.4.6**: a computer hero's targets also take in other players' heroes standing outside a town on a tile its owner has explored, whose army it is stronger than (its strength above their army's total AI value × 1.1). It walks up and attacks; when the hero is the player's, the battle screen opens during the computer's turn with the computer's hero on the left under its flag and the player's on the right. The player plays their stacks, or auto combat does; Retreat, Surrender and the spell book stay disabled for the defender. The results window is the player's: "A glorious victory!" with the experience (the attacker's creatures killed and 500 for the beaten hero), or the bitter defeat. Winning takes the computer hero off the map and its artifacts for the player's hero; losing takes the player's hero off the map and gives the computer hero the experience and the artifacts. The computer's turn waits while the battle and the windows after it (results, captured artifacts, level-up) are open, then goes on; a reload during the battle carries on with it. Clicks and keys reach a window open over the map during another player's turn. Every hero in battle now carries its owner's flag, the attacker's too.

- **8.4.7**: a computer hero works out where each enemy hero on a tile its owner has explored can be next turn: every tile it reaches with its maximum movement points without a battle on the way (the deciding hero taken off the map, as it may move first). An enemy hero's strength is its army's total AI value times its Attack and Defense factor. A town of the computer player's that such a hero can reach and whose garrison (with a hero in it) isn't above that strength × 1.1 is threatened: a hero that can get into it today and would hold it (its army joined with the garrison above the enemy × 1.1) goes there first of all and stays while it is needed, the heroes deciding one after another so that only the first goes; a hero that couldn't hold it doesn't go. A hero an enemy it isn't above × 1.1 can reach next turn goes to the nearest tile it can reach today that none can (its own town's gate counting with the garrison), then decides again; with none, it goes on as before. Otherwise piles, mines, dwellings, monsters, towns, heroes and exploration tiles where it would stand within such an enemy's reach are not targets. The player sees the computer hero walk away, or into its town. `decideComputerHeroMove` takes `routesOf(heroId)`, and the routes can take a hero off the map.

- **8.4.7b**: a computer hero's targets also take in artifacts (unguarded, or guarded by stacks it is stronger than, with room in its backpack), treasure chests, resource generators nobody has visited this week, and bonus and stat-boosting objects that would give it their rewards (not used up by it, no lasting bonus of their kind, requirements met, price payable), nearest first like the rest. An artifact's guards are fought unseen without the question; a picked-up artifact is worn where it fits. A chest's gold is taken as experience, an artifact chest's artifact is taken. A price is paid without the question (Tree of Knowledge, schools); a choice of rewards takes the lower of Attack and Defense, Attack on a tie, so the School of Magic is never a target. Nothing opens on the player's screen: the visit's message, choice and question are only for the viewing player's hero.

- **8.4.8**: a computer hero goes to the target worth the most over the days its route takes (the route's movement points over the hero's maximum a day), ties to the nearer, then the top row, then the left. Worth is in gold: resources at 1 for gold, 250 for wood and ore, 500 for the rest (each resource's `price`); a pile its amount at that price; a mine and a town five days of their income, a town also a week of its dwellings' growth at their AI value; a dwelling the AI value of what the hero would recruit there, and a week's growth while it isn't its owner's; a monster the experience it gives; an enemy hero 1250, a fifth of its army's cost and the experience; an artifact its cost; a chest its experience or its artifact's cost; an object its rewards (experience 1, a primary skill 1000, a secondary skill 1000, morale or luck 250, movement its share of a day's 1000) less its price. Defending a town, keeping out of a stronger hero's reach and leaving out targets in it still come first; safe tiles and exploration are still the nearest. `visitOffer` also gives the rewards and the price.

- **8.4.8b**: a computer hero with no target explores to the explored, empty tile it can reach past no monster that shows it the most unexplored tiles for the days its route takes: the tiles its owner hasn't explored within 5 of it (passable or not), squared, over the route's movement points over the hero's maximum a day, ties to the nearer, then the top row, then the left. Any tile that would show one counts, so a hero whose edge tiles are blocked or guarded looks past them from further back. Keeping out of a stronger enemy's reach still comes first: the best tile out of it is taken. A stronger enemy hero reaches only ground its owner has explored.

- **8.4.8c**: each morning a computer player's town aims for the building worth the most for its cost: the town's worth with it (five days of income, a week of growth at the best AI value of each tier) less without it, over its cost and that of the buildings it needs, at the resource prices. It aims only for a building it and its steps are at most a week of income away from. It builds the first step when it can pay for it. When it can't, it builds nothing and its owner keeps the step's cost back: its heroes recruit in towns and at dwellings, and pay for objects, only with what is left over. Only the first town that can't pay saves; the towns after it build what they can pay for from what is left. With nothing worth anything within reach, a town builds the first building of the Hall it can pay for. What is kept back is decided again when the turn is reloaded.

- **8.4.8d**: a target where the computer hero would stand in reach next turn of an enemy hero it isn't above × 1.1 is worth its worth less its army's AI value and 1250; one worth no more than that is left out. A threatened hero still walks to a safe tile first, and one with no safe tile goes to its best target as it is; exploration tiles in such reach are still left out. A skill's worth is its `worth` in `secondary-skills.json` (2000, 1000, 500 or 0). A Witch Hut no hero of its owner's has been inside hides its skill: it is worth the average worth of the skills it could teach that the hero lacks; a hut whose known skill is worth 0 is not a target. A value an object shows only after a visit (its status text) is hidden from the computer the same way (`visitOffer`'s `seenBy`). A computer hero levelling up learns the offered skill worth most, the first on a tie. A hero's own town with no hero in it is a target worth the AI value of what it would lead out: what its owner recruits there with what it may spend, and the garrison, as far as they fit its army.

## Plan for 8.4.8d

Three changes to how a computer hero picks where to go: a target in a stronger enemy hero's reach costs it what it could lose there instead of being left out, a Witch Hut is worth what its skill is worth to the hero, and a hero walks back to its own town when what it would recruit and take there is worth the trip.

Rules, as checked (the original game's AI is not documented, so the rules are ours; checked against the reference engine's AI. Its newer AI drops a gathering target whose enemy danger is above its army's power, and its older one weighed the danger in. It scores a Witch Hut's skill from a table per skill: Diplomacy, Logistics, Earth Magic, Armorer and Offense 2; Air Magic, Wisdom, Leadership, Intelligence and Resistance 1; Mysticism, Sorcery, Estates, First Aid, Learning, Scholar, Eagle Eye and Navigation −1; the rest 0. A hut whose skill scores 2 is worth five times a skill object, below that the score itself. It sends a hero back to a town to buy the army there when that army is worth the trip):

- **Danger weighed**: a target where the hero would stand in reach next turn of an enemy hero it isn't above × 1.1 (8.4.7's rule) is worth its worth less what the hero risks there: its army's total AI value and 1250 for the hero itself (what the enemy would gain, as 8.4.8 counts a hero). A target worth no more than that is left out, as now. So a weak scout still takes a Gold Mine in a stronger hero's reach, a strong army doesn't risk itself for a pile.
- What comes first is unchanged: defending a threatened town, then a threatened hero's walk to a safe tile. A threatened hero with no safe tile today goes on to its best target with no danger taken off, since it is in reach wherever it goes. Exploration tiles are still left out when in reach (their worth is not in gold).
- **A Witch Hut's skill**: worth from the skill's `worth` in `secondary-skills.json`: 2000 for Diplomacy, Logistics, Earth Magic, Armorer and Offense; 1000 for Air Magic, Wisdom, Leadership, Intelligence and Resistance; 500 for the rest; 0 for Mysticism, Sorcery, Estates, First Aid, Learning, Scholar, Eagle Eye and Navigation. A hut worth 0 is not a target: its skill would take one of the hero's eight slots. Other objects giving a secondary skill count the same way.
- **A hut blue hasn't been inside**: the computer doesn't know its skill until one of its heroes has been inside (as the player sees it only then). Until then the hut is worth the average worth of the skills it could teach the hero (every skill but Leadership, Necromancy and those the hero has): about 700 for a hero with no skills, under the table above (proposed, to agree).
- **Level-up**: a computer hero levelling up learns the offered skill worth the most to it (the same `worth`), the first offer on a tie, instead of one at random.
- **Going back to recruit**: a computer hero's own town (not the one it stands in, and not one another of its heroes stands in) is a target worth the AI value of what the hero would lead out of it: the creatures its owner would recruit there with what it may spend (8.4.8c), and the garrison's stacks, as many as fit the hero's army (8.4.4's order). A town with nothing for it is not a target. Weighed against the rest over the days the route takes; on arrival the hero recruits as it does today.
- **What the player sees**: a computer hero walking up to a mine near the player's stronger hero, or walking back to its town and leaving it with a bigger army (the army popup); a Witch Hut with a weak skill left alone. Nothing opens on the player's screen.

Decisions:

- The risk is the whole army and the hero, not a share of it: the enemy may not come, but a lost hero is lost for good.
- A skill's worth is data on the skill, so a new skill or a changed weight needs no code.
- The risk is agreed. The hero doesn't know a hut's skill before one of its owner's heroes has been inside (agreed). Level-up uses the same worths (agreed).

Refactor first (commits at the start of the PR): the targets' order takes each candidate's worth worked out once beforehand (`byWorthForDays` on `candidate.worth`), so the danger can be taken off it before sorting; `firstSafe` goes.

Left for later: a threatened town building its walls first comes with sieges (5.10), when walls count in its defence; hero roles (a scout weighing Estates or Scouting higher).

## Plan for 8.4.8c

A computer player's town builds what it gains most from for the cost, instead of in a fixed order. When it can't pay for that building yet, it builds nothing that day and its owner keeps the cost back: its heroes recruit, and pay for objects, only with what it has beyond that.

Rules, as checked (the original game's AI is not documented, so the rules are ours; checked against the reference engine's AI. It sums a building's gains into a reward: a week of income at half its value, its dwelling's growth at the creatures' strength × 1.5, and the walls' share of the town's army. It counts a building's missing requirements in its cost. When it can't pay, it locks the building's cost so that recruiting and other purchases spend only the rest. A building it can't save for with its income is never chosen. Once something is locked, no other building is weighed that turn):

- **What a building is worth**, in gold, as 8.4.8 counts a town's worth (five days of its income and a week of its dwellings' growth at the best AI value each tier recruits): the town's worth with it, less without it. That comes to:
  - an income hall: five days of the income it adds (Town Hall 2500, City Hall 5000, Capitol 10000);
  - a dwelling: a week of its creatures' growth (with the town's Citadel or Castle) at their AI value; an upgraded dwelling, that growth at the difference between the upgraded and plain creatures' AI values;
  - a horde building (the Griffin Bastion): the creatures it adds a week at the best AI value of its tier that the town recruits;
  - a Citadel or Castle: the week's growth it adds to the town's standing dwellings, at their best creatures' AI value;
  - everything else (Fort, Tavern, Blacksmith, Marketplace, Resource Silo, Mage Guilds, Shipyard, Lighthouse, Stables, Brotherhood of the Sword): nothing of its own.
- **What it costs**: its cost and that of every missing requirement on the way to it, at the resource prices of 8.4.8.
- **Choosing**: the building with the highest worth for its cost, ties to the Hall's order. The town builds the first step towards it, requirements first as in 8.4.3, so a Tavern carries the Town Hall's worth.
- **Within reach**: a building is aimed for only when blue's daily income makes up what it and every step to it are short of within a week. A building needing a resource blue has no income of, and not enough of, is passed over for the next best, so a town doesn't start on a chain it can't finish.
- **Saving up**: when blue can't pay for the first step today, the town builds nothing that day and blue keeps the step's cost back.
- **What is kept back**: blue's recruiting in towns and at dwellings, and the price of an object (Tree of Knowledge, schools), spend only what blue has beyond what it keeps back. An object whose price would dip into it is not a target.
- **With nothing worth anything left** to build or save for, a town builds from the rest in the Hall's order, as now: what it can pay for today, nothing saved.
- **What the player sees**: a town that builds nothing some days, and a hero that recruits fewer creatures or passes a Tree of Knowledge by. The player sees it in the town box's fort icon, the Thieves' Guild, the hero's army popup and the town screen once they take the town. Nothing opens on the player's screen.

Decisions (agreed):

- Worth for its cost, rather than the reference engine's reward divided by the days it takes to save. Both a hall's income and a dwelling's growth come back each week, so worth over cost measures how soon a building pays for itself.
- One building saved for at a time, as in the reference engine. The towns decide in town-list order. The first that can't pay saves for its building. The towns after it build what they can pay for from what is left over, passing over the rest, and save for nothing.
- Nothing is kept back once every town has built that day.
- A building is aimed for, and saved for, only when it and its steps are at most a week of income away.
- What is kept back is worked out from the state whenever it is needed, not saved, so a reload keeps it.

Refactor first (commits at the start of the PR):

- A town's worth is worked out from its buildings (`townDevelopmentWorth` in `computer-worth.js`), so the building choice in `computer-towns.js` weighs a building as the town's worth with it less without it.
- `decideTownRecruits`, `dwellingRecruitCount` and `visitOffer` take the resources they may spend, instead of reading the owner's resources themselves. The player's visits pass in the player's resources.

Left for later: a Mage Guild's worth once computer heroes cast (5.7b, agreed); saving for anything but a building (a boat, a hero in the tavern); trading at the Marketplace for what is missing; building walls first in a threatened town (8.4.8d, with the danger); the Resource Silo's income once it gives one.

## Plan for 8.4.8b

A computer hero with no target goes exploring where it shows the most for the days it takes, instead of to the nearest tile on the edge of what its owner has explored: out into open ground rather than along the map's edge, which shows a sliver.

Rules, as checked (the original game's AI is not documented, so the rule is ours; checked against the reference engine's AI, which scores a tile by the hidden tiles in the hero's sight from it, squared, over the movement points the route costs, and scans the tiles on the edge of what is explored first, then those further in when none of them will do):

- **What a tile reveals**: the tiles its owner hasn't explored within the hero's sight of it (5 tiles, measured as the fog of war measures it), counting only the tile the hero ends on, not the steps on the way. Tiles that can't be walked on count as well (agreed); the reference engine leaves out a hidden tile none of whose neighbours can be walked on.
- **Score**: the tiles revealed, squared, over the days the route takes (its movement points over the hero's maximum a day, as for targets), the highest first, ties to the nearer, then the top row, then the left. Squared, as in the reference engine: counted plainly, a step that reveals a single tile scores as well as five steps that reveal five, so the hero would creep a tile at a time and decide again after each.
- **Which tiles**: every explored, empty, passable tile the hero can reach past no monster that would reveal at least one tile, not only those touching unexplored ground. A hero whose edge tiles are blocked (an obstacle or a hero on them) still explores from a tile further in that sees past them; today it stays.
- The hero then decides again on arrival, as now, so a pile it finds is picked up the same day.

Decisions:

- Exploration still waits until no target is reachable (8.4.2): a tile's reveal isn't weighed against a target's worth in gold.
- Keeping out of a stronger enemy hero's reach still comes first: the best tile out of its reach is taken (8.4.7).
- With fog of war off, or nothing left to reveal within reach, the hero stays where it is.
- No refactor first: the exploration tiles go through the same choice as targets, with the tiles they reveal as their worth and the squared score as their order.

## Plan for 8.4.8

A computer hero goes to the target worth the most for the days it takes to get there, instead of the nearest: a gold mine two days away before a wood pile next to it, a pile next to it before a mine a week away.

Rules, as checked (the original game's AI is not documented, so the numbers are ours; checked against the reference engine's AI, which gives each goal a reward in gold and divides it by a function of the days the route takes):

- **Days**: the movement points the route costs over the hero's maximum movement points a day, so half a day's walk is 0.5 days. A target's score is its worth over its days. Ties go to the nearer, then the top row, then the left. The reference engine divides by 0.75 + days^1.3, which punishes far targets more; we keep it linear (agreed).
- **Resources**: gold 1 each, wood and ore 250, mercury, sulfur, crystal and gems 500 (the reference engine's resource prices; not found on the wiki, agreed).
- **A pile**: its amount at those prices. The reference engine counts every gold pile 600 and any other pile 100.
- **A mine**: five days of its income (the reference engine's), whoever owns it now: a Gold Mine 5000, a Sawmill 2500, a rare resource's mine 2500.
- **A dwelling**: the AI value of the creatures the hero would recruit there now, plus a week's growth when its owner hasn't flagged it yet (the reference engine's army reward and army growth). A creature's AI value counts as its worth in gold, as in the reference engine.
- **A monster**: the experience it gives (its total hit points). The reference engine weighs the army the battle would cost; we don't estimate losses (agreed).
- **An enemy hero**: 1250, a fifth of its army's gold cost, and the experience (the reference engine's elimination reward, with our experience).
- **A town**: five days of its income and a week's growth of its dwellings (agreed).
- **An artifact**: its cost. **A chest**: the gold it holds, taken as experience, or its artifact's cost.
- **A resource generator**: what it gives this week at the resource prices.
- **A bonus or stat-boosting object**: its rewards added up: experience 1 a point, a level the experience it skips, a primary skill 1000 a point (a school's price), a secondary skill 1000, morale or luck 250 a point, movement points their share of a day's 1000, spell points nothing until computer heroes cast (5.7b); its price taken off (agreed).

Decisions:

- Defending a threatened town (8.4.7) and keeping out of a stronger hero's reach still come first, and a target in such a hero's reach is still left out (8.4.8d weighs it).
- Exploration is still the nearest tile, and only when no target is reachable (8.4.8b).
- The safe tiles a threatened hero goes to are still the nearest.
- One refactor first: `computer-heroes.js` takes a target's worth from one table beside `isWorthGoingTo`, in its own module, and the choice of a target takes the comparison it sorts by, so targets are weighed while safe tiles and exploration stay nearest first.

## Plan for 8.4.7b

A computer hero's targets also take in artifacts, treasure chests, resource generators and the bonus and stat-boosting objects whose rewards it would get, nearest first like the rest; its visit gives it what the player's hero would get, and nothing opens on the player's screen.

Rules, as checked (the original game's AI is not documented; checked against the reference engine's AI: which objects it visits, how it answers an object's question and which option it takes in a choice):

- **Artifacts**: an artifact on the map is a target when it is unguarded, or its guards are weaker than the hero (8.4.5's rule, the guards' total AI value × 1.1), and the hero's backpack isn't full. Its guards' question is answered yes without being shown, and the battle is fought unseen (8.4.5). A picked-up artifact is put on as the player's is (a free slot it fits, else the backpack). The reference engine answers yes to an artifact's guards when it can beat them.
- **Treasure chests**: every chest is a target. A chest holding an artifact gives the artifact; one with gold gives the gold or the experience (open question 1).
- **Resource generators** (Windmill, Water Wheel, Mystical Garden): a target when nobody has visited it this week, as the visit limit already says.
- **Bonus and stat-boosting objects**: a target when the visit would give the hero its rewards: not visited by it yet (once per hero), no lasting bonus from one of its kind (fountains, temples, Stables' week bonus), its requirements met (the Library's level, the Witch Hut's skill not known and a free skill slot) and its cost payable by the owner (Tree of Knowledge, schools). The reference engine visits a rewardable object when it has rewards for the hero, and checks the schools' 1000 gold and the Library's level 10 the same way.
- **Questions and choices**: a cost asked first (Tree of Knowledge) is answered yes; the reference engine always answers yes to a yes/no question that isn't a guard's. A choice of rewards (Arena, schools) takes the lower of Attack and Defense, Attack on a tie, since computer heroes don't cast spells yet: the School of Magic is not a target (agreed; the reference engine takes the last option).
- **What the player sees**: the hero walking there when the player can see it, the artifact or chest gone from the map, a visited Windmill's "visited" message for the player's hero that week; no message, question or choice. The hourglass stays.

Decisions:

- One list of targets, nearest first by movement points (ties to the top row, then the left), with 8.4.7's rule that a target in a stronger enemy hero's reach isn't one.
- Paying for an object spends what the owner has; nothing is saved up for recruiting (weighing is 8.4.8).
- Fountain of Fortune is a target like any luck object, though its luck may be −1.
- A Witch Hut teaches any skill it offers, when the hero lacks it and has a free slot (agreed; the reference engine scores the skill first, which is 8.4.8's weighing).
- One refactor first: whether a visit would give the hero the object's rewards is one rule (`visitOffer`, the visit's checks without the rolls for the week), used by the visit and by the computer's targets; and another player's hero gets a modal's `factsOnModalClosed` (an artifact chest's artifact) as well as its chosen answer.

## Plan for 8.4.7

A computer hero keeps out of the reach of enemy heroes it can't beat, leaves alone what lies in their reach, and goes back to a town of its owner's an enemy hero could take next turn, when it can get there today and hold it.

Rules, as checked (the original game's AI is not documented; checked against the reference engine's AI: its danger map of where each enemy hero can be next turn, its escape behaviour and its town defence):

- **Where an enemy hero can be next turn**: every tile it can reach with the movement points a new day gives it (its maximum), from where it stands, without a battle on the way. The reference engine works this out per enemy hero over the tiles its owner can see; we take enemy heroes on tiles the computer player has explored, as for the heroes it attacks (8.4.6), and the enemy's routes over its own explored tiles.
- **How strong an enemy hero is**: its army's total AI value times its Attack and Defense factor (8.4.5's hero strength). The reference engine counts the enemy's skills here, unlike when the computer weighs an attack (8.4.6).
- **A threatened hero**: one standing where an enemy hero can be next turn, whose own strength isn't above that enemy's × 1.1 (the safe ratio of 8.4.5; the reference engine's escape uses the same). It goes, today, to the nearest tile no such enemy can reach next turn, by the movement points the route costs (ties to the top row, then the left), then decides again. Its own town's gate counts as safe when the hero's army with the garrison (joined as 8.4.6c counts a hero defending its town) is above the enemy × 1.1.
- **Targets in an enemy's reach**: a pile, mine, dwelling, monster, town or exploration tile on a tile an enemy hero the computer hero can't beat can reach next turn is not a target. Our decision: the reference engine weighs a target's danger instead of leaving it out.
- **A threatened town**: one of the computer player's towns whose gate an enemy hero can reach next turn, when its defenders (the garrison, joined with a hero standing in it) aren't above that enemy × 1.1. The walls don't count until sieges (as in 8.4.6c).
- **Going back to defend it**: a computer hero that can reach a threatened town today, and with whose army the town would be safe, goes into it before anything else; once in it, it stays there for the day. The heroes decide one after another, so a second hero doesn't go once the first has made the town safe. A hero that couldn't make it safe doesn't go. A hero standing in its own threatened town that makes it safe stays there; one that doesn't is a threatened hero and keeps away. Checked against the reference engine, which sends a hero that can reach the town in time and is strong enough, and keeps a hero needed in the town there.
- **What the player sees**: the computer hero walking away from the player's hero, or into its town, where the player can see it; nothing else.

Decisions:

- Defending a town comes first, then keeping away, then targets, then exploring.
- A threatened hero with no safe tile it can reach today carries on as before: to a target outside every such enemy's reach, else the nearest target. Our decision.
- One margin, × 1.1, for heroes and towns alike; the reference engine uses none for a town threatened in the coming turn. Our decision.
- An enemy's reach next turn uses its maximum movement points, without the bonuses a new day may add (stables, the week's bonus). Our decision.
- An enemy hero is anyone of another player's (the player's and other computer players'), as in 8.4.6.
- A hero whose day ends partway along a longer route may end it in an enemy's reach; next day it is threatened and keeps away.
- One refactor first: `decideComputerHeroMove` takes the routes of any hero (`routesOf(heroId)`) instead of one hero's routes, so it can work out where enemy heroes can be next turn.

## Plan for 8.4.6c

A computer hero takes towns: one with no defenders by walking in, one with a garrison or a hero in it by beating them. When the town is the player's, the player fights the battle on the right during the computer's turn, as in 8.4.6, with their hero (and the garrison beside it) or with the garrison alone.

Rules, as checked:

- **Taking a town** is the rule 8.1.5, 8.1.6 and 8.1.11 apply to the player, from the other side: an undefended town is captured by walking in (the hero stands on its gate); a garrison with no hero is fought from the tile next to the gate; a hero standing in the town defends it with the garrison's stacks in its free slots. Winning empties the garrison and the town becomes the attacker's owner's: its flag, its income from the next day, gone from the player's town list. Losing leaves each side what is left of its own stacks.
- **Experience** for the computer hero: the creatures' hit points, 500 for a beaten hero, and 500 more for a town with a Fort or better (the rule agreed for 8.1.6). The player's defending hero gets, as in 8.4.6, the attacker's creatures' hit points and 500 for the beaten computer hero.
- **The results window when the player's garrison fights with no hero** (checked against the wiki's `GENRLTXT.TXT` and the reference engine's results window, which adds the experience line only for a side with a hero): winning shows "A glorious victory!" (304) with no experience line; losing shows "Your forces suffer a bitter defeat." (311). The garrison's side is named by its strongest creature, as now.
- **A garrison with no hero** has no spell book, can't retreat and can't surrender: the player only moves its stacks, or turns on auto combat.
- **Retreat and surrender for a hero defending a town**: the wiki's Combat page says "a hero defending a town cannot surrender (or flee)", its siege text says it of sieges; the reference engine forbids both in any town, walls or none. Forbidden in any town for now (agreed); a town building that allows retreat comes with the factions (6.5).
- **How strong a town is to the computer** (checked against the reference engine's AI): the garrison's total AI value, with the visiting hero's army added; for a Citadel it adds 4000 and for a Castle 10000, for the walls. A hero in the town counts with the stacks that fight beside it (8.1.11). The walls are left out until sieges (agreed).
- Nothing announces the attack and no message says the town was lost; the player sees the walk, the battle and the flag. No source says otherwise; our decision. Losing the last town (the seven days' warning) comes with 8.5.

Decisions:

- **Towns join the one list of targets**, nearest first: a town not its owner's (the player's, a neutral one or another computer player's; agreed), on a tile the hero's owner has explored, that is undefended or whose defenders the hero is stronger than (its strength above theirs × 1.1). A hero standing in a town is no longer a target of its own: it is attacked with the town. The route to a defended town ends in the battle at its gate, with nothing else on the way.
- **After taking a town by walking in** the hero stands in it, so its next move recruits there (8.4.4). After a battle it stands next to the gate, as the player's hero does, and goes on with its movement points left.
- **The battle**: the player plays the right-hand side, the garrison stacks as their own; unseen when neither side is the player's.
- **The player's side in battle** is worked out from the town's owner when the defender is a garrison with no hero, not only from a defending hero's owner.

## Plan for 8.4.6b

The player's hero defending against a computer hero on the open map gets what an attacking hero has: the spell book, Retreat and Surrender. The computer hero still doesn't cast, retreat or surrender (5.7b).

Rules, as checked:

- **Retreat and surrender are allowed to a hero defending on the open map**, as to the attacker; in a town they are not (8.4.6c). Checked against the wiki's Combat page ("a hero defending a town cannot surrender (or flee)") and the reference engine's flee and surrender permissions, which are the same for both sides outside a town. The engine's ban on retreating after casting in the first round is the attacker's only, so it doesn't apply here (and isn't built for the player's attacker either).
- **Casting**: each hero casts at most one spell a round, each side counted on its own (the reference engine counts casts per side; `docs/notes/2026-11-01-casting-in-battle.md`). "Own" and "enemy" stacks are the caster's: the defender's helpful spells go on the right-hand stacks. Spell power, school levels, spell points and the targets' Resistance are as for an attacking hero.
- **Surrender price**: half the gold the defender's remaining creatures cost to recruit, less Diplomacy's discount (the reference engine works it out for the side that surrenders; the wiki's Combat and Diplomacy pages). The offer names the computer hero: "%s states:  "I will accept your surrender and grant you and your troops safe passage for the price of %d gold."" (`GENRLTXT.TXT` 32). The gold goes to the computer player.
- **After a retreat or a surrender**, as for the player's attacker (8.1.9, 8.1.10, 8.1.10b): the hero leaves the map with its artifacts and waits in the tavern (one creature of its first starting stack after a retreat, its remaining army after a surrender); the computer hero keeps its survivors and gets the experience for the creatures it killed, no 500 and no artifacts (the wiki's Experience page; the engine gives both only for a normal win). The results window shows the player's hero Defeated and the computer's Victorious, with "The cowardly %s flees from battle." or "%s surrenders to the enemy, and departs in shame." (`GENRLTXT.TXT` 307, 306).
- **Accepting a surrender**: the wiki says the enemy may refuse one (not in Horn of the Abyss), without saying when; the reference engine never asks the other side. The computer always accepts (agreed).
- **Day 7**: the wiki says a hero who retreats on the 7th day after their turn has passed fills one of the player's tavern slots in the new week instead of a new hire; the reference engine clears both slots at every new week. We follow the wiki (agreed); a surrendered hero is kept the same way (our decision: the wiki names only a retreat, but both wait in the tavern alike).

Decisions:

- The battle module names the hero the player leads (the attacker's, or the defender's when the player defends), and the spell book, the casts, the surrender offer and the tavern follow that hero.
- `fact.battle.finished` names the side that retreated or surrendered; a saved fact without one is the attacker's, as before.
- The cast-once-a-round flag is kept per side.
- Not shown: the retreat and surrender music (none is built for the attacker either).

## Plan for 8.4.6

Split in three (agreed), as attacking the player is the battle screen played from the other side as well as the AI's choice:

- **8.4.6 Attacking the player's heroes.** A computer hero attacks a player's hero it is stronger than; the player fights the battle on the battle screen, during the computer's turn, with their hero on the right. Retreat, Surrender and the spell book stay disabled for the defending player.
- **8.4.6b The defending hero's spells, retreat and surrender.**
- **8.4.6c Attacking the player's towns.** A town with no defenders is taken; a garrison, or a hero in the town with the garrison, defends it and the player fights the battle.

Rules, as checked:

- **The attacker stands on the left**, the defender on the right, whoever is the player's: the computer's hero on the left with its flag, the player's hero and army on the right. Checked against the reference engine's battle sides and the battles 8.1.7 already shows.
- **Which heroes it attacks**: the reference engine's AI rates an enemy hero by its army's total AI value alone, the hero's skills left out, and attacks by the same safe ratio as monsters. So a player's hero is a target when the computer hero's strength (8.4.5) is above the player's hero's army's total AI value × 1.1. Checked against the reference engine's danger of a hero and its army's combat value.
- **Retreat and surrender** for a hero defending on the open map are allowed, as for the attacker (the wiki's Combat page; the reference engine's flee and surrender permissions). Defending in a town they are not: the wiki says "if the hero is defending in a siege", the reference engine any town (its Village Hall forbids both). Asked for 8.4.6c.
- **Winning and losing** are the rules 8.1.7 to 8.1.10 already apply from the other side: the winner gets the experience for the creatures killed and 500 for a beaten hero, and the beaten hero's artifacts; a beaten hero leaves the map.
- Nothing announces the attack: the computer hero's walk is shown where the player can see it, then the battle screen opens. No source says otherwise; our decision.

Decisions:

- **Which heroes**: a player's hero standing outside a town, on a tile the computer hero's owner has explored (as for monsters), joins the one list of targets, nearest first. The route to it ends in the battle with that hero alone. A hero in a town comes with 8.4.6c.
- **The battle**: the computer's stacks are played by the battle AI, the player's by the player (or by auto combat). The battle music plays.
- **After it**: the computer's turn waits while the battle and its windows are open (results, captured artifacts, the player's hero's level-up; agreed), then goes on with its heroes; then the player's turn starts.
- A reload during the battle carries on with it, and the computer's turn goes on after it.
- One refactor first: the battle module names once which side the player plays (the attacker, the defender, or neither for an unseen battle), instead of taking the attacker as the player's; the results window and the player's actions follow that side.

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

- Everything listed above after 8.4.6, and difficulty levels (9.2).
- With 8.4.6c: the walls in a computer hero's weighing of a town (4000 for a Citadel, 10000 for a Castle) come with sieges (5.10); a building that lets a hero defending a town retreat comes with the factions that have one (6.5); a computer hero learning spells in a Mage Guild of a town it walks into (5.7b); losing the last town (8.5).
- With 8.4.6: a computer hero attacking another computer player's hero is fought unseen like its other battles, untested beyond the shared code; heroes in towns and towns are 8.4.6c.
- With 8.4.6b: the computer refusing a surrender, and its hero casting, retreating or surrendering (5.7b); the retreat and surrender music; the attacker's ban on retreating after casting in the first round, which the reference engine has and the player's attacker doesn't yet.
- With 8.4.7b: a computer hero choosing Power or Knowledge, and the School of Magic, once computer heroes cast spells (5.7b); a computer hero putting on a better artifact than the one it wears, or giving artifacts to its other heroes.
- With 8.4.7: a hero leaving a threatened town without taking the garrison it needs; casting Town Portal to get back.
- With 8.4.8b: weighing a tile's reveal against a target's worth, so a hero explores before going far for a small target; counting what the route shows on the way; a hidden tile none of whose neighbours can be walked on left out; the Scouting skill's longer sight.
- With 8.4.8: the army a battle would cost the hero, taken off a monster's or hero's worth; what a Stables' creature upgrade is worth; an enemy town's walls and the targets it leaves its owner without.
- With 8.4.5: a computer hero casting, retreating or surrendering in battle (smarter combat AI, 5.7b); artifacts, chests and bonus objects as targets (8.4.7b); monsters offering to join or flee a stronger hero (5.2), which would apply to computer heroes too.
- With 8.4.8d: a threatened town building its walls first (with sieges, 5.10); hero roles, so a scout weighs Estates or Scouting higher; a hero ending a long walk in an enemy's reach weighed by where it stops tonight rather than at its target; a hero that flees to a safe tile walking back into reach for a target worth the risk the same day.
