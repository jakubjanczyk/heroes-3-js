# Victory conditions

Roadmap 8.5. How a game ends: a player who has lost everything is out, the last one left wins, a player without a town for seven days is banished, and a scenario can set its own goal or way to lose.

## Parts

Each part is one PR. Scenario Info (8.5.6) was added while planning 8.5.3, so a player can see the scenario's goal.

1. **8.5.1 Defeat all enemies.** A player with no town and no hero left is vanquished. A computer player who is drops out: a message says so, its mines and dwellings go back to neutral, it takes no more turns and leaves the Thieves' Guild and the kingdom overview's Enemies. When the last one goes, the player wins. When the player is vanquished, they lose. Either way the game ends with a window that offers to start again; a reload shows it again.
2. **8.5.2 Seven days without a town.** A player without a town is told at the start of each turn how many days are left to capture one; after the seventh turn without one they are banished and lose, with their heroes still on the map. A computer player is banished the same way, its heroes leaving the map.
3. **8.5.3 The scenario's victory condition.** The scenario names one goal: capture a town, defeat a hero, gather an amount of a resource, or find an artifact; it may also let the standard victory count, and let computer players win by it.
4. **8.5.4 The scenario's loss condition.** Lose a given town, lose a given hero, or run out of time.
5. **8.5.5 The end of the game in numbers.** On a victory, the days taken, the score and the rank.
6. **8.5.6 Scenario Info.** The Adventure Options button opens a window with the scenario's name and its victory and loss conditions.

Left for later: the other special victory conditions (creatures, upgrading a town, the Grail, a monster, flagging every mine or dwelling, carrying an artifact to a town) come with what they need (the Grail, town upgrades, a map editor, 9.6). The AI going after a town when it has none waits for the AI's next round. The Hall of Fame and the difficulty in the score wait for a scenario setup screen (9.2). Teams and allies wait for hot-seat (8.2).

## Rules, as checked

