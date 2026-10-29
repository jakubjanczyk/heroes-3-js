import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

import { definitionProblems } from './check-definition.js'

const readData = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'))

const objects = [
  ...Object.entries(readData('../../data/bonus-objects.json')),
  ...Object.entries(readData('../../data/resource-generators.json'))
]

describe('bonus object and resource generator data', () => {
  test.each(objects)('%s can be visited as its data says', (_type, definition) => {
    expect(definitionProblems(definition)).toEqual([])
  })

  test('a mistyped object is reported', () => {
    const definition = {
      name: 'Shrine',
      visits: 'twicePerHero',
      cost: { GOLD_PILE: 100 },
      rewards: [{ type: 'spell', spell: '{spell}' }],
      requires: [{ type: 'knowsWisdom', message: 'unwise' }],
      messages: { gives: 'You learn a spell.', visited: 'Nothing happens.' }
    }

    expect(definitionProblems(definition)).toEqual([
      '"visits" is "twicePerHero", not one of always, oncePerHero, whileBonusLasts, oncePerWeek',
      'reward type "spell" is unknown',
      'requirement type "knowsWisdom" is unknown',
      'message "tooPoor" is missing',
      'message "unwise" is missing',
      '"{spell}" is not one of its rolls'
    ])
  })
})
