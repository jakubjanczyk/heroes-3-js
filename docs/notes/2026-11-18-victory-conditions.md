# Victory conditions

Roadmap 8.5. How a game ends: a player who has lost everything is out, the last one left wins, a player without a town for seven days is banished, and a scenario can set its own goal or way to lose.

## Parts

Each part is one PR.

1. **8.5.1 Defeat all enemies.** A player with no town and no hero left is vanquished. A computer player who is drops out: a message says so, its mines and dwellings go back to neutral, it takes no more turns and leaves the Thieves' Guild and the kingdom overview's Enemies. When the last one goes, the player wins. When the player is vanquished, they lose. Either way the game ends with a window that offers to start again; a reload shows it again.
2. **8.5.2 Seven days without a town.** A player without a town is told at the start of each turn how many days are left to capture one; after the seventh turn without one they are banished and lose, with their heroes still on the map. A computer player is banished the same way, its heroes leaving the map.
3. **8.5.3 The scenario's victory condition.** The scenario names one goal: capture a town, defeat a hero, gather an amount of a resource, or find an artifact; it may also let the standard victory count, and let computer players win by it.
4. **8.5.4 The scenario's loss condition.** Lose a given town, lose a given hero, or run out of time.
5. **8.5.5 The end of the game in numbers.** The days taken and the score shown when the game ends.

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
