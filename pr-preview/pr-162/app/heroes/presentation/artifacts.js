import { canPutOn, lockedSlots } from '../../../game/heroes/artifacts.js'

const EMPTY_ARTIFACT_FRAME_TEXT = 'Empty'
const LOCK = 'Locked'

export function renderArtifactPicture(document, artifact, className, label = artifact.name) {
  const picture = document.createElement('span')
  picture.className = className
  picture.setAttribute('role', 'img')
  picture.setAttribute('aria-label', label)
  picture.textContent = artifact.name
  if (artifact.isLock) {
    picture.dataset.lock = 'true'
  }
  return picture
}

// A frame is a worn slot, with `data-artifact-slot`, or one of the backpack's frames.
export function placeOfArtifactFrame(frame) {
  if (frame.dataset.artifactSlot) {
    return { slot: frame.dataset.artifactSlot }
  }
  return { backpack: [...frame.parentElement.children].indexOf(frame) }
}

function showArtifactIn(frame, artifact, renderPicture) {
  frame.replaceChildren(...(artifact ? [renderPicture(artifact)] : []))
  frame.dataset.status = artifact ? `View ${artifact.name} Info` : EMPTY_ARTIFACT_FRAME_TEXT
  if (artifact) {
    frame.dataset.artifact = artifact.id
  } else {
    delete frame.dataset.artifact
  }
}

function showLockIn(frame, combination, renderPicture) {
  frame.replaceChildren(renderPicture({ name: LOCK, isLock: true }))
  frame.dataset.status = `Locked by ${combination?.name ?? ''}`.trim()
  delete frame.dataset.artifact
}

// The held artifact may belong to another hero on the same screen.
export function showArtifactFrames({
  slotFrames,
  backpackFrames,
  artifacts,
  held,
  definitions,
  renderPicture
}) {
  const { worn = {}, backpack = [] } = artifacts ?? {}
  const locked = lockedSlots(artifacts)
  const definitionOf = (artifactId) =>
    definitions?.artifacts?.[artifactId] && { ...definitions.artifacts[artifactId], id: artifactId }
  for (const frame of slotFrames) {
    const slot = frame.dataset.artifactSlot
    if (locked[slot]) {
      showLockIn(frame, definitionOf(locked[slot]), renderPicture)
    } else {
      showArtifactIn(frame, definitionOf(worn[slot]), renderPicture)
    }
    frame.dataset.highlighted = String(
      Boolean(held && artifacts && canPutOn(artifacts, held, slot, definitions))
    )
  }
  backpackFrames.forEach((frame, index) => {
    showArtifactIn(frame, definitionOf(backpack[index]), renderPicture)
  })
}

export function renderDescriptionPopup(document, { title, description }) {
  const popup = document.createElement('div')
  popup.className = 'info-popup info-popup--skill message-box'
  popup.setAttribute('role', 'tooltip')
  const heading = document.createElement('h2')
  heading.className = 'info-popup__title'
  heading.textContent = title
  const text = document.createElement('p')
  text.className = 'info-popup__line'
  text.textContent = description
  popup.append(heading, text)
  return popup
}

export function createHeldArtifactPicture({ document, className }) {
  let picture = null
  let pointer = { x: 0, y: 0 }

  function place() {
    if (picture) {
      const box = picture.parentElement.getBoundingClientRect()
      picture.style.left = `${pointer.x - box.left}px`
      picture.style.top = `${pointer.y - box.top}px`
    }
  }

  return {
    show(container, artifact) {
      picture?.remove()
      picture = artifact
        ? renderArtifactPicture(document, artifact, className, `Held: ${artifact.name}`)
        : null
      if (picture) {
        container.append(picture)
        place()
      }
    },
    follow(event) {
      pointer = { x: event.clientX, y: event.clientY }
      place()
    },
    forget() {
      picture = null
    }
  }
}

// A red book with a dark spine, as the hero screen's spell book frame draws it.
const SPELL_BOOK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 42"><rect x="4" y="4" width="28" height="34" fill="#6b1d1d" stroke="#8a6a2a"/><rect x="16" y="4" width="4" height="34" fill="#3a0d0d"/><rect x="8" y="10" width="5" height="3" fill="#c9a24a"/><rect x="23" y="10" width="5" height="3" fill="#c9a24a"/></svg>`

export const SPELL_BOOK_PICTURE = `data:image/svg+xml,${encodeURIComponent(SPELL_BOOK_SVG)}`
