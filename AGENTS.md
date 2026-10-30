# Repository Guidelines

## Project Structure & Module Organization

- `docs/ROADMAP.md` — what is built and what comes next, milestone by milestone.
- `docs/notes/` — one note per feature: the game's rules as checked against the sources, what we decided and what is left.
- `scripts/` — Small utilities (e.g. `scripts/static-server.mjs`).
- Co-located test files — Vitest tests (`**/*.test.js` next to source files).
- `engine/` (infrastructure: bus, store), `game/` (rules, pure functions; `game/heroes/` is this game's content) and `app/` (modules wiring the rules to the page).

## Architecture

- Modules talk only through the event bus (`app/events.js`): `command.*` asks, `fact.*` is what happened (the saved facts are listed there and replayed on load), `ui.*` is for the screen. A module never calls another one.
- Each module declares what it `consumes` and `produces`, and is a `domain` module (decides, emits facts) or a `view` module (draws, emits commands).
- The game state is rebuilt from the saved facts by the slices (`game/state/`, `game/heroes/state/`); only fact handlers change it, and modules only read it through `state.get()` and its queries.
- `engine/` never imports from `game/`, and core `game/` code never imports `game/heroes/` (`tests/architecture/`).

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
- Keep comments to a minimum: write one only when the code can't be understood without it (a surprising rule or edge case, or why something is done the odd way it is). Rename or restructure instead where you can.
  - No comment that restates the code, the function or variable name, or the test name.
  - No header comments describing what a module, function, helper or state variable does, its parameters or what it returns.
  - This is a Heroes 3 game, so don't write "as in Heroes 3", "Heroes 3 does…" or "the Heroes 3 <thing>".
  - Never mention VCMI (or its classes, functions and files) in code, test comments or docs. Describe the rule itself instead. The `game-sources` and `new-map-object` skills name it only as a source to check rules against.
  - Not every function, variable or test helper needs one; most need none.
- In tests, a comment is worth it when it explains how an expected value is worked out (damage numbers, positions), not to narrate the steps.

## Game Rules & Map Objects

- Follow the `game-sources` skill (`.claude/skills/game-sources/SKILL.md`) whenever a game fact not yet in the repo is planned or built (a rule, number, message text, or creature, hero, skill, spell, artifact or building data), without waiting to be asked. It lists where to look (the repo's notes, the wiki's raw page source, VCMI's config and source, a web search) and how to check. Ask when the sources disagree or say nothing.
- For a new map object, also follow the `new-map-object` skill (`.claude/skills/new-map-object/SKILL.md`), which takes the object's size from the game's object table online.
- A bonus object or resource generator is data only: add its entry to `game/data/bonus-objects.json` or `game/data/resource-generators.json` as "Adding an object" in `docs/notes/2026-10-29-visitable-objects.md` says. Write code only for a part no object has yet (a new reward type, requirement, visit limit or roll).

## Testing Guidelines

- Follow the `writing-tests` skill (`.claude/skills/writing-tests/SKILL.md`) for any feature, behavior change or bug fix: list scenarios first, get them approved, write tests before the code. The rules below are this repo's specifics on top of it.
- Test runner: Vitest.
- While iterating, run only the tests the change touches (`npx vitest run tests/behavior/behavior.camera.test.js`, or `-t "<test name>"`); the full suite takes over a minute. Run the full `npm test` once at the end, before pushing.
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
  - layering rules (`tests/architecture/`)
- Don't write tests that check the data files (`game/data/*.json`) or that a scenario with bad data fails to load: we write both ourselves for now, so a mistake shows up in the behavior tests or the game. Add them once data or scenarios come from elsewhere (a map editor, players' maps).
- Behavior tests for data-driven features (map objects, artifacts) build their own definitions with the builders rather than use a real entry: test how the rule works (an artifact with a negative bonus can't take a skill below its minimum), not what one entry holds. Adding an entry to the data must not need new code or tests.
- Don't write unit tests for module wiring (module X reacts to event A by emitting B or calling a fake); they break on every refactor and duplicate behavior tests.
- A new map object of a kind that already has tests doesn't get its own generic tests: that it's drawn with its name, that a tile it blocks has no route, that the entrance can be walked onto. Its data says that, and the shared code is already tested. Test what the object itself does.
- If the user provides behavior scenarios/cases, implement those first and identify additional important missing cases.
- If the user does not provide scenarios/cases, identify the expected behavior cases yourself first, then add behavior tests for them.

## Commit & Pull Request Guidelines

- Current history uses short, imperative commit messages (e.g. “add npm for testing and linting”).
- Prefer: `<area>: <imperative summary>` (example: `docs: clarify movement rules`).
- Commit as `Jakub Janczyk <jakubjanczyk@users.noreply.github.com>`: if `git config user.name`/`user.email` say otherwise, set them before committing. Never commit with Claude as author or co-author.
- Never mention Claude or Claude Code in commit messages, PR titles or bodies, or GitHub comments: no `Co-Authored-By`, `Claude-Session` or "Generated with Claude Code" lines, and no session links.
- PRs should include:
  - a short description of user-visible behavior
  - links to the roadmap item and the feature's note (e.g. `docs/notes/2026-10-30-combination-artifacts.md`)
  - screenshots or a short screencast when UI behavior changes
- Don't open a PR for a docs-only change (roadmap, notes, these guidelines): commit it on the working branch and let it ship with the feature it plans.
- When a feature or fix is finished (tests and lint passing, changes pushed), open a PR without waiting to be asked, then share its preview URL with the user. The PR preview workflow comments the URL on the PR once it has deployed (`https://jakubjanczyk.github.io/heroes-3-js/pr-preview/pr-<number>/`); take it from that comment.
- When the work changes what the player sees, finish by showing the user screenshots of it working in the real app, not only passing tests. Run the app (`npm run dev:static`), play it in Playwright's Chromium the way a player would (walk the hero there, click, right-click), and screenshot each visible outcome: the message, the screen that changed, the popup or status bar. Send them to the user with a short caption saying what each one shows. If something can't be reached or shown that way (a new map object nobody can walk to, say), that is a bug to fix, not a screenshot to skip. Skip the screenshots only when nothing visible changed (docs, refactors, internal rules).
