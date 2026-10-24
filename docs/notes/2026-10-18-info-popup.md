# Right-click info popup (2026-10-18)

Roadmap 2.1. Holding the right mouse button on a map tile shows what is there; releasing it closes the popup.

## How Heroes 3 does it

- `client/gui/EventDispatcher.cpp`: pressing the right button opens the popup (`dispatchShowPopup`), releasing it closes it (`dispatchClosePopup`). There is no click to dismiss.
- `client/adventureMap/AdventureMapInterface.cpp`, `onTileRightClicked`: bare terrain shows the terrain name; an object shows its popup, centred on the cursor.
- `client/windows/InfoWindows.cpp`, `createCustomInfoWindow`: heroes, towns and monsters get an info box (`CInfoBoxPopup`); the monster box is the creature's portrait over its count category and plural name ("Pack of Skeletons", `lib/mapObjects/CGCreature.cpp`).
- Every other object shows its name, plus the owner's colour on the next line when it has one (`CGObjectInstance::getHoverText`: "Gold Mine", "(Red)"). A resource shows only its name, never the amount.

## Look

A plain popup is the game's standard message box (`CInfoWindow`, drawn in the player's colour): brown leather background, and the player's colour only in the frame, a thin band between gold lines with gold corner pieces. We draw it with CSS (no game graphics): the leather is a mottled gradient and the corners are plain gold brackets instead of the game's ornaments.

## What we do

- Monster: its picture and plural name. There are no creature portraits yet, so the picture is the monster as the map draws it. The count category waits for monster counts (5.2).
- Resource: its name. Terrain: its name.
- Mine: its name, then "(Red)" once the hero has captured it.
- Town and hero: their name. The info boxes wait for town ownership, hero stats and armies.
- Any tile of a mine's or town's footprint names it, as the status bar does (both use `app/heroes/map-objects.js`).
- The browser's context menu does not open on the map.

## Touch screens

Not in Heroes 3. A finger held still for 500 ms opens the same popup, placed above the finger so it is not hidden under it (below, near the top of the screen). Lifting the finger closes it, and the click the browser sends after a long press is dropped, so it does not select a route. Moving the finger more than 10 px first cancels the long press. A short tap still previews and confirms routes as before. The map turns off the long-press callout and text selection.
