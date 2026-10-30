# Guarded artifacts (2026-10-30)

Roadmap 7.8.4, the fourth of seven parts of 7.8: an artifact on the map that the scenario guards with creatures. Builds on `2026-10-29-artifacts-on-the-map.md` and the dwelling guards of `2026-10-26-map-dwellings.md`.

## How Heroes 3 does it

Checked against the Heroes 3 wiki's raw page source (Artifact, Object Events, and the GENRLTXT.TXT and advevent.txt pages of Translation Data) and against an open-source engine's artifact object code.

- **Guards.** The map maker sets up to seven stacks of any creatures (open-source engine). Nothing shows them on the map: only the artifact is drawn (wiki, Artifact).
- **Entering asks** whether to fight (`core.genrltxt.420`, title "Artifact"): "Through a clearing you observe an ancient artifact. Unfortunately, it's guarded by %s %s. Do you want to fight the %s for the artifact?" Its line number was checked against `core.genrltxt.421`, the dwelling question we already use. The wiki's Artifact page says instead that guards without a map maker's text attack straight away; the open-source engine always asks. We always ask, as decided for this repo; a map maker's own text comes with scenario format v2.
- **Yes** starts the battle against the guards as set; **No** closes the question and nothing happens.
- **Winning** picks the artifact up, as an unguarded one is picked up (wiki, open-source engine).
- **Retreat or defeat** leaves the guards that survived; they never come back to full strength (wiki, open-source engine).
- Two more texts exist with no source saying when they show: "Victorious, you take your prize, the %s." (`core.advevent.8`) and "Discretion is the better part of valor, and you decide to avoid this fight for today." (`core.advevent.11`). Not used.

## What we do

- A scenario's `ARTIFACT` entity may have `"guards": [{ "creature": "MONK", "count": 9 }, ...]`.
- The question leaves the guards unnamed (decided for this repo; our own wording, from the game's text without its placeholders): "Through a clearing you observe an ancient artifact. Unfortunately, it's guarded. Do you want to fight the guards for the artifact?"
- The battle's defender is the guards' stacks as given, not split as a wandering monster is. The results window names them by their first stack.
- Winning saves the pickup (`fact.artifact.pickedUp`) and the hero gets the battle's experience.
- Losing or retreating saves the stacks that survived (`fact.artifact.guards.changed`), so a reload and the next hero find those.

## Not yet

- A map maker's own guard text, and guards that attack without asking (9.1).
- A full backpack when the guards are beaten (7.8.5).
- Random guards by artifact class.
