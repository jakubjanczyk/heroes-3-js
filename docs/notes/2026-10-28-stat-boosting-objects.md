# Stat-boosting objects (2026-10-28)

Roadmap 7.6: map objects that give a hero a bonus that doesn't last: morale or luck until the next battle, movement points for the day or the week.

## How Heroes 3 does it

Checked against the Heroes 3 wiki's raw page source (Faerie Ring, Swan Pond, Idol of Fortune, Temple, Fountain of Fortune (adventure map), Fountain of Youth, Rally Flag, Oasis, Watering Hole, Stables, and the Morale, Luck and Movement pages) and against a second source's object rules (its configuration of these objects and the code that decides whether a hero may visit again). Shadow of Death rules; Horn of the Abyss objects and changes are left out. Message numbers are `core.advevent.<n>`.

### Which objects

| Object | Gives | Lasts |
|---|---|---|
| Faerie Ring | luck +1 | until the next battle |
| Swan Pond | luck +2, and the hero loses the rest of the day's movement points | until the next battle |
| Idol of Fortune | luck +1 on days 1, 3, 5; morale +1 on days 2, 4, 6; both on day 7 | until the next battle |
| Temple | morale +1, or +2 on day 7 | until the next battle |
| Fountain of Fortune | luck -1, +1, +2 or +3, a quarter each, rolled per fountain at the start of each week | until the next battle |
| Fountain of Youth | morale +1, and +400 movement points | morale until the next battle, movement points until the end of the day |
| Rally Flag | morale +1, luck +1, and +400 movement points | as the Fountain of Youth |
| Oasis | morale +1, and +800 movement points | as the Fountain of Youth |
| Watering Hole | morale +1, and +400 movement points | as the Fountain of Youth |
| Stables | +400 movement points now and at the start of each day; Cavaliers upgraded to Champions for free | until the end of the week |

The roadmap had three of these wrong: the Fountain of Youth gives +400 movement points, not +1; the Temple gives +1 on the other days, not nothing; the Idol of Fortune's bonus depends on the day, it doesn't always give both. The Fountain of Fortune can also give -1. The Oasis and Watering Hole were missing. The Buoy (morale +1) and the Mermaids (luck +1) are the same kind of object, but on water, so they wait for boats (7.10).

Both sources agree on every number above. The Stables give +400 in Shadow of Death; +300 is Horn of the Abyss.

### Visiting again

- A hero can't take the bonus of an object while they still have a bonus from an object **of the same kind**: a second Temple does nothing while the first Temple's morale lasts, but a Rally Flag still gives its own. The bonuses of different kinds add up (Temple +1 and Rally Flag +1 is morale +2), held to the usual range.
- Once a battle has ended (won, lost or retreated), the morale and luck bonuses are gone and the hero can take them again, the same day. So a hero can visit a Rally Flag, fight, and visit it again for another +400 movement points. Both sources say so.
- The movement points last until the end of the day, battle or not. They can take the hero above their usual maximum. A new day resets movement points to the maximum as always.
- The Stables' bonus lasts the week, not until a battle: another Stables does nothing that week ("You have already visited the stables this week."). A hero visiting again with Cavaliers in the army still gets them upgraded (message 139, whose text isn't online).
- Visiting again gets the object's second message and nothing more.
- The right-click popup and status bar say "(Visited)" or "(Not visited)" for the selected hero, as the permanent bonus objects do: "visited" while the hero has the bonus from an object of that kind.
- The second source checks this by kind of object, the wiki says only "visited again after a battle". The wiki's Movement page also says the movement objects' "effect is not cumulative", which reads as the same rule.

### Messages

From the wiki, word for word. The second number is the visited-again message.

| Object | Message | Visited again |
|---|---|---|
| Faerie Ring (49, 50) | You enter a faerie ring, and your army gains luck for its next battle. | You enter a faerie ring, but nothing happens. |
| Swan Pond (29, 30) | Childhood stories said that a scarlet swan was a portent of good fortune. You decide to rest here for the remainder of the day. | Childhood stories said that a scarlet swan was a portent of good fortune. However, you are still blessed with luck from your last visit here. Since there is nothing more to gain here, you move on. |
| Idol of Fortune (62, 63) | You've found an ancient and weathered stone idol. Kissing it is supposed to bring luck or happiness, so you do. The stone is very cold to the touch. | You've found an ancient and weathered stone idol. It is supposed to grant luck or happiness to visitors, but since the stars are already shining upon you, it does nothing. |
| Temple (140, 141) | A visit and a prayer at the temple raises the morale of your troops. | It doesn't help to pray twice before a battle. Come back another day. |
| Fountain of Fortune (55, 56) | As you drink the bittersweet water, you feel your luck changing. | You drink from the enchanted fountain, but nothing happens. |
| Rally Flag (111, 110) | You rally your troops around this flag, renewing their strength and lifting their spirits. You feel at your peak, and can travel a bit further today. | You rally your troops around this flag. |
| Oasis (95, 94) | A drink at the oasis fills your troops with strength and lifts their spirits. You can travel a bit further today. | The drink at the oasis is refreshing, but offers no further benefit. The oasis might help again if you fought a battle first. |
| Watering Hole (166, 167) | A drink at the watering hole fills your troops with strength and lifts their spirits. You can travel a bit further today. | The drink at the watering hole is refreshing, but offers no further benefit. The watering hole might help again if you fought a battle first. |
| Stables (137; 138 with Cavaliers; 136) | The stablemaster offers to provide your army with horses, increasing your movement for the remainder of the week. With Cavaliers: The stablemaster offers to provide your army with horses, increasing your movement for the remainder of the week and upgrading all your Cavaliers to Champions. | You have already visited the stables this week. |

