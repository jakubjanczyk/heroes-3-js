import { fitsSlot } from '../../../game/heroes/artifacts.js'

const EMPTY_ARTIFACT_FRAME_TEXT = 'Empty'

export function renderArtifactPicture(document, artifact, className, label = artifact.name) {
  const picture = document.createElement('span')
  picture.className = className
  picture.setAttribute('role', 'img')
  picture.setAttribute('aria-label', label)
  picture.textContent = artifact.name
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
  const definitionOf = (artifactId) =>
    definitions?.artifacts?.[artifactId] && { ...definitions.artifacts[artifactId], id: artifactId }
  for (const frame of slotFrames) {
    const slot = frame.dataset.artifactSlot
    showArtifactIn(frame, definitionOf(worn[slot]), renderPicture)
    frame.dataset.highlighted = String(
      Boolean(held && !worn[slot] && fitsSlot(held, slot, definitions))
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
