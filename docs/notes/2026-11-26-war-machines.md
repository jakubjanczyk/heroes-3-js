# War machines

Roadmap 5.11: the Ballista, the Ammo Cart, the First Aid Tent and the Catapult, and Tactics. The Catapult already stands and shoots in sieges (5.10.5, 5.10.6), on its own and for every attacking hero; nothing else of the war machines exists yet.

## Parts

Too large for one PR. Split:

- **5.11.1 War machines on the hero**: the hero carries them, in their four slots on the hero screen and the exchange window. Every hero has a Catapult; a hired hero brings the war machine in their starting army; a scenario can give a hero one. They stay in their slots: the Catapult can't be moved, and none goes to the backpack. The other three can be traded between heroes in the exchange window; on the hero screen alone they aren't picked up at all.
- **5.11.2 On the battlefield**: the hero's Ballista, Ammo Cart and First Aid Tent stand in their places in battle as targets. They can be attacked and destroyed, and a destroyed one is lost after the battle. They do nothing yet.
- **5.11.3 The Ballista shoots**, at the end of each round; its damage grows with the hero's Attack. Artillery aims it and adds its bonuses.
- **5.11.4 The First Aid Tent heals** at the end of each round; First Aid heals more and aims it.
- **5.11.5 The Ammo Cart**: the side's shooters never run out of shots while it stands.
- **5.11.6 Buying them at the Blacksmith** (6.2). The War Machine Factory waits for the map's trading and services (7.16), and the war machine specialties wait for hero specialties (4.4).
- **5.11.7 Tactics**: placing the army before the battle.

## 5.11.1 War machines on the hero

Checked against the Heroes 3 wiki's raw page source (War Machine, `Translation_Data/artraits.txt`, `Translation_Data/GENRLTXT.TXT`) and against the reference engine's artifact data, hero code and hero screen code.

- **They are artifacts**, each with a slot of its own: War Machine A is the Ballista's, B the Ammo Cart's, C the First Aid Tent's, D the Catapult's (wiki; the engine's artifact data gives each its own war machine slot). On the hero screen these are the four frames right of the helmet that `index.html` already draws empty: the Ballista's at the top left of them, then down the right-hand column the Ammo Cart's, the First Aid Tent's and the Catapult's (the engine's hero screen layout). The exchange window has the same four frames.
- **Every hero has a Catapult** (wiki: "All heroes come equipped with a Catapult"; the engine puts one in slot D of every hero). That includes scenario heroes, hired heroes and the computer's heroes.
- **A hired hero's war machine.** A hero's starting army can hold a war machine in place of a stack. It takes that stack's place in the roll (the second stack's 88%, say). When the roll brings it, the hero gets the war machine in its slot, and the creature stacks after it move up in the army (the engine; the wiki: "Heroes with the Ballista specialty have an 88% chance to start with a Ballista", the second stack's chance). The repo's hero data already lists these (Christian's Ballista, Rion's First Aid Tent, …), and the tavern leaves them out for now.
- **A scenario hero** gets the war machines named in their `artifacts`, each in its own slot, as with other artifacts. A scenario hero's army isn't rolled, so their hero data's war machine doesn't come with them (as their starting army doesn't).
- **Moving them.** "War Machines (except Catapults) can be traded between heroes, but cannot be dismissed or placed in the hero's backpack" (wiki). The engine says the same:
  - Clicking the Catapult says "The Catapult must be equipped." (`core.genrltxt.312`), and it stays where it is.
  - A war machine dropped on a backpack frame isn't put there. The message is "Alas, your backpack cannot hold something as large as a Ballista." (`core.genrltxt.153`, with the war machine's name), and the war machine stays in hand.
  - On the hero screen alone, clicking a Ballista, Ammo Cart or First Aid Tent doesn't pick it up: it fits only its own slot, so there is nowhere to put it (decided with the user; the engine picks it up). In the exchange window it is picked up and can go to the other hero's slot, and the backpack message shows there.
  - It fits only its own slot, as any artifact fits only its kind.
  - In the exchange window the Ballista, Ammo Cart and First Aid Tent go to the other hero's slot as other artifacts do; the Catapult gives the same message there.
- **Names and descriptions** (`artraits.txt`):
  - Catapult: "Use this war machine to target your enemy's fortifications in combat."
  - Ballista: "Use this war machine to target your enemy's troops in combat."
  - Ammo Cart: "The Ammo Cart ensures that your missile troops will never run out of ammunition in combat."
  - First Aid Tent: "The First Aid Tent provides healing to your troops during each round of combat."
  
  The right-click popup and the status bar text are the other artifacts' (title and description; "View Ballista Info", "Empty").
- **Counting artifacts.** The tavern's "… with N artifacts" (`core.genrltxt.215`) leaves out the war machines and the spell book (the engine's tavern window). The Thieves' Guild's "most artifacts" counts every worn artifact in the engine, war machines included; nothing says what the game does. We leave them out there too (decided with the user), as the repo already leaves out the spell book (it is not an artifact here). Not checked.
- **No class and no cost here.** An artifact chest picks only Treasure artifacts, so war machines are never found in one. Their prices come with the Blacksmith (5.11.6).

