import { sameTile } from '../../../engine/tile-utils.js'
import { isHero, isTown } from '../../domain/entity-queries.js'
import { updateHero } from '../../state/core-slices.js'
import { putOnArtifact, startingArtifacts } from '../artifacts.js'
import { calendarDateOfTurn } from '../calendar.js'
import { levelForExperience } from '../hero-experience.js'
import {
  heroOfTheGame,
  lastOfferedLevelsAfter,
  learnSecondarySkill,
  startingSecondarySkills
} from '../secondary-skills.js'
import { maxSpellPoints, spellPointsOnNewDay } from '../spell-points.js'

const DEFAULT_HERO_NAME = 'Hero'

function detailsOf(hero, definitions) {
  const details = startingDetailsOf(hero, definitions)
  return { ...details, spellPoints: maxSpellPoints({ entity: details, definitions }) }
}

// A scenario may give a hero a spell book; otherwise the game's hero of that name brings theirs.
function startingSpellBook(hero, name, definitions) {
  const source = hero.spellBook === undefined ? heroOfTheGame(definitions?.heroes, name) : hero
  const spellBook = Boolean(source?.spellBook)
  return { spellBook, spells: spellBook ? (source.spells ?? []) : [] }
}

function startingDetailsOf(hero, definitions) {
  const name = hero.name ?? definitions?.hero?.name ?? DEFAULT_HERO_NAME
  return {
    name,
    heroClass: hero.heroClass ?? definitions?.hero?.heroClass ?? null,
    primarySkills: hero.primarySkills ?? null,
    secondarySkills: startingSecondarySkills(
      { name, secondarySkills: hero.secondarySkills },
      definitions
    ),
    army: hero.army ?? [],
    artifacts: startingArtifacts(hero.artifacts, definitions),
    ...startingSpellBook(hero, name, definitions),
    experience: hero.experience ?? 0,
    level: levelForExperience(hero.experience ?? 0),
    levelUpSkills: [],
    lastOfferedLevels: {},
    pendingLevelUp: null,
    bonusPrimarySkills: {},
    visitedBonusObjects: [],
    battleBonuses: [],
    weekBonus: null
  }
}

function endWeekBonuses(heroes, { turnNumber }) {
  if (calendarDateOfTurn(turnNumber).day !== 1) {
    return heroes
  }

  return Object.fromEntries(
    Object.entries(heroes).map(([heroId, hero]) => [heroId, { ...hero, weekBonus: null }])
  )
}

function hasMageGuild(town) {
  return (town?.built ?? []).some((buildingId) => buildingId.startsWith('MAGE_GUILD_'))
}

function isInTownWithMageGuild(heroId, { scenario, previousState }) {
  const tile = previousState.heroes[heroId]?.tile
  return (scenario?.entities ?? []).some(
    (entity) =>
      isTown(entity) &&
      sameTile(entity.tile, tile) &&
      hasMageGuild(previousState.towns?.byId?.[entity.id])
  )
}

function regainSpellPoints(heroes, context) {
  return Object.fromEntries(
    Object.entries(heroes).map(([heroId, hero]) => [
      heroId,
      {
        ...hero,
        spellPoints: spellPointsOnNewDay({
          entity: { ...context.previousState.heroes[heroId], ...hero },
          definitions: context.definitions,
          isInTownWithMageGuild: isInTownWithMageGuild(heroId, context)
        })
      }
    ])
  )
}

function startNewDay(heroes, detail, context) {
  return regainSpellPoints(endWeekBonuses(heroes, detail), context)
}

function addSkills(skills, added) {
  return Object.fromEntries(
    [...new Set([...Object.keys(skills), ...Object.keys(added)])].map((key) => [
      key,
      (skills[key] ?? 0) + (added[key] ?? 0)
    ])
  )
}

export const heroDetailsSlice = {
  key: 'heroDetails',
  initial: ({ scenario, definitions }) =>
    Object.fromEntries(
      (scenario?.entities ?? [])
        .filter(isHero)
        .map((hero) => [hero.id, detailsOf(hero, definitions)])
    ),
  on: {
    'fact.hero.experience.gained': updateHero((hero, { amount }) => ({
      experience: hero.experience + amount
    })),
    'fact.hero.leveledUp': updateHero((hero, { level, primarySkill, skillOffers = [] }) => ({
      level,
      levelUpSkills: [...hero.levelUpSkills, primarySkill],
      lastOfferedLevels: lastOfferedLevelsAfter(hero.lastOfferedLevels, { level, skillOffers }),
      pendingLevelUp: skillOffers.length > 0 ? { level, primarySkill, skillOffers } : null
    })),
    'fact.hero.secondarySkill.learned': updateHero((hero, { skill, level }) => ({
      secondarySkills: learnSecondarySkill(hero.secondarySkills, { skill, level }),
      pendingLevelUp: null
    })),
    'fact.hero.bonusObject.visited': updateHero((hero, { entityId }) => ({
      visitedBonusObjects: [...hero.visitedBonusObjects, entityId]
    })),
    'fact.hero.primarySkills.gained': updateHero((hero, { primarySkills }) => ({
      bonusPrimarySkills: addSkills(hero.bonusPrimarySkills, primarySkills)
    })),
    'fact.hero.battleBonus.gained': updateHero((hero, { entityType, morale = 0, luck = 0 }) => ({
      battleBonuses: [...hero.battleBonuses, { entityType, morale, luck }]
    })),
    'fact.hero.weekBonus.gained': updateHero((_hero, { entityType, movementPoints }) => ({
      weekBonus: { entityType, movementPoints }
    })),
    'fact.turn.ended': startNewDay,
    'fact.battle.ended': (heroes, detail) =>
      detail.heroId ? updateHero(() => ({ battleBonuses: [] }))(heroes, detail) : heroes,
    'fact.battle.spell.cast': updateHero((hero, { cost }) => ({
      spellPoints: hero.spellPoints - cost
    })),
    'fact.hero.spellBook.bought': updateHero(() => ({ spellBook: true })),
    'fact.hero.spells.learned': updateHero((hero, { spells }) => ({
      spells: [...new Set([...hero.spells, ...spells])]
    })),
    'fact.hero.army.changed': updateHero((_hero, { army }) => ({ army })),
    'fact.hero.artifacts.changed': updateHero((_hero, { artifacts }) => ({ artifacts })),
    'fact.artifact.pickedUp': (heroes, detail, { definitions }) =>
      updateHero((hero, { artifact }) => ({
        artifacts: putOnArtifact(hero.artifacts, artifact, definitions)
      }))(heroes, detail),
    'fact.treasureChest.opened': (heroes, detail, { definitions }) =>
      detail.artifact
        ? updateHero((hero, { artifact }) => ({
            artifacts: putOnArtifact(hero.artifacts, artifact, definitions)
          }))(heroes, detail)
        : heroes,
    'fact.hero.hired': (heroes, { heroId, name, heroClass, army }, { definitions }) => ({
      ...heroes,
      [heroId]: detailsOf({ name, heroClass, army }, definitions)
    })
  }
}

export function heroById(state, heroId) {
  const details = state.heroDetails[heroId]
  return details ? { id: heroId, ...state.heroes[heroId], ...details } : null
}
