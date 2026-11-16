import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const usage = `Usage: node scripts/architecture-diff.mjs [--base <ref>] [--head <ref>] [--markdown file.md] [--html file.html]

Compares how the app is wired at two points: the modules and the events each one consumes and
produces, the saved facts and the state slices that handle them, and which layers the change touched.

--base  defaults to where the branch left origin/main
--head  defaults to the working tree, uncommitted changes included
Prints the Markdown report when neither --markdown nor --html is given.`

const EVENT_KINDS = ['command', 'fact', 'ui']

const LAYERS = [
  ['tests', (file) => file.startsWith('tests/') || file.endsWith('.test.js')],
  ['engine', (file) => file.startsWith('engine/')],
  ['game data', (file) => file.startsWith('game/data/')],
  ['game rules (heroes)', (file) => file.startsWith('game/heroes/')],
  ['game rules (core)', (file) => file.startsWith('game/')],
  ['app modules (heroes)', (file) => file.startsWith('app/heroes/')],
  ['app core', (file) => file.startsWith('app/')],
  ['markup & styles', (file) => file === 'index.html' || file.endsWith('.css')],
  ['scenarios', (file) => file.startsWith('scenarios/')],
  ['docs', (file) => file.startsWith('docs/') || file.endsWith('.md')],
  ['tooling', () => true]
]

function git(...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
}

function importFrom(directory, file) {
  return import(pathToFileURL(path.join(directory, file)).href)
}

function eventTypesOf(value, config) {
  const types = typeof value === 'function' ? value(config) : value
  return [...new Set(types ?? [])].sort()
}

function isEventType(value) {
  return typeof value === 'string' && EVENT_KINDS.some((kind) => value.startsWith(`${kind}.`))
}

async function readArchitecture(directory) {
  const events = await importFrom(directory, 'app/events.js')
  const { CORE_MODULES } = await importFrom(directory, 'app/modules/register-modules.js')
  const { heroesAppContent } = await importFrom(directory, 'app/heroes/content.js')
  const { gameStateSlices } = await importFrom(directory, 'app/game-state.js')
  const config = { content: heroesAppContent }

  const modules = [...CORE_MODULES, ...heroesAppContent.modules].map(({ meta }) => ({
    id: meta.id,
    phase: meta.phase,
    consumes: eventTypesOf(meta.consumes, config),
    produces: eventTypesOf(meta.produces, config)
  }))
  const declared = modules.flatMap((module) => [...module.consumes, ...module.produces])
  const eventTypes = [...new Set([...Object.values(events).filter(isEventType), ...declared])]

  return {
    modules: new Map(modules.map((module) => [module.id, module])),
    eventTypes: new Set(eventTypes),
    savedFacts: new Set(eventTypes.filter((type) => events.shouldPersistFactEvent(type))),
    slices: new Map(
      gameStateSlices(heroesAppContent).map((slice) => [slice.key, Object.keys(slice.on).sort()])
    )
  }
}

async function readArchitectureAt(ref) {
  if (!ref) {
    return readArchitecture(repoRoot)
  }

  const directory = await mkdtemp(path.join(tmpdir(), 'architecture-diff-'))
  git('worktree', 'add', '--detach', '--quiet', directory, ref)
  try {
    return await readArchitecture(directory)
  } finally {
    git('worktree', 'remove', '--force', directory)
    await rm(directory, { recursive: true, force: true })
  }
}

function difference(left, right) {
  const rightSet = new Set(right)
  return [...left].filter((item) => !rightSet.has(item)).sort()
}

function setChange(before, after) {
  return { added: difference(after, before), removed: difference(before, after) }
}

function hasChange(change) {
  return change.added.length > 0 || change.removed.length > 0
}

function moduleChange(before, after) {
  return {
    id: after.id,
    phase: before.phase === after.phase ? null : { from: before.phase, to: after.phase },
    consumes: setChange(before.consumes, after.consumes),
    produces: setChange(before.produces, after.produces)
  }
}

function isModuleChanged(change) {
  return Boolean(change.phase) || hasChange(change.consumes) || hasChange(change.produces)
}

