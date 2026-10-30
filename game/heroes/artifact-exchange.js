import {
  ARTIFACT_SLOTS,
  canWear,
  hasFullBackpack,
  layoutOf,
  putBackHeldArtifact,
  putHeldArtifact,
  putOnArtifact,
  scrollBackpack,
  swapIntoSlot,
  takeArtifact
} from './artifacts.js'

const SIDES = ['left', 'right']
const OTHER_SIDE = { left: 'right', right: 'left' }

const holderOf = (artifacts) => SIDES.find((side) => artifacts[side].held) ?? null

export function takeArtifactFrom(artifacts, side, place) {
  if (holderOf(artifacts)) {
    return null
  }
  const taken = takeArtifact(artifacts[side], place)
  return taken && { ...artifacts, [side]: taken }
}

// An artifact swapped out of the other hero's slot is held by the hero who picked up the first.
function putOnOtherHero(holder, receiver, place, definitions) {
  if (place.slot) {
    const swapped = swapIntoSlot(receiver, holder.held, place.slot, definitions)
    return (
      swapped && { holder: { ...holder, held: swapped.swappedOut }, receiver: swapped.artifacts }
    )
  }
  if (hasFullBackpack(receiver)) {
    return null
  }
  const backpack = [...receiver.backpack]
  backpack.splice(place.backpack, 0, holder.held)
  return { holder: { ...holder, held: null }, receiver: { ...receiver, backpack } }
}

export function putHeldArtifactOn(artifacts, side, place, definitions) {
  const holderSide = holderOf(artifacts)
  if (!holderSide) {
    return null
  }
  if (holderSide === side) {
    const put = putHeldArtifact(artifacts[side], place, definitions)
    return put && { ...artifacts, [side]: put }
  }
  const put = putOnOtherHero(artifacts[holderSide], artifacts[side], place, definitions)
  return put && { ...artifacts, [holderSide]: put.holder, [side]: put.receiver }
}

export function putBackHeldArtifacts(artifacts, definitions) {
  const holderSide = holderOf(artifacts)
  return (
    holderSide && {
      ...artifacts,
      [holderSide]: putBackHeldArtifact(artifacts[holderSide], definitions)
    }
  )
}

export function scrollBackpackOf(artifacts, side, direction) {
  const scrolled = scrollBackpack(artifacts[side], direction)
  return scrolled && { ...artifacts, [side]: scrolled }
}

const hasRoomFor = (artifacts, artifactId, definitions) =>
  !hasFullBackpack(artifacts) || canWear(artifacts, artifactId, definitions)

function keepWorn(kept, slotId, artifactId, layout) {
  const worn = { ...kept.worn, [slotId]: artifactId }
  return layout
    ? { ...kept, worn, combined: { ...kept.combined, [slotId]: layout } }
    : { ...kept, worn }
}

// Worn artifacts go first, in slot order, then the backpack; those with no room stay.
export function sendAllArtifacts(artifacts, fromSide, definitions) {
  const toSide = OTHER_SIDE[fromSide]
  let giver = { ...artifacts[fromSide], worn: {}, combined: {}, backpack: [] }
  let receiver = artifacts[toSide]
  const send = (artifactId, keep) => {
    if (hasRoomFor(receiver, artifactId, definitions)) {
      receiver = putOnArtifact(receiver, artifactId, definitions)
    } else {
      giver = keep(giver, artifactId)
    }
  }

  for (const { id } of ARTIFACT_SLOTS) {
    const artifactId = artifacts[fromSide].worn[id]
    if (artifactId) {
      send(artifactId, (kept) => keepWorn(kept, id, artifactId, layoutOf(artifacts[fromSide], id)))
    }
  }
  for (const artifactId of artifacts[fromSide].backpack) {
    send(artifactId, (kept) => ({ ...kept, backpack: [...kept.backpack, artifactId] }))
  }
  if (receiver === artifacts[toSide]) {
    return null
  }
  return { ...artifacts, [fromSide]: giver, [toSide]: receiver }
}

export function swapAllArtifacts(artifacts) {
  const { left, right } = artifacts
  return {
    left: { ...left, worn: right.worn, combined: right.combined, backpack: right.backpack },
    right: { ...right, worn: left.worn, combined: left.combined, backpack: left.backpack }
  }
}
