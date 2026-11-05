import { castRuleOf, spellTargeting } from './battle-spells.js'
import { getHeroPrimarySkills } from './primary-skills.js'
import { secondarySkillLevel } from './secondary-skills.js'
import { getHeroSpellPoints } from './spell-points.js'

export const SPELL_SCHOOLS = Object.freeze(['AIR', 'EARTH', 'FIRE', 'WATER'])
export const ALL_SCHOOLS = 'ALL'

// The order spells of one level are sorted in, which is not the order of the bookmarks.
const SCHOOL_SORT_ORDER = Object.freeze(['AIR', 'FIRE', 'EARTH', 'WATER'])
const SCHOOL_SKILLS = Object.freeze({
  AIR: 'AIR_MAGIC',
  EARTH: 'EARTH_MAGIC',
  FIRE: 'FIRE_MAGIC',
  WATER: 'WATER_MAGIC'
})
const SKILL_LEVELS = Object.freeze({ BASIC: 1, ADVANCED: 2, EXPERT: 3 })
const SORCERY_BONUS_PERCENT = Object.freeze({ BASIC: 5, ADVANCED: 10, EXPERT: 15 })
const SKILL_LEVEL_SHORT_NAMES = Object.freeze(['', 'Bas', 'Adv', 'Exp'])
const SPELL_LEVEL_NAMES = Object.freeze(['', '1st lev', '2nd lev', '3rd lev', '4th lev', '5th lev'])

const SPELLS_PER_SPREAD = 12
// A school's first spread shows the school's picture in the first two places.
const SCHOOL_HEADING_PLACES = 2

export function hasSpellBook(hero) {
  return Boolean(hero?.spellBook)
}

export function skillLevelOf(hero, skillId) {
  return SKILL_LEVELS[secondarySkillLevel(hero, skillId)] ?? 0
}

const ALWAYS_LEARNABLE_LEVEL = 2

export function maxLearnableSpellLevel(hero) {
  return ALWAYS_LEARNABLE_LEVEL + skillLevelOf(hero, 'WISDOM')
}

function schoolSkillLevel(hero, school) {
  return skillLevelOf(hero, SCHOOL_SKILLS[school])
}

// A spell of several schools is cast with the best of the hero's skills in them.
export function spellSkillLevel(hero, spell) {
  return Math.max(0, ...(spell.schools ?? []).map((school) => schoolSkillLevel(hero, school)))
}

export const castsOnAllStacks = (hero, spell) =>
  Boolean(spell?.targets) ||
  (Boolean(castRuleOf(spell)?.allAtExpert) && spellSkillLevel(hero, spell) === SKILL_LEVELS.EXPERT)

export function spellCost(hero, spell) {
  return spell.costs?.[spellSkillLevel(hero, spell)] ?? spell.costs?.[0] ?? 0
}

const powerOf = (hero, definitions) =>
  getHeroPrimarySkills({ entity: hero, definitions }).find(({ key }) => key === 'power').value

const sorceryPercentOf = (hero) => SORCERY_BONUS_PERCENT[secondarySkillLevel(hero, 'SORCERY')] ?? 0

// No skill in the school casts as Basic: the data repeats Basic's base for it.
export function spellDamage({ hero, spell, definitions }) {
  if (!spell.damage) {
    return 0
  }
  const power = powerOf(hero, definitions)
  const { base, perPower } = spell.damage
  return Math.floor(
    ((base[spellSkillLevel(hero, spell)] + perPower * power) * (100 + sorceryPercentOf(hero))) / 100
  )
}

export function spellHealing({ hero, spell, definitions }) {
  const { base, perPower } = spell.heals
  return base[spellSkillLevel(hero, spell)] + perPower * powerOf(hero, definitions)
}

// Each effect's value at the hero's skill level, for as many rounds as the hero's Power, or no
// rounds for a spell that lasts until the battle ends. One that ends on the stack's turn in the
// next round is cast for two.
function lastingRounds({ untilBattleEnds, untilOwnTurn, untilOwnAttack }, power) {
  if (untilBattleEnds || untilOwnAttack) {
    return null
  }
  return untilOwnTurn ? 2 : power
}

export const cloneRounds = (hero, definitions) => powerOf(hero, definitions)

