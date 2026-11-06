# Teleport, Clone and Sacrifice

Roadmap 4.8.7.3, in three parts:

- **4.8.7.3a Teleport**
- **4.8.7.3b Clone**: needs a stack that joins the battle and vanishes (shared later with the Summon Elemental spells)
- **4.8.7.3c Sacrifice**: needs the dead counted, as Resurrection and Animate Dead do (5.8 later), so it may move there

## Teleport (Water, level 3, 15 / 12 / 6 / 3 spell points) — 4.8.7.3a

Checked against the wiki (Teleport, and its copy of `GENRLTXT.TXT`), the descriptions in `game/data/spells.json` and an open-source engine's spell config (`spells/other.json`) and teleport script.

- Two clicks: an own stack, then a free hex. Checked against the wiki ("Target allied troop instantly moves to an unoccupied target hex") and the engine (a creature target, then a location).
- The destination must be a hex the stack can stand on: free, and for a double-wide stack both its hexes free. Checked against the engine (the hex must be accessible for that unit); the wiki says "unoccupied".
- Walls and moat limits (Basic: neither, Advanced: over the moat, Expert: anything) only matter in sieges (5.10); outside one every level teleports the same. Only the cost changes with the skill. Checked against the wiki and the engine.
- The stack moves at once, with no path and no movement cost; it isn't its turn, so the active stack teleported still takes its turn after. Checked against the engine (moved as a teleport, the hero's cast doesn't use the stack's turn, as for every spell here, 4.8.3.3).
- Undead can be teleported (not a mind spell); Anti-Magic's stack can't (level 3); war machines are immune (none in battle yet). Checked against the wiki and the engine.
- An own stack under Berserk or a hypnotized enemy stack: the engine's target condition lets it be chosen as an "allied" unit by side; we follow who controls the stack now (decided with the user): a hypnotized enemy stack can be teleported, an own berserk stack can't.
- Status bar: hovering an own stack "Cast Teleport on Pikemen" (`core.genrltxt.27`); after picking it, a free hex says "Teleport Here" (`core.genrltxt.25`) with the teleport cursor, any other hex "Invalid Teleport Destination" (`core.genrltxt.24`) with the blocked cursor. Checked against the wiki's copy of `GENRLTXT.TXT` and the engine's use of it.
- Cancelling (right-click, Escape) at either click: "Spell cancelled", as for the other spells. A click on an invalid destination does nothing and the spell waits for a valid hex, as the engine does (decided with the user).
- The stack shows up on its new hex at once; it doesn't walk there.
- Combat log: the usual cast line, "%s casts '%s' on the %s." (`core.genrltxt.195`). When the clone is hit, the damage line and then "The Swordsmen perish.": our own wording, as no source gives it (decided with the user).
- Its label reads "Swordsmen (clone)".

- Built: `clones.highestTier` in the spell's data, by skill level. The fact keeps the clone's hex and rounds.

- Built: `teleports` in the spell's data. The fact keeps the destination hex.

## Clone (Water, level 4, 24 / 20 / 20 / 20 spell points) — 4.8.7.3b

Checked against the wiki (Clone), the descriptions in `game/data/spells.json`, and an open-source engine's spell config (`spells/other.json`), clone script and unit state.

