# Minimap: terrain colours, objects and drag (2026-10-17)

Roadmap 1.4. The minimap now follows how the Heroes 3 minimap works.

## How Heroes 3 colours the minimap

Each tile gets the first colour that applies:

1. Not explored yet: black.
2. Covered by an ownable object (town, mine, dwelling, hero): neutral grey `#848484`, or the owner's player colour.
3. Blocked and not visitable (obstacles, building bodies): a darker shade of its terrain.
4. Otherwise: the terrain colour.

Monsters and resources have no owner and their tile is visitable, so they show as plain terrain. The player colours are in `client/render/Graphics.cpp`; the first player is red `#ff0000`.

Clicking the minimap centres the view on that point, and holding the button while moving keeps re-centring it.

## What we do

- Minimap tiles reuse the map's `terrain-tile--<name>` classes, so both always use the same colours.
- Tiles covered by a mine (entry tile and footprint) are neutral grey. Mines cannot be captured yet.
- Towns keep their marker, now neutral grey. Town ownership does not exist yet.
- The hero is a red marker that follows hero moves, including moves replayed on reload.
- Monsters and resources are not shown.
- Pressing on the minimap (mouse, touch or pen, via pointer events) and moving pans the camera; the drag continues outside the minimap (clamped to the map edges) until the pointer is released. `touch-action: none` stops touch drags from scrolling the page, and the mobile tap highlight is turned off so a tap does not flash the minimap.
- Rule 3 applies to obstacles (`2026-10-30-obstacles.md`); not yet to the blocked tiles of other objects. Fog of war (rule 1) waits for fog.
