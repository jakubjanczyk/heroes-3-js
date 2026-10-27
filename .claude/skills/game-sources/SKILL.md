---
name: game-sources
description: Use before writing down or building any game fact not yet in the repo, or one you're not sure of. That covers rules, numbers, formulas, message texts, and creature, hero, skill, spell, artifact, building or map object data. Says where to look the fact up and how to check it.
---

# Game sources

Don't take a game fact from memory or from a single source. Look it up as below, without waiting to be asked. Do it while planning (the note in `docs/notes/`), before the test scenarios are written.

## Where to look, in this order

1. **The repo's own notes** (`docs/notes/`, and `docs/ROADMAP.md`). A note may already have the fact and say what it was checked against. Treat it as a starting point and check it like any other source; a note can be wrong.
2. **The Heroes 3 wiki, raw page source:** `https://heroes.thelazy.net/index.php?title=<Page_Name>&action=raw`. Use it for exact message texts, numbers and rules. The rendered page, or a summary of it, splits and rewords texts, so always fetch the raw source.
3. **VCMI**, an open-source engine for the game. It doesn't contain the game's texts, but it does have the game's data and rules.
   - **Config files**, fetched with `curl -sSfL https://raw.githubusercontent.com/vcmi/vcmi/develop/config/<path>`:
     - `creatures/<faction>.json` for creatures;
     - `factions/<faction>.json` for towns and their buildings;
     - `heroes/<faction>.json` and `heroClasses.json` for heroes;
     - `skills.json` for secondary skills;
     - `spells/*.json` for spells;
     - `artifacts.json` for artifacts;
     - `objects/*.json` for map objects;
     - `gameConfig.json` for general constants.
     
     A text reference such as `core.advevent.158` names the line in the game's text files that a message comes from.
   - **Its C++ source**, for mechanics the configs don't spell out (damage, movement, battle order, AI). Clone it into the scratchpad (`git clone --depth 1 https://github.com/vcmi/vcmi.git`) and search it.
   - VCMI sometimes differs from the original game on purpose; its configs and code comments say so. Rules from Horn of the Abyss, a fan expansion, are left out unless asked for.
4. **A web search**, for anything still unclear or where the sources above disagree.

The game's own data files sit inside its archives and aren't online. So say "checked against …", never "the game's file says …", unless the source quotes the game itself.

## Checking

- Check every fact against at least two sources. A note and the wiki count as two only when the note's fact wasn't taken from that same wiki page.
- When the sources disagree, or none of them says, write that down and ask the user instead of picking one.
- Texts nobody can confirm are written in our own wording and marked as such in the note.

## Writing it down

- In the note, say what each fact was checked against ("checked against the Heroes 3 wiki"), and list what couldn't be checked.
- Never mention VCMI in code, tests or docs (AGENTS.md): describe the rule itself. VCMI is only for checking.
- When reporting a plan to the user, say what was verified and against which source.
