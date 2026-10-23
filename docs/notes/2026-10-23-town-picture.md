# Town picture (2026-10-23)

Roadmap 6.3.5: the town screen's picture draws the buildings the town has, and they open the Hall, the Fort window and the recruit windows.

## How Heroes 3 does it

- **What is drawn.** Only buildings that stand. Some replace the one before them: Village, Town, City Hall and Capitol; Fort, Citadel and Castle; Mage Guild levels; a dwelling and its upgrade. Others are drawn beside their base: the Brotherhood of the Sword by the Tavern, the Resource Silo by the Marketplace, the Lighthouse by the Shipyard, the Griffin Bastion around the Griffin Tower.
- **Where.** Each faction places its buildings on an 800x374 background. VCMI keeps the spots in `config/factions/<faction>.json` (`structures`: x, y and a z order).
- **Hover.** The building under the mouse gets a bright outline, its shape only, and its name shows in the town screen's own status bar, between the panel and the resource bar.
- **Left click.** The hall opens the Hall, the fort the Fort window, a dwelling or its horde building the dwelling's recruit window (the upgraded creature chosen). The Tavern, Marketplace, Mage Guild, Blacksmith and Shipyard open their screens; the Brotherhood, Lighthouse and Stables show their description.
- **Right click.** A window with the building's picture, name and description. A building just built fades in.

## What we do

- `towns.json` gives the Castle a `picture`: `{ x, y, z }` per building, the top left corner of its drawing on the 800x374 picture and its drawing order. The spots follow the Castle's layout in VCMI, moved so that the stand-ins, which are smaller than the sprites, don't hide one another.
- `game/heroes/town-picture.js` (`describeTownPicture`) lists what is drawn: the buildings in effect (`buildingsInEffect`: not one that a standing building `upgrades`), back to front, each with what clicking it opens. The Mage Guild levels now say which level they upgrade, as in VCMI; nothing else read `upgrades` for them. The town module sends the list with the rest of the town (`picture` on `ui.town.updated`).
- `town-screen-view.module.js` draws the picture as one SVG and each building as a `role="button"` group of shapes, so only its drawn shapes take the mouse. A building carries the same `data-town-action` or `data-recruit-tier` as the panel's Hall and Fort icons and creature buttons, so the existing Hall, Fort and recruit views open from it unchanged. Hovering or focusing it writes its name in the town status bar; Enter and Space press it.
- The drawings are stand-ins, in `app/heroes/presentation/castle-town-art.js`: a shape per building that says what it is (crossed swords on the Brotherhood, a tankard on the Tavern's sign, pikes over the Guardhouse, a griffin on its tower, tents for the Training Grounds, a floor per Mage Guild level). Upgraded dwellings get more: a taller tower, a gold roof, another tent.
- The picture is scaled to fit the town screen whole. Its background reaches past the 800x374 frame, so a wider or taller screen shows more sky, sea and land rather than bars.

## Not yet

- Clicking the other buildings: their screens don't exist yet, so clicking them does nothing.
- Right-click info on a building, and the fade-in of a building just built.
- Other factions' pictures: only the Castle has drawings and spots; a building without a drawing would show as a plain block.
