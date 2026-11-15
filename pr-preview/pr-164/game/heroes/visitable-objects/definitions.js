import { describeSecondarySkill } from '../secondary-skills.js'

const DEFINITIONS_KEY_BY_KIND = Object.freeze({
  BONUS_OBJECT: 'bonusObjects',
  RESOURCE_GENERATOR: 'resourceGenerators'
})

const PLACEHOLDER = /^\{(\w+)\}$/
const PLACEHOLDERS_IN_TEXT = /\{(\w+)\}/g

export function isVisitableObject(entity) {
  return Boolean(DEFINITIONS_KEY_BY_KIND[entity?.kind])
}

export function visitableDefinition(definitions, { kind, type } = {}) {
  return definitions?.[DEFINITIONS_KEY_BY_KIND[kind]]?.[type] ?? {}
}

export function visitableFootprint(definitions, entity) {
  return visitableDefinition(definitions, entity).footprint ?? []
}

// A '2000 gold' price in the words of the messages, or null when it costs nothing.
export function describePrice(definitions, cost = {}) {
  const [resourceType, amount] = Object.entries(cost ?? {})[0] ?? []
  if (!resourceType) {
    return null
  }

  const name = definitions?.resources?.[resourceType]?.name ?? resourceType
  return `${amount} ${name.toLowerCase()}`
}

// A '{price}' in the object's data stands for the value it rolled under that name.
export function fillValues(spec, values) {
  if (typeof spec === 'string') {
    const [, name] = spec.match(PLACEHOLDER) ?? []
    return name ? values[name] : spec
  }
  if (Array.isArray(spec)) {
    return spec.map((item) => fillValues(item, values))
  }
  if (spec && typeof spec === 'object') {
    return Object.fromEntries(
      Object.entries(spec).map(([key, value]) => [key, fillValues(value, values)])
    )
  }
  return spec
}

const VALUE_TEXT_BY_KIND = Object.freeze({
  resources: (value, definitions) => describePrice(definitions, value),
  secondarySkill: (skill, definitions) => describeSecondarySkill({ skill }, definitions).name,
  number: (value) => String(value)
})

function describeValue(definition, name, values, definitions) {
  const value = values[name]
  if (value === undefined || value === null) {
    return null
  }
  const describe = VALUE_TEXT_BY_KIND[definition.rolls?.[name]?.as] ?? VALUE_TEXT_BY_KIND.number
  return describe(value, definitions)
}

// The text with each '{name}' replaced by the rolled value in words, or null while one of them
// is not rolled yet.
export function fillText(text, definition, values, definitions) {
  if (!text) {
    return null
  }

  let complete = true
  const filled = text.replace(PLACEHOLDERS_IN_TEXT, (_placeholder, name) => {
    const described = describeValue(definition, name, values, definitions)
    complete &&= described !== null
    return described ?? ''
  })
  return complete ? filled : null
}

function rollWeighted(weighted, roll) {
  let threshold = 0
  for (const { chance, value } of weighted) {
    threshold += chance
    if (roll * 100 < threshold) {
      return value
    }
  }
  return weighted.at(-1)?.value
}

function choicesOf(roll, definitions) {
  if (roll.as === 'secondarySkill') {
    const except = roll.except ?? []
    return Object.keys(definitions?.secondarySkills ?? {}).filter(
      (skill) => !except.includes(skill)
    )
  }
  return roll.anyOf ?? []
}

function rollValue(roll, definitions, random) {
  if (roll.weighted) {
    return rollWeighted(roll.weighted, random())
  }
  const choices = choicesOf(roll, definitions)
  return choices[Math.floor(random() * choices.length)] ?? null
}

export function rollsPer(definition, per) {
  return Object.entries(definition.rolls ?? {}).filter(([, roll]) => roll.per === per)
}

// The values of the object that are rolled `per` game or week and not known yet.
export function rollMissingValues({ definitions, entity, values, per, random }) {
  return Object.fromEntries(
    rollsPer(visitableDefinition(definitions, entity), per)
      .filter(([name]) => values[name] === undefined || values[name] === null)
      .map(([name, roll]) => [name, rollValue(roll, definitions, random)])
  )
}

// A scenario can set the values rolled once per game, such as a Witch Hut's `skill`.
export function scenarioValues(definitions, entity) {
  return Object.fromEntries(
    rollsPer(visitableDefinition(definitions, entity), 'game')
      .filter(([name]) => entity[name] !== undefined && entity[name] !== null)
      .map(([name]) => [name, entity[name]])
  )
}
