# Future Ideas (Post-V1 / Optional Enhancements)

This document captures ideas worth revisiting after core V1 milestones.

## 1) Path Preview Glyph Atlas (instead of fully dynamic geometry)

### Idea

Predefine SVG glyphs for path marker states and render by selecting glyph per tile step, instead of building all dash/corner geometry each time.

Examples of glyph states:

- straight segment
- corner segment
- start segment
- end segment
- target marker (`X`)

### Why consider it

- More consistent visuals across all paths.
- Easier art-direction and polish (edit glyph once, affects all routes).
- Potentially lower CPU work during frequent preview updates.

### Trade-offs

- More up-front state-mapping logic (tile neighbors -> glyph id).
- More variants to maintain (direction/diagonal combinations).
- Slightly less flexibility than procedural geometry for fast iteration.

### Suggested approach

Use a hybrid model:

- Keep dynamic pathfinding and path tile sequence generation.
- Replace procedural line/corner drawing with glyph selection per path tile.
- Render via SVG `<symbol>` + `<use>` (or equivalent reusable SVG nodes).

---

## 2) Preview Animation Polish

- Subtle pulse/fade on path markers.
- Destination `X` emphasis animation.
- Optional hover/confirm transition between first and second click states.

---

## 3) Movement Feel Tuning

- Configurable movement speed presets (slow/normal/fast).
- Terrain-relative speed visual only (without changing gameplay cost).
- Optional anticipation frame (small pause before first step).

---

## 4) Camera Follow Polish

- Light smoothing instead of instant follow jumps.
- Optional camera dead-zone around hero.
- Keep manual pan offset behavior as additive layer.

---

## 5) Input UX Additions

- Right-click to cancel current preview.
- Keyboard confirm key for currently previewed destination.
- Touch-friendly confirm affordances.
