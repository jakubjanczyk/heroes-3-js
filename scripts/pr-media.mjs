import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MEDIA_DIRECTORY = 'pr-media'
const VIEWPORT_ORDER = ['desktop', 'phone']

const usage = `Usage: node scripts/pr-media.mjs <shots dir> [--captions captions.json] [--markdown file.md] [--repo owner/name]

Puts the shots and recordings of scripts/screenshot.mjs into the PR description.
GitHub keeps no images sent through its API, so the files go into one commit on the current
branch and straight out again in the next one: the PR's net diff and the squash merge leave
them out, while the PR's head ref keeps the first commit, and the links to it, for good.
Recordings become GIFs, which GitHub shows inline.

--captions  JSON mapping a shot name (the name given to shot()) or "recording" to its caption
--markdown  where to write the Markdown to paste into the PR; printed when not given
--repo      defaults to the owner/name of the origin remote
Push the branch afterwards: the links work once both commits are on GitHub.`

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    captions: { type: 'string' },
    markdown: { type: 'string' },
    repo: { type: 'string' },
    help: { type: 'boolean', default: false }
  }
})

if (options.help || positionals.length !== 1) {
  console.log(usage)
  process.exit(options.help ? 0 : 1)
}

function git(...args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
}

function repoSlug() {
  if (options.repo) {
    return options.repo
  }
  const match = git('remote', 'get-url', 'origin').match(/github\.com[/:]([^/]+\/[^/]+?)(\.git)?$/)
  if (!match) {
    throw new Error(
      'Cannot tell the GitHub repository from the origin remote: pass --repo owner/name'
    )
  }
  return match[1]
}

function toGif(mp4, gif) {
  const palette =
    'fps=8,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse'
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf', palette, '-loop', '0', gif])
}

async function collectMedia(shotsDirectory, targetDirectory) {
  const files = (await readdir(shotsDirectory)).sort()
  const shots = files.filter((file) => file.endsWith('.png') && !file.endsWith('-failed.png'))
  const recordings = files.filter((file) => file.endsWith('.mp4'))
  await mkdir(targetDirectory, { recursive: true })
  for (const file of shots) {
    await copyFile(path.join(shotsDirectory, file), path.join(targetDirectory, file))
  }
  for (const file of recordings) {
    toGif(
      path.join(shotsDirectory, file),
      path.join(targetDirectory, file.replace(/\.mp4$/, '.gif'))
    )
  }
  return {
    shots,
    recordings: recordings.map((file) => file.replace(/\.mp4$/, '.gif'))
  }
}

function groupShots(shots) {
  const groups = new Map()
  for (const file of shots) {
    const [, viewport, key] = file.match(/^([a-z]+)-(\d+-.+)\.png$/) ?? []
    if (!viewport) {
      continue
    }
    const group = groups.get(key) ?? { name: key.replace(/^\d+-/, ''), files: {} }
    group.files[viewport] = file
    groups.set(key, group)
  }
  return [...groups.values()]
}

function viewportsOf(files) {
  return Object.keys(files).sort((a, b) => VIEWPORT_ORDER.indexOf(a) - VIEWPORT_ORDER.indexOf(b))
}

function imageTable(files, urlOf, alt) {
  const viewports = viewportsOf(files)
  const header = `| ${viewports.join(' | ')} |`
  const divider = `| ${viewports.map(() => '---').join(' | ')} |`
  const images = `| ${viewports.map((viewport) => `![${alt} (${viewport})](${urlOf(files[viewport])})`).join(' | ')} |`
  return [header, divider, images].join('\n')
}

function markdownFor({ shots, recordings }, captions, urlOf) {
  const sections = ['## Screenshots']
  for (const group of groupShots(shots)) {
    sections.push(
      `**${captions[group.name] ?? group.name}**`,
      imageTable(group.files, urlOf, group.name)
    )
  }
  if (recordings.length > 0) {
    const files = Object.fromEntries(recordings.map((file) => [file.replace(/\.gif$/, ''), file]))
    sections.push(`**${captions.recording ?? 'Recording'}**`, imageTable(files, urlOf, 'recording'))
  }
  return `${sections.join('\n\n')}\n`
}

function assertNothingStaged() {
  if (git('diff', '--cached', '--name-only') !== '') {
    throw new Error('Staged changes would go into the media commit: commit or unstage them first')
  }
}

assertNothingStaged()
const slug = repoSlug()
const captions = options.captions ? JSON.parse(await readFile(options.captions, 'utf8')) : {}
const media = await collectMedia(path.resolve(positionals[0]), path.join(repoRoot, MEDIA_DIRECTORY))

git('add', '--force', MEDIA_DIRECTORY)
git('commit', '--quiet', '-m', 'pr: add screenshots for the description')
const mediaCommit = git('rev-parse', 'HEAD')
git('rm', '-r', '--quiet', MEDIA_DIRECTORY)
git('commit', '--quiet', '-m', 'pr: take the screenshots back out of the tree')

const urlOf = (file) =>
  `https://raw.githubusercontent.com/${slug}/${mediaCommit}/${MEDIA_DIRECTORY}/${file}`
const markdown = markdownFor(media, captions, urlOf)
if (options.markdown) {
  await writeFile(options.markdown, markdown)
  console.log(options.markdown)
} else {
  console.log(markdown)
}
