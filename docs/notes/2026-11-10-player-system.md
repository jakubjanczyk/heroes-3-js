# Player system

Roadmap 8.1. Other players on the map, whose turn it is, and what a player can learn about the others. The AI that plays them is 8.3 and 8.4, hot-seat is 8.2.

## Parts

Proposed, waiting for approval. Each part is one PR.

Other players on the map:

1. **8.1.1 Other players' colours.** Heroes, towns, mines and dwellings of other colours carry their owner's flag (every hero gets a flag, the player's own too), show in that colour on the minimap and say their owner in the popup ("(Blue)"). The kingdom overview shows the other players' flags under Enemies.
2. **8.1.2 Enemy heroes stand in the way.** The player can't select an enemy hero or meet it: there is no route to its tile and it blocks the way. The arrow cursor shows over it, and a click does nothing until 8.1.6.
3. **8.1.3 What an enemy hero's popup shows.** Its name and army, each stack's size as a word. No primary skills, morale, luck or spell points.
4. **8.1.4 Capturing enemy mines and dwellings.** Flagging one makes it the player's: the flag turns red, and the income or the recruits go to the player.
5. **8.1.5 Capturing enemy towns.** Walking into an enemy town without defenders captures it: red flag, the town list, its income.

Fighting enemy heroes:

6. **8.1.6 Attacking an enemy hero.** The swords cursor, then a battle against the hero's army, with its primary skills. The winner gets the experience and the beaten enemy hero leaves the map.
7. **8.1.7 The beaten hero's artifacts go to the winner.**
8. **8.1.8 Losing to an enemy hero.** The player's beaten hero leaves for the tavern (4.5.5).
9. **8.1.9 Surrender** to an enemy hero: pay half the recruitment cost of the creatures left, in gold.
10. **8.1.10 An enemy hero defends its town.** Entering a town with an enemy hero in it starts a battle, and the town is captured if the player wins.

Turns:

11. **8.1.11 Taking turns.** After End Turn each other player takes a turn in colour order, then the new day starts. The turns are empty until the AI plays them (8.3).
12. **8.1.12 Each player's day.** Each player's heroes get their movement points back, and each player gets their own income and starting resources.
13. **8.1.13 The hourglass.** The info box shows an hourglass with the player's crest during another player's turn.

What a player learns about the others:

14. **8.1.14 The town box for towns that aren't yours.** No hall or income, and army sizes as words.
15. **8.1.15 Visions on enemy heroes** (Advanced) **and towns** (Expert).
16. **8.1.16 The Thieves' Guild.**

Later: Disguise and enemy heroes casting in battle (Eagle Eye, Magic Mirror, Cure, Resistance) come with the AI (8.3, 5.7b), and losing the game with victory conditions (8.5).

## Rules, as checked

- **Colours**, in turn order: red, blue, tan, green, orange, purple, teal, pink. Checked against the wiki's copy of `ARRAYTXT.TXT` (texts 23 to 30, "Owned by red player" and so on) and an open-source engine's player colours.
- **Enemy hero popup** (right-click): the hero's name and army, each stack's size as a word and not a number. No primary skills, morale, luck or spell points. Checked against an open-source engine's hero info (the basic level for a hero of another player) and the game manual, which says Visions at Advanced shows an enemy hero's primary skills and the "composition and quantity" of its army, so they're hidden without it.
- **Army size words** in an army slot: Few, Several, Pack, Lots, Horde, Throng, Swarm, Zounds, Legion (`ARRAYTXT.TXT` 174 to 198, every third). The bands are the monsters' bands (`game/heroes/monster-count.js`). Checked against the wiki's `ARRAYTXT.TXT` and the engine's army tooltip.
- **Status bar** over another player's hero: the engine shows "%s the %s" (`GENRLTXT.TXT` 15) and the owner line. Our status bar names heroes by their name alone. We keep that for every hero: the class isn't shown anywhere on the map yet.
- **Cursor**: swords over an enemy hero the hero can reach, which is the attack (8.1.2). Until then there is no route to an enemy hero: the arrow, and a click does nothing.
- **Capturing**: entering a town of another player that has no defenders captures it, like a neutral one. Flagging a mine or dwelling of another player makes it the visitor's. Checked against the wiki (Town, Mine) and the engine.
- **Fog**: each player's heroes and towns reveal the map for that player only. Already built (`game/state/fog.js`).

## Decisions

- **The players are the colours that own something in the scenario**, in colour order. Red is always the human player until hot-seat (8.2). The scenario gets no separate players list until it needs one (faction or AI settings, 8.3 or 9.1).
- **Every hero gets a flag in its owner's colour**, the player's own too, as towns, mines and dwellings have.
- **Other players' towns start without a garrison**, like neutral towns, until sieges (5.10). We write the scenarios ourselves, so no check for it.
- Other players' resources start empty. Starting resources and income for them come with turns (8.1.3).
