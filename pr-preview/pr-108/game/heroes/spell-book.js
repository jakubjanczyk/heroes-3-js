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

export function spellCost(hero, spell) {
  return spell.costs?.[spellSkillLevel(hero, spell)] ?? spell.costs?.[0] ?? 0
}

// No skill in the school casts as Basic: the data repeats Basic's base for it.
export function spellDamage({ hero, spell, definitions }) {
  if (!spell.damage) {
    return 0
  }
  const power = getHeroPrimarySkills({ entity: hero, definitions }).find(
    ({ key }) => key === 'power'
  ).value
  const { base, perPower } = spell.damage
  const sorceryPercent = SORCERY_BONUS_PERCENT[secondarySkillLevel(hero, 'SORCERY')] ?? 0
  return Math.floor(
    ((base[spellSkillLevel(hero, spell)] + perPower * power) * (100 + sorceryPercent)) / 100
  )
}

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

export function cannotAffordText(cost, spellPoints) {
  return `That spell costs ${cost} spell points.  Your hero only has ${spellPoints} spell points, and therefore can't cast the spell.`
}
