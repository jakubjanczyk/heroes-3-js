# Hero screen (2026-10-23)

Roadmap 4.3b: the Heroes 3 hero screen, with what the game knows about the hero so far and empty frames for the rest.

## How Heroes 3 does it

Checked against VCMI (`client/windows/CHeroWindow.cpp`, `client/adventureMap/CList.cpp`, `AdventureMapInterface.cpp`, `CCastleInterface.cpp`, `config/shortcutsConfig.json`).

- **Opening it.** A click on a hero in the hero list selects them; a click on the hero already selected opens the hero screen (`CList::CListItem::clickPressed`). The selection doesn't move the camera on that second click. Clicking the selected hero on the map opens it too. In a town, the first click on the visiting hero's portrait frames it and the second opens the hero screen over the town (`CHeroGSlot::clickPressed`).
- **Closing it.** The ✓, Enter or Escape (`globalReturn`). Over a town, it goes back to the town.
- **Layout**, in the game's pixels (the screenshot of the HD version is the same at 1.8 times):
  - left: the portrait (58 × 64) and a box with the name and "Level 5 Warlock", the four primary skills (name, icon, value), Specialty, morale and luck, Experience and Spell Points, then eight secondary skills in two columns
  - right: the paper doll with 19 artifact slots (`CArtifactsOfHeroBase::slotPos`), the backpack's five slots between two arrows, Quest Log and Dismiss Hero
  - bottom: the seven army slots, and the tight / loose formation, tactics and split buttons
  - down the right side: the player's banner, a list of the player's heroes, the ✓
  - the status bar along the bottom
- **Status bar.** Hovering a part names what right-clicking it shows: "View Advanced Learning Info" over a secondary skill. Primary skills use the same text (`core.heroscrn.1` with the skill's name) and Experience its own (`core.heroscrn.9`). The game's texts aren't in VCMI's repository; "View Attack Info" and "View Experience Info" follow the wording the screenshot shows for a secondary skill.

## What we do

- `app/heroes/modules/hero-screen-view.module.js` keeps what it shows (experience, level-ups, army, where the hero is, whether they are selected) and opens on `ui.heroScreen.openRequested`, which the hero list (`hero-panel`) and the town screen ask for, or on a click on the selected hero's tile when nothing else blocks the map. It reads the hero when it opens; nothing changes the hero while it is open.
- The markup is `#hero-screen-template` in `index.html`, styled in `game/ui/hero-screen.css`. Every part is placed in the game's 670 × 584 pixels and the window scales as a whole, so it keeps the game's look on any screen; on a phone it is small.
- It covers the map (`ui.adventureMap.covered`) unless the town screen already does, and uncovers only what it covered, so closing it over a town leaves the map covered.
- What the game has no data for yet is an empty frame where Heroes 3 draws it: specialty, morale, luck, spell points (left empty until there are spells), secondary skills, artifacts, backpack, Quest Log, Dismiss Hero and the four army buttons.
- The portrait is the hero's initial, as in the hero box; the icons are the hero box's stand-ins.
- It isn't saved: a reload shows the map.

## Not yet

- Rearranging the army on the hero screen, as on the town screen (4.3).
- Right-click popups and status bar texts over the portrait, the army and the buttons.
- Clicking the hero's own tile still clears the route preview before the screen opens; Heroes 3 keeps the route.
