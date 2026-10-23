# Repository Guidelines

## Project Structure & Module Organization

- `docs/v1/` — V1 scope and implementation plan (`docs/v1/SPEC.md`, `docs/v1/IMPLEMENTATION_PLAN.md`).
- `docs/v1/tasks/` — Shipable milestone tasks + tracker (`docs/v1/tasks/TRACKER.md`).
- `initial_docs/` — Reference material (do not treat as current requirements).
- `scripts/` — Small utilities (e.g. `scripts/static-server.mjs`).
- Co-located test files — Vitest tests (`**/*.test.js` next to source files).
- Planned runtime code (per `docs/v1/IMPLEMENTATION_PLAN.md`) will live in `engine/` (infrastructure) and `game/` (experience rules). Keep the boundary strict: `engine/` must not import from `game/`.

## Build, Test, and Development Commands

Install dev tools (requires npm registry access):

- `npm install` — installs `vitest` and `@biomejs/biome` (dev-only).

Run locally:

- `npm run dev` — starts a local static server at `http://localhost:8080/`.
- `npm test` — runs unit tests once (CI-friendly).
- `npm run test:watch` — runs tests in watch mode.
- `npm run lint` — runs Biome checks (lint + formatting diagnostics).
- `npm run lint:fix` — applies Biome fixes/formatting.

Continuous integration:

- Every PR and every push to `main` runs `npm ci`, `npm run lint` and `npm test` on Node 22 (`.github/workflows/test.yml`).

Deployment (GitHub Pages, served from the `gh-pages` branch):

- Pushes to `main` publish the site to the `gh-pages` root (`.github/workflows/deploy-pages.yml`).
- Each PR from this repo gets a preview at `/pr-preview/pr-<number>/`, linked in a PR comment and removed when the PR closes (`.github/workflows/pr-preview.yml`). Previews omit music and keep their own saved session.
- `node scripts/build-site.mjs <outDir> [--without-music]` builds the same site locally. It ships the source files as they are (native ES modules, no bundling) and adds preload links for every module and imported stylesheet to `index.html`, so a phone downloads them all at once instead of one import level at a time.

## Coding Style & Naming Conventions

- JavaScript is native ESM (`"type": "module"` in `package.json`).
- Formatting/linting is enforced by Biome (`biome.json`):
  - 2-space indentation
  - single quotes
  - semicolons as needed
  - cognitive complexity of at most 15 per function, and no nested ternaries; split a function rather than silencing the rule
- Prefer descriptive names (`movementPointsMax`, `screenToTile`) over abbreviations.
- Comments only for what the code can't say: why something is done, a non-obvious rule or edge case, or where a Heroes 3 rule comes from (e.g. VCMI). Don't add a comment that restates the code, the function or variable name, or the test name; rename instead. Not every function, variable or test helper needs one.
- In tests, a comment is worth it when it explains how an expected value is worked out (damage numbers, positions), not to narrate the steps.

## Testing Guidelines

- Follow the `writing-tests` skill (`.claude/skills/writing-tests/SKILL.md`) for any feature, behavior change or bug fix: list scenarios first, get them approved, write tests before the code. The rules below are this repo's specifics on top of it.
- Test runner: Vitest.
- Test files: `**/*.test.js` (co-located with source files).
- Keep tests deterministic (no network, no wall-clock dependencies unless mocked).
- For new features, start by adding behavior coverage in `tests/behavior/` for that feature before implementation work.
- Behavior tests drive the app only the way a player can (clicks, keys, reloads) and assert on what is visible. They must not emit or listen to bus events, nor read the saved event log; prove persistence by reloading and checking what the player sees.
- Behavior tests run on a fake clock (`tests/behavior/fake-timers.setup.js`, the `behavior` Vitest project). Let time pass with `waitMs(ms)`, never a real `setTimeout`, so a check partway through a walk or fade always lands at the same moment.
- Behavior test files share a worker and its jsdom page (`isolate: false` in `vitest.config.mjs`), which halves the run. After each test, `tests/behavior/reset-page.setup.js` stops the app and removes the app's styles; anything else a test changes on `window` or `document` it must put back itself.
- Build test scenarios with the builders in `tests/behavior/builders.js` (`aScenario()`, `aHero()`, `aMonster()`, ...), based on `@jjanczyk/object-builder`; change only what matters for the test case.
- Shared behavior test helpers are split by screen: `app.utils.js` (starting the app, waiting, reloads), `adventure-map.utils.js`, `adventure-panels.utils.js` (hero box, resource bar, buttons, dialogs), `battle.utils.js` (including `startBattle` and `reloadBattle`) and `town-screen.utils.js`, all in `tests/behavior/`. Put a new helper in the file for the screen it drives.
- Behavior tests are the main safety net. Add a unit test only when it catches something a behavior test can't, for example:
  - subtle algorithms (pathfinding)
  - storage and browser APIs behavior tests don't use (IndexedDB event log, native dialog quirks, music)
  - validation of real data files or of inputs a player can't produce (scenario loading)
  - layering rules (`tests/architecture/`)
- Don't write unit tests for module wiring (module X reacts to event A by emitting B or calling a fake); they break on every refactor and duplicate behavior tests.
- If the user provides behavior scenarios/cases, implement those first and identify additional important missing cases.
- If the user does not provide scenarios/cases, identify the expected behavior cases yourself first, then add behavior tests for them.

## Commit & Pull Request Guidelines

- Current history uses short, imperative commit messages (e.g. “add npm for testing and linting”).
- Prefer: `<area>: <imperative summary>` (example: `docs: clarify movement rules`).
- PRs should include:
  - a short description of user-visible behavior
  - links to relevant docs/tasks (e.g. `docs/v1/tasks/T05-move-hero.md`)
  - screenshots or a short screencast when UI behavior changes
