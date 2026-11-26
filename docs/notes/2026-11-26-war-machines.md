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
