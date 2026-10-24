# Battle hover highlight (2026-10-20)

Roadmap 5.3: the hex under the mouse lights up when pointing at an enemy, not only at a hex to move to. Follows `docs/notes/2026-10-20-ranged-attacks.md`.

## How Heroes 3 does it

The combat options have a Cursor Shadow setting that shades the hex under the mouse. We keep it on, and light the hex only when clicking it would do something: a hex the active stack can move to, or an enemy it can attack or shoot. A double-wide enemy lights up on both its hexes. The hex the stack would attack from is not lit; the sword cursor shows the side.

## What we do

- `battle-view.module.js` works out the lit hexes from the hex under the mouse, with the same rules as the cursor and the status bar, and marks them `battlefield__hex--highlighted`. Before, CSS `:hover` lit reachable hexes only.
- A tap lights nothing: on a touch screen the next stack would get its turn with the tapped enemy still lit. Moving a mouse or pen lights hexes again on a device with both.
- The edge columns past each side stay unmarked, so the back half of a double-wide enemy standing there is not lit.
