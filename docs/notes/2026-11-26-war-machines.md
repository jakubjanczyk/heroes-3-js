# War machines

Roadmap 5.11: the Ballista, the Ammo Cart, the First Aid Tent and the Catapult, and Tactics. The Catapult already stands and shoots in sieges (5.10.5, 5.10.6), on its own and for every attacking hero; nothing else of the war machines exists yet.

## Parts

Too large for one PR. Split:

- **5.11.1 War machines on the hero**: the hero carries them, in their four slots on the hero screen and the exchange window. Every hero has a Catapult; a hired hero brings the war machine in their starting army; a scenario can give a hero one. They stay in their slots: the Catapult can't be moved, and none goes to the backpack. The other three can be traded between heroes in the exchange window.
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

As built: a war machine is an artifact with `"warMachine": true` in `game/data/artifacts.json`, its slot one of `BALLISTA`, `AMMO_CART`, `FIRST_AID_TENT` and `CATAPULT`; `"everyHero"` gives it to every hero and `"mustBeEquipped"` keeps it in its slot. A beaten hero's war machines go to the winner as their other artifacts do, into a free slot of their own kind only, and never the Catapult (the engine; not checked in the game).

Left for later parts: everything in battle (5.11.2–5.11.5), buying them (5.11.6) and whether a hero back in the tavern keeps theirs (with the hero who retreated, 4.5.5). Pictures stay the artifacts' stand-ins (the name in the frame) until the sprites (10.1).
