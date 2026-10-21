// Renders the module table in docs/v1/ARCHITECTURE.md from each module's declared contract.
// `node scripts/module-contracts.mjs` rewrites the table; tests/architecture checks it is current.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { heroesAppContent } from '../app/heroes/content.js'
import { CORE_MODULES } from '../app/modules/register-modules.js'

export const ARCHITECTURE_DOC_PATH = fileURLToPath(
  new URL('../docs/v1/ARCHITECTURE.md', import.meta.url)
)

const TABLE_START = '<!-- module-contracts:start -->'
const TABLE_END = '<!-- module-contracts:end -->'

const config = { content: heroesAppContent }

function listEvents(eventTypes) {
  const types = typeof eventTypes === 'function' ? eventTypes(config) : eventTypes
  return types.length > 0 ? types.map((type) => `\`${type}\``).join(', ') : 'none'
}

function renderRow({ meta }, source) {
  return `| \`${meta.id}\` | ${source} | ${meta.phase} | ${listEvents(meta.consumes)} | ${listEvents(meta.produces)} |`
}

export function renderModuleContractsTable() {
  return [
    TABLE_START,
    '| Module | Source | Phase | Consumes | Produces |',
    '|---|---|---|---|---|',
    ...CORE_MODULES.map((module) => renderRow(module, 'core')),
    ...heroesAppContent.modules.map((module) => renderRow(module, 'heroes')),
    TABLE_END
  ].join('\n')
}

export function readDocumentedModuleContractsTable(
  doc = readFileSync(ARCHITECTURE_DOC_PATH, 'utf8')
) {
  const start = doc.indexOf(TABLE_START)
  const end = doc.indexOf(TABLE_END)
  return start < 0 || end < 0 ? null : doc.slice(start, end + TABLE_END.length)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const doc = readFileSync(ARCHITECTURE_DOC_PATH, 'utf8')
  const current = readDocumentedModuleContractsTable(doc)
  if (!current) {
    throw new Error(`${ARCHITECTURE_DOC_PATH} has no ${TABLE_START} … ${TABLE_END} block`)
  }

  writeFileSync(ARCHITECTURE_DOC_PATH, doc.replace(current, renderModuleContractsTable()))
}