As built: a war machine is an artifact with `"warMachine": true` in `game/data/artifacts.json`, its slot one of `BALLISTA`, `AMMO_CART`, `FIRST_AID_TENT` and `CATAPULT`; `"everyHero"` gives it to every hero and `"mustBeEquipped"` keeps it in its slot. A beaten hero's war machines don't go to the winner: they aren't really artifacts and can't be captured (decided with the user in 5.11.2, which changed what 5.11.1 built from the engine). Between the player's own heroes they are still traded in the exchange window.

Left for later parts: everything in battle (5.11.2–5.11.5), buying them (5.11.6) and whether a hero back in the tavern keeps theirs (with the hero who retreated, 4.5.5). Pictures stay the artifacts' stand-ins (the name in the frame) until the sprites (10.1).

## 5.11.2 On the battlefield

Checked against the Heroes 3 wiki's raw page source (War Machine, `Template:Creature/Ballista`, `Template:Creature/Ammo_Cart`, `Template:Creature/First_Aid_Tent`, Combat), the game's manual (its war machine table, as quoted by a web search) and the reference engine (its battle set-up, its battle layout's war machine hexes, its battle's end and casualties, its creature entries).

- **Who has them in battle.** A hero's Ballista, Ammo Cart and First Aid Tent stand on their side of the battlefield in every battle that hero fights, attacking or defending, against a monster, a guard, a garrison or a hero (the wiki: "When purchased, they participate in combat on the owner's side of the battlefield"; the engine places each war machine artifact the hero wears). A side without a hero (a monster, a garrison on its own) has none. The Catapult stays as it is: the attacker's, in a siege only (5.10.6).
- **A hero defending a town** has their Ammo Cart and First Aid Tent but not their Ballista (the engine leaves the defender's Ballista out in a battle at a town, as the original game does; the wiki says nothing; a web search found nothing either). We follow the engine (decided with the user).
- **Where they stand** (the engine's war machine hexes; the wiki's "Army organization with War Machines" picture shows the same places). Rows and columns as in `battlefield.js`:
  - the attacker: the Ammo Cart on row 1, the Ballista on row 3, the First Aid Tent on row 9, all in column 0; the catapult stays on row 7;
  - the defender: the same rows in column 14.
  
  The armies' start rows (0, 2, 4, 5, 6, 8, 10) never use rows 1, 3, 7 and 9, so nothing overlaps.
- **Their stats** (the wiki's creature tables; the manual's war machine table agrees on the Ballista's 10, 10 and 250 health and the others' health):

  | | Attack | Defense | Damage | Health | Speed | Size |
  |---|---|---|---|---|---|---|
  | Ballista | 10 | 10 | 2–3 | 250 | 0 | two hexes |
  | Ammo Cart | 0 | 5 | 0 | 100 | 0 | one hex |
  | First Aid Tent | 0 | 0 | 0 | 75 | 0 | two hexes |

  The size is the engine's (`doubleWide` for the Ballista and the tent, not the cart) and the wiki's (`size` 2, 1, 2). A two-hex one has its back half on the edge column, as the catapult does. The hero's Attack and Defense are added to them as to the catapult (agreed for the catapult in 5.10.6).
- **As targets** they are what the catapult already is (5.10.6): the enemy's stacks walk or fly to them, shoot them and cast on them; they never strike back; next to an enemy shooter they keep it from shooting; they take no turn (in this part none of them acts), have no morale, and don't count for winning, so a side with only war machines left has lost. They are immune to the same spells as the catapult (the wiki's list is for all war machines). The arrow towers go for a creature before a war machine, as they already do. The log says "The Ballista is destroyed." when one falls, as for the catapult.
- **Destroyed ones are lost.** After the battle a destroyed Ballista, Ammo Cart or First Aid Tent is gone from the hero's slot, whoever won; the Catapult never is (the engine removes every destroyed war machine but the catapult from the hero; the wiki, Combat: the catapult "can be destroyed only temporarily"). Whether destroyed or not, a beaten hero's war machines are never captured (decided with the user).
- **Experience and casualties.** The winner earns no experience for them (already so for every war machine). A destroyed one is listed among its side's casualties in the results window, as the destroyed catapult is (the engine counts them as casualties).
- **On screen** each has a stand-in picture of its own, as the catapult has, until the sprites (10.1); hovering one shows its name in the status bar and the attack cursor, as for the catapult.

As built: a war machine artifact names its battle creature (`"creature": "BALLISTA"` in `artifacts.json`), and the creatures are in `monsters.json` with the `warMachine` ability; their rows are in `battlefield.js`, the catapult's included. Each has a stand-in picture until the sprites (10.1).

Left for later parts: the Ballista shooting (5.11.3), the tent healing (5.11.4), the cart's shots (5.11.5); paying for standing war machines when surrendering (the engine counts half their price, with their prices, 5.11.6); a battle without war machines at a creature bank (7.13); a retreated hero keeping theirs (4.5.5); the computer counting them in an army's strength (8.4); their right-click popups, with the battle's stack popups.

## 5.11.3 The Ballista shoots

Checked against the Heroes 3 wiki's raw page source (War Machine, `Template:Creature/Ballista`, Artillery, Combat, Damage, Shots, Archery, `Translation_Data/SSTRAITS.TXT`) and the reference engine (Artillery's effects, the Ballista's creature entry and damage script, the turn order, the automatic shooter's turn, the attack's rolls, which shooters an adjacent enemy blocks, its shots).

- **Its turn.** The Ballista has Speed 0, so it takes its turn after every stack that didn't wait, and before the stacks that waited (the wiki's Combat page: "Ballista and First Aid Tent act last as they have 0 Speed"; the engine sorts it by speed in the round's normal phase like any stack). The wiki's War Machine page says "at the end of every combat round, followed only by the First Aid Tent", which is the same order read before Wait existed. Two Ballistas both at Speed 0 keep the repo's tie rule: the attacker's first. It has no morale (5.11.2), but luck counts for it (the wiki: "Ballistas are affected by Luck"; the engine rolls luck for every attack).
- **Its shot.** Its damage is 2–3 times the hero's Attack plus one (the wiki: "(2–3)*(hero's attack + 1)" for the original game; the engine scales the base damage by the hero's Attack from their skill and artifacts, plus one). That range is then used in the damage formula as any creature's, with its own Attack (10 plus the hero's, as built in 5.11.2) against the target's Defense. Bless and Curse work on the scaled range. An enemy next to it doesn't stop it shooting (the wiki: "It can shoot even if enemies are adjacent to it"; the engine gives war machines free shooting). A target more than 10 hexes away, measured to its nearest hex, and the walls halve its shot as any shooter's, the status bar showing the halved range, (the engine has no exception for it; the wiki's ranged penalty lists none). It never strikes back (5.11.2).
- **Shots.** "Contrary to what its in-game statistics indicate, a Ballista has unlimited shots" (the wiki's War Machine page); "it cannot run out, and goes into negatives instead of becoming unable to shoot" (the wiki's Shots page). The engine gives it 24 shots that run out unless an Ammo Cart stands. We follow the original game: it never runs out, and the status bar leaves its shots out: "Shoot Pikemen (damage 20-30)", as for the arrow towers (decided with the user).
- **Who aims it.** A hero with Artillery at any level controls it (the wiki; the engine's Artillery gives the control at every level). Without the skill, in Auto combat and for the computer, it aims itself. Aiming itself, it picks its target as the arrow towers do (5.10.9): a stack that can act before a blinded one, a creature before a war machine, one that can strike this turn or the next before one that can't, one inside the walls before one outside, then the most worth taken (the engine uses the same choice for towers and the Ballista). Its turn then plays at once, and the hero can't cast on it.
- **The player's controlled Ballista** takes its turn as a stack of theirs that can't move: it is outlined, the cursor shoots at any enemy stack, the status bar says the shot and its damage, the hero can cast first if they haven't this round, Wait brings it back first among the stacks that waited (it is the slowest), Defend passes the turn. The wiki's Combat page says of the controlled towers and catapult that "defense provides no bonuses"; nothing says so for the Ballista, and we give it none either.
- **Artillery's bonuses**, by level (Basic, Advanced, Expert): a 50, 75 or 100% chance of double damage on each shot, and from Advanced two shots a turn (the wiki's skill table and its Shots page: "Shoots twice from Advanced Artillery"; the engine: the chance 50, 75, 100 and an extra attack at Advanced and Expert). The double damage doubles the base damage: it adds +100% next to the Attack bonus, as a lucky strike does, so both together triple it (the wiki's Damage page, I5 = 1.00 for the Ballista's double damage; the engine adds it to the same factors). Each shot rolls its own chance (the engine rolls per attack). The second shot goes at the same target and is lost when the first kills it, as a Marksman's.
  - The game's own skill texts (`SSTRAITS.TXT`) say two shots already at Basic: "Basic Artillery gives control of the ballista to the hero, allowing two shots with a 50% chance to inflict double damage." The wiki's table, its Shots page and the engine give Basic one shot; we follow them (decided with the user).
  - The game's texts: Advanced "…allowing two shots with a 75% chance to inflict double damage.", Expert "…allowing two shots which inflict double damage." The repo's descriptions were our own wording; they become the game's three texts as written, Basic's "two shots" included (decided with the user).
- **No log line for the double damage**: neither source shows one; the damage line is the usual "The Ballista does 40 damage."
- **Saved**: the Ballista's shot is saved as any stack's shot, its strikes with the damage rolled, so a reload rolls nothing again.

As built: the Ballista's entry in `monsters.json` says it all: `ranged`, `unlimitedShots` and `damageTimesHeroAttack` among its abilities, and `controlledBy` with the skill and, by level (none, Basic, Advanced, Expert), its shots a turn and its chance of double damage. A war machine that shoots takes turns as a stack; one that doesn't (the Ammo Cart and the tent, for now) still has none. The towers and the Ballista aiming themselves share one target choice (`game/heroes/self-aimed-shots.js`).

Left for later: Archery adding to its damage (with Archery's effects, 4.7; the wiki: Archery increases the Ballista's base damage); the Ballista specialty (4.4); the computer weighing whether to give its own Artillery Ballista other targets (8.4); its right-click popup, with the battle's stack popups.

## 5.11.4 The First Aid Tent heals

Checked against the Heroes 3 wiki's raw page source (War Machine, First Aid, Combat, `Translation_Data/GENRLTXT.TXT`, `Translation_Data/SSTRAITS.TXT`) and the reference engine (the tent's creature entry and its healing ability, First Aid's effects, the tent's automatic turn, its heal action and its choice of target). A web search found nothing more.

