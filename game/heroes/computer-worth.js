import { heroMovementPoints, heroOwner } from '../state/queries.js'
import { computerChoiceAt } from './computer-choices.js'
import { dwellingRecruitCount } from './computer-recruiting.js'
import { recruitableCreaturesByTier, weeklyGrowthByTier } from './creature-recruitment.js'
import { experienceToNextLevel } from './hero-experience.js'
import {
  MOVEMENT_INTERACTION_KIND_ARTIFACT_PICK_UP,
  MOVEMENT_INTERACTION_KIND_BONUS_OBJECT_VISIT,
  MOVEMENT_INTERACTION_KIND_DWELLING_VISIT,
  MOVEMENT_INTERACTION_KIND_HERO_MEET,
  MOVEMENT_INTERACTION_KIND_MINE_ENTER,
  MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT,
  MOVEMENT_INTERACTION_KIND_RESOURCE_GENERATOR_VISIT,
  MOVEMENT_INTERACTION_KIND_TOWN_VISIT,
  MOVEMENT_INTERACTION_KIND_TREASURE_CHEST_OPEN
} from './interaction-kinds.js'
import { dwellingCreature } from './map-dwellings.js'
import { PRIMARY_SKILLS } from './primary-skills.js'
import { heroById } from './state/hero-details.js'
import { dwellingOwner, monsterCount, treasureChestContents } from './state/map-objects.js'
import { builtIn, dailyIncomeOf, townType } from './state/towns.js'
import { townBuildingsCatalogue } from './town-buildings.js'
import { openChest } from './treasure-chest.js'
import { bonusOnTheDay } from './visitable-objects/rewards.js'
import { visitOffer } from './visitable-objects/visits.js'

// An income is worth this many days of it.
const INCOME_DAYS = 5
const HERO_ELIMINATION_WORTH = 1250
const ENEMY_ARMY_COST_SHARE = 0.2
const DEFEATED_HERO_EXPERIENCE = 500
const PRIMARY_SKILL_POINT_WORTH = 1000
const SECONDARY_SKILL_WORTH = 1000
const MORALE_OR_LUCK_POINT_WORTH = 250
const DAY_OF_MOVEMENT_WORTH = 1000
// What an unopened chest is worth: the middle tier's experience.
const UNKNOWN_CHEST_WORTH = 1000

const average = (values) =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length

const amountOf = (value) => Number(value) || 0

function resourcesWorth(resources, definitions) {
  return Object.entries(resources ?? {}).reduce(
    (sum, [resourceType, amount]) =>
      sum + amountOf(amount) * (definitions?.resources?.[resourceType]?.price ?? 0),
    0
  )
}

function priceOf(resourceType, definitions) {
  return definitions?.resources?.[resourceType]?.price ?? 0
}

function rolledResourcesWorth({ resources, firstWeek, oneOf, anyOf, amount }, definitions) {
  if (oneOf) {
    return average(oneOf.map((option) => resourcesWorth(option, definitions)))
  }
  if (anyOf) {
    const meanAmount = (amountOf(amount?.min) + amountOf(amount?.max)) / 2
    return meanAmount * average(anyOf.map((resourceType) => priceOf(resourceType, definitions)))
  }
  return resourcesWorth(resources ?? firstWeek, definitions)
}

function movementWorth({ amount }, { maxMovementPoints }) {
  return (amountOf(amount) / maxMovementPoints) * DAY_OF_MOVEMENT_WORTH
}

const REWARD_WORTH = Object.freeze({
  experience: ({ amount }) => amountOf(amount),
  level: (_reward, { hero }) => experienceToNextLevel(hero.experience ?? 0),
  primarySkills: (reward) =>
    PRIMARY_SKILLS.reduce((sum, { key }) => sum + amountOf(reward[key]), 0) *
    PRIMARY_SKILL_POINT_WORTH,
  secondarySkill: () => SECONDARY_SKILL_WORTH,
  battleBonus: (reward, { state }) => {
    const { morale, luck } = bonusOnTheDay(reward, state)
    return (amountOf(morale) + amountOf(luck)) * MORALE_OR_LUCK_POINT_WORTH
  },
  movementPoints: movementWorth,
  weekMovementPoints: movementWorth,
  resources: (reward, { definitions }) => rolledResourcesWorth(reward, definitions)
})

function rewardsWorth(rewards, context) {
  return rewards.reduce(
    (sum, reward) => sum + (REWARD_WORTH[reward.type]?.(reward, context) ?? 0),
    0
  )
}

function visitWorth(target, context) {
  const { state, heroId, hero, definitions } = context
  const entity = { id: target.id, kind: target.entityKind, type: target.type }
  const offer = visitOffer({ state, definitions, entity, heroId })
  if (!offer) {
    return 0
  }
  const choice = offer.choices && computerChoiceAt({ hero, choices: offer.choices, definitions })
  const rewards = offer.choices ? (offer.choiceRewards[Number(choice)] ?? []) : offer.rewards
  return rewardsWorth(rewards, context) - resourcesWorth(offer.cost, definitions)
}

