# Artifacts on the map (2026-10-29)

Roadmap 7.8.1, the first of seven parts of 7.8: artifacts lying on the map, picked up and worn, for the 38 that only change primary skills. Moving them on the hero screen is 7.8.2; the rest of 7.8 builds on this.

## How Heroes 3 does it

Checked against the Heroes 3 wiki's raw page source (Artifact, the slot tables `Template:Artifact table - <slot>`, Primary skill, and each artifact's own page) and against an open-source engine's artifact data, map object code and hero screen layout. Shadow of Death rules; the wiki's tables also give HotA's values, which are left out.

- **On the map.** An artifact takes one tile, its entrance: the game's object table (`Objects.txt`, checked against homm3tools' copy of it) gives every one of the 134 artifacts the same footprint, `E`. As with resources, the tile blocks and the hero picks the artifact up from the next tile.
- **Picking it up.** A message with no title opens: the artifact's own pickup text, its picture, and OK. Centaur's Axe: "You see a heavy axe embedded deeply in the ground. After several unsuccessful attempts by your army to remove it, you tightly grip the handle of the axe and effortlessly pull it free." The artifact leaves the map.
- **Where it goes.** To the first free slot of its kind, otherwise to the backpack. Ring slots fill right ring first, then left; misc slots 1 to 5 in order (the order checked against the open-source engine only; the wiki gives the slots but not the order). Artifacts in the backpack do nothing.
- **Slots.** Helmet, Cape, Necklace, Weapon (right hand), Shield (left hand), Torso, two Rings, Feet, five Misc; and four war machine slots and the spell book's, which take only those. On the hero screen the 19 frames already in `index.html` are, in order: helmet, cape, necklace, weapon, shield, torso, right ring, left ring, feet, misc 1-4, the four war machines, spell book, misc 5.
- **Bonuses.** A worn artifact's primary skills add to the hero's everywhere they count, battle included. Two of the same artifact don't add up, except Quiet Eye of the Dragon (and the resource artifacts, later); in this part only Quiet Eye can be worn twice, on the two rings.
- **Minimums.** Power and Knowledge never go below 1 (wiki). Attack and Defense never below 0 (open-source engine only). So a Knight (Defense 2) with Titan's Gladius has Defense 0.
- **Pickup texts.** Every artifact page has one (`event`), quoted from the game. Helm of Chaos and Hellstorm Helmet share the same text. No second source could be reached for these (the Might and Magic wiki is blocked from here), so they are checked against the Heroes 3 wiki only.
- **The right-click popup** on an artifact on the map names it (open-source engine only; worth checking in the game).
- The wiki's list gives Armageddon's Blade +6 Power and +3 Knowledge; its own page and the open-source engine say +3 Power and +6 Knowledge. Not in this part.

### The 38 artifacts

Slot, class and cost match between the slot tables and each artifact's page; the bonuses match the open-source engine.

