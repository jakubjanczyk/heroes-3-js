import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, test } from 'vitest'

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'architecture-diff.mjs')
const repos = []

afterEach(async () => {
  await Promise.all(repos.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

function aModule(id, { phase = 'domain', consumes = [], produces = [] } = {}) {
  return { id, phase, consumes, produces }
}

function moduleSource({ id, phase, consumes, produces }) {
  const events = (value) => (typeof value === 'string' ? value : JSON.stringify(value))
  return `{ meta: { id: '${id}', phase: '${phase}', consumes: ${events(consumes)}, produces: ${events(produces)} } }`
}

function sliceSource([key, facts]) {
  return `{ key: '${key}', on: { ${facts.map((type) => `'${type}': (value) => value`).join(', ')} } }`
}

function appFiles({
  coreModules = [],
  modules = [],
  events = [],
  saved = [],
  slices = {},
  outcomeEvents = []
}) {
  return {
    'app/events.js': [
      ...events.map((type, index) => `export const EVENT_${index} = '${type}'`),
      `const SAVED = new Set(${JSON.stringify(saved)})`,
      'export function shouldPersistFactEvent(type) { return SAVED.has(type) }'
    ].join('\n'),
    'app/modules/register-modules.js': `export const CORE_MODULES = [${coreModules.map(moduleSource).join(',\n')}]`,
    'app/heroes/content.js': `export const heroesAppContent = {
      outcomeEvents: ${JSON.stringify(outcomeEvents)},
      modules: [${modules.map(moduleSource).join(',\n')}],
      stateSlices: [${Object.entries(slices).map(sliceSource).join(',\n')}]
    }`,
    'app/game-state.js': 'export function gameStateSlices(content) { return content.stateSlices }'
  }
}

async function writeFiles(dir, files) {
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, file)), { recursive: true })
    await writeFile(path.join(dir, file), `${content}\n`)
  }
}

async function aRepo() {
  const dir = await mkdtemp(path.join(tmpdir(), 'architecture-diff-test-'))
  repos.push(dir)
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
  git('init', '--quiet')
  git('config', 'user.name', 'Test')
  git('config', 'user.email', 'test@example.com')

  return {
    dir,
    write: (files) => writeFiles(dir, files),
    async commit(files) {
      await writeFiles(dir, files)
      git('add', '--all')
      git('commit', '--quiet', '--allow-empty', '--message', 'change')
      return git('rev-parse', 'HEAD')
    }
  }
}

function report(repo, base, head) {
  const args = [script, '--repo', repo.dir, '--base', base, ...(head ? ['--head', head] : [])]
  return execFileSync('node', args, { encoding: 'utf8' })
}

async function reportOf(before, after) {
  const repo = await aRepo()
  const base = await repo.commit(appFiles(before))
  const head = await repo.commit(appFiles(after))
  return report(repo, base, head)
}

function sectionOf(markdown, title) {
  const start = markdown.indexOf(`### ${title}\n`)
  const end = markdown.indexOf('\n### ', start + 1)
  return markdown
    .slice(start, end === -1 ? undefined : end)
    .split('\n')
    .slice(1)
    .map((line) => line.trimEnd())
    .filter(Boolean)
}

function labelsOf(diagram) {
  const labels = new Map()
  for (const match of diagram.matchAll(/^\s+(n_\w+)\W+"([^"]+)"/gm)) {
    labels.set(match[1], match[2].replace(/<br\/>.*/, '').replace(' 💾', ''))
  }
  return labels
}

// The diagram's arrows as "from -> to", and "from -.-> to" for wiring that is gone, by node label.
function arrowsOf(markdown) {
  const diagram = markdown.match(/```mermaid\n([\s\S]*?)\n```/)?.[1] ?? ''
  const labels = labelsOf(diagram)
  return [...diagram.matchAll(/^\s+(n_\w+) (-->|-\.->) (n_\w+)$/gm)].map(
    ([, from, arrow, to]) =>
      `${labels.get(from)} ${arrow === '-->' ? '->' : '-.->'} ${labels.get(to)}`
  )
}

function nodeLabel(markdown, name) {
  return markdown.match(new RegExp(`"(${name.replaceAll('.', '\\.')}[^"]*)"`))?.[1]
}