function sliceChanges(base, head) {
  const keys = [...new Set([...base.slices.keys(), ...head.slices.keys()])].sort()
  return keys
    .map((key) => ({
      key,
      status: statusOf(base.slices.has(key), head.slices.has(key)),
      facts: setChange(base.slices.get(key) ?? [], head.slices.get(key) ?? [])
    }))
    .filter((change) => change.status !== 'same' || hasChange(change.facts))
}

function statusOf(inBase, inHead) {
  if (inBase && inHead) {
    return 'same'
  }

  return inHead ? 'added' : 'removed'
}

function edgesOf(architecture) {
  const edges = new Map()
  for (const module of architecture.modules.values()) {
    for (const type of module.produces) {
      edges.set(`${module.id}>${type}`, { from: module.id, to: type, kind: 'produces' })
    }
    for (const type of module.consumes) {
      edges.set(`${type}>${module.id}`, { from: type, to: module.id, kind: 'consumes' })
    }
  }
  for (const [key, facts] of architecture.slices) {
    for (const type of facts) {
      edges.set(`${type}>slice:${key}`, { from: type, to: `slice:${key}`, kind: 'handles' })
    }
  }
  return edges
}

function edgeChanges(base, head) {
  const baseEdges = edgesOf(base)
  const headEdges = edgesOf(head)
  const all = new Map([...baseEdges, ...headEdges])
  return [...all].map(([key, edge]) => ({
    ...edge,
    status: statusOf(baseEdges.has(key), headEdges.has(key))
  }))
}

export function diffArchitecture(base, head) {
  const ids = [...new Set([...base.modules.keys(), ...head.modules.keys()])].sort()
  return {
    modules: {
      added: ids.filter((id) => !base.modules.has(id)).map((id) => head.modules.get(id)),
      removed: ids.filter((id) => !head.modules.has(id)).map((id) => base.modules.get(id)),
      changed: ids
        .filter((id) => base.modules.has(id) && head.modules.has(id))
        .map((id) => moduleChange(base.modules.get(id), head.modules.get(id)))
        .filter(isModuleChanged)
    },
    events: setChange(base.eventTypes, head.eventTypes),
    savedFacts: setChange(base.savedFacts, head.savedFacts),
    slices: sliceChanges(base, head),
    edges: edgeChanges(base, head),
    phases: new Map(
      [...base.modules.values(), ...head.modules.values()].map((module) => [
        module.id,
        module.phase
      ])
    ),
    savedFactTypes: new Set([...base.savedFacts, ...head.savedFacts])
  }
}

function layerOf(file) {
  return LAYERS.find(([, matches]) => matches(file))[0]
}

function readLayers(baseRef, headRef) {
  const range = headRef ? [baseRef, headRef] : [baseRef]
  const rows = git('diff', '--numstat', ...range)
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t'))
  const layers = new Map(LAYERS.map(([name]) => [name, { files: 0, added: 0, removed: 0 }]))
  for (const [added, removed, file] of rows) {
    const layer = layers.get(layerOf(file))
    layer.files += 1
    layer.added += Number(added) || 0
    layer.removed += Number(removed) || 0
  }
  return [...layers].filter(([, layer]) => layer.files > 0)
}

function nodeId(name) {
  return `n_${name.replace(/[^A-Za-z0-9]/g, '_')}`
}

function quote(text) {
  return `"${text.replaceAll('"', '#quot;')}"`
}

function eventNode(type, diff, listeners) {
  const saved = diff.savedFactTypes.has(type) ? ' 💾' : ''
  const kind = type.split('.')[0]
  return `${nodeId(type)}{{${quote(`${type}${saved}${listenersNote(listeners.get(type))}`)}}}:::${kind}`
}

function moduleNode(id, diff) {
  const phase = diff.phases.get(id)
  return phase === 'view'
    ? `${nodeId(id)}(${quote(id)}):::view`
    : `${nodeId(id)}[${quote(id)}]:::domain`
}

function sliceNode(name) {
  return `${nodeId(name)}[(${quote(`state: ${name.slice('slice:'.length)}`)})]:::slice`
}