- **Its turn.** The tent has Speed 0, so it acts after every stack that didn't wait and before those that waited, as the Ballista does (the wiki's Combat page: "Ballista and First Aid Tent act last as they have 0 Speed"; War Machine: the Ballista acts at the end of the round "followed only by the First Aid Tent"). The repo's tie rule (the attacker's first, then slot order) puts a side's Ballista before its tent, as the battle places the Ballista first. It has no morale and no luck: it doesn't attack.
- **How much.** It heals a random 1 to 25 health without First Aid, 1–50, 1–75, 1–100 with Basic, Advanced, Expert (the wiki's First Aid table for the original game, "healing 1-50 points of damage to the first unit of the selected stack"; the War Machine page's "1-25"; the engine: a power of 25, 50, 75, 100 with a minimum of 1, "H3: heals random amount from 1 to maximum"). The wiki's "20-25" and "40-50" are Horn of the Abyss's and left out.
- **Only the top creature.** It heals the stack's top creature up to its full health and never brings back a killed one (the wiki: "heals … hit points of the top creature of an allied stack", "it cannot resurrect killed creatures"; the engine heals without raising). The battle's existing `healTopCreature` (Cure) does exactly that.
- **Whom.** A living stack of its own side whose top creature is wounded; never an enemy and never a war machine, itself included (the engine: the heal targets the healer's side only, war machines are immune to it, and an unwounded stack is refused). Undead and other living-or-not creatures are healed too, as the engine does; the wiki and a web search say nothing (decided with the user).
- **Who aims it.** A hero with First Aid at any level controls it (the wiki: the skill "gives the player control over the tent rather than being chosen by computer"; the engine gives the control at every level). Without the skill, in Auto combat and for the computer, it aims itself at the stack whose top creature has lost the most health; on a tie, the earlier in the army (the engine picks the most health lost on the top creature; the original game's choice isn't documented; we keep the engine's, decided with the user). With nobody to heal its turn passes, the player's controlled tent's too: the engine gives the player that turn with every hex blocked, we skip it (decided with the user).
- **The player's controlled tent** takes its turn as the controlled Ballista does: outlined as the active stack, the hero can cast first, Wait and Defend work as for the Ballista. Hovering one of the player's wounded stacks shows a heal cursor and "Apply first aid to the Pikemen" (`core.genrltxt.419`) in the status bar; any other hex is blocked. Clicking heals it.
- **The log** says "The First Aid Tent heals the Pikemen removing 17 points of damage." (`core.genrltxt.414`, "The %s heals the %s removing %d points of damage."), with the health actually healed.
- **On screen** the healed stack shows a heal picture over it as it is healed, whoever aims the tent (the game plays the Cure spell's animation on it, decided with the user; the engine's data names another animation; until the sprites, 10.1, it is the same stand-in burst as Cure's).
- **Saved** as a fact with the health rolled, so a reload rolls nothing again.
- **First Aid's descriptions** become the game's texts as written (`SSTRAITS.TXT`), as Artillery's did: "Basic First Aid gives control of the first aid tent to the hero, healing 50 points of damage to the first unit of the selected stack.", Advanced's 75 and Expert's 100.
- **The cursor** is our own pixel art (a red cross), drawn by `scripts/build-cursors.mjs` as the others.

As built: the tent's entry in `monsters.json` has the `heals` ability and `controlledBy` with the skill and its healing by level (none, Basic, Advanced, Expert). A war machine that shoots or heals takes turns as a stack. The heal is saved as `fact.battle.stack.healed` with the health given back.

Left for later: the First Aid specialty (Rion, Gem, Verdish: +5% healing per level, 4.4); the computer weighing First Aid (8.4); the tent's right-click popup, with the battle's stack popups.

## 5.11.5 The Ammo Cart

Checked against the Heroes 3 wiki's raw page source (War Machine, Shots, `Template:Creature/Ammo_Cart`) and the reference engine (a stack's shots, the check for its side's Ammo Cart).

- **Shots aren't used while it stands.** "The Ammo Cart provides unlimited shots for creatures and War Machines with ranged attacks until the Ammo Cart is destroyed, after which their shots will deplete as normal" (the wiki's War Machine page); "The shots start to decrease right after the Ammo Cart is destroyed" (its Shots page). The engine does the same: while the side's cart is alive, a shot uses no ammunition, so a shooter's count stays where it was and goes down from there once the cart falls.
- **On screen** the status bar still shows the shooter's count, which doesn't go down: "Shoot Pikemen (12 shots left, damage 21-31)" after any number of shots (the engine shows the count left, which the cart keeps as it is; the wiki says nothing). A shooter that shoots twice (Marksmen) shoots both even with one shot left, as it uses none.
- **Whose shooters.** Only its own side's: the enemy's cart does nothing for the hero's shooters. A stack that changed sides (hypnotized) is served by the cart of the side it started on, not the one it fights for (the engine matches the cart to the stack's side at the start of the battle; the wiki says nothing; decided with the user).
- **Who it helps.** The Ballista and the arrow towers already never run out (5.11.3, 5.10.9), and the catapult's shots are its turn's, not ammunition; so in practice it serves creature shooters.
- **It takes no turn**, as built in 5.11.2.
- **Saved**: nothing new; the shots left follow from the saved shots and whether the cart stood at each one.

Left for later: a creature bank battle, where the cart doesn't stand on the battlefield but still gives unlimited shots (the wiki and the engine; 7.13); the shots left in the creature's info window (with the battle's stack popups).