function armyExperience(army, definitions) {
  return army
    .filter(Boolean)
    .reduce(
      (sum, { creature, count }) => sum + (definitions?.monsters?.[creature]?.health ?? 0) * count,
      0
    )
}

function armyCost(army, definitions) {
  return army
    .filter(Boolean)
    .reduce(
      (sum, { creature, count }) =>
        sum + resourcesWorth(definitions?.monsters?.[creature]?.cost, definitions) * count,
      0
    )
}

const aiValueOf = (creature, definitions) => definitions?.monsters?.[creature]?.aiValue ?? 0

function dwellingWorth(target, { state, heroId, player, definitions }) {
  const creature = dwellingCreature(target.type, definitions)
  if (!creature) {
    return 0
  }
  const recruits = dwellingRecruitCount({ state, dwellingId: target.id, heroId, definitions })
  const growth = dwellingOwner(state, target.id) === player ? 0 : (creature.growth ?? 0)
  return (recruits + growth) * (creature.aiValue ?? 0)
}

// A week of each dwelling's creatures, the strongest a tier recruits.
function townGrowthWorth(state, townId, definitions) {
  const { buildings } = townBuildingsCatalogue(definitions, townType(state, townId))
  const built = builtIn(state, townId)
  const monsters = definitions?.monsters
  const growth = weeklyGrowthByTier({ buildings, built, monsters, flaggedDwellings: {} })
  return recruitableCreaturesByTier({ buildings, built, monsters }).reduce(
    (sum, creatures, tier) =>
      sum +
      (growth[tier] ?? 0) *
        Math.max(0, ...creatures.map((creature) => aiValueOf(creature, definitions))),
    0
  )
}

function townWorth(target, { state, definitions }) {
  const income = dailyIncomeOf(state.towns.byId[target.id], definitions)
  return (
    INCOME_DAYS * resourcesWorth(income, definitions) +
    townGrowthWorth(state, target.id, definitions)
  )
}

function chestWorth(target, { state, hero, definitions }) {
  const opened = openChest(treasureChestContents(state, target.id), hero.artifacts)
  if (opened.artifact) {
    return definitions?.artifacts?.[opened.artifact]?.cost ?? 0
  }
  return opened.rewards?.experience ?? UNKNOWN_CHEST_WORTH
}

function enemyHeroWorth(target, { state, definitions }) {
  const { army } = heroById(state, target.id)
  return (
    HERO_ELIMINATION_WORTH +
    ENEMY_ARMY_COST_SHARE * armyCost(army, definitions) +
    armyExperience(army, definitions) +
    DEFEATED_HERO_EXPERIENCE
  )
}

const WORTH_OF_KIND = Object.freeze({
  [MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT]: (target, { definitions }) =>
    amountOf(definitions?.resources?.[target.type]?.amount) * priceOf(target.type, definitions),
  [MOVEMENT_INTERACTION_KIND_MINE_ENTER]: (target, { definitions }) => {
    const income = definitions?.mines?.[target.type]?.income
    return income
      ? INCOME_DAYS * amountOf(income.amount) * priceOf(income.resource, definitions)
      : 0
  },
  [MOVEMENT_INTERACTION_KIND_DWELLING_VISIT]: dwellingWorth,
  [MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT]: (target, { state, definitions }) =>
    armyExperience(
      [{ creature: target.type, count: monsterCount(state, target.id) ?? target.count }],
      definitions
    ),
  [MOVEMENT_INTERACTION_KIND_HERO_MEET]: enemyHeroWorth,
  [MOVEMENT_INTERACTION_KIND_TOWN_VISIT]: townWorth,
  [MOVEMENT_INTERACTION_KIND_ARTIFACT_PICK_UP]: (target, { definitions }) =>
    definitions?.artifacts?.[target.type]?.cost ?? 0,
  [MOVEMENT_INTERACTION_KIND_TREASURE_CHEST_OPEN]: chestWorth,
  [MOVEMENT_INTERACTION_KIND_RESOURCE_GENERATOR_VISIT]: visitWorth,
  [MOVEMENT_INTERACTION_KIND_BONUS_OBJECT_VISIT]: visitWorth
})

// What each of the hero's targets is worth to it, in gold; a creature's AI value counts as its
// worth in gold, and a point of experience as one gold.
export function createTargetWorth({ state, heroId, definitions }) {
  const maxMovementPoints = heroMovementPoints(state, heroId)?.max || 1
  const context = {
    state,
    heroId,
    player: heroOwner(state, heroId),
    hero: heroById(state, heroId),
    definitions,
    maxMovementPoints
  }
  return {
    maxMovementPoints,
    worthOf: (target) => WORTH_OF_KIND[target.kind]?.(target, context) ?? 0
  }
}
