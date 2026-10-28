# Morale and luck (2026-10-28)

Roadmap 4.9: each hero's morale and luck, worked out from what the game has, and shown where the game shows them. What they do in battle (an extra turn, freezing, a lucky strike) comes later (5.6); the bonuses that last until the next battle come with the objects that give them (7.6).

## How Heroes 3 does it

Checked against the Heroes 3 wiki (Morale, Luck, Alignment, Leadership pages) and against VCMI's rules (`CArmedInstance::updateMoraleBonusFromArmy`, `AFactionMember::moraleValAndBonusList`, `config/creatures/castle.json`, `config/gameConfig.json`).

- **Range.** Morale is -3 to +3. Luck is 0 to +3: negative luck exists only in Horn of the Abyss, and in Shadow of Death a total below 0 counts as 0. The modifiers are added up and the total is held to the range.
- **Sources the game already has:**
  - **Leadership:** morale +1 / +2 / +3 at Basic / Advanced / Expert.
  - **Luck (the skill):** luck +1 / +2 / +3.
  - **The army's towns.** Creatures of one town: morale +1. Two towns: 0. Three: -1, four: -2, and so on (`2 - towns`; the wiki's Alignment table stops at -3 for 5-7, its Morale page says six towns give -4 and seven -5, as VCMI does. The cap on the total makes that matter only next to other bonuses, and we have creatures of two towns only, so we use `2 - towns`). Neutral creatures count as a town of their own. An empty army gets nothing.
  - **Undead in the army:** morale -1 when any stack is undead (Skeletons). Undead themselves are never affected by morale in battle, but the hero's morale shows the -1.
  - **Angels and Archangels:** morale +1 for the army they are in, once however many stacks of them there are.
- **Sources for later:** artifacts (7.8), map objects until the next battle (7.6), the Tavern and Brotherhood of the Sword when defending a siege (5.10), the Colossus, spells (Mirth, Sorrow, Fortune, Misfortune), the Bone Dragon's and Devil's effect on the enemy (5.6), magical terrain.
- **Where it is shown:**
  - The hero screen: two frames between Specialty and Experience, morale then luck, each a picture for its state.
  - The hero exchange screen: in each hero's row of small frames after experience and spell points.
  - The hero info box and the right-click hero popup: morale and luck beside the army slots.
- **Right click** on one of them shows a popup: the state as its title ("Good Morale", "Neutral Morale", "Bad Morale"; "Good Luck", "Neutral Luck"), a sentence on what it means, then "Current Morale Modifiers:" with a line per modifier ("Basic Leadership +1", "All troops of one alignment +1", "Troops of 3 alignments -1", "Undead in army -1"), or "None" when there are none (`core.arraytxt.60-62`, `86-88`, `108`, `114-116`).
- **The status bar** over one names its state (`core.heroscrn.3-8`).

The game's texts aren't online. The titles and modifier lines above follow how the game builds them (one line per modifier with its number) and are our own wording; the sentences on what each state means are ours too.

## What we do

- `game/heroes/morale-and-luck.js` works out a hero's morale and luck from their secondary skills and army: the total, held to the range, and the list of modifiers with their values. Nothing new is saved; skills and army already are, so a reload shows the same values.
- Creature data: the faction is already there (`CASTLE`, `NECROPOLIS`). Skeletons and Skeleton Warriors get an `undead` ability, Angels and Archangels a `raisesMorale` ability.
- Shown in the hero screen, the exchange screen and the hero box (info box and right-click popup). The pictures are stand-ins until there are sprites (10.1): an SVG banner for morale and a clover for luck, the value under it ("+1", "0", "-1").
- Holding the right button on one shows the popup above; the status bar says "Good Morale" and so on.
- The values follow the army as it changes: recruiting, an exchange, a stack moved into a town's garrison, a lost battle.
- Nothing changes in battle yet.

## Not yet

- What morale and luck do in battle (5.6).
- Bonuses until the next battle (7.6) and every other source listed above.
- A stack's own morale in battle (undead and the creatures immune to morale show 0).
- Pictures for each state (10.1).