| Artifact | Slot | Class | Cost | Bonus |
|---|---|---|---|---|
| Helm of the Alabaster Unicorn | Helmet | Treasure | 1000 | +1 Knowledge |
| Skull Helmet | Helmet | Treasure | 3000 | +2 Knowledge |
| Helm of Chaos | Helmet | Minor | 4000 | +3 Knowledge |
| Crown of the Supreme Magi | Helmet | Minor | 5000 | +4 Knowledge |
| Hellstorm Helmet | Helmet | Major | 6000 | +5 Knowledge |
| Crown of Dragontooth | Helmet | Relic | 8000 | +4 Power, +4 Knowledge |
| Thunder Helmet | Helmet | Relic | 10000 | -2 Power, +10 Knowledge |
| Helm of Heavenly Enlightenment | Helmet | Relic | 24000 | +6 Attack, +6 Defense, +6 Power, +6 Knowledge |
| Dragon Wing Tabard | Cape | Minor | 4000 | +2 Power, +2 Knowledge |
| Necklace of Dragonteeth | Necklace | Major | 6000 | +3 Power, +3 Knowledge |
| Celestial Necklace of Bliss | Necklace | Relic | 12000 | +3 Attack, +3 Defense, +3 Power, +3 Knowledge |
| Centaur's Axe | Weapon | Treasure | 2000 | +2 Attack |
| Blackshard of the Dead Knight | Weapon | Minor | 3000 | +3 Attack |
| Greater Gnoll's Flail | Weapon | Minor | 4000 | +4 Attack |
| Red Dragon Flame Tongue | Weapon | Minor | 4000 | +2 Attack, +2 Defense |
| Ogre's Club of Havoc | Weapon | Major | 5000 | +5 Attack |
| Sword of Hellfire | Weapon | Major | 6000 | +6 Attack |
| Titan's Gladius | Weapon | Relic | 10000 | +12 Attack, -3 Defense |
| Sword of Judgement | Weapon | Relic | 20000 | +5 Attack, +5 Defense, +5 Power, +5 Knowledge |
| Shield of the Dwarven Lords | Shield | Treasure | 2000 | +2 Defense |
| Shield of the Yawning Dead | Shield | Minor | 3000 | +3 Defense |
| Buckler of the Gnoll King | Shield | Minor | 4000 | +4 Defense |
| Targ of the Rampaging Ogre | Shield | Major | 5000 | +5 Defense |
| Shield of the Damned | Shield | Major | 6000 | +6 Defense |
| Dragon Scale Shield | Shield | Major | 6000 | +3 Attack, +3 Defense |
| Sentinel's Shield | Shield | Relic | 10000 | -3 Attack, +12 Defense |
| Lion's Shield of Courage | Shield | Relic | 16000 | +4 Attack, +4 Defense, +4 Power, +4 Knowledge |
| Breastplate of Petrified Wood | Torso | Treasure | 1000 | +1 Power |
| Rib Cage | Torso | Minor | 3000 | +2 Power |
| Scales of the Greater Basilisk | Torso | Minor | 4000 | +3 Power |
| Armor of Wonder | Torso | Minor | 4000 | +1 Attack, +1 Defense, +1 Power, +1 Knowledge |
| Tunic of the Cyclops King | Torso | Major | 5000 | +4 Power |
| Breastplate of Brimstone | Torso | Major | 6000 | +5 Power |
| Dragon Scale Armor | Torso | Relic | 8000 | +4 Attack, +4 Defense |
| Titan's Cuirass | Torso | Relic | 10000 | +10 Power, -2 Knowledge |
| Quiet Eye of the Dragon | Ring | Treasure | 2000 | +1 Attack, +1 Defense |
| Dragonbone Greaves | Feet | Treasure | 2000 | +1 Power, +1 Knowledge |
| Sandals of the Saint | Feet | Relic | 8000 | +2 Attack, +2 Defense, +2 Power, +2 Knowledge |

## What we do

- `game/data/artifacts.json`: the 38 by id (`CENTAURS_AXE`, ...), each with name, slot, class, cost, `primarySkills` (`{ "attack": 2 }`) and pickup text, the wiki's links turned back into plain words. The other artifacts come with the parts that give their effects.
- A new entity kind, `ARTIFACT`, naming its artifact (`"artifact": "CENTAURS_AXE"`). It blocks its tile and is visited from the next one, as a resource is; the step is paid as for any visit from the next tile.
- No pictures yet: the map, the message and the hero screen frames show a stand-in with the artifact's name, as other objects do.
- A scenario hero may start with artifacts (`"artifacts": ["CENTAURS_AXE", ...]`), put on as if picked up in that order, as the map editor lets a map maker equip a hero. A scenario naming an artifact that doesn't exist fails to load.
- Picking it up is saved (`fact.artifact.picked_up`, with the hero and where it went), so a reload shows it worn and gone from the map.
- The hero screen shows each worn artifact in its frame, and the backpack's first five in the backpack frames. Its arrows, moving artifacts and right-click descriptions are 7.8.2.
- The primary skills shown in the info box, the hero's right-click popup, the hero screen and the exchange screen, and used in battle, add the worn artifacts, never below the minimums above.
- A beaten hero hired again comes back without artifacts, as they come back at level 1 (see `2026-10-26-defeated-hero.md`).
- Closes 2.4's "Artifact pickup: dialog with the artifact's picture and its pickup text".

## Not yet

- Moving artifacts on the hero screen, the backpack's arrows and the descriptions (7.8.2).
- The other artifacts (7.8.3 onwards), the exchange screen's paper dolls (7.8.6) and combination artifacts (7.8.7).
- Pictures and the pickup sound (10.1, 10.4).
- Random artifacts placed by class (the map editor's "random Treasure artifact").