function nodeLine(name, diff, listeners) {
  if (name.startsWith('slice:')) {
    return sliceNode(name)
  }

  return diff.phases.has(name) ? moduleNode(name, diff) : eventNode(name, diff, listeners)
}

function nodeStatuses(diff) {
  const statuses = new Map()
  for (const module of diff.modules.added) statuses.set(module.id, 'added')
  for (const module of diff.modules.removed) statuses.set(module.id, 'removed')
  for (const change of diff.modules.changed) statuses.set(change.id, 'changed')
  for (const type of diff.events.added) statuses.set(type, 'added')
  for (const type of diff.events.removed) statuses.set(type, 'removed')
  for (const change of diff.slices) {
    statuses.set(`slice:${change.key}`, change.status === 'same' ? 'changed' : change.status)
  }
  return statuses
}

// Unchanged edges are drawn only to a new or removed event, so a module that now listens to an
// event many others listen to doesn't pull them all into the picture; they're counted instead.
function drawnEdges(diff) {
  const changedEvents = new Set([...diff.events.added, ...diff.events.removed])
  return diff.edges.filter(
    (edge) => edge.status !== 'same' || changedEvents.has(edge.from) || changedEvents.has(edge.to)
  )
}

function hiddenListeners(diff, drawn) {
  const drawnSet = new Set(drawn)
  const listeners = new Map()
  const touchedEvents = new Set(drawn.flatMap((edge) => [edge.from, edge.to]))
  for (const edge of diff.edges) {
    if (edge.kind === 'consumes' && touchedEvents.has(edge.from) && !drawnSet.has(edge)) {
      listeners.set(edge.from, [...(listeners.get(edge.from) ?? []), edge.to])
    }
  }
  return listeners
}

function listenersNote(listeners = []) {
  if (listeners.length === 0) {
    return ''
  }

  const names = listeners.length <= 3 ? listeners.join(', ') : `${listeners.length} other modules`
  return `<br/><small>also heard by ${names}</small>`
}

const EDGE_STYLES = {
  added: 'stroke:#1a7f37,stroke-width:2.5px',
  removed: 'stroke:#cf222e,stroke-width:2px,stroke-dasharray:5 4',
  same: 'stroke:#8c959f,stroke-width:1px'
}

const MERMAID_CLASSES = [
  'classDef domain fill:#ddf4ff,stroke:#0969da,color:#0a3069',
  'classDef view fill:#fbefff,stroke:#8250df,color:#3e1f79',
  'classDef command fill:#fff8c5,stroke:#9a6700,color:#4d2d00',
  'classDef fact fill:#dafbe1,stroke:#1a7f37,color:#002d11',
  'classDef ui fill:#f6f8fa,stroke:#6e7781,color:#24292f',
  'classDef slice fill:#ffebe9,stroke:#bc4c00,color:#4c2000',
  'classDef added stroke:#1a7f37,stroke-width:4px',
  'classDef removed stroke:#cf222e,stroke-width:3px,stroke-dasharray:6 4,opacity:0.7',
  'classDef changed stroke:#bf8700,stroke-width:4px'
]

export function mermaidOf(diff) {
  const edges = drawnEdges(diff)
  if (edges.length === 0) {
    return null
  }

  const names = [...new Set(edges.flatMap((edge) => [edge.from, edge.to]))]
  const statuses = nodeStatuses(diff)
  const listeners = hiddenListeners(diff, edges)
  const lines = ['flowchart LR', ...names.map((name) => `  ${nodeLine(name, diff, listeners)}`)]
  edges.forEach((edge, index) => {
    const arrow = edge.status === 'removed' ? '-.->' : '-->'
    lines.push(`  ${nodeId(edge.from)} ${arrow} ${nodeId(edge.to)}`)
    lines.push(`  linkStyle ${index} ${EDGE_STYLES[edge.status]}`)
  })
  for (const name of names.filter((name) => statuses.has(name))) {
    lines.push(`  class ${nodeId(name)} ${statuses.get(name)}`)
  }
  return [...lines, ...MERMAID_CLASSES.map((line) => `  ${line}`)].join('\n')
}

