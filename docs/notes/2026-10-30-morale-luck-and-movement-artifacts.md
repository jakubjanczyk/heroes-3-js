# Morale, luck and movement artifacts (2026-10-30)

Roadmap 7.8.3, the third of seven parts of 7.8: the artifacts that change morale, luck or land movement points. Builds on `2026-10-29-artifacts-on-the-map.md` and `2026-10-28-morale-and-luck.md`.

## How Heroes 3 does it

Slot, class, cost and effect checked against the Heroes 3 wiki's raw page source (each artifact's page, the slot tables `Template:Artifact table - <slot>`, and the Morale, Luck, Movement and Artifact pages) and against an open-source engine's artifact data. The descriptions are the game's own, from `artraits.txt` as the wiki hosts it.

| Artifact | Slot | Class | Cost | Effect |
|---|---|---|---|---|
| Clover of Fortune | Misc | Treasure | 1000 | Luck +1 |
| Cards of Prophecy | Misc | Treasure | 1000 | Luck +1 |
| Ladybird of Luck | Misc | Treasure | 1000 | Luck +1 |
| Badge of Courage | Misc | Treasure | 1000 | Morale +1 |
| Crest of Valor | Misc | Treasure | 1000 | Morale +1 |
| Glyph of Gallantry | Misc | Treasure | 1000 | Morale +1 |
| Still Eye of the Dragon | Ring | Treasure | 2000 | Morale +1, Luck +1 |
| Pendant of Courage | Necklace | Major | 7000 | Morale +3, Luck +3 |
| Spirit of Oppression | Misc | Treasure | 2000 | Cancels positive morale in battle, both sides |
| Hourglass of the Evil Hour | Misc | Treasure | 2000 | Cancels positive luck in battle, both sides |
| Boots of Speed | Feet | Minor | 6000 | +600 land movement points |
| Equestrian's Gloves | Ring | Minor | 3000 | +300 land movement points |

- **Morale and luck** add to the hero's like any other modifier, and the total is still held to the range (morale -3 to +3, luck 0 to +3).
- **Two of the same** count once (the wiki's Artifact page): two Still Eyes on both rings give +1, two Gloves +300. Different ones add up: Clover, Cards and Ladybird give luck +3.
- **Spirit of Oppression and the Hourglass** only act in battle ("This item negates all Morale bonuses during combat for both you and your opponent."). The wiki's Morale and Luck pages say they negate positive values only, and the open-source engine holds the value to at most 0, so negative morale still freezes stacks. Not checked in the game.
- **Movement.** The bonus counts when the artifact is worn as a day starts (wiki, Movement): picking the boots up changes nothing that day. The wiki's tables give Shadow of Death's +600 and +300 next to Horn of the Abyss's +400 and +200; we use Shadow of Death's.
- **Badge of Courage** also makes the troops immune to mind spells (wiki only; the game's text doesn't say). That comes with spells (5.8).

The game's text files for the morale and luck popups aren't online. The artifact's line, its name and value ("Clover of Fortune +1"), is our own wording, as the open-source engine shows it.

## What we do

- Each artifact is data in `game/data/artifacts.json`. Next to `primarySkills`, an artifact may have `morale`, `luck`, `landMovementPoints` and `cancelsInBattle` (`["morale"]`, `["luck"]`). A new artifact with these needs no code.
- The morale and luck popups list each worn artifact after the secondary skill.
- In battle, a hero wearing an artifact that cancels morale or luck holds both sides' value to at most 0. The hero screen and popups still show the usual values.
- At the start of each day a hero gets the movement points of the artifacts they wear, over the maximum, as the Stables give theirs; the movement bar's maximum stays 1500. A scenario hero who starts wearing them has them on day 1 too.
- The demo map has a Still Eye of the Dragon, Boots of Speed and a Spirit of Oppression near Lord Haart.

## Not yet

- Badge of Courage's immunity to mind spells (5.8).
- The sea movement artifacts (Necklace of Ocean Guidance, Sea Captain's Hat) and Angel Wings, with boats and flying (7.10).