- One click on an own stack. Basic (and no skill) clones creatures of level 1-5, Advanced 1-6, Expert any level. Checked against the wiki, our descriptions and the engine.
- Not a target: a clone, a stack that already has a clone, a stack whose level is too high, Anti-Magic's stack when it was cast with Advanced or Expert Earth Magic (it turns away level 4 from Advanced). War machines are immune (none in battle yet). Undead can be cloned. Checked against the wiki ("only one clone of a single unit stack can exist at a time"; it can be cloned again once its clone is gone) and the engine.
- Who controls the stack decides, as for Teleport: a hypnotized enemy stack can be cloned, an own berserk stack can't. The clone fights for the hero.
- The clone is a new stack of the same creature and count on the hero's side, with the original's Attack, Defense, morale and luck; the spells on the original aren't copied (decided with the user, as the engine does).
- It stands on the free hex nearest the original that it fits on; on a tie, the one further toward the enemy, then the one nearest in row. Checked against the engine. With no free hex the spell does nothing; not planned for.
- It acts this round in its turn order place, like any stack that hasn't acted. Checked against the wiki's commentary (a fast clone acts next) and the engine.
- It lasts Power rounds, counted like the other spells' rounds, and is gone as the round after them starts. Checked against the wiki ("1 rnd/sp") and the engine.
- Any damage makes it vanish at once, so it never strikes back. It also vanishes when the original dies. Checked against the wiki and the engine.
- It doesn't count for the battle's end (a side with only clones left has lost), for casualties in the results window, for the hero's army after the battle or for experience. Checked against the engine (clones don't keep a side in the battle); the rest follows from it. Since a clone vanishes with its original, it can only be left alone on the hero's side when it is a clone of a hypnotized enemy stack.
- Drawn with a pale blue tint so the player tells it apart; our own look, as the game tints it too.
- Combat log: the usual cast line, "%s casts '%s' on the %s." (`core.genrltxt.195`). When the clone is hit, the damage line and then "The Swordsmen perish.": our own wording, as no source gives it (decided with the user).
- Its label reads "Swordsmen (clone)".

- Built: `clones.highestTier` in the spell's data, by skill level. The fact keeps the clone's hex and rounds.

## Sacrifice (Fire, level 5, 25 / 20 / 20 / 20 spell points) — 4.8.7.3c

Checked against the wiki (Sacrifice, and its copy of `GENRLTXT.TXT`), the descriptions in `game/data/spells.json` and an open-source engine's spell config (`spells/other.json`) and sacrifice script.

- Two clicks: first the stack to bring back, then the own stack to sacrifice. Checked against the engine (target one is healed, target two is destroyed); the wiki names the same two targets.
- The stack to bring back is an own stack that is dead, or alive with creatures lost or its top creature hurt. A dead stack whose hex a living stack stands on can't be chosen. Checked against the engine.
- The stack sacrificed is another living own stack the hero controls: not a clone, not an own stack hypnotized by the enemy, not undead. Checked against the engine; the wiki lists undead (and golems, elementals, gargoyles and others from other factions, 6.5).
- Undead can't be brought back either. Checked against the wiki and the engine.
- Health given back: (Power + the sacrificed creature's health + 3 / 6 / 10 for Basic or none / Advanced / Expert) × the sacrificed stack's count. Checked against the wiki and the engine.
- That health first heals the top creature, then brings back creatures, never more than the stack had as the battle started; the rest is lost. A creature given only part of its health comes back too, with that much health (18 health brings back two Brutes of 10, the top one with 8). Checked against the engine (resurrect, permanent, and how it counts creatures from their health).
- The sacrificed stack is removed with no corpse: it isn't drawn as "Dead ...". Checked against the wiki.
- Permanent: the creatures brought back stay in the hero's army after the battle, and the results window counts only those still dead. The sacrificed creatures count as lost.
- The spell can't be picked without a stack to bring back and another living own stack to sacrifice: "That spell will affect no one!" as elsewhere. Checked against the engine (no appropriate target).
- Status bar: the first click uses "Cast Sacrifice on Pikemen" (`core.genrltxt.27`); after it, an own stack that can be sacrificed says "Sacrifice the Swordsmen" (`core.genrltxt.549`) with the sacrifice cursor, any other hex "Choose an army to sacrifice" (`core.genrltxt.543`). Checked against the wiki's copy of `GENRLTXT.TXT` and the engine.
- Cancelling at either click: "Spell cancelled". An invalid second click does nothing, as for Teleport.
- Combat log: "%s casts '%s' on the %s." (`core.genrltxt.195`) naming the stack brought back, then "%d %s rise from the dead!" (`core.genrltxt.116`), or "rises" for one (`core.genrltxt.117`), when creatures come back. Checked against the wiki's copy of `GENRLTXT.TXT` and the engine.

## Left for later

- The wall and moat limits, with sieges (5.10). Dendroid binding ending on a teleport, with Rampart (6.5).
- Clone with no free hex left; clones for an enemy that casts (8.1).
- Creatures of other factions that can't be sacrificed or brought back (6.5); Resurrection and Animate Dead reuse bringing back the dead (5.8 later).
