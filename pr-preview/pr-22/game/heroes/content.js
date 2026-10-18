import { mineBehavior } from './entity-behaviors/mine.js'
import { monsterBehavior } from './entity-behaviors/monster.js'
import { resourceBehavior } from './entity-behaviors/resource.js'
import { townBehavior } from './entity-behaviors/town.js'
import { heroesMovementRules } from './movement-rules.js'
import { heroesRoadTypes } from './road-types.js'
import { heroesTerrainTypes } from './terrain-types.js'

export const heroesContent = Object.freeze({
  entityBehaviors: Object.freeze([mineBehavior, monsterBehavior, resourceBehavior, townBehavior]),
  movementRules: heroesMovementRules,
  roadTypes: heroesRoadTypes,
  terrainTypes: heroesTerrainTypes
})