function code(items) {
  return items.map((item) => `\`${item}\``).join(', ')
}

function changeLines(label, change) {
  return [
    change.added.length > 0 ? `  - ${label} **+** ${code(change.added)}` : null,
    change.removed.length > 0 ? `  - ${label} **−** ${code(change.removed)}` : null
  ].filter(Boolean)
}

function moduleLines(diff) {
  const lines = []
  for (const module of diff.modules.added) {
    lines.push(`- **new** \`${module.id}\` (${module.phase})`)
    lines.push(...changeLines('consumes', { added: module.consumes, removed: [] }))
    lines.push(...changeLines('produces', { added: module.produces, removed: [] }))
  }
  for (const module of diff.modules.removed) {
    lines.push(`- **removed** \`${module.id}\` (${module.phase})`)
  }
  for (const change of diff.modules.changed) {
    const phase = change.phase ? `, ${change.phase.from} → ${change.phase.to}` : ''
    lines.push(`- \`${change.id}\`${phase}`)
    lines.push(...changeLines('consumes', change.consumes))
    lines.push(...changeLines('produces', change.produces))
  }
  return lines
}

function eventLines(diff) {
  return EVENT_KINDS.flatMap((kind) => {
    const ofKind = (types) => types.filter((type) => type.startsWith(`${kind}.`))
    return changeLines(kind, {
      added: ofKind(diff.events.added),
      removed: ofKind(diff.events.removed)
    })
  }).map((line) => line.slice(2))
}

function savedFactLines(diff) {
  const lines = changeLines('saved', diff.savedFacts).map((line) => line.slice(2))
  if (diff.savedFacts.removed.length > 0) {
    lines.push(
      '- ⚠️ A fact that is no longer saved or replayed: games saved before this change still hold it.'
    )
  }
  for (const change of diff.slices) {
    const label =
      change.status === 'same' ? `\`${change.key}\`` : `**${change.status}** \`${change.key}\``
    lines.push(`- state slice ${label}`)
    lines.push(...changeLines('handles', change.facts))
  }
  return lines
}

function layerLines(layers) {
  if (layers.length === 0) {
    return ['No files changed.']
  }

  const widest = Math.max(...layers.map(([, layer]) => layer.added + layer.removed))
  return [
    '| Layer | Files | Lines | |',
    '|---|---:|---:|---|',
    ...layers.map(([name, layer]) => {
      const bar = '█'.repeat(Math.max(1, Math.round(((layer.added + layer.removed) / widest) * 20)))
      return `| ${name} | ${layer.files} | +${layer.added} −${layer.removed} | ${bar} |`
    })
  ]
}

function section(title, lines, empty) {
  return [`### ${title}`, '', ...(lines.length > 0 ? lines : [empty]), '']
}

export function markdownOf({ diff, layers, baseLabel, headLabel }) {
  const diagram = mermaidOf(diff)
  return [
    `## Architecture changes: ${baseLabel} → ${headLabel}`,
    '',
    ...section('Layers touched', layerLines(layers), ''),
    ...section(
      'Event flow',
      diagram
        ? [
            'Rectangles are domain modules, rounded boxes view modules, hexagons events (💾 saved facts), cylinders state slices. Green is new, red dashed is gone, amber is changed.',
            '',
            '```mermaid',
            diagram,
            '```'
          ]
        : [],
      'No module, event or state slice changed how it is wired.'
    ),
    ...section('Modules', moduleLines(diff), 'No module was added, removed or rewired.'),
    ...section('Events', eventLines(diff), 'No event type was added or removed.'),
    ...section(
      'Saved facts and state',
      savedFactLines(diff),
      'The saved facts and the state slices are unchanged.'
    )
  ].join('\n')
}

function escapeHtml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function markdownToHtml(markdown) {
  const blocks = markdown.split(/```mermaid\n([\s\S]*?)\n```/)
  return blocks
    .map((block, index) =>
      index % 2 === 1 ? `<pre class="mermaid">${escapeHtml(block)}</pre>` : textToHtml(block)
    )
    .join('\n')
}

function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

