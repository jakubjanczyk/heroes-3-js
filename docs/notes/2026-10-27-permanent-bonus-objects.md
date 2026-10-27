# Permanent bonus objects (2026-10-27)

Roadmap 7.7: map objects that each hero can use once, for a bonus that stays. The Treasure Chest is done (2026-10-19-treasure-chests-and-hero-levels.md); this note covers the rest.

## How Heroes 3 does it

Checked against the Heroes 3 wiki (heroes.thelazy.net: Learning Stone, Mercenary Camp, Marletto Tower, Star Axis, Garden of Revelation, Arena, School of War, School of Magic, Tree of Knowledge, Witch Hut, Library of Enlightenment), Shadow of Death rules. Horn of the Abyss objects and changes are left out. Message numbers are `core.advevent.<n>`.

### Which objects

Shadow of Death has eleven objects that give each hero a lasting bonus once:

| Object | Gives | Choice? | Cost | Needs |
|---|---|---|---|---|
| Learning Stone | 1000 experience | no | free | — |
| Mercenary Camp | +1 Attack | no | free | — |
| Marletto Tower | +1 Defense | no | free | — |
| Star Axis | +1 Power | no | free | — |
| Garden of Revelation | +1 Knowledge | no | free | — |
| Arena | +2 Attack or +2 Defense | yes, no way out | free | — |
| School of War | +1 Attack or +1 Defense | yes, may leave | 1000 gold | — |
| School of Magic | +1 Power or +1 Knowledge | yes, may leave | 1000 gold | — |
| Tree of Knowledge | one level | no, but may leave a paid one | free, 2000 gold or 10 gems | — |
| Witch Hut | one secondary skill at Basic | no | free | — |
| Library of Enlightenment | +2 to all four primary skills | no | free | level 10, or less with Diplomacy |

The roadmap had two of these wrong: the School of Magic teaches no spell, it raises Power or Knowledge, so it needs no hero magic; and the School of War gives Attack *or* Defense, not both. The Arena was missing.

Objects that look similar but belong elsewhere: the Shrines (a spell, needs 4.8), the Scholar (a primary skill, a secondary skill or a spell, and it disappears), the University (secondary skills for gold, its own trade window), the Warrior's Tomb, Wagon, Corpse and Lean To (once per object, not per hero), and the temporary bonus objects of 7.6.

### Once per hero

- Each hero keeps a list of the objects they have used. Another hero, of the same player or not, can still use the object.
- The status bar and the right-click popup over one of these objects add "(Visited)" or "(Not visited)" under the name, for the selected hero (`core.genrltxt.352`, `353`; not yet checked in the game). With no hero selected nothing is added.
- There is no sign on the map itself.
- Visiting again gets the object's second message and nothing more.
- Every message has no title: the text, the picture of what it gives with the amount under it ("+1" under the Attack picture, "1000" under the experience picture), and OK.

### The free ones

| Object | Message | Visited again |
|---|---|---|
| Learning Stone (143, 144) | A smooth stone on the face of this pillar begins to swirl as you approach. Looking into it, you are amazed to see answers to questions you have pondered for years. The stone suddenly goes still, but you realize you have learned much. | You approach the pillar, hoping to gain more insight, but the stone now does nothing more than reflect the sunlight. |
| Mercenary Camp (80, 81) | You've come upon a camp of mercenaries practicing their combat tactics. They welcome you and your troops and invite you to train with them. | You've come upon a camp of mercenaries practicing their combat tactics. "You're too advanced for us," the mercenary captain says. "We can teach you nothing more." |
| Marletto Tower (39, 40) | The soldiers living in the tower teach you a few new defensive tricks. | "I'm sorry sir," the leader of the soldiers says, "but you already know everything we have to teach." |
| Star Axis (100, 101) | You've found several of the best astrologers of the land gathered at a Star Axis. Happy to have some company, they teach you how to use the Sun, Moon, and Stars to enhance your spell casting ability. | You've found several of the best astrologers of the land gathered at a Star Axis. You spend some time chatting with them, but soon realize that there is nothing new for you to learn from them. |
| Garden of Revelation (59, 60) | A monk sitting in the center of a garden invites you to meditate with him. You do, and after a short time you feel enlightened. | You enter the garden, and the monk, recognizing you, says, "My child, the blessing of knowledge comes but once in a person's lifetime." |

