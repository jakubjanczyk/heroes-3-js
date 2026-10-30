# Combination artifacts (2026-10-30)

Roadmap 7.8.7, the last of seven parts of 7.8: assembling worn artifacts into a combination, the slots it locks, and taking it apart. Builds on `2026-10-29-moving-artifacts.md` and `2026-10-30-artifacts-between-heroes.md`.

## How Heroes 3 does it

Checked against the Heroes 3 wiki's raw page source (Combination artifact, each combination's own page, and the `GENRLTXT.TXT` and `artraits.txt` pages of Translation Data), against an open-source engine's artifact data and its assembling code, and against what the user knows from the game. Shadow of Death rules; Horn of the Abyss's four combinations are left out.

- **The question.** When the last part goes on a worn slot, the game asks: the combination's description, then "You possess all of the components needed to assemble the Power of the Dragon Father.  Do you wish to assemble this artifact?" (`core.genrltxt.732`), with the combination's picture and Yes and No. It asks only when every part is worn, never when one of them is in the backpack (the user); on picking a part up, on putting it on from the backpack (the user) and on moving it from the other hero on the exchange screen. The open-source engine doesn't ask when a part comes from the same hero's backpack; we follow the user.
- **Right-clicking a part** while every part is worn asks the same question in place of the part's description (the wiki: "Combining is performed by equipping all the required artifacts, and right-clicking one of them"). The open-source engine shows the description first and asks when it closes; the user confirmed asking straight away.
- **Assembled**, the combination is worn in its own slot and every other slot its parts took is locked: the slot shows a lock, and clicking or right-clicking it does nothing (the user, the wiki and the open-source engine). It gives its parts' bonuses and its own on top (wiki).
- **Taking it off** frees the locked slots (the user). It can be put on again only where its own slot, or the artifact there that it swaps with, and every slot its parts take are free (open-source engine). Putting it on asks nothing.
- **Right-clicking the combination** asks "Do you wish to disassemble this artifact?" (`core.genrltxt.733`) under its description. Yes puts each part back in the slot it was worn in (the user, open-source engine). In the backpack it is offered too, as the user decided, and the parts take the combination's place there; with no room for them it shows the description instead (open-source engine).
- **The combinations.** The engine's data and the wiki agree on the parts and costs; each one's own slot and the slots it locks are from the wiki's pages only (a web search backs up the Angelic Alliance's weapon slot). The descriptions are the game's own, from `artraits.txt`.

| Combination | Slot | Cost | Parts | Its own effect |
|---|---|---|---|---|
| Angelic Alliance | Weapon | 84000 | Helm of Heavenly Enlightenment, Celestial Necklace of Bliss, Armor of Wonder, Sandals of the Saint, Sword of Judgement, Lion's Shield of Courage | Castle, Rampart, Tower, Fortress and Stronghold creatures count as one town for morale; Expert Prayer at the start of battle |
| Armor of the Damned | Torso | 12000 | Skull Helmet, Rib Cage, Blackshard of the Dead Knight, Shield of the Yawning Dead | Expert Slow, Curse, Weakness and Misfortune on the enemy for 50 rounds |
| Power of the Dragon Father | Torso | 42000 | Crown of Dragontooth, Necklace of Dragonteeth, Dragon Scale Armor, Dragon Wing Tabard, Dragonbone Greaves, Red Dragon Flame Tongue, Dragon Scale Shield, Quiet Eye of the Dragon, Still Eye of the Dragon | +6 to all primary skills; troops immune to level 1-4 spells |
| Titan's Thunder | Weapon | 40000 | Thunder Helmet, Titan's Cuirass, Titan's Gladius, Sentinel's Shield | Titan's Lightning Bolt and a spell book |

- **The Angelic Alliance's morale.** The game's text says "for the player" and the open-source engine gives it to all the player's heroes; the wiki says the wearer's army. Decided with the user: only the wearer's army. Neutral creatures (the Peasant) are no town and don't count as one.

## What we do

- A combination is data in `game/data/artifacts.json`: its slot, class, cost, description, its `parts`, and its own effects with the keys other artifacts use (`primarySkills`) or a new one (`townsCountAsOne`, the towns whose creatures count as one for morale). Adding a combination whose effects the game already has needs no code.
- All four are in: Power of the Dragon Father with its +6, the Angelic Alliance with its morale rule. Armor of the Damned and Titan's Thunder assemble and give their parts' bonuses; their own effects come with spells (5.8), as do the Dragon Father's immunity and the Alliance's Prayer.
- A worn combination keeps where each part was worn (`combined` in the hero's artifacts), so taking it apart puts them back, rings in the ring each was on. Put on again from the backpack, the parts take the first free slots of their kinds.
- The status bar over a locked slot says "Locked by Power of the Dragon Father": our own wording, the game's text isn't online.
- The morale and luck popups list a part's morale or luck under the part's name (Still Eye of the Dragon), not checked in the game.
- Move all and Swap on the exchange screen don't ask; right-clicking a part does.
- The demo map gives Valeska three parts of Titan's Thunder, with Titan's Gladius two tiles south of her.

## Not yet

- The other eight combinations, with the artifacts they're made of.
- Spells: the Dragon Father's immunity, the Alliance's Prayer, the Armor of the Damned's curses, Titan's Thunder's bolt and spell book (5.8).
- Pictures (10.1).
