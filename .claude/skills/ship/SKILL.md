---
name: ship
description: Use when a feature or fix is implemented and its tests pass, to finish it - full checks, roadmap and note, push, screenshots, PR and preview link - and later when the user says to merge it.
---

# Ship

## 1. Check

- Run the full `npm test` and `npm run lint` once. Fix what fails; don't skip or loosen a test.
- Tick the roadmap boxes the part finished in `docs/ROADMAP.md`, and update the note's "left" section.

## 2. Commit and push

- Commit as `AGENTS.md` says (author, `<area>: <imperative summary>`), then push the working branch.

## 3. Screenshots

Skip this step only when nothing the player sees changed.

1. Write a steps file in the scratchpad (not in the repo) for `scripts/screenshot.mjs`. It starts the app, runs the steps once per viewport (`desktop` and `phone`, a landscape phone with touch) and saves the shots to `--out`:

   ```js
   // Optional: start from the demo map with changes, or give a whole scenario object.
   export const scenario = (demo) => ({
     ...demo,
     fogOfWar: false,
     entities: demo.entities.map((entity) =>
       entity.id === 'hero-1' ? { ...entity, tile: { x: 9, y: 12 } } : entity
     )
   })

   export default async function ({ page, shot, walkTo, clickTile, tile, dialog, viewport }) {
     await walkTo(10, 10) // returns the tile the hero stopped on
     await shot('town-screen')
     await dialog().getByRole('button', { name: 'Leave town' }).click()
   }
   ```

   `node scripts/screenshot.mjs /path/to/steps.mjs --out /tmp/shots [--viewports desktop,phone]`

   - The demo map's first hero starts walled in by objects. Move the hero next to what you show, as above, rather than walking across the map.
   - Locate things by role and name, scoped to the dialog (`dialog().getByRole(...)`), since the town and other screens have several buttons with the same name.
   - When the steps fail, the script saves `<viewport>-failed.png` showing the page at that moment.
2. Read every shot before sending it, and check it shows what the caption says.
3. Send them with a caption each. Always include the phone shots of a new dialog or screen: the user tries previews on a phone.

## 4. Open the PR

- Open it as `AGENTS.md` says: what the player can now do, links to the roadmap item and the note.
- Subscribe to it (`subscribe_pr_activity`) and end the turn saying the preview link will follow.
- When the PR preview bot's comment says the preview is deployed, send the link (`https://jakubjanczyk.github.io/heroes-3-js/pr-preview/pr-<number>/`) with the clicks that reach the feature on the demo map (which hero, where to walk, what to build first).
- A red CI: reproduce it locally, fix it, run the same check green, push.

## 5. Merge

Only when the user says so.

- "Merge": check both checks (`test`, `preview`) passed on the last commit, then squash-merge.
- "Merge when green": turn on squash auto-merge (`enable_pr_auto_merge`), so no one has to come back to the session.
- After the merge, unsubscribe from the PR and name the next part (the `next-part` skill picks it).
