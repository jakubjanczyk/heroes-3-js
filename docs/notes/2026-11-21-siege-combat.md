# Siege combat

Roadmap 5.10. A battle at a town with a Fort, Citadel or Castle is fought against its walls. Battles at towns already happen (a garrison, 8.1.6; a hero defending a town, 8.1.11; the computer attacking a town, 8.4.6c), all on an open field until now.

## Parts

Each part is one PR.

1. **5.10.1 Walls and the drawbridge.** A town with a Fort, Citadel or Castle is a siege: the walls stand on the battlefield. Walking stacks can't cross them; flying stacks fly over. The defender's stacks go out and back through the drawbridge, which opens for them and shuts behind them.
2. **5.10.2 Holding the drawbridge.** A dead stack on the drawbridge keeps it open for good, and an attacker on the hex in front of it keeps it shut.
3. **5.10.3 Shooting at the walls.** An attacking shooter outside the walls does half damage to a stack inside them.
4. **5.10.4 Teleport and the walls.** Teleport below Expert can't take a stack across them.
5. **5.10.5 The catapult.** The attacker always has one. It shoots once a round, before the other stacks, at a wall segment or the drawbridge; a segment it destroys can be walked through, a destroyed drawbridge stays open. The wall segments' hit points come from the Fort or the Castle. The defenders can attack it. Earthquake damages the walls. The computer's walkers that can't get in wait by the walls.
6. **5.10.6 The moat** (Citadel and Castle): a stack entering it stops there for the round, takes the town's moat damage and has −3 Defense while in it; Advanced Teleport crosses it.
7. **5.10.7 Arrow towers**: the Keep with a Citadel, two more with a Castle; how much they deal (the town's buildings), when they shoot, the catapult shooting at them.
8. **5.10.8 Ballistics**: the hero aims the catapult, two shots at Advanced, every shot hits at Expert; the hit chances and damage by level.
9. **5.10.9 The computer and the walls**: the walls in a computer hero's weighing of a town (4000 for a Citadel, 10000 for a Castle, 8.4.6c), a threatened town building its walls (8.4.8d), the catapult's automatic aim with Ballistics.

5.10.1 was first planned with 5.10.2 in it and split for size (agreed); 5.10.2 was then split in three, 5.10.2 to 5.10.4 (agreed). 5.10.1 is done: the walls and the drawbridge stand in every battle at a town with a Fort or better, whoever attacks. 5.10.2 is done: a dead stack on the drawbridge holds it open, any stack on it keeps it from shutting, and a living attacker in front of it keeps the defender's stacks off it while it is shut. 5.10.3 is done: a shot from outside at a stack wholly inside is halved, once even when it is also too far, and the cursor and the status bar show it. Left for 5.10.4: Teleport still ignores the walls.

Left for later: each faction's own walls, moat and Tower's land mines (6.5); the Tavern's and Brotherhood of the Sword's morale for defenders (6.5); Force Field and Fire Wall on the drawbridge's hexes (with battlefield obstacles, 5.3); the Cyclops attacking walls, Magi and the Golden Bow ignoring the walls (6.5, 7.8); the siege's own picture and music (10.2, 10.5).

## Rules, as checked

- **Which battles are sieges**: a battle at a town with a Fort, Citadel or Castle. Without one it is an open field, as now. Checked against the wiki (Combat, Siege: "If there is no fortification built in the town, there is a usual battlefield instead") and an open-source engine (walls only when the town has a Fort).
- **Already done**: no retreat or surrender in a town (8.4.6c), and 500 more experience for winning at a town with a Fort or better (8.1.6).
- **Where the walls stand**, checked against the wiki (Wall: "walls fill up 11 hexes, and 6 of them are indestructible", four segments and the drawbridge) and the engine's wall hexes. In our rows and columns (from 0; the engine counts the edge column as its column 0, so ours are one less):

  | Row | Wall | What |
  | --- | --- | --- |
  | 0 | 11 | the upper tower's base, always blocked |
  | 1 | 11 | Upper Wall |
  | 2, 3 | 10 | indestructible |
  | 4 | 9 | Mid-Upper Wall |
  | 5 | 9 and 10 | the drawbridge: its outer and inner hex |
  | 6 | 9 | indestructible |
  | 7 | 10 | Mid-Lower Wall |
  | 8 | 10 | indestructible |
  | 9 | 11 | indestructible |
  | 10 | 11 | Lower Wall |

  A hex is inside the walls when it is right of its row's wall hex (row 5: right of column 10). The defender's stacks start at column 14, inside. The hex in front of the drawbridge is row 5, column 8.
- **Who can stand where**: no stack stands on a wall hex. Walking stacks can't pass them; flying stacks fly over them, as over any stack (the wiki, Combat: "Flying creatures can fly over walls"; Fortifications: the wall "is impassable by non-flying enemy creatures"). Checked against the engine's battlefield accessibility.
- **The drawbridge**, checked against the wiki (Wall, Drawbridge) and the engine (its gate states and when they change):
  - Shut, its two hexes are walls for the attacker, flyers included; the defender's stacks walk and fly onto and through them, which opens it.
  - It shuts again after an action ends with no stack, living or dead, on either of its hexes. A dead stack on it keeps it open for good, and the attacker can then go through ("drawbridge trapping", the wiki).
  - A stack of the attacker on the hex in front of it (row 5, column 8) keeps it from opening: the defender can't go out through it while it is shut.
  - Its hit points and its destruction come with the catapult (5.10.5).
- **Shooting at the walls**: an attacker's shot from outside the walls at a stack behind a standing wall does half damage (the wiki: Wall, "hamper the attacks of ranged attackers by 50%"; Damage, the obstacle penalty R6 = 0.50). The engine halves it when the shooter stands outside the walls and the hexes between it and the target cross a standing wall hex; the drawbridge's outer hex doesn't count. With every wall standing (until 5.10.5) that is any shot from outside at a stack wholly inside. A stack on the drawbridge is not behind the walls (our reading of the engine, where the outer hex doesn't block and the inner one is the line itself). The defender's shots out of the town aren't halved (the engine; the wiki speaks only of targets "behind the wall").
  - **With the distance penalty too**: the wiki's Damage page says the damage "is halved once again if a range penalty applies" (a quarter); the engine halves it only once. We follow the engine (agreed): a shot is halved once, whichever penalties apply.
