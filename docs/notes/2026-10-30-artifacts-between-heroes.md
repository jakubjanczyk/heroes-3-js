# Artifacts between heroes (2026-10-30)

Roadmap 7.8.6, the sixth of seven parts of 7.8: moving artifacts between two heroes on the exchange screen. Builds on `2026-10-25-heroes-meeting.md` and `2026-10-29-moving-artifacts.md`.

## How Heroes 3 does it

The wiki has no page on the exchange screen; its Keybinds page lists the trade screen's artifact keys ("X / F11 = Swap artifacts", Ctrl+click to equip on the other hero, Shift+click to trade). How moving works is checked against an open-source engine's exchange window and artifact code only. The layout follows a screenshot of the exchange screen the user shared. Not yet checked in the game.

- **One artifact.** Clicking an artifact on either hero takes it onto the pointer; clicking a slot or backpack frame on either hero puts it there, with the hero screen's rules (7.8.2): only a slot of its kind, swapping with what is there, and a backpack frame moving the rest one place right.
- **Swapped out.** An artifact swapped out of the other hero's slot is now held, and still belongs to the hero who picked up the first one: closing the screen puts it on that hero, in the first free slot of its kind, else at the end of the backpack.
- **A full backpack** (64) takes nothing more: the held artifact stays held. The open-source engine checks the backpack of the hero holding the artifact rather than the one receiving it; we check the receiver's.
- **Highlighting.** While an artifact is held, the empty slots it can go in light up on both heroes.
- **Move all artifacts**, the helmet-and-arrow buttons under the armies: the giving hero's worn artifacts go first, in slot order, then the backpack; each goes to the other hero's first free slot of its kind, else to the end of their backpack. What has no room stays with the giving hero.
- **Swap artifacts**: worn artifacts trade slot for slot and the backpacks trade whole.
- **Status bar.** Over artifacts and empty frames as on the hero screen ("View <artifact> Info", "Empty"). The buttons' texts are in our own wording: "Move all artifacts to <hero>" and "Swap artifacts".
- **Right-click** on an artifact shows its name and description, as on the hero screen.

## What we do

- `game/heroes/artifact-exchange.js` works on both heroes' artifacts, `{ left, right }`; the held artifact is the `held` of the hero who picked it up.
- The screen asks with `command.heroes.*` (`artifactTake`, `artifactPut`, `artifactPutBack`, `backpackScroll`, `artifactsSend`, `artifactsSwap`), each naming `heroIds: { left, right }`. `hero-artifacts.module.js` applies them and emits `fact.hero.artifacts.changed` for each hero whose artifacts changed, which is saved.
- The hero screen and the exchange screen draw artifacts with `app/heroes/presentation/artifacts.js`.
- Left out, decided with the user: the four double arrows between the paper dolls, whose use couldn't be confirmed.

## Not yet

- The chest buttons beside the backpacks, which open the whole backpack (an optional extra, 7.8.5), and the buttons in the bottom corners.
- The modifier keys: moving only worn artifacts or only the backpack.
- Artifact pictures (10.1).