- **Fountain of Youth (57, 58): not online.** The wiki's Fountain of Youth page carries the Fountain of Fortune's two texts word for word ("you feel your luck changing" from an object that gives no luck), so it is a copy, not the game's text. Ours will need our own wording.
- The wiki lists the Oasis's two messages the other way round; the message numbers and the texts themselves show which is which.
- Every message is shown without a title, with the bonus's picture and amount under it (the morale or luck picture with "+1"), and OK. Whether the game also shows the movement points isn't written down anywhere; we show only morale and luck.
- The popup's line on what an object gives (`core.xtrainfo.<n>`) isn't online: ours is our own wording.
- The hero's morale and luck popup lists each bonus as a modifier (the line's text, `core.arraytxt.<n>`, isn't online; ours reads "Temple Visit +1", our own wording).

### Tiles on the map

From the game's object table (`Objects.txt`, as the map tool homm3tools ships it). `E` is the entrance, `#` a blocked tile, the bottom row last. Where the table has a line per terrain (`Faerie Ring_Dirt0`), all of them are the same object with the same tiles; the Swan Pond's three lines are three objects with the same tiles. The Stables have only terrain lines (Dirt, Grass, Rough), all one object.

| Object | Tiles |
|---|---|
| Fountain of Fortune, Idol of Fortune | `E` |
| Faerie Ring, Swan Pond, Temple | `E#` |
| Rally Flag, Stables | `#E` |
| Fountain of Youth | `##` / `#E` |
| Oasis | `##` / `EE` |
| Watering Hole | `EEEE` |

The Oasis has two entrance tiles and the Watering Hole four. Every object so far has one.

## What we do

Built in four parts, all done: until the next battle (Faerie Ring, Swan Pond, Idol of Fortune, Temple), movement points (Fountain of Youth, Rally Flag), the Fountain of Fortune and the Stables. How an object is made from its data is in `2026-10-29-visitable-objects.md`; what is decided here:

- A hero's bonuses until the next battle add to their morale and luck, held to the range as the rest, and the battle starts with them. Each is listed in the morale and luck popups as "Temple Visit +1" (our own wording). A battle's end takes them all away, won or lost.
- The message shows the morale or luck picture (the hero screen's stand-ins) with "+1" or "-1" under it; the Idol's day 7 shows both. It shows no picture for movement points, so the Stables' message has none.
- The popup's line on what an object gives is our own wording: "+1 Luck until the next battle", "+1 Morale, +2 on day 7", "+1 Morale and Luck until the next battle, +400 movement points today", "-1 to +3 Luck until the next battle" (it doesn't give away this week's roll), "+400 movement points each day until the end of the week". Then "(Visited)" while the selected hero has the bonus from that kind of object; the status bar says the same.
- Movement points can go above the maximum until the day ends; the new day resets them to the maximum. The hero list's movement bar stays full above the maximum.
- The Fountain of Youth's messages are our own wording, as its texts aren't online: "You drink from the fountain of youth. Your troops feel refreshed and their spirits lift. You can travel a bit further today." and "You drink from the fountain of youth again, but nothing more happens."
- Fountain of Fortune: the luck is rolled on the week's first visit that gives it, then the same for every hero there that week, even after the first hero's bonus is gone in a battle.
- Stables: the bonus is per hero; another hero can take it at the same Stables that week. A visit on day 7 lasts that day only. Message 139 isn't online: "The stablemaster upgrades all your Cavaliers to Champions." is our own wording.
- A beaten or retreated hero leaves the map and starts over when hired again.
- The demo map has one of each, near the starting hero.

## Not yet

- The Oasis and the Watering Hole (several entrance tiles).
- The Castle town's Stables building, which gives the same week's movement points (6.5).
- The Buoy and the Mermaids (water, 7.10).
- Pictures on the map (10.1), visit sounds (10.4).