function tableToHtml(rows) {
  const cells = (row) =>
    row
      .split('|')
      .slice(1, -1)
      .map((cell) => inline(cell.trim()))
  const [head, , ...body] = rows
  return `<table><thead><tr>${cells(head)
    .map((cell) => `<th>${cell}</th>`)
    .join('')}</tr></thead><tbody>${body
    .map(
      (row) =>
        `<tr>${cells(row)
          .map((cell) => `<td>${cell}</td>`)
          .join('')}</tr>`
    )
    .join('')}</tbody></table>`
}

function lineToHtml(line) {
  if (line.startsWith('## ')) return `<h1>${inline(line.slice(3))}</h1>`
  if (line.startsWith('### ')) return `<h2>${inline(line.slice(4))}</h2>`
  if (line.startsWith('  - ')) return `<li class="sub">${inline(line.slice(4))}</li>`
  if (line.startsWith('- ')) return `<li>${inline(line.slice(2))}</li>`
  return line.trim() ? `<p>${inline(line)}</p>` : ''
}

function textToHtml(text) {
  const lines = text.split('\n')
  const html = []
  let table = []
  for (const line of lines) {
    if (line.startsWith('|')) {
      table.push(line)
      continue
    }
    if (table.length > 0) {
      html.push(tableToHtml(table))
      table = []
    }
    html.push(lineToHtml(line))
  }
  return html.join('\n')
}

export function htmlOf(markdown, title) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { --bg: #ffffff; --fg: #1f2328; --muted: #59636e; --line: #d1d9e0; --code: #f6f8fa; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --bg: #0d1117; --fg: #e6edf3; --muted: #9198a1; --line: #3d444d; --code: #151b23; }
  }
  :root[data-theme="dark"] { --bg: #0d1117; --fg: #e6edf3; --muted: #9198a1; --line: #3d444d; --code: #151b23; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 1.4rem; margin: 0 0 16px; }
  h2 { font-size: 1.1rem; margin: 32px 0 8px; border-bottom: 1px solid var(--line); padding-bottom: 4px; }
  p { color: var(--muted); }
  code { background: var(--code); padding: 1px 5px; border-radius: 4px; font-size: 0.88em; overflow-wrap: anywhere; }
  li { list-style: none; margin: 4px 0; }
  li.sub { margin-left: 24px; color: var(--muted); }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--line); }
  td:last-child { color: #0969da; letter-spacing: -1px; white-space: nowrap; }
  pre.mermaid { background: #ffffff; border: 1px solid var(--line); border-radius: 8px; padding: 12px; overflow-x: auto; }
  ul, ol { padding-left: 0; }
</style>
</head>
<body>
<main>
${markdownToHtml(markdown)}
</main>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs'
  mermaid.initialize({ startOnLoad: false, theme: 'default', flowchart: { useMaxWidth: true, htmlLabels: true } })
  await mermaid.run({ querySelector: 'pre.mermaid' })
  document.body.dataset.rendered = 'true'
</script>
</body>
</html>
`
}

function defaultBase() {
  return git('merge-base', 'HEAD', 'origin/main')
}

function labelOf(ref) {
  return ref ? git('log', '-1', '--format=%h %s', ref) : 'working tree'
}

async function main() {
  const { values: options } = parseArgs({
    options: {
      base: { type: 'string' },
      head: { type: 'string' },
      markdown: { type: 'string' },
      html: { type: 'string' },
      help: { type: 'boolean', default: false }
    }
  })
  if (options.help) {
    console.log(usage)
    return
  }

  const baseRef = options.base ?? defaultBase()
  const base = await readArchitectureAt(baseRef)
  const head = await readArchitectureAt(options.head)
  const report = {
    diff: diffArchitecture(base, head),
    layers: readLayers(baseRef, options.head),
    baseLabel: labelOf(baseRef),
    headLabel: labelOf(options.head)
  }
  const markdown = markdownOf(report)

  if (options.markdown) {
    await writeFile(options.markdown, markdown)
  }
  if (options.html) {
    await writeFile(options.html, htmlOf(markdown, 'Architecture changes'))
  }
  if (!options.markdown && !options.html) {
    console.log(markdown)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