describe('architecture diff', () => {
  test('lists a new module with the events it consumes and produces', async () => {
    const markdown = await reportOf(
      { events: ['command.guild.open'] },
      {
        events: ['command.guild.open', 'ui.guild.updated'],
        modules: [
          aModule('guild', { consumes: ['command.guild.open'], produces: ['ui.guild.updated'] })
        ]
      }
    )

    expect(sectionOf(markdown, 'Modules')).toEqual([
      '- **new** `guild` (domain)',
      '  - consumes **+** `command.guild.open`',
      '  - produces **+** `ui.guild.updated`'
    ])
  })

  test('lists a removed module', async () => {
    const markdown = await reportOf(
      {
        events: ['fact.day.started'],
        modules: [aModule('calendar', { consumes: ['fact.day.started'] })]
      },
      { events: ['fact.day.started'] }
    )

    expect(sectionOf(markdown, 'Modules')).toEqual(['- **removed** `calendar` (domain)'])
  })

  test('lists the events a module started and stopped consuming or producing', async () => {
    const events = ['fact.a', 'fact.b', 'command.c', 'command.d']
    const markdown = await reportOf(
      { events, modules: [aModule('town', { consumes: ['fact.a'], produces: ['command.c'] })] },
      { events, modules: [aModule('town', { consumes: ['fact.b'], produces: ['command.d'] })] }
    )

    expect(sectionOf(markdown, 'Modules')).toEqual([
      '- `town`',
      '  - consumes **+** `fact.b`',
      '  - consumes **−** `fact.a`',
      '  - produces **+** `command.d`',
      '  - produces **−** `command.c`'
    ])
  })

  test('lists a module that moved from domain to view', async () => {
    const markdown = await reportOf(
      { modules: [aModule('panel', { phase: 'domain' })] },
      { modules: [aModule('panel', { phase: 'view' })] }
    )

    expect(sectionOf(markdown, 'Modules')).toEqual(['- `panel`, domain → view'])
  })

  test('lists new and removed event types by kind', async () => {
    const markdown = await reportOf(
      { events: ['command.old', 'fact.kept', 'ui.old'] },
      { events: ['command.new', 'fact.kept', 'fact.new'] }
    )

    expect(sectionOf(markdown, 'Events')).toEqual([
      '- command **+** `command.new`',
      '- command **−** `command.old`',
      '- fact **+** `fact.new`',
      '- ui **−** `ui.old`'
    ])
  })

  test('lists a new saved fact and the state slice that handles it', async () => {
    const markdown = await reportOf(
      { events: ['fact.turn.ended'], saved: [], slices: { players: [] } },
      {
        events: ['fact.turn.ended'],
        saved: ['fact.turn.ended'],
        slices: { players: ['fact.turn.ended'] }
      }
    )

    expect(sectionOf(markdown, 'Saved facts and state')).toEqual([
      '- saved **+** `fact.turn.ended`',
      '- state slice `players`',
      '  - handles **+** `fact.turn.ended`'
    ])
  })

  test('warns when a fact is no longer saved', async () => {
    const markdown = await reportOf(
      { events: ['fact.hero.moved'], saved: ['fact.hero.moved'] },
      { events: ['fact.hero.moved'], saved: [] }
    )

    expect(sectionOf(markdown, 'Saved facts and state')).toEqual([
      '- saved **−** `fact.hero.moved`',
      '- ⚠️ A fact that is no longer saved or replayed: games saved before this change still hold it.'
    ])
  })

  test('lists a new state slice with the facts it handles', async () => {
    const markdown = await reportOf(
      { events: ['fact.spell.learned'], saved: ['fact.spell.learned'] },
      {
        events: ['fact.spell.learned'],
        saved: ['fact.spell.learned'],
        slices: { spellBooks: ['fact.spell.learned'] }
      }
    )

    expect(sectionOf(markdown, 'Saved facts and state')).toEqual([
      '- state slice **added** `spellBooks`',
      '  - handles **+** `fact.spell.learned`'
    ])
  })

  test('reads the events a module takes from the content', async () => {
    const interaction = aModule('interaction', {
      produces: '(config) => config.content.outcomeEvents'
    })
    const markdown = await reportOf(
      { coreModules: [interaction], outcomeEvents: ['fact.chest.opened'] },
      { coreModules: [interaction], outcomeEvents: ['fact.chest.opened', 'fact.shrine.visited'] }
    )

    expect(sectionOf(markdown, 'Modules')).toEqual([
      '- `interaction`',
      '  - produces **+** `fact.shrine.visited`'
    ])
  })

  test('draws the new wiring and names the modules that already listened to an event', async () => {
    const markdown = await reportOf(
      {
        events: ['fact.world.ready', 'fact.town.left'],
        modules: [
          aModule('map', { consumes: ['fact.world.ready'] }),
          aModule('hud', { phase: 'view', consumes: ['fact.world.ready'] }),
          aModule('tavern-view', { phase: 'view' })
        ]
      },
      {
        events: ['fact.world.ready', 'fact.town.left', 'command.guild.open', 'ui.guild.updated'],
        modules: [
          aModule('map', { consumes: ['fact.world.ready'] }),
          aModule('hud', { phase: 'view', consumes: ['fact.world.ready'] }),
          aModule('tavern-view', { phase: 'view', produces: ['command.guild.open'] }),
          aModule('guild', {
            consumes: ['command.guild.open', 'fact.world.ready'],
            produces: ['ui.guild.updated']
          }),
          aModule('guild-view', { phase: 'view', consumes: ['ui.guild.updated'] })
        ]
      }
    )

    expect(arrowsOf(markdown).sort()).toEqual([
      'command.guild.open -> guild',
      'fact.world.ready -> guild',
      'guild -> ui.guild.updated',
      'tavern-view -> command.guild.open',
      'ui.guild.updated -> guild-view'
    ])
    expect(nodeLabel(markdown, 'fact.world.ready')).toBe(
      'fact.world.ready<br/><small>also heard by hud, map</small>'
    )
  })

  test('draws the wiring that is gone as dashed arrows', async () => {
    const markdown = await reportOf(
      {
        events: ['fact.battle.ended', 'ui.notice.opened'],
        saved: ['fact.battle.ended'],
        modules: [
          aModule('notices', { consumes: ['fact.battle.ended'], produces: ['ui.notice.opened'] })
        ]
      },
      {
        events: ['fact.battle.ended', 'ui.notice.opened'],
        saved: ['fact.battle.ended'],
        modules: [aModule('notices', { produces: ['ui.notice.opened'] })]
      }
    )

    expect(arrowsOf(markdown)).toEqual(['fact.battle.ended -.-> notices'])
    expect(nodeLabel(markdown, 'fact.battle.ended')).toBe('fact.battle.ended 💾')
  })

  test('says the wiring is the same when only the code inside modules changed', async () => {
    const files = appFiles({
      events: ['fact.a'],
      modules: [aModule('town', { consumes: ['fact.a'] })]
    })
    const repo = await aRepo()
    const base = await repo.commit(files)
    const head = await repo.commit({ ...files, 'app/heroes/town.js': 'export const town = 1' })

    const markdown = report(repo, base, head)

    expect(sectionOf(markdown, 'Event flow')).toEqual([
      'No module, event or state slice changed how it is wired.'
    ])
    expect(sectionOf(markdown, 'Modules')).toEqual(['No module was added, removed or rewired.'])
    expect(sectionOf(markdown, 'Events')).toEqual(['No event type was added or removed.'])
    expect(sectionOf(markdown, 'Saved facts and state')).toEqual([
      'The saved facts and the state slices are unchanged.'
    ])
  })

  test('counts the changed files and lines in each layer', async () => {
    const repo = await aRepo()
    const base = await repo.commit(appFiles({}))
    const head = await repo.commit({
      'tests/behavior/guild.test.js': 'a\nb\nc\nd',
      'game/heroes/guild.test.js': 'a\nb',
      'game/heroes/guild.js': 'a\nb',
      'game/data/spells.json': 'a',
      'game/state/queries.js': 'a',
      'engine/bus.js': 'a',
      'app/heroes/modules/guild.module.js': 'a\nb\nc',
      'index.html': 'a',
      'docs/notes/guild.md': 'a'
    })

    // Each line of a new file counts as one added line; tests next to the source count as tests.
    expect(sectionOf(report(repo, base, head), 'Layers touched')).toEqual([
      '| Layer | Files | Lines | |',
      '|---|---:|---:|---|',
      '| tests | 2 | +6 −0 | ████████████████████ |',
      '| engine | 1 | +1 −0 | ███ |',
      '| game data | 1 | +1 −0 | ███ |',
      '| game rules (heroes) | 1 | +2 −0 | ███████ |',
      '| game rules (core) | 1 | +1 −0 | ███ |',
      '| app modules (heroes) | 1 | +3 −0 | ██████████ |',
      '| markup & styles | 1 | +1 −0 | ███ |',
      '| docs | 1 | +1 −0 | ███ |'
    ])
  })

  test('compares against the working tree when no head is given', async () => {
    const repo = await aRepo()
    const base = await repo.commit(appFiles({ events: ['fact.a'] }))
    await repo.write(appFiles({ events: ['fact.a', 'fact.b'] }))

    const markdown = report(repo, base)

    expect(markdown).toContain('→ working tree')
    expect(sectionOf(markdown, 'Events')).toEqual(['- fact **+** `fact.b`'])
  })
})