- **Teleport**: Basic and Advanced can't move a stack from one side of a standing wall to the other; Expert can. Checked against the wiki and the engine (the earlier Teleport note, `2026-11-05-teleport-clone-sacrifice.md`); the engine checks the hexes between the stack and its destination, as for the shooting penalty. The moat's limit comes with 5.10.6. The message is the one an invalid destination already gets ("Invalid Teleport Destination").

## What we decided

- **The battlefield**: the town gate's terrain, as for the open-field battles at towns, with the walls drawn on their hexes and the drawbridge drawn shut or open. The game shows the town's own siege picture instead; that waits for pictures (10.2).
- **The combat AI** (agreed): unchanged, with the walls in its paths. A computer defender's stack goes out through the drawbridge to its nearest target; a computer attacker's walker that can't reach any target passes its turn, as now. The game's AI tends to stay inside; that is smarter combat AI (5.7b).
- **Until the catapult (5.10.5)**, an attacker with only walkers can't get in unless the defenders come out (agreed); since 5.10.2 also when a stack dies on the drawbridge.
- **What is saved**: nothing new. Whether the battle is a siege follows from the town's buildings when the battle started, and the drawbridge from where the stacks are: it is open while a living stack covers one of its hexes.
- **5.10.2, holding the drawbridge**: open while any stack, living or dead, covers one of its hexes; a sacrificed stack leaves no corpse, so it doesn't. It stays worked out from where the stacks are, so nothing new is saved. While it is shut, a living stack of the attacker on the hex in front of it keeps the defender's stacks off its two hexes; a corpse there doesn't (the sources don't say; our call). The defender's flyers still fly out over the walls.
- **Inside the walls** (5.10.3, 5.10.4): a hex is inside when it is right of its row's wall hex; the drawbridge's two hexes are outside. A shot is halved for the walls when the shooter stands outside and every hex of the target is inside, whichever side either fights for (the engine goes by where they stand). The shot's cursor and damage range show it as they show the distance penalty, since the game has one cursor for either penalty. A two-hex stack with one hex on the drawbridge is not wholly inside, so a shot at it is not halved (agreed).
- **The computer's shooters** (5.10.3): they still shoot the nearest stack, so the halving doesn't change which one they pick; weighing the damage is smarter combat AI (5.7b). A computer attacker's shooter starts more than 10 hexes from every hex inside the walls, so until something brings it closer its shots into the town are halved for the distance anyway.
- **5.10.4, Teleport**: below Expert, the stack and the hex it is taken to must both be inside or both outside; otherwise the hex says "Invalid Teleport Destination" and clicking it does nothing.
- **How it looks**: stone hexes for the walls, and wooden planks for the drawbridge, lowered while it is open. A wall hex is out of reach like any other; the game's status bar text over the walls waits for the siege's picture (10.2).
