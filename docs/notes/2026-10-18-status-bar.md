# Status bar (2026-10-18)

Roadmap 2.5. As in Heroes 3, a one-line bar between the map and the resource bar names whatever the mouse is over.

## Behaviour

- A tile with nothing on it: the terrain name ("Grass", "Water", "Subterranean", ...).
- A monster: its plural name ("Skeletons", `namePlural` in `game/data/monsters.json`). Once monsters have counts (5.2) it becomes "Pack of Skeletons".
- A resource: its name ("Gold"). As in H3 the amount stays hidden.
- A mine or a town: its name, on the entry tile and on every tile of the building. Mine names now follow H3 ("Gold Mine", "Ore Pit", "Alchemist's Lab", ...).
- The hero: the hero's name.
- Once a monster is defeated or a resource collected, its tile shows the terrain again.
- The bar empties when the mouse leaves the map, and keeps its height when empty.
- Portrait phones: the bar sits between the map and the resource bar too.

## How it works

- `engine/input.js` finds the tile under the pointer from screen coordinates and the camera offset, the same way clicks do. The tiles are covered by the effects layer, so the pointer never lands on a tile element. It reports the tile only when it changes, and `null` when the pointer leaves the map.
- `app/modules/camera.module.js` emits that as `ui.tile.hovered` (`{ tile }`).
- `app/heroes/modules/status-bar.module.js` works out what stands on the tile (static occupancy, footprints, removed entities, the hero's current tile), and `game/heroes/status-bar-text.js` turns it into the text.
- Behavior tests hover with `hoverTile(user, x, y)`, which moves the pointer over the top layer at the tile's screen position, like a real mouse.

## Not yet

- Count categories for monsters ("Pack of Skeletons"): done, see `2026-10-18-monster-counts.md`.
- Hovering HUD buttons does not describe them yet.
- If the map scrolls under a still mouse (arrow keys, edge scrolling), the text updates on the next mouse move.