The Learning Stone's 1000 experience can level the hero up, with the usual level-up popups after the message. The Learning skill will raise it, as it does all experience (4.7.3).

### The ones with a choice

The dialog shows both bonuses as pictures with "+2" or "+1" under them, "or" between them, and the checkmark, disabled until one is picked, as the chest's.

- **Arena** (0, 1). "You enter the arena and face a pack of vicious lions. You handily defeat them, to the wild cheers of the crowd. Impressed by your skill, the aged trainer of gladiators agrees to train you in a skill of your choice." No way out: the hero has to pick one. Visited again: "The Arena guards prevent you from entering. "You've already beaten our best. Begone from here.""
- **School of War** (158, 159, 160). "The battle-scarred instructor of this school of war grunts as you walk past. For a fee of 1000 gold he can teach you your choice of new attack or defense skills." The dialog also has a cancel button; cancelling costs nothing and leaves the school unvisited. Picking one takes 1000 gold. With less than 1000 gold: "The battle-scarred instructor of this school of war grunts as you walk past. He could teach you some new combat tactics, but he charges 1000 gold, which you currently do not have." with OK only, and the school stays unvisited. Visited again: "The head instructor laughs out loud when you ask to receive more training. "You should be teaching here!" he shouts."
- **School of Magic** (71, 72, 73). The same with Power and Knowledge. "The tingle of magic fills the air of this school of mystical arts. An acolyte offers to sign you up for the next class for 1000 gold. You will have your choice of increasing your knowledge, or learning to better focus your powers." Too poor: "The tingle of magic fills the air of this school of mystical arts. An acolyte informs you that he could sign you up for the next class, but that you do not have the required tuition of 1000 gold." Visited again: "An old wizard appears out of thin air. "Master," he says, "you have learned all that we could possibly teach you.""

### Tree of Knowledge

- Gives exactly the experience the hero is missing for the next level, so the hero always goes up one level, with the level-up popup.
- Each tree's price is rolled once, when the map starts: free, 2000 gold or 10 gems, a third each (34 / 33 / 33). A map may set it.
- Free (148): "Upon your approach, the tree opens its eyes in delight. "Ahh, an adventurer! Allow me to teach you a little of what I have learned over the ages.""
- 2000 gold (149): "Upon your approach, the tree opens its eyes in delight. "Ahh, an adventurer! I will be happy to teach you a little of what I have learned over the ages for a mere 2000 gold." (Just bury it around my roots.)" The paid tree asks: the player can accept or leave, and leaving keeps the tree unvisited. Too poor (150): "Tears brim in the eyes of the tree. "I need 2000 gold." it whispers. (sniff) "Well, come back when you can pay me.""
- 10 gems (151, 152): the same with "10 gems".
- Visited again (147): "Upon your approach, the tree opens its eyes in delight. "It is good to see you, my student. I hope my teachings have helped you.""
- Whether the free tree asks too, or just gives the level with OK, is not yet checked in the game.

### Witch Hut

