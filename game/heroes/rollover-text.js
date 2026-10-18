const DEFINITIONS_KEY_BY_KIND = Object.freeze({
  MONSTER: 'monsters',
  RESOURCE: 'resources',
  MINE: 'mines',
  TOWN: 'towns'
})

// What the Heroes 3 rollover bar says about a map tile: the name of what stands on it,
// or the terrain name when nothing does. Monsters go by their plural name ("Skeletons").
export function getRolloverText({ entity, terrainName, definitions }) {
  if (entity?.kind === 'HERO') {
    return definitions?.hero?.name ?? 'Hero'
  }

  const definition = definitions?.[DEFINITIONS_KEY_BY_KIND[entity?.kind]]?.[entity?.type]
  if (definition) {
    return definition.namePlural ?? definition.name
  }

  return terrainName ? terrainName.charAt(0).toUpperCase() + terrainName.slice(1) : ''
}
