---
name: next-part
description: Use when the user asks what's next on the roadmap, for the roadmap priorities, or to start the next part. Picks the next part from the roadmap's work order, plans it against the game's sources and stops with the test scenarios for approval.
---

# Next part

Takes a session from "what's next?" to an approved list of test scenarios in one turn.

## 1. Check where you are

- `git remote get-url origin` must point to `jakubjanczyk/heroes-3-js`. If it doesn't, stop and tell the user this session has another repository checked out; don't plan from it.
- `git fetch origin main`. Start the working branch from the latest `origin/main` unless it already holds unmerged work for this part.
- List the open PRs. A part with an open PR is in progress, not next: name it to the user and take the one after it.

## 2. Pick the part

- Read "Recommended Work Order" at the end of `docs/ROADMAP.md`, take the first item not finished, then in its section (`### 4.8`, say) the first part whose boxes aren't all ticked.
- Read the part's note in `docs/notes/` if it has one, and the notes of the parts before it.
- If the order between two items is a priority call rather than a dependency, say so in one line; don't argue it.
- A part bigger than one PR (several screens, or rules and their UI both large) gets split first: propose the parts, and once agreed write them to the roadmap and the note.

## 3. Plan it

- Follow the `game-sources` skill for every rule, number and text the part needs, and the `new-map-object` skill for a map object.
- Write or update the feature's note in `docs/notes/` (`YYYY-MM-DD-topic.md`): the rules as checked, what we decided, and what is left for later parts.
- Look for a refactor that makes the part easier, as the `refactor-first` skill says, and propose it with the plan if one is worth it.

## 4. Stop for approval

End the turn with one message that holds:

- the part (roadmap number and name) and, in a few lines, what the player will be able to do;
- what it leaves out and which later part takes it;
- the scenario list, grouped by test file, as the `writing-tests` skill shows;
- the open questions, where the sources disagree or say nothing.

Write no test or code until the user replies to it.