- Each hut teaches one skill, rolled when the map starts from every skill but Leadership and Necromancy; a map may set it or narrow the list. A skill the hero's class never gets on level-up can still be learned here.
- Nothing tells the player the skill before a hero of theirs has visited; after that the status bar and popup name it ("Witch Hut" and the skill on the next line, `core.genrltxt.354`).
- No question first: entering teaches the skill at Basic. "An ancient witch living in a strange hut welcomes you, offering to teach you Archery for her own inscrutable purposes." (171), with the skill's picture and "Basic Archery" under it.
- The hero already has the skill, at any level (172): "You approach the strange hut and observe a witch inside studying an ancient tome on Archery. As you approach, she turns and speaks. "You already know that which I would teach you. I can help you no further.""
- The hero has 8 skills (173): "You approach the strange hut and observe a witch inside studying an ancient tome on Archery. As you approach, she turns and focuses her one glass eye on you. "HA!" she screeches, "I would not presume to try to teach new tricks to someone so clearly as wise as you." You leave, but can't quite shake the feeling that you have just been insulted."
- The hut is not "once per hero": a hero who couldn't learn the skill there can't later either, and one who did already has it. The popup shows no "(Visited)".

### Library of Enlightenment

- +2 Attack, Defense, Power and Knowledge, once per hero (66).
- The hero must be level 10, or 8 with Basic Diplomacy, 6 with Advanced, 4 with Expert. Too low (68): "The caretaker opens the door and looks you up and down. "You are neither famous nor diplomatic enough to be admitted to the Library of Enlightenment," he sniffs. "Come back when you think yourself worthy."" A hero turned away can come back later.
- Visited again (67): "Recognizing you, the caretaker refuses to admit you. "The Library of Enlightenment," he says, "may be visited but once.""

## What we do

Built in five parts, each its own change. Nothing here needs a feature we don't have.

1. **Once per hero, free:** Learning Stone, Mercenary Camp, Marletto Tower, Star Axis, Garden of Revelation.
2. **Choices:** Arena, School of War, School of Magic.
3. **Tree of Knowledge.**
4. **Witch Hut.**
5. **Library of Enlightenment.**

### Part 1

- A scenario entity `{ "kind": "BONUS_OBJECT", "type": "LEARNING_STONE" }` (or `MERCENARY_CAMP`, `MARLETTO_TOWER`, `STAR_AXIS`, `GARDEN_OF_REVELATION`); `game/data/bonus-objects.json` names each and says what it gives (`{ "experience": 1000 }`, `{ "primarySkills": { "attack": 1 } }`). Parts 2 to 5 add their objects to the same file.
- Each is one tile for now, which the hero steps onto, as the resource generators' entrance; real footprints come with the pictures (10.1). They show their name on the map, as the dwellings and resource generators do.
- A visit is saved as `fact.hero.bonusObject.visited` (`heroId`, `entityId`, `primarySkills`). The `heroDetails` slice keeps the hero's `visitedBonusObjects` and adds the primary skills to a `bonusPrimarySkills` count that `getHeroPrimarySkills` adds in, as it adds the level-ups. Experience goes through `command.hero.experience.gain.requested`, as the chest's does, so level-ups work the same.
- A beaten hero hired again starts over, as with their level and skills (2026-10-26-defeated-hero.md): the bonuses and the visited list go.
- The message is the notice the resource generators use: no title, the text, the reward's picture with its amount, OK. The primary skill pictures are the hero box's; experience uses the chest's banner.
- The status bar and the right-click popup add "(Visited)" or "(Not visited)" for the selected hero.

### Later parts

- **Part 2.** The chest's choice dialog with a cancel button for the schools. Gold is spent through the kingdom's spending (3.4); too little gold gets the message and the object stays unvisited.
- **Part 3.** Each tree's price is rolled when the world is built (`config.random`) and kept in the world state, so a reload keeps it; a scenario may set `price`.
- **Part 4.** Each hut's skill is rolled when the world is built, or set by the scenario (`skill`). The player's visited huts are kept per player, so the popup can name the skill.
- **Part 5.** The level rule with Diplomacy; Diplomacy itself does nothing else yet.

## Not yet

- Pictures on the map (10.1) and visit sounds (10.4).
- The Learning skill's extra experience (4.7.3).
- The Treasure Chest's random tier and artifact chest (7.8).
