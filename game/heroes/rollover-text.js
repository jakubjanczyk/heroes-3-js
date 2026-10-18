const DEFINITIONS_KEY_BY_KIND = Object.freeze({
  MONSTER: 'monsters',
  RESOURCE: 'resources',
  MINE: 'mines',
  TOWN: 'towns'
})

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// What the Heroes 3 rollover bar says about a map tile: the name of what stands on it,
// or the terrain name when nothing does. Monsters go by their plural name ("Skeletons").
export function getRolloverText({ entity, terrainName, definitions }) {
  if (!entity) {
    return capitalize(terrainName)
  }
  if (entity.kind === 'HERO') {
    return definitions.hero.name
  }

  const definition = definitions[DEFINITIONS_KEY_BY_KIND[entity.kind]][entity.type]
  return definition.namePlural ?? definition.name
}
