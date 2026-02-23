# V1 Task Tracker

This file is the single place to see what exists, what is currently being worked on, what is done, and what blocks what.

Conventions:

- **Done**: check when completed.
- **In progress**: check for the one task currently being worked on (ideally only one at a time).
- **Blocks**: tasks that cannot start until this task is done.
- **Task file**: the self-contained task document with implementation details and acceptance criteria.

---

- T01 — Bootable app + load data
  - Done: [x]
  - In progress: [ ]
  - Blocks: T02
  - Task file: `docs/v1/tasks/T01-bootstrap.md`

- T02 — Render the map (binary passable/blocked)
  - Done: [x]
  - In progress: [ ]
  - Blocks: T03
  - Task file: `docs/v1/tasks/T02-render-map.md`

- T03 — Camera controls (arrow keys + edge scroll)
  - Done: [x]
  - In progress: [ ]
  - Blocks: T04
  - Task file: `docs/v1/tasks/T03-camera.md`

- T04 — Render the hero + initial camera center
  - Done: [x]
  - In progress: [ ]
  - Blocks: T05
  - Task file: `docs/v1/tasks/T04-render-hero.md`

- T05 — Click-to-move hero (8-dir BFS, no corner cutting)
  - Done: [x]
  - In progress: [ ]
  - Blocks: T06
  - Task file: `docs/v1/tasks/T05-move-hero.md`

- T06 — Movement points (15) + end turn reset
  - Done: [ ]
  - In progress: [ ]
  - Blocks: T07
  - Task file: `docs/v1/tasks/T06-movement-points-turn.md`

- T07 — Render monsters + defeat on arrival
  - Done: [ ]
  - In progress: [ ]
  - Blocks: T08
  - Task file: `docs/v1/tasks/T07-monsters.md`

- T08 — Render resources + collect on arrival
  - Done: [ ]
  - In progress: [ ]
  - Blocks: T09
  - Task file: `docs/v1/tasks/T08-resources.md`

- T09 — Render towns + visit on arrival (town persists)
  - Done: [ ]
  - In progress: [ ]
  - Blocks: T10
  - Task file: `docs/v1/tasks/T09-towns.md`

- T10 — Persist session across reload (IndexedDB event log, silent replay)
  - Done: [ ]
  - In progress: [ ]
  - Blocks: T11
  - Task file: `docs/v1/tasks/T10-persistence.md`

- T11 — Reset session (clear event log + reload)
  - Done: [ ]
  - In progress: [ ]
  - Blocks: (none)
  - Task file: `docs/v1/tasks/T11-reset.md`

- T12 — Two-click path preview UX (post-spec improvement)
  - Done: [ ]
  - In progress: [ ]
  - Blocks: (none)
  - Task file: `docs/v1/tasks/T12-path-preview.md`
