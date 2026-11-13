# Titan's Thunder's spell book and bolt (2026-11-12)

Part of 7.8.7 and 4.8 later: what Titan's Thunder gives besides its parts' bonuses. Builds on `2026-10-30-combination-artifacts.md` and `2026-10-31-spell-book-and-spell-points.md`.

## The rules

Checked against the Heroes 3 wiki's raw page source (Titan's Thunder, Titan's Lightning Bolt) and an open-source engine's artifact and spell data and its artifact code.

- **The spell book.** A hero without a spell book gets one when Titan's Thunder is worn, and keeps it: taking the artifact off or apart doesn't take the book away (the wiki's "Gain a Spell Book", the game's own description "adds a spell book into their inventory (permanently)", the engine). In the backpack it gives nothing (engine: only on a worn slot).
- **Titan's Lightning Bolt** is in the book only while Titan's Thunder is worn (wiki, engine). It is never learnt, so it isn't in a guild or taught by Scholar.
- **The bolt** is a level 5 Air combat spell, cost 0, 600 damage at every level of Air Magic and with any Power (wiki). Sorcery still adds to it (wiki).
- **Its right-click** shows only its description, which already says "Does 600 points of damage…"; the engine leaves off the damage line every other damage spell gets.

## What we do

- Artifact data: `grantsSpellBook: true` gives a spell book while worn, kept afterwards; `spells` lists the spells it gives while worn. Titan's Thunder has both. Another artifact with these needs no code.
- Spell data: Titan's Lightning Bolt has `damage` (600, nothing per Power) and `damageInDescription`, which drops the popup's damage line.
- A hero's spells in the book and in battle are the learnt ones plus those of worn artifacts; a `special` spell only ever comes from an artifact.

## Not checked

- What the original game shows in the popup with Sorcery, when the bolt does more than 600: the engine shows only the description.

## Left

- Earth and Magma Elementals' immunity to the bolt, Air and Storm Elementals' vulnerability (with Conflux creatures, 6.5); the Orb of the Firmament (7.8).
- Protection from Air lowers the bolt's damage (wiki only); it is an Air spell, so our Protection from Air treats it as one.
