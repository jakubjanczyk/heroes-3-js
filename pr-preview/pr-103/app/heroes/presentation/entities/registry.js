import * as artifact from './artifact.js'
import * as bonusObject from './bonus-object.js'
import * as dwelling from './dwelling.js'
import * as hero from './hero.js'
import * as mine from './mine.js'
import * as monster from './monster.js'
import * as obstacle from './obstacle.js'
import * as resource from './resource.js'
import * as resourceGenerator from './resource-generator.js'
import * as town from './town.js'
import * as treasureChest from './treasure-chest.js'

const presentationByKind = Object.freeze({
  ARTIFACT: artifact,
  BONUS_OBJECT: bonusObject,
  DWELLING: dwelling,
  HERO: hero,
  MINE: mine,
  MONSTER: monster,
  OBSTACLE: obstacle,
  RESOURCE: resource,
  RESOURCE_GENERATOR: resourceGenerator,
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