- **The standard victory**: every enemy town captured and every enemy hero beaten, that is every other player out of the game. Checked against the wiki (Victory and Loss Conditions, "conquer all enemy towns and defeat all enemy heroes"), the game's text "Defeat all enemy heroes and capture all enemy towns." (`GENRLTXT.TXT` 234), and an open-source engine's standard win (the one player still in the game, or one team).
- **The standard loss**: losing every town for seven days, or the last hero beaten while owning no town. Checked against the wiki (Victory and Loss Conditions; Town: "If a player loses the control of his last town, or if a player starts with no towns, he has time for seven days to conquer at least one town, otherwise being eliminated from the game") and the engine (a player with no towns and no heroes is vanquished; a separate loss at seven days without a town). The game's short form is "Lose all your heroes and towns." (`GENRLTXT.TXT` 227).
- **What counts**: heroes on the map. A hero in a tavern doesn't keep a player in the game. Mines, dwellings and resources don't either. Checked against the engine (its vanquished check counts the player's heroes and towns).
- **A player who is out**: the engine takes their heroes off the map and makes every object they owned neutral (towns, mines, dwellings). They take no more turns, and the Thieves' Guild leaves them out (it ranks only the players still in the game). Checked against the engine; the wiki says nothing on it.
- **When it is checked**: as soon as a player has nothing left, once the windows of what caused it (battle results, artifacts, level-up) are closed; one player going out can make another the winner straight away. Checked against the engine (it checks after a battle, after an object changes owner, and again for every other player after one goes out, waiting while a window is open).
- **Days without a town** (8.5.2), checked against the engine: the count starts at 0 when a player loses their last town and goes up by one at the end of each of their turns while they have none; capturing a town clears it. At the start of each of their turns without a town the player sees "%s, you only have %d days left to capture a town or you will be banished from this land." (`ARRAYTXT.TXT` 128) with 7 − the count, and with a count of 6 "%s, this is your last day to capture a town or you will be banished from this land." (`ARRAYTXT.TXT` 129), with their flag. At 7 they lose. A player who starts with no town sees no message on the first day (the count starts at the first turn's end), so they see "6 days left" on day 2. The texts were checked against the wiki's `ARRAYTXT.TXT`.
- **Messages**, checked against the wiki's `GENRLTXT.TXT` and the engine (which shows each in a window with the player's flag, `%s` replaced by the colour's name, "Red"):
  - The player wins: "Congratulations! All your enemies have been defeated! Victory is yours!" (659).
  - The player is banished after seven days: "%s, your heroes abandon you, and you are banished from this land." (7). Another player banished so: "%s's heroes have abandoned him, and he is banished from this land." (8).
  - The game also has "All your forces have been defeated, and you are banished from this land!" (660) and "%s has been vanquished!" (5). The engine uses 7 and 8 for every loss, also when the last hero is beaten; 660 and 5 fit losing the last hero and town better. Open question below.
- **The end of the game**: the game plays a victory or defeat video and goes back to the main menu (the wiki's gallery, Victory and Defeat). We have no main menu: the map stays, locked, under a window saying Victorious or Defeated (`GENRLTXT.TXT` 410, 411) with a button to start the scenario again, as the system options' Reset does ("Are you sure you want to restart? (Your current game will be lost)", `GENRLTXT.TXT` 67, is the game's restart question).

## Decided

- A scenario with no other player has no standard victory: the game is won when the last enemy goes out, so there must have been one.
- The texts (agreed for 8.5.1): the player losing their last hero and town sees "All your forces have been defeated, and you are banished from this land!" (660); another player losing theirs, "%s has been vanquished!" (5). The seven days' texts 7 and 8 stay for 8.5.2.
- The end of the game (agreed for 8.5.1, for now): the message with the player's flag, then the map locked under a Victorious or Defeated window with a Restart button that starts the scenario again. Later, the proper ending: the victory or defeat video, the score and the Hall of Fame, and the way back to a main menu once there is one (8.5.5, 9.2).
- A scenario switch, `standardVictoryAndLoss`, on unless the scenario turns it off; the test builder turns it off, as it does fog of war, so a test that beats the only enemy hero or loses the only hero doesn't end the game unless it is about that (agreed for 8.5.1).

## Built in 8.5.1

- The check runs after a hero leaves the map (beaten, retreated, surrendered) and after a town changes owner, once that has settled, so the battle results, captured artifacts and level-up windows come first. Every player with no hero on the map and no town is out (`fact.player.vanquished`, saved); a computer player going out is announced with its flag, then the victory or defeat message with the player's flag, then the end window.
- A player who is out has their mines and dwellings unflagged, is skipped in the turn order, and is left out wherever the players in the game are listed: the Thieves' Guild, the kingdom overview's Enemies, the new day's movement points.
- After the game ends, the computer player whose turn it was stops, End Turn does nothing, and every click and key outside the end window is stopped. A reload opens the end window again, without the message.
- The scenario switch is `standardVictoryAndLoss` (on unless set to `false`).

Left for later parts: the days without a town (8.5.2), the scenario's own victory and loss conditions (8.5.3, 8.5.4), and the end in numbers with the proper ending (8.5.5).

## Plan for 8.5.2

The rules and texts above were checked again for this part: the four texts against the wiki's `GENRLTXT.TXT` (7, 8) and `ARRAYTXT.TXT` (128, 129), the count and when it is checked against the engine (the count goes up at the end of the player's own turn while they have no town, a town lost sets it to 0, a town captured clears it, 7 or more is the loss, checked right after that turn ends).

- The count, per player: none while they own a town; 0 when they lose their last one; one more at the end of each of their turns without a town (a player who starts with none goes from none to 1); cleared when they capture a town. So the days left depend on whose turn the town was lost in: lost in another player's turn, the player's next turn says 7 days left; the player starting without a town sees nothing on day 1 and 6 days left on day 2.
- At the start of the player's turn without a town: "Red, you only have N days left to capture a town or you will be banished from this land." (N = 7 − the count), or at a count of 6 "Red, this is your last day to capture a town or you will be banished from this land.", with their flag. Computer players see nothing.
- At the end of a turn that takes the count to 7, the player is out (the same vanquished fact as 8.5.1, so their mines and dwellings lose their flag and they take no more turns):
  - the player: "Red, your heroes abandon you, and you are banished from this land." with their flag, then the Defeated window, their heroes still on the map under it;
  - a computer player: "Blue's heroes have abandoned him, and he is banished from this land." with its flag; its heroes leave the map. If it was the last enemy, the victory message and the Victorious window follow.
- A banished computer player's heroes go back to the taverns, as a beaten hero does: the next heroes the taverns roll can be any of them (agreed for 8.5.2).
- After a reload the days-left message is not shown again, as 8.5.1's messages aren't; the count itself is rebuilt from the saved facts (agreed for 8.5.2).
- All of it only with `standardVictoryAndLoss` on, as the rest of the standard loss.

## Built in 8.5.2

- The towns state keeps each player's days without a town; it is rebuilt from the saved turn ends and town captures, so no new fact is saved.
- The check runs as each player's turn ends; a player banished goes out with the same saved fact as in 8.5.1. A computer player's heroes are taken off the map, so the taverns can offer them again. The player's heroes stay, and the day doesn't move on under the Defeated window.
- The days-left message opens once the player's turn has started, after the new week's message.

Left for later parts: the scenario's own victory and loss conditions (8.5.3, 8.5.4), and the end in numbers with the proper ending (8.5.5).


## Plan for 8.5.3

Rules checked against the wiki (Victory and Loss Conditions; texts in `GENRLTXT.TXT`) and an open-source engine (how a scenario's victory condition is read, when it is checked and which texts it shows):

- **The four goals and when each is met**:
  - *Capture a town*: the player owns the given town. Checked whenever a town changes owner.
  - *Defeat a hero*: the given hero leaves the map after losing a battle to the player (beaten, retreated or surrendered all count, as the hero is the battle's loser). Beaten by another player or by monsters, nobody wins by it. The engine lets only the human player win this way and always counts the standard victory with it, whatever the scenario says; we let the scenario decide both, as for the other goals (agreed for 8.5.3).
  - *Gather a resource*: the player's stock of the resource is at least the amount ("over" in the text, but the check is "at least"). Checked whenever the player's resources change, so also when a new day's income comes in.
  - *Find an artifact*: one of the player's heroes has the artifact, worn or in the backpack. Checked once picking it up (from the map, a chest, a beaten hero) has settled.
- **The two switches**: whether the standard victory (every enemy out) also wins, and whether a computer player can win by the goal. The standard loss (no hero and no town, seven days without a town) always counts, whatever they say. With the standard victory off, the last enemy going out doesn't end the game; the goal still has to be met.
- **Messages**, with the winner's flag (`GENRLTXT.TXT`):
  - capture a town: "Congratulations! You captured %s, and are victorious!" (249); a computer player doing it, "The enemy has captured %s, and claims victory!" (250);
  - defeat a hero: "Congratulations! You have completed your quest to defeat the enemy hero %s. Victory is yours!" (252);
  - gather a resource: "Congratulations! You have collected over %d %s in your treasury. Victory is yours!" (278); a computer player, "The enemy has collected over %d %s. Victory is theirs!" (279);
  - find an artifact: "Congratulations! You have found the %s, and can claim victory!" (280); a computer player, "The enemy has found the %s, and can claim victory!" (281).
  - A computer player winning ends the game for the player: its message, then the Defeated window.
- **The goal's own texts**, for a Scenario Info window later: "Capture the %s '%s'." (228), "Defeat the hero '%s'." (229), "Find the %s." (231), "Accumulate %d %s." (232), "  You may also defeat all heroes and towns." (233); the short names are in `vcdesc.txt` ("Capture Town", "Defeat Hero", "Accumulate Resources", "Acquire Artifact").

What we decide for this part:

- The scenario JSON gets `victoryCondition`: `{ "type": "captureTown", "town": "<town id>" }`, `{ "type": "defeatHero", "hero": "<hero id>" }`, `{ "type": "gatherResource", "resource": "GOLD", "amount": 100000 }` or `{ "type": "findArtifact", "artifact": "<artifact id>" }`, with `standardVictory` (`true` or `false`, always given: some scenarios can be won only by the goal, finding an artifact say, others also by beating every enemy; agreed for 8.5.3) and `computerCanWin` (also always given; agreed for 8.5.3). The goal works whether `standardVictoryAndLoss` is on or not; `standardVictory: false` turns off only the standard victory.
- The winner is saved as a fact; a reload shows the Victorious or Defeated window again, without the message.
- The resource in the message is named as in the resource bar ("Gold"), and the goal is met at the amount or more (agreed for 8.5.3).

- The demo map gets no goal until the player can see it (8.5.6) (agreed for 8.5.3).

Left for later: showing the goal to the player (8.5.6, the Adventure Options button opening a Scenario Info window with the victory and loss conditions in the game's texts above), computer players going after the goal (the AI's next round), and the other goals listed above.

## Built in 8.5.3

- The scenario's `victoryCondition` is read into its own state slice, which also keeps who beat each hero: the player on the other side of the battle the hero lost. A hero beaten by a town's garrison is beaten by the town's owner; one beaten by monsters, by nobody.
- The goal is checked after every fact that can meet it (a town captured, a hero leaving the map, resources found or gained, the day's income, an artifact picked up, captured or moved), once its windows have settled, before the standard loss. The player is checked first, then the computer players in turn order if the scenario lets them win by it.
- The winner is saved (`fact.player.won`). The player winning sees the goal's message with their flag, then the Victorious window; a computer player winning shows the enemy's message with its flag, then the Defeated window. A computer player beating the hero shows "The hero, %s, has suffered defeat - your quest is over!" (`GENRLTXT.TXT` 253), as the engine does.
- The Victorious or Defeated window repeats the goal's message when the goal ended the game, and a goal town the scenario leaves unnamed goes by its type's name ("Castle"), as everywhere else.
- `standardVictory: false` stops the last enemy going out from winning the game; the standard loss still counts.
- Computer heroes don't retreat or surrender yet, so the defeat-a-hero goal is tested with the hero beaten while attacking the player's hero rather than retreating from it.

Left for later parts: the scenario's loss condition (8.5.4), the end in numbers (8.5.5), Scenario Info (8.5.6), and computer players going after the goal.

## Plan for 8.5.4

Rules checked against the wiki (Victory and Loss Conditions; texts in `GENRLTXT.TXT`) and an open-source engine (how a scenario's loss condition is read, when it is checked and which texts it shows):

- **The three ways to lose** (the wiki: "Lose a Specific Town: you lose if the specified town is occupied by an enemy", "Lose a Specific Hero: you lose if the specified hero is defeated", "Time Limit: you lose if you have not won the scenario within the specified number of days"):
  - *Lose a town*: a town the player has owned is now another player's. The engine checks that the player doesn't hold the town and has held it at some point, so a town the player never had doesn't lose the game when someone else takes it.
  - *Lose a hero*: the hero is no longer the player's: beaten, retreated or surrendered, to an enemy hero, a garrison or monsters. The engine checks only that the hero is gone from the player, whatever took it.
  - *Time runs out*: the scenario gives a number of days; the player plays those days and loses when the next one starts (the engine: the day number is greater than the limit, checked at the start of each new day).
- **Only the human player** can lose this way; computer players lose only by the standard loss (the engine adds "is human" to the special loss condition).
- **The standard loss still counts** alongside it (the engine keeps the standard defeat with every special one), and the victory goal is checked before the loss, so a goal met at the moment time runs out still wins (the engine checks its victory events first).
- **Messages**, with the player's flag (`GENRLTXT.TXT`; the engine shows them in a window with the flag):
  - lose a town: "The town of %s has fallen - all is lost!" (251);
  - lose a hero: "The hero, %s, has suffered defeat - your quest is over!" (253), the same text 8.5.3 uses when a computer player beats the goal's hero;
  - time runs out: "Alas, time has run out on your quest. All is lost." (254).
- **The condition's own texts**, for Scenario Info (8.5.6): "Lose the %s '%s'." (224), "Lose the hero '%s'." (225), "Fail to win by month %d, week %d, day %d." (226), and "Lose all your heroes and towns." (227) for the standard loss.

What we decide for this part:

- The scenario JSON gets `lossCondition`: `{ "type": "loseTown", "town": "<town id>" }`, `{ "type": "loseHero", "hero": "<hero id>" }` or `{ "type": "timeExpires", "days": 90 }`. It works whether `standardVictoryAndLoss` is on or not, as the victory goal does.
- Losing this way is saved as the player being out (`fact.player.vanquished`), as the seven days' banishment is: the message with the red flag, then the Defeated window repeating the message, the player's heroes still on the map under it. A reload opens the Defeated window again with the message, without the message window.
- A goal town or hero the scenario leaves unnamed goes by its type's name, as in 8.5.3.
- The time limit's message opens at the start of the player's turn on the first day past the limit, after the new week's message, in place of the days-left warning.
- The demo map gets no loss condition until the player can see it (8.5.6).

Left for later: showing the condition (8.5.6), computer players guarding the town or hero, and dismissing a hero (4.5) counting as losing it once heroes can be dismissed.

## Built in 8.5.4

- The scenario's `lossCondition` is read into the same state slice as the victory goal, which also keeps whether the player has held the town it names: from the start, or once they capture it.
- It is checked with the victory goal, after every fact that can meet it and at the start of each day, once their windows have settled: the goal first, then the loss condition, then the standard rules. Only the player is checked.
- Losing this way is saved as the player being out (`fact.player.vanquished`); the Defeated window repeats the condition's message, also after a reload.
- A hero counts as lost once they are no longer on the map as the player's, so a retreat or surrender loses the game as a beating does.

Left for later parts: the end in numbers (8.5.5), Scenario Info showing the condition (8.5.6), computer players guarding the town or hero, and dismissing the hero once heroes can be dismissed (4.5).

## 8.5.5 The end of the game in numbers

Checked against the Heroes 3 wiki (Score, raw source; `GENRLTXT.TXT` and `ARRAYTXT.TXT`) and the open-source engine (its high score calculation, its high score screen and its creature table):

- **When**: the score is worked out each time a scenario is won (wiki: "Each time a scenario or a campaign is won"). On a defeat the game plays the defeat video and shows no score (engine).
- **The formula**: (200 − (D + 10) / (T + 5) + Grail + Genocide) × Difficulty, where D is the day the game ended on (the first day is 1), T the towns the player owns at the end, Grail 25 if the player has built the Grail in a town (the engine also counts carrying it), Genocide 25 if every other player is out of the game, and Difficulty 0.8, 1.0, 1.3, 1.6 or 2.0 from Easy to Impossible. Both sources agree on it.
- **Rounding**: the engine divides (D + 10) by (T + 5) in whole numbers, dropping the remainder, and drops the fraction of the final score; the wiki doesn't say. We follow the engine (agreed for 8.5.5).
- **What the screen shows**, in five columns (engine; texts checked against the wiki): "Total Time" (438) with the days, "Base Score" (439) with the score before the difficulty, "Difficulty Level" (440) with "Normal" (`ARRAYTXT.TXT` 143; Easy to Impossible are 142 to 146), "Final Score" (441), and "Your Rank" (676) with a creature's name. A player who cheated is ranked "Cheater!!!" (260); we have no cheats.
- **The rank**: the final score picks a creature from a table of 118 ranges, from 1–4 Imp to 398–500 Archangel. The wiki's table and the engine's agree row by row. It is a name only: most of these creatures aren't in our game.
- **The video and the Hall of Fame**: on a victory the game plays the high score animation behind the numbers, then lets the player enter a name into the Hall of Fame if the score makes the table. On a defeat, the defeat video.

What we decide for this part:

- The Victorious window shows the five columns under the message. The Defeated window stays as it is.
- Difficulty is Normal (×1.0) until a scenario setup screen lets the player choose it (9.2); the Grail bonus is 0 until there is a Grail.
- The numbers are worked out from the state when the window opens, so a reload shows the same ones.
- The rank table is data, `game/data/score-ranks.json`.
- No videos: we have none to play (agreed for 8.5.5).

Left for later: the difficulty (9.2), the Grail bonus (with the Grail), and the Hall of Fame (9.2, with the main menu).

## Built in 8.5.5

- When the game ends in the player's victory, the end window gets the score worked out from the state at that moment: the day, the player's towns, and whether every other player is out. A reload works it out again from the same state, so it shows the same numbers.
- The Victorious window lists the five columns under the message; the Defeated window has none.

## Plan for 8.5.6

Checked against the wiki's copies of the game's texts (`GENRLTXT.TXT`, `Help.txt`, `vcdesc.txt`, `lcdesc.txt`) and an open-source engine (its Adventure Options window, its Scenario Info screen and how it builds the conditions' texts):

- **The Adventure Options window**: the HUD's Adventure Options button ("{Adventure Options} Allows you to dig for the Grail, view the current Grail Puzzle, World Map, or Scenario Briefing. In multiplayer games you will also be allowed to view your opponents' last turn.", `Help.txt`) opens a window titled "Adventure Options" with View World ("See a bird's eye view of the world"), View Puzzle ("See the map of the buried object"), View Scenario Info ("View information about the current scenario"), Dig ("Search the area for the buried Grail"), Replay Opponent Turn ("Replays events since your last turn") and Okay ("Return to the Adventure Map"). The engine's window has the same buttons in the order View World, View Puzzle, Dig, View Scenario Info, Replay Opponent Turn, each disabled when it can't be used, and closes with Okay. This settles the adventure-map spells note's open question: Dig is in this window.
- **The Scenario Info screen**: the same card as the scenario selection, with a Back button ("Return to the previous screen."). Its rows (`GENRLTXT.TXT`): "Scenario Name:" (495) with the name, "Scenario Description:" (496) with the description, "Victory Condition:" (497) and "Loss Condition:" (498), each with an icon and its text, "Allies" (390) and "Enemies" (391) with the players' flags, the map size, and the difficulty ("Map Diff:" 494, "Player Difficulty" 492, "Rating" 218).
- **The conditions' texts**: the game has two sets. The short names: "Defeat All Enemies", "Acquire Artifact", "Accumulate Resources", "Defeat Hero", "Capture Town" (`vcdesc.txt`); "Lose All Your Towns and Heroes", "Lose Town", "Lose Hero", "Time Expires" (`lcdesc.txt`). The engine shows these, with " / Defeat All Enemies" after the goal when the standard victory also counts. And the full ones: "Capture the %s '%s'." (228), "Defeat the hero '%s'." (229), "Find the %s." (231), "Accumulate %d %s." (232), "  You may also defeat all heroes and towns." (233), "Defeat all enemy heroes and capture all enemy towns." (234); "Lose the %s '%s'." (224), "Lose the hero '%s'." (225), "Fail to win by month %d, week %d, day %d." (226), "Lose all your heroes and towns." (227). No source says where the game shows the full set (open question).

A screenshot of the game's screen (shared by the user) confirms the layout and that the full texts are shown: "Capture the castle 'Hells Depths'." and "Lose the Town 'Camp Kuttans'.". It is the whole screen: on the left "Scenario Information" over a table with a row per player (flag, Player or Computer with the handicap, Starting Town, Starting Hero, Starting Bonus) and Player Turn Duration under it; on the right the card (Scenario Name with the map size letter, Scenario Description, Victory Condition and Loss Condition each with an icon, Allies and Enemies as small flags, Map Diff, Player Difficulty and Rating), More Options and BACK. The map size letter is S, M, L or XL for maps 36, 72, 108 or 144 tiles wide (the engine), and the engine writes the size ("64x64") under it.

Proposed for this part (the full screen, agreed for 8.5.6):

- The Adventure Options button is enabled and opens the Adventure Options window; View Scenario Info and Okay work, the other four are shown disabled ("not available yet"), as the HUD's buttons are. Escape closes it, as Okay does.
- View Scenario Info opens the Scenario Information screen over the whole game; Back (or Escape) returns to the Adventure Options window.
- The left half: the title and a row for each player still in the game, in colour order, with its flag, Player or Computer, and its starting town and hero (the first of each the scenario gives it; empty when it has none).
- The right half: the scenario's name with the map size ("64x64", and the letter for the four standard sizes), its description (a new optional `meta.description` in the scenario JSON; empty when there is none), the victory and loss conditions in the full texts, Allies (the player's flag) and Enemies (the flags of the other players still in the game), and the difficulty: Map Diff and Player Difficulty Normal, Rating 100%, as the score uses until 9.2.
- A scenario with no victory condition shows the standard victory, one with no loss condition the standard loss; a goal with `standardVictory` adds "  You may also defeat all heroes and towns.".
- The word before a town's name: the screenshot has "castle" in one line and "Town" in the other, and no source says how the game picks it. Until one does, "town" in both (agreed for 8.5.6).
- "Fail to win by month %d, week %d, day %d." gives the last day the player plays (a 90-day limit: month 4, week 1, day 6) (agreed for 8.5.6).
- The demo map gets a description, in our own wording, and no goal or loss condition (agreed for 8.5.6).
- Nothing is saved: the screens read the state.

Left for later: Starting Bonus, the handicap, Player Turn Duration, More Options and choosing the difficulty (with the scenario selection, 9.2, which shows the same card), View World without a spell (4.8.8.5), View Puzzle and Dig (with obelisks and the Grail), Replay Opponent Turn (8.2), and the conditions' icons and the players' portraits (sprites, 10.1).

## Built in 8.5.6

- The Adventure Options button opens its window; only View Scenario Info and Okay work. Okay, Escape and Enter close it.
- View Scenario Info asks for the screen, which is worked out from the state when it opens: the players still in the game, each with the first town and hero the scenario gives it (the town by its type's name, as the game's Starting Town column shows the town's kind), the scenario's `meta.name` and `meta.description`, the map size with its letter for the four standard sizes, both conditions in the game's full texts, the flags of the player (Allies) and the other players still in the game (Enemies), and Normal difficulty with a 100% rating. Back, Escape and Enter return to Adventure Options.
- The screen keeps the game's 800 x 600 proportions and fills as much of the game as fits. As in the game's screen: a banner flag beside each player's row, the name over its handicap (Human or CPU), the town and hero as picture boxes with their names under them (letters until sprites), Player Turn Duration "Unlimited" (we have no turn timer), an icon beside each condition, the five difficulty pieces with Normal's picked, and a gold BACK.
- The demo map's description is our own wording.

Left for later: Starting Bonus, the handicap, Player Turn Duration, More Options and choosing the difficulty (9.2), View World without a spell (4.8.8.5), View Puzzle and Dig (with obelisks and the Grail), Replay Opponent Turn (8.2), the conditions' icons and the portraits (10.1), and the word before a town's name if a source settles it.
