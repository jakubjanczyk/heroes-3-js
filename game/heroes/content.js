import { heroBehavior } from './entity-behaviors/hero.js'
import { mineBehavior } from './entity-behaviors/mine.js'
import { monsterBehavior } from './entity-behaviors/monster.js'
import { resourceBehavior } from './entity-behaviors/resource.js'
import { townBehavior } from './entity-behaviors/town.js'
import { treasureChestBehavior } from './entity-behaviors/treasure-chest.js'
import { heroesMovementRules } from './movement-rules.js'
import { PRIMARY_SKILLS } from './primary-skills.js'
import { heroesRoadTypes } from './road-types.js'
import { fogSlice } from './state/fog.js'
import { heroDetailsSlice } from './state/hero-details.js'
import { kingdomsSlice } from './state/kingdoms.js'
import { minesSlice, monsterCountsSlice } from './state/map-objects.js'
import { townsSlice } from './state/towns.js'
import { heroesTerrainTypes } from './terrain-types.js'

export const heroesContent = Object.freeze({
  entityBehaviors: Object.freeze([
    heroBehavior,
    mineBehavior,
    monsterBehavior,
    resourceBehavior,
    townBehavior,
    treasureChestBehavior
  ]),
  movementRules: heroesMovementRules,
  primarySkills: PRIMARY_SKILLS,
  roadTypes: heroesRoadTypes,
  stateSlices: Object.freeze([
    heroDetailsSlice,
    townsSlice,
    minesSlice,
    monsterCountsSlice,
    kingdomsSlice,
    fogSlice
  ]),
  terrainTypes: heroesTerrainTypes
})
