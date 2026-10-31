import { describeMonsterGroup } from './monster-count.js'
import { TREASURE_CHEST_NAME } from './treasure-chest.js'

const DEFINITIONS_KEY_BY_KIND = Object.freeze({
  ARTIFACT: 'artifacts',
  MONSTER: 'monsters',
  OBSTACLE: 'obstacles',
  RESOURCE: 'resources',
  MINE: 'mines',
  DWELLING: 'dwellings',
  RESOURCE_GENERATOR: 'resourceGenerators',
  BONUS_OBJECT: 'bonusObjects',
  TOWN: 'towns'
})

export function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// The name of a map object; monsters go by their plural name ("Skeletons"), and a town the
// scenario names by its own name ("Whitemoon").
export function getEntityName({ entity, definitions }) {
  if (entity.kind === 'HERO') {
    return entity.name ?? definitions.hero.name
  }
  if (entity.kind === 'TOWN' && entity.name) {
    return entity.name
  }
  if (entity.kind === 'TREASURE_CHEST') {
    return TREASURE_CHEST_NAME
  }

  const definition = definitions[DEFINITIONS_KEY_BY_KIND[entity.kind]][entity.type]
  return definition.namePlural ?? definition.name
}

// What the Heroes 3 status bar says about a map tile: the name of what stands on it,
// or the terrain name when nothing does. Monsters also get the size of the group ("Pack of Skeletons"),
// and an object each hero uses once whether the selected hero has ("Star Axis (Visited)").
export function getStatusBarText({ entity, terrainName, definitions, visitedText = null }) {
  if (!entity) {
    return capitalize(terrainName)
  }

  const name = getEntityName({ entity, definitions })
  if (entity.kind === 'MONSTER') {
    return describeMonsterGroup(entity.count, name)
  }
  return visitedText ? `${name} ${visitedText}` : name
}