export function spellLasting({ hero, spell, definitions }) {
  const level = spellSkillLevel(hero, spell)
  const effects = Object.fromEntries(
    Object.entries(spell.lasting.effects).map(([key, values]) => [key, values[level]])
  )
  if (spell.lasting.raisedBySorcery) {
    effects.sorceryPercent = sorceryPercentOf(hero)
  }
  return { effects, rounds: lastingRounds(spell.lasting, powerOf(hero, definitions)) }
}

function healthLimit({ hero, spell, definitions }) {
  const limit = spell.lasting?.healthLimit
  return limit
    ? limit.base[spellSkillLevel(hero, spell)] + limit.perPower * powerOf(hero, definitions)
    : null
}

export const battleSpellTargeting = ({ hero, spell, definitions }) =>
  spellTargeting(spell, spellSkillLevel(hero, spell), {
    healthBelow: healthLimit({ hero, spell, definitions })
  })

function popupText(description, damage) {
  return damage > 0 ? `${description} Does ${damage} points of damage.` : description
}

function schoolSortIndex(spell) {
  return Math.min(...(spell.schools ?? []).map((school) => SCHOOL_SORT_ORDER.indexOf(school)))
}

function compareSpells(a, b) {
  return (
    a.level - b.level || schoolSortIndex(a) - schoolSortIndex(b) || a.name.localeCompare(b.name)
  )
}

function describeSpell(id, spell, { hero, spellPoints, definitions }) {
  const skillLevel = spellSkillLevel(hero, spell)
  const levelName = SPELL_LEVEL_NAMES[spell.level] ?? ''
  const cost = spellCost(hero, spell)
  const description = spell.descriptions?.[skillLevel] ?? { title: spell.name, text: '' }
  return {
    id,
    name: spell.name,
    levelText: skillLevel > 0 ? `${levelName}/${SKILL_LEVEL_SHORT_NAMES[skillLevel]}` : levelName,
    cost,
    canAfford: cost <= spellPoints,
    schools: spell.schools ?? [],
    statusText: `${spell.name} (${levelName})`,
    description,
    popupText: popupText(description.text, spellDamage({ hero, spell, definitions }))
  }
}

function spellsInBook({ hero, definitions, kind, school }) {
  const { value: spellPoints } = getHeroSpellPoints({ entity: hero, definitions })
  return (hero?.spells ?? [])
    .map((id) => [id, definitions?.spells?.[id]])
    .filter(
      ([, spell]) =>
        spell &&
        !spell.special &&
        spell.kind === kind &&
        (school === ALL_SCHOOLS || spell.schools?.includes(school))
    )
    .sort(([, a], [, b]) => compareSpells(a, b))
    .map(([id, spell]) => describeSpell(id, spell, { hero, spellPoints, definitions }))
}

function spreadsOf(spells, school) {
  if (school === ALL_SCHOOLS) {
    return Math.max(1, Math.ceil(spells.length / SPELLS_PER_SPREAD))
  }
  const onFirstSpread = SPELLS_PER_SPREAD - SCHOOL_HEADING_PLACES
  return 1 + Math.max(0, Math.ceil((spells.length - onFirstSpread) / SPELLS_PER_SPREAD))
}

function spellsOnSpread(spells, school, spread) {
  if (school === ALL_SCHOOLS) {
    return spells.slice(spread * SPELLS_PER_SPREAD, (spread + 1) * SPELLS_PER_SPREAD)
  }
  const start =
    spread === 0 ? 0 : SPELLS_PER_SPREAD - SCHOOL_HEADING_PLACES + (spread - 1) * SPELLS_PER_SPREAD
  const end = spread === 0 ? SPELLS_PER_SPREAD - SCHOOL_HEADING_PLACES : start + SPELLS_PER_SPREAD
  return spells.slice(start, end)
}

// One spread of the book: the spells on it, with the school's heading first on a school's first
// spread, and how many spreads the bookmark has.
export function describeSpellBookSpread({ hero, definitions, kind, school, spread }) {
  const spells = spellsInBook({ hero, definitions, kind, school })
  const spreads = spreadsOf(spells, school)
  const shown = Math.min(Math.max(0, spread), spreads - 1)
  return {
    spread: shown,
    spreads,
    schoolHeading: school !== ALL_SCHOOLS && shown === 0 ? school : null,
    spells: spellsOnSpread(spells, school, shown)
  }
}

export const SPELL_AFFECTS_NO_ONE_TEXT = 'That spell will affect no one!'

export function cannotAffordText(cost, spellPoints) {
  return `That spell costs ${cost} spell points.  Your hero only has ${spellPoints} spell points, and therefore can't cast the spell.`
}
