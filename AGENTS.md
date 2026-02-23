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

## Coding Style & Naming Conventions

- JavaScript is native ESM (`"type": "module"` in `package.json`).
- Formatting/linting is enforced by Biome (`biome.json`):
  - 2-space indentation
  - single quotes
  - semicolons as needed
- Prefer descriptive names (`movementPointsMax`, `screenToTile`) over abbreviations.

## Testing Guidelines

- Test runner: Vitest.
- Test files: `**/*.test.js` (co-located with source files).
- Keep tests deterministic (no network, no wall-clock dependencies unless mocked).

## Commit & Pull Request Guidelines

- Current history uses short, imperative commit messages (e.g. “add npm for testing and linting”).
- Prefer: `<area>: <imperative summary>` (example: `docs: clarify movement rules`).
- PRs should include:
  - a short description of user-visible behavior
  - links to relevant docs/tasks (e.g. `docs/v1/tasks/T05-move-hero.md`)
  - screenshots or a short screencast when UI behavior changes

