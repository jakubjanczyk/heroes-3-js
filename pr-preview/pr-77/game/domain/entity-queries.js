export function isEntityKind(entity, kind) {
  return Boolean(entity && entity.kind === kind)
}

export function isHero(entity) {
  return isEntityKind(entity, 'HERO')
}

export function isTown(entity) {
  return isEntityKind(entity, 'TOWN')
}

export function isMine(entity) {
  return isEntityKind(entity, 'MINE')
}

export function isDwelling(entity) {
  return isEntityKind(entity, 'DWELLING')
}

export function isResourceGenerator(entity) {
  return isEntityKind(entity, 'RESOURCE_GENERATOR')
}

export function findHero(entities) {
  if (!Array.isArray(entities)) {
    return null
  }

  return entities.find(isHero) ?? null
}
