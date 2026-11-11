# Player system

Roadmap 8.1. Other players on the map, whose turn it is, and what a player can learn about the others. The AI that plays them is 8.3 and 8.4, hot-seat is 8.2.

## Parts

Each part is one PR.

Other players on the map:

1. **8.1.1 Other players' colours.** Heroes, towns, mines and dwellings of other colours carry their owner's flag (every hero gets a flag, the player's own too), show in that colour on the minimap and say their owner in the popup ("(Blue)"). The kingdom overview shows the other players' flags under Enemies.
2. **8.1.2 Enemy heroes stand in the way.** The player can't select an enemy hero or meet it, and it blocks its tile. The swords show over one the hero can reach, and the hero walks up to it and stops next to it; the battle comes with 8.1.7.
3. **8.1.3 What an enemy hero's popup shows.** Its name and army, each stack's size as a word. No primary skills, morale, luck or spell points.
4. **8.1.4 Capturing enemy mines and dwellings.** Flagging one makes it the player's: the flag turns red, and the income or the recruits go to the player.
5. **8.1.5 Capturing enemy towns.** Walking into an enemy town without defenders captures it: red flag, the town list, its income.

Fighting for towns and heroes:

6. **8.1.6 Attacking a town's garrison.** Entering an enemy town with a garrison and no hero starts a battle against the garrison; winning captures the town, losing leaves the town and what is left of its garrison as they were. A neutral town given a garrison by the scenario is fought the same way (6.4). Until sieges (5.10) every such battle is fought on an open field, walls or not.
7. **8.1.7 Attacking an enemy hero.** The swords cursor, then a battle against the hero's army, with its primary skills. The winner gets the experience and the beaten enemy hero leaves the map.
8. **8.1.8 The beaten hero's artifacts go to the winner.**
9. **8.1.9 Losing to an enemy hero.** The player's beaten hero leaves for the tavern (4.5.5).
10. **8.1.10 Surrender** to an enemy hero: pay half the recruitment cost of the creatures left, in gold.
11. **8.1.11 An enemy hero defends its town.** Entering a town with an enemy hero in it starts a battle against that hero, and the town is captured if the player wins.

Turns:

12. **8.1.12 Taking turns.** After End Turn each other player takes a turn in colour order, then the new day starts. The turns are empty until the AI plays them (8.3).
13. **8.1.13 Each player's day.** Each player's heroes get their movement points back, and each player gets their own income and starting resources.
14. **8.1.14 The hourglass.** The info box shows an hourglass with the player's crest during another player's turn.

What a player learns about the others:

15. **8.1.15 The town box for towns that aren't yours.** No hall or income, and army sizes as words.
16. **8.1.16 Visions on enemy heroes** (Advanced) **and towns** (Expert).
17. **8.1.17 The Thieves' Guild.**

Later: Disguise and enemy heroes casting in battle (Eagle Eye, Magic Mirror, Cure, Resistance) come with the AI (8.3, 5.7b), and losing the game with victory conditions (8.5). The random starting garrison of a neutral town the scenario gives none, and its weekly reinforcements, come with neutral towns' garrisons (6.4).

## Rules, as checked

- **Colours**, in turn order: red, blue, tan, green, orange, purple, teal, pink. Checked against the wiki's copy of `ARRAYTXT.TXT` (texts 23 to 30, "Owned by red player" and so on) and an open-source engine's player colours.
- **Enemy hero popup** (right-click): the hero's name and army, each stack's size as a word and not a number. No primary skills, morale, luck or spell points. Checked against an open-source engine's hero info (the basic level for a hero of another player) and the game manual, which says Visions at Advanced shows an enemy hero's primary skills and the "composition and quantity" of its army, so they're hidden without it.
- **Army size words** in an army slot: Few, Several, Pack, Lots, Horde, Throng, Swarm, Zounds, Legion (`ARRAYTXT.TXT` 174 to 198, every third). The bands are the monsters' bands (`game/heroes/monster-count.js`). Checked against the wiki's `ARRAYTXT.TXT` and the engine's army tooltip.
- **The enemy hero popup's box** is the hero box the player's own heroes get, with the portrait, the name and the seven army slots. The primary skill values, morale, luck and spell points are left empty; each slot shows the creature with its size word under it in place of the count. Checked again for 8.1.3 against an open-source engine's hero tooltip (the four skills, spell points, morale and luck are drawn only for a detailed hero, the slot's word is `ARRAYTXT.TXT` 171 + 3 × the band, counting Few as 1) and the wiki's `ARRAYTXT.TXT` (Few at 174 through Legion at 198).
- **The size words' bands** are the monsters' bands: 1 to 4 Few, 5 Several, 10 Pack, 20 Lots, 50 Horde, 100 Throng, 250 Swarm, 500 Zounds, 1000 Legion. Checked against the engine's quantity bands and `game/heroes/monster-count.js`.
- **Status bar** over another player's hero: the engine shows "%s the %s" (`GENRLTXT.TXT` 15) and the owner line. Our status bar names heroes by their name alone. We keep that for every hero: the class isn't shown anywhere on the map yet.
- **Cursor**: swords over an enemy hero the hero can reach, which is the attack (8.1.7), numbered with the day like any other target; the arrow over one it can't reach.
- **Capturing**: entering a town of another player that has no defenders captures it, like a neutral one. A town with a garrison and no hero is defended by the garrison. With a Fort, Citadel or Castle that is a siege; without one, an ordinary battle on an open field (the wiki, Town). A hero in the town defends it with their own army, and in a siege the garrison's stacks join them (the engine), checked again in 8.1.11. Flagging a mine or dwelling of another player makes it the visitor's. Checked against the wiki (Town, Mine) and the engine.
- **Capturing mines and dwellings** (checked again for 8.1.4 against the wiki's Mine and Creature dwelling pages and an open-source engine's mine and dwelling visits): entering a mine or dwelling another player owns flags it for the visitor, exactly as a neutral one: the same mine message with its daily income, and a dwelling then offers its creatures. A mine pays its new owner from the next day; the old owner's income loses it at once. A flagged dwelling's +1 growth moves to the new owner's towns from the next week.
- **Guarded dwellings of another player**: the level 5 to 7 dwellings' guards come back at the start of every week whoever owns the dwelling, and guard it against every player but its owner, a pre-flagged one included. So a hero fights the full guards of another player's Monastery (same question, `core.genrltxt.421`); winning flags it, and for the rest of that week it can be re-flagged without a fight ("may be re-flagged peacefully by enemy heroes any number of times during that week", the wiki).
- **Guards an owner leaves in a mine** ("Unfortunately, it appears that the owner has left some guards. Do you wish to fight them?", the wiki's Mine page) need garrisons in mines, which nothing builds yet: left out.
- **Attacking a town's garrison** (checked for 8.1.6 against the wiki's Town and Experience pages, its `GENRLTXT.TXT`, and an open-source engine's town visit, pathfinding, battle results and results window):
  - A town of another player, or a neutral town, with creatures in its garrison and no hero is fought by entering it: the hero walks onto the town's gate and the battle starts straight away, with no question first. The cursor over it is the swords, not the horse; a town with an empty garrison keeps the horse and is taken without a fight (8.1.5).
  - The garrison fights as it stands, each stack in its own slot, with no hero: no spells, primary skills, morale or luck from a hero on its side.
  - Winning empties the garrison and the town becomes the player's: its flag, the town list, its income, the fog around it. The hero stays in the town. The engine doesn't open the town screen after the battle; we open it, as entering an undefended town does (agreed for 8.1.6).
  - Experience is one point per hit point of the creatures killed, as against monsters. The wiki gives 500 more for "an enemy town captured during a siege"; the engine gives those 500 for every won battle at a town, with walls or without. We follow the wiki (agreed for 8.1.6): the 500 come only for a town with a Fort, Citadel or Castle, where the battle would be a siege.
  - Losing or retreating takes the hero off the map and leaves the town to its owner with what is left of the garrison. Surrender needs an enemy hero, so it's disabled; its tooltip, "There is no hero to surrender to", is our own wording.
  - The results window names the defender by its strongest creature (the highest AI value), as for monsters; the texts are the ones the battles already use.
- **Fog**: each player's heroes and towns reveal the map for that player only. Already built (`game/state/fog.js`).

## Decisions

- **The players are the colours that own something in the scenario**, in colour order. Red is always the human player until hot-seat (8.2). The scenario gets no separate players list until it needs one (faction or AI settings, 8.3 or 9.1).
- **Every hero gets a flag in its owner's colour**, the player's own too, as towns, mines and dwellings have.
- **A garrisoned town is fought on an open field until sieges (5.10)**, even when it has walls.
- **The hero walks up to an enemy hero before heroes can attack** (the player's choice): the swords show, the hero stops on the tile next to it and nothing happens there until 8.1.7. Meeting a hero only opens the exchange screen when both are the same player's. Flying passes over an enemy hero as over the player's own heroes, and no spell lands on its tile.
- **The helmet cursor is only for the player's own heroes.** Over an enemy hero the hero can't reach it is the arrow, with a town selected too.
- **An enemy hero's popup keeps the hero box's skill icons** with their values empty, so it has the same shape as the player's own (agreed for 8.1.3).
- Other players' resources start empty. Starting resources and income for them come with each player's day (8.1.13).

## Built

- **8.1.1**: every hero, town, mine and dwelling a player owns carries that player's flag on the map, and the minimap shows them in that colour on the tiles the player has explored. The kingdom overview lists the other players' flags, in colour order, under Enemies. The demo map has a blue player in the south-east corner: Kirkwall, Sir Mullich and the Sulfur Dune.
- **8.1.2**: an enemy hero blocks its tile and can't be selected or met. The swords show over one the hero can reach and the hero walks up next to it, where nothing happens yet; the arrow shows over one it can't reach.
- **8.1.3**: right-clicking or long-pressing another player's hero shows its portrait, name and army, each stack with its size word under it ("Pack"), and the skill icons without values; no morale, luck or spell points.
- **8.1.4 and 8.1.5**, in one PR: entering another player's mine, dwelling or undefended town takes it for the player, through the same rule as a neutral one (the visitor's owner differs from the object's), so no new code was needed; the tests pin it. The flag turns red on the map and the minimap, the popup says "(Red)", the mine message shows, the income and the dwelling's growth bonus go to the player, a dwelling offers its creatures, and another player's guarded dwelling is fought for first. The demo map has a blue Archers' Tower beside Kirkwall.
- **8.1.6**: entering another player's town, or a neutral one, whose garrison has creatures and no hero in it starts a battle against the garrison, fought on an open field; the swords show over it. Winning empties the garrison, takes the town and opens its town screen, with 500 more experience when the town has a Fort or better. Losing or retreating leaves the town to its owner with what is left of its garrison, and Surrender says there is no hero to surrender to. A scenario may now give any town a garrison; the demo map gives Kirkwall 15 Pikemen and 8 Archers.
- Left for the next parts: the attack once the hero is next to an enemy hero (8.1.7), the enemy hero's details through Visions (8.1.16), and a town of another player names no owner in its popup until the town box (8.1.15).
