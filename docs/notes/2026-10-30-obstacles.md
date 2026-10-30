# Obstacles (2026-10-30)

Roadmap 7.3. Mountains, trees, lakes, rocks and craters: map objects that only block tiles.

## The rules

- An obstacle blocks some of the tiles its picture covers; the others can be walked on. Nothing can visit it.
- Over a tile it blocks, the status bar names it and the right-click popup shows only its name. Over a tile of its picture it doesn't block, both show the terrain. Checked against the game's adventure map code in VCMI (the hover text and popup of an object with no popup of its own are its name).
- On the minimap, the tiles it blocks are a darker shade of their terrain (rule 3 of `2026-10-17-minimap-objects-and-drag.md`).
- Names: Mountain, Oak Trees, Pine Trees, Trees, Lake, Rock, Crater. Checked against the wiki's copy of the game's object names (`Translation_Data/ObjNames.txt`), its map editor object table (`Map_Editor_Objects`) and homm3tools' object list.

## Shapes

From the game's object table (homm3tools' copy). An obstacle has no entrance, so it is placed by the bottom-right corner of its 8×6 grid, as the game's maps place every object; that tile can be one it doesn't block (`MOUNTAIN_1`). `#` blocked, `.` part of the picture that can be walked on, bottom row last, the bottom-right corner last on it.

The game has several pictures per obstacle and a set for each terrain; the terrain sets reuse the same shapes. We have the 41 base ones (the dirt set), keyed by name and number:

| Type | Shape | Type | Shape |
|---|---|---|---|
| `MOUNTAIN_1` | `.####` / `#####` / `###..` | `OAK_TREES_1`, `_2`, `PINE_TREES_1`, `_2` | `#` |
| `MOUNTAIN_2` | `###` / `.##` | `OAK_TREES_3`, `_4`, `PINE_TREES_3`, `_4` | `.##` / `##.` |
| `MOUNTAIN_3` | `###` / `##.` | `OAK_TREES_5`, `_6`, `PINE_TREES_5`, `_6` | `##.` / `.##` |
| `MOUNTAIN_4` | `####.` / `#####` / `..###` | `OAK_TREES_7`, `PINE_TREES_7` | `##.` / `###` / `.##` |
| `MOUNTAIN_5` | `##.` / `.##` | `OAK_TREES_8`, `PINE_TREES_8` | `.##` / `###` / `##.` |
| `MOUNTAIN_6` | `.##` / `##.` | `TREES_1`, `_2` | `#.` |
| `MOUNTAIN_7` | `###..` / `..###` | `TREES_3`, `ROCK_3`, `_4` | `#` |
| `MOUNTAIN_8` | `..###` / `###..` | `LAKE_1` | `#######` / `#######` / `###....` |
| `ROCK_1`, `_2`, `_5`, `CRATER_1`, `_2`, `_4`–`_6` | `##` | `LAKE_2` | `####` / `####` |
| `CRATER_3` | `##` / `##` | `LAKE_3` | `##` |

## What we did

- A scenario entity `{ "kind": "OBSTACLE", "type": "PINE_TREES_3", "tile": <bottom-right corner> }`. `game/data/obstacles.json` gives each type its `name`, `look` (its colour on the map) and `blocks`, the tiles it blocks as offsets from that corner. A new shape is data only.
- No pictures yet: each blocked tile is filled with its kind's colour (mountain, trees, lake, rock, crater).
- The demo map's walls were rock terrain, which is the underground's solid rock. Each rock tile now has the terrain around it, and the walls are mountains, largest shapes first. No mountain shape is two tiles wide and straight, so the gaps they leave are the one- and two-tile rocks. The blocked tiles are the same as before.
- The game restricts each picture to some terrains in its map editor; we don't check where a scenario puts an obstacle.

## Not yet

- The other terrain sets' pictures, and the decorations nothing blocks (flowers, kelp, ...), once there are pictures.
- The darker minimap shade for the tiles other objects block besides their entrance (resource generators, bonus objects).
