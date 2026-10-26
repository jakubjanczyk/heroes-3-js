# Creature dwellings on the map (2026-10-26)

Roadmap 7.4: standalone dwellings on the adventure map where a hero recruits creatures. Castle's seven only; the other factions' come with them (6.5).

## How Heroes 3 does it

Checked against the Heroes 3 wiki (heroes.thelazy.net: Creature dwelling), Shadow of Death rules.

- **The Castle dwellings.** Price and growth are the creature's, as in town (`monsters.json` already has them):

  | Dwelling | Creature | Level | Growth | Guards |
  |---|---|---|---|---|
  | Guardhouse | Pikeman | 1 | 14 | – |
  | Archers' Tower | Archer | 2 | 9 | – |
  | Griffin Tower | Griffin | 3 | 7 | – |
  | Barracks | Swordsman | 4 | 4 | – |
  | Monastery | Monk | 5 | 3 | 9 Monks |
  | Training Grounds | Cavalier | 6 | 2 | 6 Cavaliers |
  | Portal of Glory | Angel | 7 | 1 | 3 Angels |

- **Growth doesn't pile up.** "In adventure map dwellings the number of creatures cannot exceed the weekly growth." Each new week the count goes back to the growth. Only Horn of the Abyss makes it cumulative.
- **Recruiting** needs a hero to visit; recruits join that hero's army. Level 1 creatures are free from map dwellings; the others cost what they cost in a town.
- **Flag.** A visit flags the dwelling for the visiting player. While it flies the player's flag, that creature's dwelling in every town of the player gets +1 growth.
- **Guards.** Level 5, 6 and 7 dwellings are guarded by their non-upgraded creature, three weeks of growth. The guards come back at the start of each week. A hero who is beaten or retreats leaves only the surviving guards for the rest of that week. A dwelling pre-flagged for a player is guarded against the others in the first week, so the owner never fights them.

## Parts

1. **On the map, visited and flagged** (7.4.1). `game/data/dwellings.json` names each dwelling and its creature; a `DWELLING` entity blocks a row of two tiles, its entrance and the one left of it; a level 1 dwelling (the Guardhouse) also blocks the tile above that one. The rest of the 3×2 picture can be walked on and keeps its terrain colour on the minimap. As with every entrance, the hero gets onto it and off it from below or the sides, never through the row above. It shows on the map, the minimap and under fog, with the visit cursor on the entrance, and the status bar and right-click popup name it. Entering it flags it in the player's colour (`fact.dwelling.flagged`, persisted). No recruiting yet, and the guarded three are flagged as freely as the rest.
2. **Recruiting** (7.4.2). A week of growth at the start, reset each new week. The visit asks to recruit, then opens the recruit window, moved out of the town screen so both can open it. Recruits join the hero's army; Pikemen are free.
3. **Guards** (7.4.3). The battle module first learns to fight a defender army that isn't a monster on the map. Then the guarded dwellings start a battle on the first visit, keep their survivors for the week and renew each week.
4. **Town growth** (7.4.4). +1 growth per flagged dwelling in the player's Castle towns.
