import * as dwelling from './dwelling.js'
import * as hero from './hero.js'
import * as mine from './mine.js'
import * as monster from './monster.js'
import * as resource from './resource.js'
import * as town from './town.js'
import * as treasureChest from './treasure-chest.js'

const presentationByKind = Object.freeze({
  DWELLING: dwelling,
  HERO: hero,
  MINE: mine,
  MONSTER: monster,
  RESOURCE: resource,
  TOWN: town,
  TREASURE_CHEST: treasureChest
})

export function getEntityPresentation(entity) {
  const kind = entity?.kind
  if (typeof kind !== 'string' || kind.length < 1) {
    return null
  }

  return presentationByKind[kind] ?? null
}

export function getEntityLayerStyle({ entity, map, definitions }) {
  const presentation = getEntityPresentation(entity)
  if (!presentation?.getEntityLayerStyle) {
    return null
  }

  return presentation.getEntityLayerStyle({ entity, map, definitions })
}

export function getEntityFadeOutSpec({ entityKind }) {
  if (typeof entityKind !== 'string' || entityKind.length < 1) {
    return null
  }

  const presentation = presentationByKind[entityKind] ?? null
  return presentation?.fadeOut ?? null
}
