# T01 — Bootable app + load data

## Goal (shipable milestone)

Starting a local static server and opening the page in Chrome shows a booted app shell that:

- loads a scenario JSON file and the V1 definition JSON files
- constructs an in-memory `world` state from that data
- renders a visible “app frame” (`viewport`, `world`, and `ui` containers) even if the map is not rendered yet

This task is complete when the app loads without errors and logs a single “boot ok” line with the loaded scenario `meta.id`.

## Depends on

- None

## Scope

- Create the minimal file structure to run native ESM in the browser.
- Add scenario + definition JSON files with minimal V1 content (binary terrain, one hero placement, at least one monster/resource/town placement).
- Add a thin loader in `game/` that returns `{ scenario, definitions }`.

## Out of scope

- Rendering tiles
- Hero movement
- Persistence

## Files to create / modify

- `index.html`
- `main.js`
- `scenarios/v1.json`
- `game/load.js`
- `game/data/hero.json`
- `game/data/monsters.json`
- `game/data/resources.json`
- `game/data/towns.json`
- (optional) `styles.css` (if you want basic layout)

## Implementation notes (no guessing)

- Use native ESM only (`<script type="module" src="main.js">`).
- No build step and no external dependencies.
- The app should assume it is being served over `http://` (not `file://`).

Minimal DOM structure (IDs/classes are up to you, but must support later tasks):

- `.viewport` (fixed-size; `overflow: hidden`)
  - `.world` (the translated camera container)
    - `.terrain-layer`
    - `.entity-layer`
    - `.effects-layer`
  - `.ui-layer` (overlay)

## Acceptance

1. Run a static server from repo root: `node scripts/static-server.mjs 8080`.
2. Open `http://localhost:8080/` in Chrome.
3. In DevTools console you see exactly one boot line that includes:
   - the scenario meta id, and
   - a count of entity placements loaded.
